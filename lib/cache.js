/**
 * Disk cache for the per-session usage folds.
 *
 * A fold is expensive to rebuild: it replays a whole session log. Persisting the
 * result keyed by the session's storage revision means a restart only replays
 * sessions whose log actually changed, so the panel opens on data instead of on
 * a full rescan.
 *
 * @module dsh-statistics/cache
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

/** Bumped whenever the folded shape changes; older files are ignored. */
export const CACHE_VERSION = 1

/** The harness home directory that holds sessions and storages. */
export function dshHome() {
  return process.env.DSH_HOME && process.env.DSH_HOME.length > 0 ? process.env.DSH_HOME : join(homedir(), '.dsh')
}

/** `<DSH_HOME>/storages/dsh-statistics-cache.json`. */
export function cachePath() {
  return join(dshHome(), 'storages', 'dsh-statistics-cache.json')
}

/** `<DSH_HOME>/sessions`. */
export function sessionsRoot() {
  return join(dshHome(), 'sessions')
}

/** Whether a stored fold still has the shape this build folds. */
function usable(entry) {
  if (!entry || typeof entry !== 'object') return false
  const { fold } = entry
  if (!fold || typeof fold !== 'object') return false
  if (!fold.tokens || typeof fold.tokens !== 'object') return false
  if (!Array.isArray(fold.days) || !Array.isArray(fold.models)) return false
  return typeof entry.revision === 'string' || entry.revision === null
}

/**
 * Read the cache file. Anything unreadable, stale, or malformed yields an empty
 * map: the cache is an optimisation, never a source of truth.
 *
 * @param {string} file
 * @returns {Promise<Map<string, {revision: string | null, header: object, fold: object}>>}
 */
export async function readCache(file) {
  let parsed
  try {
    parsed = JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return new Map()
  }
  if (!parsed || parsed.version !== CACHE_VERSION || typeof parsed.sessions !== 'object' || parsed.sessions === null) {
    return new Map()
  }
  const out = new Map()
  for (const [id, entry] of Object.entries(parsed.sessions)) {
    if (!usable(entry)) continue
    out.set(id, {
      revision: entry.revision,
      header: entry.header && typeof entry.header === 'object' ? entry.header : { id },
      fold: entry.fold,
    })
  }
  return out
}

/**
 * Debounced, atomic writer. Writes go to a sibling temp file and are renamed
 * into place so a crash mid-write cannot corrupt the cache.
 *
 * @param {string} file
 * @param {number} [debounceMs]
 */
export function createCacheWriter(file, debounceMs = 2000) {
  let timer = null
  let pending = null

  async function flush() {
    if (pending === null) return
    const body = pending
    pending = null
    try {
      await mkdir(dirname(file), { recursive: true })
      const temp = `${file}.tmp`
      await writeFile(temp, JSON.stringify(body), 'utf8')
      await rename(temp, file)
    } catch {
      /* the cache is best effort: a failed write only costs a rescan */
    }
  }

  return {
    /** Queue a snapshot of the current folds. */
    schedule(payload) {
      pending = { version: CACHE_VERSION, ...payload }
      if (timer !== null) return
      timer = setTimeout(() => {
        timer = null
        void flush()
      }, debounceMs)
      timer.unref?.()
    },
    /** Write any queued snapshot now, for teardown. */
    async flushNow() {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      await flush()
    },
    stop() {
      if (timer !== null) clearTimeout(timer)
      timer = null
      pending = null
    },
  }
}
