/**
 * Request-body readers shared by the proxy processes (site-stats, voltron-proxy,
 * cert-request). One implementation so the size cap, the error shape and the
 * UTF-8 handling cannot drift between files.
 *
 * Chunks are kept as Buffers and decoded once at the end: decoding chunk by
 * chunk splits a multi-byte character that straddles a chunk boundary.
 *
 * Rejections carry `status` (413 too large, 400 invalid JSON) so a route can
 * answer with the right code; stream errors are passed through unchanged.
 */

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {number} maxBytes never retain more than this many bytes
 * @returns {Promise<string>} the body as UTF-8 text
 */
export function readBody(req, maxBytes) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = []
    let total = 0
    let settled = false
    req.on('data', (chunk) => {
      if (settled) return
      total += chunk.length
      if (total > maxBytes) {
        settled = true
        rejectBody(Object.assign(new Error('body_too_large'), { status: 413 }))
        try { req.destroy() } catch { /* ignore */ }
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (settled) return
      settled = true
      resolveBody(Buffer.concat(chunks).toString('utf8'))
    })
    req.on('error', (err) => {
      if (settled) return
      settled = true
      rejectBody(err)
    })
  })
}

/** readBody + JSON.parse. An empty body parses as {}. */
export async function readJsonBody(req, maxBytes) {
  const text = await readBody(req, maxBytes)
  try { return JSON.parse(text || '{}') } catch {
    throw Object.assign(new Error('invalid_json'), { status: 400 })
  }
}
