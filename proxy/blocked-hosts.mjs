// Parses nginx/blocked-hosts.inc — the single source of truth for workstations
// barred from every change path — so the proxy refuses admin routes from those
// addresses even if the nginx allowlist is ever edited to readmit them.
import { readFileSync, statSync } from 'node:fs'

const LINE_RE = /^\s*deny\s+([0-9a-fA-F:.]+)\s*;(?:\s*#\s*(\S+)(?:\s*\(([^)]+)\))?)?/

/** @returns {Map<string, {workstation: string, user: string}>} keyed by IP */
export function parseBlockedHosts(text) {
  const map = new Map()
  for (const line of String(text || '').split('\n')) {
    const m = LINE_RE.exec(line)
    if (m) map.set(m[1], { workstation: m[2] || '', user: m[3] || '' })
  }
  return map
}

let cached = new Map()
let cachedMtime = -1
/** mtime-cached read; an unreadable file keeps the last good list (fail-safe). */
export function loadBlockedHosts(file) {
  try {
    const st = statSync(file)
    if (st.mtimeMs !== cachedMtime) {
      cached = parseBlockedHosts(readFileSync(file, 'utf8'))
      cachedMtime = st.mtimeMs
    }
  } catch { /* keep last good list */ }
  return cached
}

/** nginx sets x-real-ip from $remote_addr; the proxy itself binds loopback. */
export function normalizeClientIp(req) {
  return String(req?.headers?.['x-real-ip'] || req?.socket?.remoteAddress || '')
    .trim().replace(/^::ffff:/, '')
}
