/**
 * App-wide memory for the statistics panel: this process's RSS leaves out the
 * renderer, the GPU helper and the Electron main process, which together dwarf
 * the utility process the panel itself runs in.
 *
 * @module dsh-statistics/memory
 */

import { execFile } from 'node:child_process'

/**
 * Sum the tree rooted at the ancestor whose parent is launchd: the app bundle's
 * main process plus every descendant.
 *
 * @param {string} stdout `ps -axo pid=,ppid=,rss=` output, RSS in kilobytes
 * @param {number} selfPid process to climb up from
 * @returns {number | null} total bytes, or null when the tree cannot be read
 */
export function sumAppTree(stdout, selfPid) {
  const parents = new Map()
  const rss = new Map()
  for (const line of stdout.split('\n')) {
    const [pid, ppid, kb] = line.trim().split(/\s+/).map(Number)
    if (!Number.isFinite(pid) || !Number.isFinite(ppid) || !Number.isFinite(kb)) continue
    parents.set(pid, ppid)
    rss.set(pid, kb)
  }
  let root = selfPid
  for (let guard = 0; guard < 32; guard += 1) {
    const parent = parents.get(root)
    if (parent === undefined || parent <= 1) break
    root = parent
  }
  if (root === selfPid) return null
  const children = new Map()
  for (const [pid, parent] of parents) {
    if (!children.has(parent)) children.set(parent, [])
    children.get(parent).push(pid)
  }
  let totalKb = 0
  const queue = [root]
  while (queue.length > 0) {
    const pid = queue.pop()
    totalKb += rss.get(pid) ?? 0
    queue.push(...(children.get(pid) ?? []))
  }
  return totalKb > 0 ? totalKb * 1024 : null
}

/**
 * Poll the app's tree on demand, at most once per `ttlMs`. Only attempted from
 * inside a macOS app bundle: a terminal-hosted run would otherwise walk up to
 * the terminal and report that whole session instead.
 */
export function createAppMemoryProbe({ ttlMs = 5000 } = {}) {
  const inBundle = process.execPath.includes('.app/Contents/')
  let cachedBytes = null
  let cachedAt = 0
  let inFlight = false

  const refresh = () => {
    if (!inBundle || inFlight) return
    inFlight = true
    execFile('ps', ['-axo', 'pid=,ppid=,rss='], { maxBuffer: 4 * 1024 * 1024 }, (error, stdout) => {
      inFlight = false
      if (error || typeof stdout !== 'string') return
      const bytes = sumAppTree(stdout, process.pid)
      if (bytes === null) return
      cachedBytes = bytes
      cachedAt = Date.now()
    })
  }

  return () => {
    if (!inBundle) return null
    if (Date.now() - cachedAt > ttlMs) refresh()
    return cachedBytes
  }
}
