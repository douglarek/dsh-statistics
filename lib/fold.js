/**
 * Pure session-log folding, pricing, and aggregation for the statistics panel.
 *
 * Nothing here touches Cordis, the filesystem, or the clock: the Host half feeds
 * in committed Session events and the browser receives the finished snapshot.
 *
 * @module dsh-statistics/fold
 */

/**
 * Snapshot payload version.
 *
 * The Client half refuses to trust a payload it was not built for: bump this and
 * the matching SNAPSHOT_API in client.js together when a field the panel reads
 * changes shape, so a Host that is still running older code shows a restart
 * notice instead of drawing zeros.
 */
export const SNAPSHOT_API = 2

/** Token bucket names carried through every fold and aggregate. */
const BUCKETS = ['input', 'output', 'cacheRead', 'cacheWrite']

/**
 * Events that represent conversation work.
 *
 * Bookkeeping events carry a time too — `session/end-seed`, `permission/preset`,
 * `sandbox/mode`, `approval/policy`, and `workspace/changes` are written whenever
 * a Session is reopened or resumed — so only these may move `lastAt`. Otherwise a
 * conversation whose last turn ran at 23:04 shows the next day as its last
 * activity as soon as the Session is opened again.
 */
const ACTIVITY_TYPES = new Set([
  'turn/start',
  'turn/end',
  'step/start',
  'step/end',
  'user/message',
  'assistant/message',
  'tool/call',
  'tool/result',
  'compaction/summary',
])

/** @returns {{input: number, output: number, cacheRead: number, cacheWrite: number}} */
export function emptyTokens() {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
}

/**
 * @param {{input?: number, output?: number, cacheRead?: number, cacheWrite?: number}} tokens
 * @returns {number}
 */
export function totalOf(tokens) {
  let sum = 0
  for (const bucket of BUCKETS) sum += tokens[bucket] ?? 0
  return sum
}

/** @param {Record<string, number>} target @param {Record<string, number>} source */
function addInto(target, source) {
  for (const bucket of BUCKETS) target[bucket] = (target[bucket] ?? 0) + (source[bucket] ?? 0)
}

