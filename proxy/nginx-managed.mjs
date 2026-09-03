// ──────────────────────────────────────────────────────────────
//  nginx-managed.mjs — admin-managed NGINX zones + upstreams
// ──────────────────────────────────────────────────────────────
//
// Lets sysadmins add proxied services from /admin#nginx. Each "entry" is a NEW
// path that becomes BOTH an HTTP server-zone (a VTS filter bucket) and an HTTP
// upstream (a named backend pool) on the live dashboard. The registry is a JSON
// file; on Publish it is rendered into two nginx include fragments that
// server.conf pulls in via wildcard `include` (so the core config is untouched
// and the fragments survive $SITEUPDATE):
//
//   managed-http.conf   — the `upstream {}` blocks (http context)
//   managed-loc.conf    — the `location {}` blocks (inside the 443 server{})
//
// SECURITY: `key`, `path`, and `backends` are interpolated verbatim into nginx
// config, so they are validated against strict allowlists — anything with
// whitespace, `{ } ; #` or other config metacharacters is rejected. `label`/
// `sub` are display-only (returned to the frontend as JSON, never written to
// nginx), so they only get a length cap.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'

/** Zone keys owned by the hand-written server.conf — managed entries may not reuse them. */
export const RESERVED_KEYS = new Set(['main', 'speedtest', 'api', 'winget', 'mirrors', 'apen'])

/** Path prefixes already served by the core server.conf. A managed location that
 *  duplicated one of these would collide (nginx errors on an exact-duplicate
 *  `location`); reject them up front so a bad path can never reach nginx -t. */
export const RESERVED_PATH_PREFIXES = [
  '/api/', '/speedtest/', '/speedtest', '/netdiag/', '/netdiag', '/network-analysis/', '/network-analysis',
  '/winget/', '/cran/', '/cran-control/', '/cran-control', '/pip-control/', '/pip-control',
  '/iso-control/', '/iso-control', '/repos/', '/logos/', '/_next/', '/public/', '/pki/',
  '/admin', '/test', '/403/', '/404/', '/status/',
]

const KEY_RE = /^[a-z][a-z0-9_]{1,31}$/     // nginx-safe identifier
// Location PREFIX only — deliberately excludes nginx metacharacters (space,
// `{ } ; # $ '"`, regex ops) so `location <path> {` can never be broken out of.
const PATH_RE = /^\/[A-Za-z0-9._~/-]*$/
const BACKEND_RE = /^[A-Za-z0-9.-]+:\d{1,5}$/       // host:port (also accepts IPs)
const LABEL_MAX = 80

/** Validate one entry. Returns { ok:true, entry } (normalized) or { ok:false, error }. */
export function validateEntry(raw, { existingKeys = new Set() } = {}) {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'entry must be an object' }
  const key = String(raw.key || '').trim()
  const path = String(raw.path || '').trim()
  const label = String(raw.label ?? '').trim().slice(0, LABEL_MAX)
  const sub = String(raw.sub ?? '').trim().slice(0, LABEL_MAX)
  const backends = Array.isArray(raw.backends) ? raw.backends.map((b) => String(b).trim()).filter(Boolean) : []

  if (!KEY_RE.test(key)) return { ok: false, error: `key "${key}" must be lowercase letters/numbers/underscore, 2-32 chars, starting with a letter` }
  if (RESERVED_KEYS.has(key)) return { ok: false, error: `key "${key}" is reserved by the base config` }
  if (existingKeys.has(key)) return { ok: false, error: `duplicate key "${key}"` }
  if (!PATH_RE.test(path)) return { ok: false, error: `path "${path}" must start with "/" and contain only URL-safe characters` }
  if (path === '/') return { ok: false, error: 'path "/" is the site root and cannot be managed' }
  for (const p of RESERVED_PATH_PREFIXES) {
    if (path === p || path === `${p}/` || (path + '/').startsWith(p.endsWith('/') ? p : `${p}/`)) {
      return { ok: false, error: `path "${path}" overlaps a core location (${p}) — pick a different, unused path` }
    }
  }
  if (backends.length === 0) return { ok: false, error: `entry "${key}" needs at least one backend (host:port)` }
  for (const b of backends) {
    if (!BACKEND_RE.test(b)) return { ok: false, error: `backend "${b}" must be host:port (e.g. 127.0.0.1:9000)` }
    const port = Number(b.split(':')[1])
    if (!(port >= 1 && port <= 65535)) return { ok: false, error: `backend "${b}" has an invalid port` }
  }
  return { ok: true, entry: { key, path, label, sub, backends } }
}

