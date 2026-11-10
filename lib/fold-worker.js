/**
 * Worker entry: read one session log, fold it, hand back the compact result.
 *
 * The main thread only passes a path, so decompression, JSON parsing, and the
 * fold all happen off the event loop — the parts that actually block a large
 * session's scan.
 *
 * @module dsh-statistics/fold-worker
 */

import { readFile } from 'node:fs/promises'
import { parentPort } from 'node:worker_threads'
import { promisify } from 'node:util'
import { zstdDecompress } from 'node:zlib'
import { applyFoldEvent, createFoldState, finishFold } from './fold.js'

const inflate = promisify(zstdDecompress)

const FRAME_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])

/**
 * A session log is a concatenation of zstd frames, one per flush. Some zlib
 * builds only decode the first frame, which silently yields just the session
 * header, so split on the frame magic and decode each frame on its own.
 *
 * @param {Buffer} buffer
 */
async function inflateLog(buffer) {
  const starts = []
  let at = buffer.indexOf(FRAME_MAGIC, 0)
  while (at !== -1) {
    starts.push(at)
    at = buffer.indexOf(FRAME_MAGIC, at + FRAME_MAGIC.length)
  }
  if (starts.length <= 1) return (await inflate(buffer)).toString('utf8')
  const parts = []
  for (let index = 0; index < starts.length; index += 1) {
    const from = starts[index]
    const to = index + 1 < starts.length ? starts[index + 1] : buffer.length
    parts.push((await inflate(buffer.subarray(from, to))).toString('utf8'))
  }
  return parts.join('')
}

/**
 * Fold one log file. The first line is the session header; every other line is
 * a committed event.
 *
 * @param {string} path
 * @param {string} expectedId
 */
async function foldFile(path, expectedId) {
  const text = await inflateLog(await readFile(path))
  let header = null
  let state = null
  let seen = 0
  let skipped = 0
  const lines = text.split('\n')
  for (const line of lines) {
    if (line.length === 0) continue
    let record
    try {
      record = JSON.parse(line)
    } catch {
      skipped += 1
      continue
    }
    if (header === null) {
      header = record && record.type === 'session' ? record : { id: expectedId }
      if (record && record.type === 'session' && String(record.id) !== expectedId) {
        throw new Error(`log belongs to ${record.id}, expected ${expectedId}`)
      }
      state = createFoldState(header)
      if (record && record.type === 'session') continue
    }
    applyFoldEvent(state, record)
    seen += 1
  }
  if (state === null) throw new Error(`log holds no records: ${path}`)
  return { header, fold: finishFold(state), events: seen, skipped, lines: lines.length, bytes: text.length }
}

parentPort?.on('message', async (message) => {
  const id = message?.id
  if (typeof id !== 'number') return
  try {
    const value = await foldFile(String(message.path), String(message.sessionId))
    parentPort.postMessage({ id, ok: true, value })
  } catch (error) {
    parentPort.postMessage({ id, ok: false, error: error instanceof Error ? error.message : String(error) })
  }
})
