/**
 * Host half of the statistics bundle.
 *
 * Reads every conversation log this profile stores, folds the committed token
 * usage, prices it against a configurable rate card, and serves one snapshot to
 * the panel over `/api/statistics/snapshot`. The same snapshot carries a live CPU
 * history sampled in this process, with CPU time attributed to the conversation
 * that was running while each interval elapsed.
 *
 * @module dsh-statistics
 */

import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { applyFoldEvent, buildSnapshot, createFoldState, finishFold, normalizeRates } from './lib/fold.js'
import { createCpuSampler } from './lib/cpu.js'
import { cachePath, createCacheWriter, readCache, sessionsRoot } from './lib/cache.js'
import { createFoldPool } from './lib/fold-pool.js'

/** Stable Cordis plugin name. */
export const name = 'statistics'

/** Connection owns the authenticated Fetch registry the route lives in. */
export const inject = ['connection']

/** Exact route inside Connection's authentication fence. */
const SNAPSHOT_PATH = '/api/statistics/snapshot'

/** Rate card used when the profile patch sets none; USD per 1M tokens. */
const DEFAULT_RATES = [
  { match: 'deepseek-v4.1-flash*', input: 0.3, output: 1.2, cacheRead: 0.006 },
  { match: 'deepseek-v4-flash*', input: 0.3, output: 1.2, cacheRead: 0.006 },
  { match: '*deepseek-flash*', input: 0.3, output: 1.2, cacheRead: 0.006 },
  { match: 'deepseek-v4-pro*', input: 1.32, output: 3.96, cacheRead: 0.044 },
  { match: '*glm-5.3-flash*', input: 0.15, output: 0.5, cacheRead: 0.03 },
  { match: '*deepseek*', input: 0.27, output: 1.1, cacheRead: 0.07 },
]

const DEFAULT_FALLBACK_RATE = { input: 0.27, output: 1.1, cacheRead: 0.07 }

const DEFAULTS = {
  rates: DEFAULT_RATES,
  fallbackRate: DEFAULT_FALLBACK_RATE,
  budgetUsd: 20,
  budgetPeriod: 'month',
  cpuIntervalMs: 2000,
  cpuHistorySize: 120,
  refreshMs: 4000,
  statsTtlMs: 15000,
  includeSubagents: true,
  maxSessions: 500,
  foldInWorker: true,
}

const BUDGET_PERIODS = new Set(['day', 'week', 'month', 'all'])

/**
 * Normalize one rate rule, rejecting anything that cannot be priced.
 *
 * @param {unknown} rule
 * @param {string} field
 */
function rateRule(rule, field) {
  if (rule === null || typeof rule !== 'object' || Array.isArray(rule)) {
    throw new Error(`${field} must be an object`)
  }
  const match = rule.match ?? '*'
  if (typeof match !== 'string' || match.length === 0) throw new Error(`${field}.match must be a non-empty string`)
  const rate = { match }
  for (const bucket of ['input', 'output', 'cacheRead', 'cacheWrite']) {
    const value = rule[bucket]
    if (value === undefined) continue
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new Error(`${field}.${bucket} must be a non-negative number`)
    }
    rate[bucket] = value
  }
  return rate
}

/**
 * Validate the plugin row's config into the resolved shape `apply` uses.
 *
 * @param {unknown} raw
 */