/** Validate a whole entries array; returns { ok, entries } or { ok:false, error }. */
export function validateEntries(rawEntries) {
  if (!Array.isArray(rawEntries)) return { ok: false, error: 'entries must be an array' }
  const seen = new Set()
  const out = []
  for (const raw of rawEntries) {
    const r = validateEntry(raw, { existingKeys: seen })
    if (!r.ok) return r
    seen.add(r.entry.key)
    out.push(r.entry)
  }
  return { ok: true, entries: out }
}

// Derived from the same env var site-stats.mjs uses for the managed-conf dir,
// so a per-enclave path is set in exactly one place instead of two literals
// that silently disagreed (this file said apen_support, that one apen_support2).
const MANAGED_CONF_DIR = (process.env.NGINX_MANAGED_CONF_DIR || '/etc/nginx/conf.d/apen_support').trim()
const PROXY_HEADERS_INC = `${MANAGED_CONF_DIR}/proxy-headers.inc`

/**
 * Render validated entries into the two nginx fragments. Pure — no I/O.
 * Returns { http, loc } config strings (empty-but-valid when no entries).
 */
export function generateManaged(entries) {
  const stamp = '# AUTO-GENERATED by proxy/nginx-managed.mjs — DO NOT EDIT BY HAND.\n' +
                '# Managed from /admin#nginx (Zones & Upstreams). Regenerated on every Publish.\n'
  if (!entries.length) {
    return {
      http: stamp + '# (no managed upstreams)\n',
      loc: stamp + '# (no managed locations)\n',
    }
  }
  const http = [stamp]
  const loc = [stamp]
  for (const e of entries) {
    const up = `mgd_${e.key}`
    http.push(`upstream ${up} {`)
    for (const b of e.backends) http.push(`    server ${b};`)
    http.push('}')
    http.push('')

    loc.push(`# ${e.key}${e.label ? ` — ${e.label}` : ''}`)
    loc.push(`location ${e.path} {`)
    loc.push(`    vhost_traffic_status_filter_by_set_key ${e.key} apen;`)
    loc.push(`    proxy_pass http://${up};`)
    loc.push(`    include ${PROXY_HEADERS_INC};`)
    loc.push('}')
    loc.push('')
  }
  return { http: http.join('\n') + '\n', loc: loc.join('\n') + '\n' }
}

/* ── Registry persistence ─────────────────────────────────────── */

export function readRegistry(file) {
  try {
    if (!existsSync(file)) return { entries: [] }
    const j = JSON.parse(readFileSync(file, 'utf8'))
    return { entries: Array.isArray(j.entries) ? j.entries : [], updatedAt: j.updatedAt, updatedBy: j.updatedBy }
  } catch {
    return { entries: [] }
  }
}

export function writeRegistry(file, entries, updatedBy) {
  const payload = { entries, updatedAt: new Date().toISOString(), updatedBy: updatedBy || 'admin' }
  writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8')
  return payload
}

/** Write both nginx fragments (idempotent). Returns the paths written. */
export function writeManagedFragments(destDir, entries) {
  const { http, loc } = generateManaged(entries)
  const httpPath = `${destDir}/managed-http.conf`
  const locPath = `${destDir}/managed-loc.conf`
  writeFileSync(httpPath, http, 'utf8')
  writeFileSync(locPath, loc, 'utf8')
  return { httpPath, locPath }
}
