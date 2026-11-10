/**
 * One worker thread that folds session logs on demand.
 *
 * The pool is lazy: the worker starts on the first request and is terminated on
 * teardown or after a failure. Every request carries a timeout, and a failure
 * rejects that request only — the caller falls back to reading through the
 * session services on the main thread.
 *
 * @module dsh-statistics/fold-pool
 */

import { fileURLToPath } from 'node:url'
import { Worker } from 'node:worker_threads'

const REQUEST_TIMEOUT_MS = 20_000

/**
 * Electron's worker threads do not take an ESM entry URL directly, so the worker
 * boots from this CommonJS shim and imports the real module itself.
 */
const BOOTSTRAP = `
const { pathToFileURL } = require('node:url')
const { workerData } = require('node:worker_threads')
import(pathToFileURL(workerData.entry).href).catch((error) => {
  console.error('dsh-statistics: fold worker failed to load', error)
})
`

/**
 * @param {{timeoutMs?: number, createWorker?: () => Worker}} [options]
 */
export function createFoldPool(options = {}) {
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS
  const create = options.createWorker ?? (() => new Worker(BOOTSTRAP, {
    eval: true,
    workerData: { entry: fileURLToPath(new URL('./fold-worker.js', import.meta.url)) },
  }))
  /** @type {Worker | null} */
  let worker = null
  let nextId = 1
  /** @type {Map<number, {resolve: (value: unknown) => void, reject: (error: Error) => void, timer: NodeJS.Timeout}>} */
  const pending = new Map()
  let disposed = false

  function failAll(error) {
    for (const [, entry] of pending) {
      clearTimeout(entry.timer)
      entry.reject(error instanceof Error ? error : new Error(String(error)))
    }
    pending.clear()
  }

  function ensure() {
    if (worker !== null) return worker
    const started = create()
    started.on('message', (message) => {
      const entry = pending.get(message?.id)
      if (!entry) return
      pending.delete(message.id)
      clearTimeout(entry.timer)
      if (message.ok) entry.resolve(message.value)
      else entry.reject(new Error(message.error ?? 'fold failed'))
    })
    started.on('error', (error) => {
      worker = null
      failAll(error)
    })
    started.on('exit', () => {
      worker = null
      failAll(new Error('fold worker exited'))
    })
    started.unref?.()
    worker = started
    return started
  }

  return {
    /**
     * Fold one log file off the main thread.
     *
     * @param {string} path
     * @param {string} sessionId
     * @returns {Promise<{header: object, fold: object, events: number, skipped: number}>}
     */
    fold(path, sessionId) {
      if (disposed) return Promise.reject(new Error('fold pool disposed'))
      const id = nextId
      nextId += 1
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id)
          reject(new Error('fold worker timed out'))
        }, timeoutMs)
        timer.unref?.()
        pending.set(id, { resolve, reject, timer })
        try {
          ensure().postMessage({ id, path, sessionId })
        } catch (error) {
          clearTimeout(timer)
          pending.delete(id)
          reject(error instanceof Error ? error : new Error(String(error)))
        }
      })
    },
    /** Stop the worker and reject anything still in flight. */
    async dispose() {
      disposed = true
      failAll(new Error('fold pool disposed'))
      const current = worker
      worker = null
      if (current) await current.terminate().catch(() => {})
    },
  }
}
