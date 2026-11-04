/**
 * CPU sampling for the statistics panel: a live utilization history for the
 * chart, plus CPU time attributed to the conversation that was running while
 * each interval elapsed.
 *
 * Every platform probe is injectable so the sampler can be exercised without a
 * Host process.
 *
 * @module dsh-statistics/cpu
 */

import os from 'node:os'

/** Aggregate one `os.cpus()` reading into busy and total tick counts. */
function systemTimes(cpus) {
  let busy = 0
  let total = 0
  for (const cpu of cpus) {
    const times = cpu?.times ?? {}
    const idle = times.idle ?? 0
    const core = (times.user ?? 0) + (times.nice ?? 0) + (times.sys ?? 0) + (times.irq ?? 0) + idle
    busy += core - idle
    total += core
  }
  return { busy, total }
}

function round(value, digits = 1) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

/**
 * Create the sampler. Call `start()` once the plugin owns it and `stop()` on
 * teardown.
 *
 * @param {object} [options]
 * @param {number} [options.intervalMs]
 * @param {number} [options.historySize]
 * @param {number} [options.activityWindowMs]
 * @param {() => number} [options.clock]
 * @param {() => {user: number, system: number}} [options.cpuUsage]
 * @param {() => object[]} [options.cpus]
 * @param {() => number[]} [options.loadavg]
 * @param {() => {rss: number, heapUsed: number}} [options.memory]
 */
export function createCpuSampler(options = {}) {
  const {
    intervalMs = 2000,
    historySize = 120,
    activityWindowMs = 10_000,
    clock = () => Date.now(),
    cpuUsage = () => process.cpuUsage(),
    cpus = () => os.cpus(),
    loadavg = () => os.loadavg(),
    memory = () => process.memoryUsage(),
  } = options

  const startedAt = clock()
  let lastAt = startedAt
  let lastCpu = cpuUsage()
  let lastSystem = systemTimes(cpus())
  /** @type {Array<{t: number, p: number, s: number}>} */
  let samples = []
  /** @type {Map<string, {cpuMs: number, activeMs: number, lastActiveAt: number}>} */
  const sessions = new Map()
  const running = new Set()
  /** @type {Map<string, number>} conversations producing events, valid until this time */
  const recent = new Map()
  let totalCpuMs = 0
  let idleCpuMs = 0
  let peakPct = 0
  let sumPct = 0
  let ticks = 0
  let lastProcessPct = 0
  let lastSystemPct = 0
  let timer = null

  function tick() {
    const now = clock()
    const wallMs = now - lastAt
    if (wallMs <= 0) return
    const current = cpuUsage()
    const deltaMs = Math.max(0, (current.user - lastCpu.user + (current.system - lastCpu.system)) / 1000)
    lastCpu = current
    lastAt = now

    const system = systemTimes(cpus())
    const totalDelta = system.total - lastSystem.total
    const busyDelta = system.busy - lastSystem.busy
    lastSystem = system

    const processPct = (deltaMs / wallMs) * 100
    const systemPct = totalDelta > 0 ? (busyDelta / totalDelta) * 100 : 0
    lastProcessPct = processPct
    lastSystemPct = systemPct

    samples.push({ t: now, p: round(processPct), s: round(systemPct) })
    if (samples.length > historySize) samples = samples.slice(samples.length - historySize)

    totalCpuMs += deltaMs
    ticks += 1
    sumPct += processPct
    if (processPct > peakPct) peakPct = processPct

    const active = new Set(running)
    for (const [id, until] of recent) {
      if (until > now) active.add(id)
      else recent.delete(id)
    }

    if (active.size > 0) {
      const share = deltaMs / active.size
      for (const id of active) {
        let entry = sessions.get(id)
        if (!entry) {
          entry = { cpuMs: 0, activeMs: 0, lastActiveAt: now }
          sessions.set(id, entry)
        }
        entry.cpuMs += share
        entry.activeMs += wallMs
        entry.lastActiveAt = now
      }
    } else {
      idleCpuMs += deltaMs
    }
  }

  return {
    /** Begin sampling; idempotent. */
    start() {
      if (timer) return
      tick()
      timer = setInterval(tick, intervalMs)
      timer.unref?.()
    },
    /**
     * Mark one conversation as active for a short window after a committed
     * event, so attribution starts even when the run began before this plugin.
     */
    touch(sessionId, at = clock()) {
      const id = String(sessionId)
      if (!sessions.has(id)) sessions.set(id, { cpuMs: 0, activeMs: 0, lastActiveAt: at })
      const until = at + activityWindowMs
      if ((recent.get(id) ?? 0) < until) recent.set(id, until)
    },
    /** Mark one conversation as running or idle for attribution. */
    setRunning(sessionId, isRunning) {
      const id = String(sessionId)
      if (isRunning) {
        if (!running.has(id)) {
          running.add(id)
          if (!sessions.has(id)) sessions.set(id, { cpuMs: 0, activeMs: 0, lastActiveAt: clock() })
        }
        return
      }
      running.delete(id)
    },
    /** Sample now instead of waiting for the next interval. */
    tick,
    stop() {
      if (!timer) return
      clearInterval(timer)
      timer = null
    },
    /** Current readings plus the retained history. */
    snapshot() {
      let rss = 0
      let heapUsed = 0
      try {
        const usage = memory()
        rss = usage.rss ?? 0
        heapUsed = usage.heapUsed ?? 0
      } catch {
        /* memory probes are best-effort */
      }
      const load = loadavg()
      const perSession = {}
      for (const [id, entry] of sessions) {
        perSession[id] = {
          cpuMs: round(entry.cpuMs),
          activeMs: round(entry.activeMs),
          util: entry.activeMs > 0 ? round((entry.cpuMs / entry.activeMs) * 100) : 0,
          lastActiveAt: entry.lastActiveAt,
        }
      }
      return {
        startedAt,
        updatedAt: clock(),
        intervalMs,
        processPct: round(lastProcessPct),
        systemPct: round(lastSystemPct),
        averagePct: ticks > 0 ? round(sumPct / ticks) : 0,
        peakPct: round(peakPct),
        load1: round(load[0] ?? 0, 2),
        load5: round(load[1] ?? 0, 2),
        cores: cpus().length,
        rssMb: round(rss / 1024 / 1024, 1),
        heapUsedMb: round(heapUsed / 1024 / 1024, 1),
        samples,
        running: [...running],
        active: [...new Set([...running, ...[...recent].filter(([, until]) => until > clock()).map(([id]) => id)])],
        sessions: perSession,
        idleCpuMs: round(idleCpuMs),
        totalCpuMs: round(totalCpuMs),
      }
    },
  }
}