export function validateConfig(raw = {}) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('plugin config must be an object')
  const config = { ...DEFAULTS, ...raw }

  if (!Array.isArray(config.rates)) throw new Error('rates must be an array')
  config.rates = config.rates.map((rule, index) => rateRule(rule, `rates[${index}]`))
  config.fallbackRate = rateRule(config.fallbackRate ?? DEFAULT_FALLBACK_RATE, 'fallbackRate')
  delete config.fallbackRate.match

  const number = (field, min, max) => {
    const value = config[field]
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${field} must be a number`)
    if (value < min || value > max) throw new Error(`${field} must be between ${min} and ${max}`)
    return value
  }
  config.budgetUsd = number('budgetUsd', 0, 1_000_000)
  config.cpuIntervalMs = number('cpuIntervalMs', 250, 60_000)
  config.cpuHistorySize = number('cpuHistorySize', 10, 2000)
  config.refreshMs = number('refreshMs', 1000, 600_000)
  config.statsTtlMs = number('statsTtlMs', 0, 3_600_000)
  config.maxSessions = number('maxSessions', 1, 20000)

  if (typeof config.budgetPeriod !== 'string' || !BUDGET_PERIODS.has(config.budgetPeriod)) {
    throw new Error(`budgetPeriod must be one of ${[...BUDGET_PERIODS].join(', ')}`)
  }
  config.includeSubagents = config.includeSubagents !== false
  config.foldInWorker = config.foldInWorker !== false
  return config
}

/** Standard Schema face so the Loader validates the row's `config`. */
const Config = {
  '~standard': {
    version: 1,
    vendor: 'dsh-statistics',
    validate(value) {
      try {
        return { value: validateConfig(value ?? {}) }
      } catch (error) {
        return { issues: [{ message: error instanceof Error ? error.message : String(error) }] }
      }
    },
  },
}

/** Whether one `agent/status` payload describes a running turn. */
function isRunning(status) {
  if (typeof status === 'string') return status === 'running'
  if (status && typeof status === 'object') {
    const kind = status.kind ?? status.status
    if (typeof kind === 'string') return kind === 'running'
  }
  return false
}

/**
 * List stored conversations through whichever session service this profile
 * mounts. `sessionQuery` is live-preferred, so a running conversation is read
 * from its in-memory tail rather than the flushed log prefix.
 *
 * @param {object} ctx
 * @param {AbortSignal | undefined} signal
 */
async function listStoredSessions(ctx, signal) {
  const query = ctx.get('sessionQuery')
  if (query && typeof query.listSessions === 'function') {
    const records = await query.listSessions(signal)
    return {
      source: 'sessionQuery',
      records: records.map((record) => ({
        id: String(record.header?.id ?? ''),
        live: record.live === true,
        stamp: record.live === true ? 'live' : 'persisted',
      })),
    }
  }
  const persistence = ctx.get('sessionPersistence')
  if (persistence && typeof persistence.list === 'function') {
    const snapshots = await persistence.list({ signal })
    return {
      source: 'sessionPersistence',
      records: snapshots.map((snapshot) => ({
        id: String(snapshot.header?.id ?? ''),
        live: false,
        stamp: String(snapshot.revision ?? ''),
      })),
    }
  }
  return { source: 'none', records: [] }
}

/**
 * Read one conversation's committed events.
 *
 * @param {object} ctx
 * @param {string} id
 */
async function readStoredSession(ctx, id) {
  const query = ctx.get('sessionQuery')
  if (query && typeof query.readSession === 'function') {
    const snapshot = await query.readSession(id)
    return { header: snapshot.session ?? {}, events: snapshot.events ?? [] }
  }
  const persistence = ctx.get('sessionPersistence')
  if (persistence && typeof persistence.open === 'function') {
    const handle = await persistence.open(id, 'read')
    try {
      const result = await handle.read()
      return { header: handle.header ?? {}, events: result.events ?? [] }
    } finally {
      await handle.close()
    }
  }
  throw new Error('this profile mounts no session storage service')
}

/**
 * Map every session id on disk to its log file. A missing or unreadable tree
 * yields an empty map, which sends every read back through the services.
 *
 * @returns {Promise<Map<string, string>>}
 */
async function sessionLogPaths() {
  const root = sessionsRoot()
  const paths = new Map()
  let workspaces
  try {
    workspaces = await readdir(root, { withFileTypes: true })
  } catch {
    return paths
  }
  for (const workspace of workspaces) {
    if (!workspace.isDirectory()) continue
    let sessions
    try {
      sessions = await readdir(join(root, workspace.name), { withFileTypes: true })
    } catch {
      continue
    }
    for (const session of sessions) {
      if (!session.isDirectory()) continue
      const dir = join(root, workspace.name, session.name)
      let files
      try {
        files = await readdir(dir)
      } catch {
        continue
      }
      const log = files.find((name) => name.startsWith('session.') && name.endsWith('.zstd'))
      if (log !== undefined) paths.set(session.name, join(dir, log))
    }
  }
  return paths
}

/**
 * Storage revisions for every persisted session, plus what went wrong if the
 * profile cannot report them. A missing revision is never reused, so an unknown
 * state costs a rescan rather than a stale number.
 *
 * @param {object} ctx
 */
async function revisionsOf(ctx) {
  const persistence = ctx.get('sessionPersistence')
  if (!persistence) return { revisions: new Map(), note: 'sessionPersistence unavailable' }
  if (typeof persistence.list !== 'function') return { revisions: new Map(), note: 'sessionPersistence.list missing' }
  try {
    const snapshots = await persistence.list({})
    const revisions = new Map()
    for (const snapshot of snapshots) {
      const id = snapshot?.header?.id
      if (id === undefined || id === null) continue
      const revision = snapshot.revision
      if (revision === undefined || revision === null) continue
      revisions.set(String(id), String(revision))
    }
    return { revisions, note: revisions.size === 0 ? 'sessionPersistence.list returned no revisions' : null }
  } catch (error) {
    return { revisions: new Map(), note: `sessionPersistence.list failed: ${error instanceof Error ? error.message : String(error)}` }
  }
}

/**
 * Folded conversations, refreshed on a TTL, with unchanged persisted logs left
 * alone between refreshes and carried across restarts through the disk cache.
 *
 * @param {object} ctx
 * @param {ReturnType<typeof validateConfig>} config
 */
function createSessionCache(ctx, config, pool) {
  /** @type {Map<string, {revision: string | null, header: object, fold: object}>} */
  let folds = new Map()
  const file = cachePath()
  const writer = createCacheWriter(file)
  let hydrated = false
  let revisionNote = null
  let source = 'none'
  let lastScanAt = 0
  let lastError = null
  let inflight = null

  async function hydrate() {
    if (hydrated) return
    hydrated = true
    folds = await readCache(file)
  }

  async function scan() {
    await hydrate()
    const listed = await listStoredSessions(ctx)
    source = listed.source
    const { revisions, note } = await revisionsOf(ctx)
    revisionNote = note
    const paths = config.foldInWorker ? await sessionLogPaths() : new Map()
    const next = new Map()
    let reused = 0
    let viaWorker = 0
    let workerEvents = 0
    const workerTrace = []
    let serviceEvents = 0
    for (const record of listed.records.slice(0, config.maxSessions)) {
      if (record.id.length === 0) continue
      const cached = folds.get(record.id)
      const revision = record.live ? null : revisions.get(record.id) ?? null
      if (cached && cached.state) {
        cached.fold = finishFold(cached.state)
        cached.dirty = false
        next.set(record.id, revision === null || revision === cached.revision ? cached : { ...cached, revision })
        reused += 1
        continue
      }
      if (cached && revision !== null && cached.revision === revision) {
        next.set(record.id, cached)
        reused += 1
        continue
      }
      const logPath = record.live ? undefined : paths.get(record.id)
      if (logPath !== undefined) {
        try {
          const folded = await pool.fold(logPath, record.id)
          if (workerTrace.length < 3) workerTrace.push({ id: record.id.slice(0, 12), events: folded.events, lines: folded.lines, bytes: folded.bytes })
          if (folded.events === 0) throw new Error(`worker read no events from ${logPath} (lines ${folded.lines}, bytes ${folded.bytes})`)
          next.set(record.id, { revision, header: folded.header, fold: folded.fold, state: null })
          viaWorker += 1
          workerEvents += folded.events
          continue
        } catch (error) {
          lastError = `worker fold failed for ${record.id}: ${error instanceof Error ? error.message : String(error)}`
        }
      }
      try {
        const { header, events } = await readStoredSession(ctx, record.id)
        if (events.length === 0 && revision !== null) throw new Error('storage returned no events')
        const state = createFoldState(header)
        for (const event of events) applyFoldEvent(state, event)
        next.set(record.id, { revision, header, fold: finishFold(state), state: record.live ? state : null })
        serviceEvents += events.length
      } catch (error) {
        lastError = `could not read ${record.id}: ${error instanceof Error ? error.message : String(error)}`
        if (cached) next.set(record.id, cached)
      }
    }
    folds = next
    lastScanAt = Date.now()
    writer.schedule({
      sessions: Object.fromEntries([...folds].map(([id, entry]) => [id, { revision: entry.revision, header: entry.header, fold: entry.fold }])),
      diagnostics: {
        source,
        revisionNote,
        cached: folds.size,
        reused,
        viaWorker,
        workerEvents,
        serviceEvents,
        emptyFolds: [...folds.values()].filter((entry) => entry.fold.totalTokens === 0).length,
        lastError,
        workerTrace,
      },
    })
  }

  return {
    get source() {
      return source
    },
    get lastError() {
      return lastError
    },
    get revisionNote() {
      return revisionNote
    },
    /**
     * Fold one committed event into a live session's state. Sessions without a
     * tracked state are ignored: their next scan reads them in full.
     *
     * @param {string} id
     * @param {object} event
     */
    applyEvent(id, event) {
      const entry = folds.get(id)
      if (!entry || !entry.state) return
      applyFoldEvent(entry.state, event)
      entry.dirty = true
    },
    /** Folded conversations, scanning first when the cache has gone stale. */
    async collect() {
      const stale = Date.now() - lastScanAt >= config.statsTtlMs
      if (stale) {
        if (!inflight) {
          inflight = scan().finally(() => {
            inflight = null
          })
        }
        await inflight
      }
      for (const entry of folds.values()) {
        if (!entry.dirty) continue
        entry.fold = finishFold(entry.state)
        entry.dirty = false
      }
      return [...folds.values()]
    },
    /** Persist whatever is folded, for teardown. */
    async dispose() {
      for (const entry of folds.values()) {
        if (!entry.dirty) continue
        entry.fold = finishFold(entry.state)
        entry.dirty = false
      }
      writer.schedule({
        sessions: Object.fromEntries([...folds].map(([id, entry]) => [id, { revision: entry.revision, header: entry.header, fold: entry.fold }])),
        diagnostics: { source, revisionNote, cached: folds.size, reused: 0, teardown: true },
      })
      await writer.flushNow()
      writer.stop()
    },
  }
}

/**
 * Mount the snapshot route and the CPU sampler.
 *
 * @param {object} ctx
 * @param {unknown} rawConfig
 */
export function apply(ctx, rawConfig = {}) {
  const config = validateConfig(rawConfig)
  const rates = normalizeRates(config.rates, config.fallbackRate)

  const cpu = createCpuSampler({ intervalMs: config.cpuIntervalMs, historySize: config.cpuHistorySize })
  ctx.effect(() => {
    cpu.start()
    return () => cpu.stop()
  }, 'dsh-statistics: cpu sampler')

  ctx.on('agent/status', (payload) => {
    const id = payload?.agent?.id
    if (id === undefined || id === null) return
    cpu.setRunning(id, isRunning(payload.status))
  })

  const pool = config.foldInWorker ? createFoldPool() : null
  ctx.effect(() => () => pool?.dispose(), 'dsh-statistics: fold worker')
  const cache = createSessionCache(ctx, config, pool)
  ctx.effect(() => () => cache.dispose(), 'dsh-statistics: persist the fold cache')

  const ACTIVITY_EVENTS = new Set(['turn/start', 'step/start', 'assistant/message', 'tool/call'])
  ctx.on('session/event', (session, event) => {
    const id = session?.id
    if (id === undefined || id === null) return
    if (ACTIVITY_EVENTS.has(event?.type)) cpu.touch(id)
    cache.applyEvent(String(id), event)
  })


  ctx.effect(() => {
    const timer = setTimeout(() => {
      cache.collect().catch(() => {})
    }, 1500)
    return () => clearTimeout(timer)
  }, 'dsh-statistics: warm the scan before the panel opens')

  const respond = async () => {
    try {
      const stored = await cache.collect()
      const sessions = stored
        .filter((entry) => config.includeSubagents || entry.fold.origin !== 'subagent')
        .map((entry) => ({ header: entry.header, fold: entry.fold }))
      const snapshot = buildSnapshot({
        sessions,
        rates,
        budgetUsd: config.budgetUsd,
        budgetPeriod: config.budgetPeriod,
        cpu: cpu.snapshot(),
        now: Date.now(),
        source: cache.source,
      })
      const warnings = []
      if (cache.source === 'none') warnings.push('no session storage service is mounted in this profile')
      else if (cache.lastError) warnings.push(cache.lastError)
      return Response.json(
        {
          ...snapshot,
          warnings,
          config: {
            refreshMs: config.refreshMs,
            budgetUsd: config.budgetUsd,
            budgetPeriod: config.budgetPeriod,
            currency: 'USD',
            rateCard: config.rates.map((rule) => ({
              match: rule.match,
              input: rule.input ?? 0,
              output: rule.output ?? 0,
              cacheRead: rule.cacheRead ?? 0,
              cacheWrite: rule.cacheWrite ?? 0,
            })),
            fallbackRate: config.fallbackRate,
          },
        },
        { headers: { 'cache-control': 'no-store' } },
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      ctx.logger?.error?.('dsh-statistics: snapshot failed', error)
      return Response.json({ error: message }, { status: 500, headers: { 'cache-control': 'no-store' } })
    }
  }

  ctx.effect(
    () =>
      ctx.connection.fetch.register({
        path: SNAPSHOT_PATH,
        methods: ['GET'],
        requestBody: 'buffered',
        fetch: respond,
      }),
    'dsh-statistics: snapshot route',
  )
}

export { Config, SNAPSHOT_PATH, DEFAULT_RATES }