/** Local calendar day of one epoch-millisecond timestamp, as `YYYY-MM-DD`. */
export function dayKey(time) {
  const date = new Date(time)
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * Start of the budget period containing `time`, in local time.
 * @param {number} time
 * @param {'day' | 'week' | 'month' | 'all'} period
 */
export function periodStart(time, period) {
  if (period === 'all') return 0
  const date = new Date(time)
  date.setHours(0, 0, 0, 0)
  if (period === 'day') return date.getTime()
  if (period === 'week') {
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
    return date.getTime()
  }
  date.setDate(1)
  return date.getTime()
}

/**
 * End of the budget period containing `time`, in local time.
 * @param {number} time
 * @param {'day' | 'week' | 'month' | 'all'} period
 */
export function periodEnd(time, period) {
  if (period === 'all') return Number.POSITIVE_INFINITY
  const date = new Date(periodStart(time, period))
  if (period === 'day') date.setDate(date.getDate() + 1)
  else if (period === 'week') date.setDate(date.getDate() + 7)
  else date.setMonth(date.getMonth() + 1)
  return date.getTime()
}

/** `provider/model` identity, or a stable placeholder. */
function modelId(provider, model) {
  const left = typeof provider === 'string' && provider.length > 0 ? provider : 'unknown'
  const right = typeof model === 'string' && model.length > 0 ? model : 'unknown'
  return `${left}/${right}`
}

/** Normalize one `TokenUsage` record into bucket names. */
function usageBuckets(usage) {
  return {
    input: Number(usage.inputTokens) || 0,
    output: Number(usage.outputTokens) || 0,
    cacheRead: Number(usage.cacheReadTokens) || 0,
    cacheWrite: Number(usage.cacheWriteTokens) || 0,
  }
}

/**
 * Fold one Session's committed events into its usage profile.
 *
 * Usage is attributed to the model recorded on the assistant message itself, so a
 * conversation that switches models is priced per step rather than per
 * conversation. Compaction summaries are real provider spend and are included.
 *
 * @param {{header: object, events: readonly object[]}} input
 */
/**
 * Mutable fold state for one session.
 *
 * `applyFoldEvent` updates it in place and `finishFold` projects it into the
 * snapshot shape, so a full replay and a live event feed share one
 * implementation: the panel can never disagree with a fresh scan.
 *
 * @param {object} header
 */
export function createFoldState(header) {
  const createdAt = typeof header?.createdAt === 'number' ? header.createdAt : null
  return {
    sessionId: String(header?.id ?? 'unknown'),
    cwd: typeof header?.cwd === 'string' ? header.cwd : null,
    origin: header?.origin === 'subagent' ? 'subagent' : 'session',
    parentSessionId: typeof header?.parentSession === 'string' ? header.parentSession : null,
    createdAt,
    tokens: emptyTokens(),
    /** @type {Map<string, {id: string, provider: string, model: string, tokens: object}>} */
    models: new Map(),
    /** @type {Map<string, {tokens: object, models: Map<string, object>, sessions: Set<string>, turns: number, steps: number, toolCalls: number, requests: number}>} */
    days: new Map(),
    title: null,
    current: null,
    turns: 0,
    steps: 0,
    userTurns: 0,
    toolCalls: 0,
    compactionTokens: 0,
    activeWallMs: 0,
    firstAt: createdAt,
    lastAt: createdAt,
    /** @type {Map<number, number>} */
    openTurns: new Map(),
  }
}

function dayEntryOf(state, time) {
  const key = dayKey(time)
  let day = state.days.get(key)
  if (!day) {
    day = { tokens: emptyTokens(), models: new Map(), sessions: new Set(), turns: 0, steps: 0, toolCalls: 0, requests: 0 }
    state.days.set(key, day)
  }
  day.sessions.add(state.sessionId)
  return day
}

function attributeTo(state, provider, model, buckets, time) {
  addInto(state.tokens, buckets)
  const id = modelId(provider, model)
  let entry = state.models.get(id)
  if (!entry) {
    entry = { id, provider: provider ?? 'unknown', model: model ?? 'unknown', tokens: emptyTokens() }
    state.models.set(id, entry)
  }
  addInto(entry.tokens, buckets)
  if (typeof time === 'number' && time > 0) {
    const day = dayEntryOf(state, time)
    addInto(day.tokens, buckets)
    let dayModel = day.models.get(id)
    if (!dayModel) {
      dayModel = { id, provider: entry.provider, model: entry.model, tokens: emptyTokens() }
      day.models.set(id, dayModel)
    }
    addInto(dayModel.tokens, buckets)
  }
}

/**
 * Fold one committed event into the state. Unknown event types are ignored, so
 * a plugin that is behind the session format degrades instead of throwing.
 *
 * @param {ReturnType<typeof createFoldState>} state
 * @param {object} event
 */
export function applyFoldEvent(state, event) {
  if (!event || typeof event.type !== 'string') return state
  const time = typeof event.time === 'number' && event.time > 0 ? event.time : null
  if (time !== null) {
    if (state.firstAt === null || time < state.firstAt) state.firstAt = time
    if (ACTIVITY_TYPES.has(event.type) && (state.lastAt === null || time > state.lastAt)) state.lastAt = time
  }
  const data = event.data ?? {}
  switch (event.type) {
    case 'session/title':
      if (typeof data.title === 'string' && data.title.length > 0) state.title = data.title
      break
    case 'model/selection':
    case 'request/context':
      state.current = { provider: data.provider, model: data.model }
      break
    case 'turn/start':
      state.turns += 1
      if (time !== null) {
        state.openTurns.set(data.turn, time)
        dayEntryOf(state, time).turns += 1
      }
      break
    case 'turn/end': {
      const started = typeof data.turn === 'number' ? state.openTurns.get(data.turn) : undefined
      if (typeof started === 'number') {
        const closed = time ?? state.lastAt
        if (typeof closed === 'number' && closed >= started) state.activeWallMs += closed - started
        state.openTurns.delete(data.turn)
      }
      break
    }
    case 'user/message':
      state.userTurns += 1
      break
    case 'step/start':
      state.steps += 1
      if (time !== null) dayEntryOf(state, time).steps += 1
      break
    case 'tool/call':
      state.toolCalls += 1
      if (time !== null) dayEntryOf(state, time).toolCalls += 1
      break
    case 'assistant/message': {
      const usage = data.usage
      if (!usage) break
      const source = data.message?.source ?? {}
      attributeTo(state, source.provider ?? state.current?.provider, source.model ?? state.current?.model, usageBuckets(usage), time)
      if (time !== null) dayEntryOf(state, time).requests += 1
      break
    }
    case 'compaction/summary': {
      const usage = data.usage
      if (!usage) break
      const buckets = usageBuckets(usage)
      state.compactionTokens += totalOf(buckets)
      attributeTo(state, data.provider ?? state.current?.provider, data.model ?? state.current?.model, buckets, time)
      break
    }
    default:
      break
  }
  return state
}

/**
 * Project the state into the snapshot shape the panel and the disk cache read.
 *
 * @param {ReturnType<typeof createFoldState>} state
 */
export function finishFold(state) {
  const modelEntries = [...state.models.values()].sort((left, right) => totalOf(right.tokens) - totalOf(left.tokens))
  return {
    sessionId: state.sessionId,
    title: state.title,
    cwd: state.cwd,
    origin: state.origin,
    parentSessionId: state.parentSessionId,
    createdAt: state.createdAt,
    firstAt: state.firstAt,
    lastAt: state.lastAt,
    model: modelEntries.length > 0 ? modelEntries[0].id : null,
    tokens: state.tokens,
    totalTokens: totalOf(state.tokens),
    models: modelEntries,
    days: [...state.days.entries()].map(([day, value]) => ({
      day,
      tokens: value.tokens,
      models: [...value.models.values()],
      sessions: value.sessions.size,
      turns: value.turns,
      steps: value.steps,
      toolCalls: value.toolCalls,
      requests: value.requests,
    })),
    turns: state.turns,
    steps: state.steps,
    userTurns: state.userTurns,
    toolCalls: state.toolCalls,
    compactionTokens: state.compactionTokens,
    activeWallMs: state.activeWallMs,
  }
}

/**
 * Fold one Session's committed events into its usage profile.
 *
 * Usage is attributed to the model recorded on the assistant message itself, so a
 * conversation that switches models is priced per step rather than per
 * conversation. Compaction summaries are real provider spend and are included.
 *
 * @param {{header: object, events: readonly object[]}} input
 */
export function foldSession({ header, events }) {
  const state = createFoldState(header)
  for (const event of events) applyFoldEvent(state, event)
  return finishFold(state)
}

/** Compile one rate card into matchers, with a `*` rule appended last. */
export function normalizeRates(raw, fallback) {
  const rules = Array.isArray(raw) ? raw : []
  return rules
    .filter((rule) => rule && typeof rule.match === 'string' && rule.match.length > 0)
    .map((rule) => ({
      match: rule.match,
      pattern: globToRegExp(rule.match),
      input: Number(rule.input) || 0,
      output: Number(rule.output) || 0,
      cacheRead: Number(rule.cacheRead) || 0,
      cacheWrite: Number(rule.cacheWrite) || 0,
    }))
    .concat([
      {
        match: '*',
        pattern: /^.*$/,
        input: Number(fallback?.input) || 0,
        output: Number(fallback?.output) || 0,
        cacheRead: Number(fallback?.cacheRead) || 0,
        cacheWrite: Number(fallback?.cacheWrite) || 0,
      },
    ])
}

function globToRegExp(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp(`^${escaped}$`)
}

/**
 * Resolve the rate for one model, plus whether an explicit rule matched.
 *
 * @param {ReturnType<typeof normalizeRates>} rates
 * @param {string} id `provider/model`
 */
export function rateFor(rates, id) {
  const slash = id.indexOf('/')
  const model = slash === -1 ? id : id.slice(slash + 1)
  const candidates = slash === -1 ? [id] : [id, model]
  for (const rule of rates) {
    if (rule.match === '*') continue
    for (const candidate of candidates) if (rule.pattern.test(candidate)) return { rate: rule, explicit: true }
  }
  return { rate: rates[rates.length - 1], explicit: false }
}

/** Estimated USD for one bucket set at one rate, priced per 1M tokens. */
export function costOf(tokens, rate) {
  return (
    ((tokens.input ?? 0) * (rate.input ?? 0) +
      (tokens.output ?? 0) * (rate.output ?? 0) +
      (tokens.cacheRead ?? 0) * (rate.cacheRead ?? 0) +
      (tokens.cacheWrite ?? 0) * (rate.cacheWrite ?? 0)) /
    1_000_000
  )
}

/** Display name of a workspace from its directory. */
function workspaceName(cwd) {
  if (typeof cwd !== 'string' || cwd.length === 0) return null
  const parts = cwd.split(/[\\/]/).filter(Boolean)
  return parts.length === 0 ? null : parts[parts.length - 1]
}

/**
 * Build the whole panel snapshot from folded sessions.
 *
 * @param {object} input
 * @param {Array<{header: object, fold: object}>} input.sessions
 * @param {ReturnType<typeof normalizeRates>} input.rates
 * @param {number} input.budgetUsd
 * @param {'day' | 'week' | 'month' | 'all'} input.budgetPeriod
 * @param {object} input.cpu
 * @param {number} input.now
 * @param {string} input.source
 */
export function buildSnapshot({ sessions, rates, budgetUsd, budgetPeriod, cpu, now, source }) {
  const totals = emptyTokens()
  /** @type {Map<string, {day: string, tokens: object, cost: number, sessions: number, turns: number}>} */
  const dayMap = new Map()
  /** @type {Map<string, {id: string, provider: string, model: string, tokens: object, cost: number, explicit: boolean, sessions: number}>} */
  const modelMap = new Map()
  const rows = []
  let turns = 0
  let steps = 0
  let toolCalls = 0
  let pricedSessions = 0
  let unpricedSessions = 0
  let totalCost = 0

  for (const { header, fold } of sessions) {
    const priced = fold.models.map((entry) => {
      const { rate, explicit } = rateFor(rates, entry.id)
      return { ...entry, cost: costOf(entry.tokens, rate), explicit, rate: rate.match }
    })
    const cost = priced.reduce((sum, entry) => sum + entry.cost, 0)
    const allExplicit = priced.every((entry) => entry.explicit)
    if (fold.totalTokens > 0) {
      if (allExplicit) pricedSessions += 1
      else unpricedSessions += 1
    }
    totalCost += cost
    addInto(totals, fold.tokens)
    turns += fold.turns
    steps += fold.steps
    toolCalls += fold.toolCalls

    for (const entry of priced) {
      let bucket = modelMap.get(entry.id)
      if (!bucket) {
        bucket = {
          id: entry.id,
          provider: entry.provider,
          model: entry.model,
          tokens: emptyTokens(),
          cost: 0,
          explicit: entry.explicit,
          sessions: 0,
        }
        modelMap.set(entry.id, bucket)
      }
      addInto(bucket.tokens, entry.tokens)
      bucket.cost += entry.cost
      bucket.sessions += 1
    }

    const rowDays = []
    for (const day of fold.days) {
      const dayModels = day.models.map((entry) => {
        const { rate, explicit } = rateFor(rates, entry.id)
        return { id: entry.id, tokens: entry.tokens, cost: costOf(entry.tokens, rate), explicit }
      })
      const dayCost = dayModels.reduce((sum, entry) => sum + entry.cost, 0)
      rowDays.push({
        day: day.day,
        tokens: day.tokens,
        cost: dayCost,
        turns: day.turns,
        steps: day.steps,
        toolCalls: day.toolCalls,
        requests: day.requests,
        models: dayModels,
      })
      let bucket = dayMap.get(day.day)
      if (!bucket) {
        bucket = { day: day.day, tokens: emptyTokens(), cost: 0, sessions: 0, turns: 0, steps: 0, toolCalls: 0, requests: 0 }
        dayMap.set(day.day, bucket)
      }
      addInto(bucket.tokens, day.tokens)
      bucket.sessions += day.sessions
      bucket.turns += day.turns
      bucket.steps += day.steps
      bucket.toolCalls += day.toolCalls
      bucket.requests += day.requests
      bucket.cost += dayCost
    }

    rows.push({
      sessionId: fold.sessionId,
      title: fold.title,
      cwd: fold.cwd,
      workspace: workspaceName(fold.cwd),
      origin: fold.origin,
      parentSessionId: fold.parentSessionId,
      createdAt: fold.createdAt,
      lastAt: fold.lastAt,
      model: fold.model,
      models: priced.map((entry) => ({ id: entry.id, tokens: entry.tokens, cost: entry.cost, explicit: entry.explicit })),
      tokens: fold.tokens,
      totalTokens: fold.totalTokens,
      cost,
      priced: allExplicit,
      turns: fold.turns,
      steps: fold.steps,
      toolCalls: fold.toolCalls,
      activeWallMs: fold.activeWallMs,
      compactionTokens: fold.compactionTokens,
      days: rowDays,
      cpu: cpu?.sessions?.[fold.sessionId] ?? null,
    })
  }

  const days = [...dayMap.values()].sort((left, right) => (left.day < right.day ? -1 : 1))
  const budgetStart = periodStart(now, budgetPeriod)
  const budgetStop = periodEnd(now, budgetPeriod)
  const spentInPeriod = days
    .filter((entry) => {
      const time = Date.parse(`${entry.day}T00:00:00`)
      return time >= budgetStart && time < budgetStop
    })
    .reduce((sum, entry) => sum + entry.cost, 0)
  const periodDays = Number.isFinite(budgetStop) ? Math.max(1, Math.round((budgetStop - budgetStart) / 86_400_000)) : 0
  const elapsedDays = periodDays
    ? Math.min(periodDays, Math.max(1, Math.ceil((now - budgetStart) / 86_400_000)))
    : 1
  const projectedUsd = periodDays ? (spentInPeriod / elapsedDays) * periodDays : spentInPeriod

  rows.sort((left, right) => right.totalTokens - left.totalTokens)

  return {
    api: SNAPSHOT_API,
    generatedAt: now,
    source,
    totals: { ...totals, tokens: totalOf(totals), cost: totalCost, turns, steps, toolCalls },
    conversations: rows.filter((row) => row.totalTokens > 0).length,
    sessions: rows.length,
    pricedSessions,
    unpricedSessions,
    budget: {
      usd: budgetUsd,
      period: budgetPeriod,
      spent: spentInPeriod,
      projected: projectedUsd,
      remaining: budgetUsd - spentInPeriod,
      ratio: budgetUsd > 0 ? spentInPeriod / budgetUsd : 0,
      start: budgetStart,
      end: Number.isFinite(budgetStop) ? budgetStop : null,
      elapsedDays,
      periodDays,
    },
    days,
    models: [...modelMap.values()].sort((left, right) => right.cost - left.cost),
    rows,
    cpu,
  }
}
