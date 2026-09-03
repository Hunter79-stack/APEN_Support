/**
 * nginx-stats — shared types + formatting helpers for the admin NGINX status
 * surfaces (the Real-Time Traffic summary widget and the "NGINX status" tab).
 *
 * The shapes here mirror exactly what proxy/site-stats.mjs `readNginxStatus()`
 * returns after normalizing nginx-module-vts JSON or open-source stub_status.
 * When no status module is installed the backend
 * returns `{ available: false }` and the UI shows an honest "not detected"
 * state — we never fabricate traffic numbers in /admin/ (the simulated mock
 * lives at /test/). See proxy/NGINX_VTS_RUNBOOK.md.
 */

export type NginxStatusSource = 'vts' | 'stub' | null

export interface NginxResponses {
  c1: number
  c2: number
  c3: number
  c4: number
  c5: number
  total: number
}

export interface NginxConnections {
  active: number
  reading: number
  writing: number
  waiting: number
  accepted: number
  handled: number
  requests: number
  dropped: number
}

export interface NginxServerZone {
  name: string
  requests: number
  responses: NginxResponses
  sentBytes: number
  rcvdBytes: number
  responseMsec: number
}

export type NginxPeerState = 'up' | 'down' | 'draining' | 'unavail' | 'backup' | 'checking' | string

export interface NginxUpstreamServer {
  server: string
  state: NginxPeerState
  requests: number
  responses: NginxResponses
  responseMsec: number
  weight: number
  active: number | null
  checks: number | null
  fails: number
  downtime: number | null
}

export interface NginxUpstreamGroup {
  group: string
  servers: NginxUpstreamServer[]
}

export interface NginxStreamZone {
  name: string
  connections: number | null
  bytesIn: number
  bytesOut: number
  sessions: number
}

export interface NginxStreamUpstreamServer {
  server: string
  state: NginxPeerState
  active: number | null
  bytesIn: number
  bytesOut: number
  responseMsec: number
}

export interface NginxStreamUpstreamGroup {
  group: string
  servers: NginxStreamUpstreamServer[]
}

export interface NginxCache {
  name: string
  state: string
  hitRatio: number | null
  used: number | null
  max: number
  served: number
  written: number
  bypassed: number
}

export interface NginxSharedZone {
  name: string
  used: number | null
  total: number
  usedNode: number
}

export interface NginxResolver {
  name: string
  requests: { name: number; srv: number; addr: number }
  responses: { noerror: number; nxdomain: number; servfail: number }
  timedout: number
}

export interface NginxWorker {
  pid: number
  active: number
  accepted: number
  dropped: number
  requests: number
}

/**
 * One line from a self-heal log. Mirrors readSelfHealEvents() in
 * proxy/site-stats.mjs — keep the two in sync by hand, as with the rest of
 * this file.
 */
export interface SelfHealEvent {
  source: string        // 'guard' (VTS toggle) | 'autorepair' (version realign)
  severity: 'recovered' | 'alert' | 'failed' | 'info'
  message: string
  at: string            // raw 'YYYY-MM-DD HH:MM:SS' in server-local time; render as-is
  atMs: number          // parsed server-side for sorting only — do not reformat client-side
  /** Line order within its source log. These scripts write a whole incident in
   *  one second, so the timestamp alone cannot order it. */
  seq?: number
  /** A later RECOVERED from the same source superseded this one. Only an
   *  UNRESOLVED problem should colour the card — otherwise one old failure
   *  pins it red until the log rotates. */
  resolved?: boolean
  /** Older than the freshness window (24h): history, not news. */
  stale?: boolean
}

export interface NginxStatus {
  available: boolean
  source: NginxStatusSource
  error?: string
  nginxVersion: string
  uptimeSec: number | null
  connections: NginxConnections | null
  serverZones: NginxServerZone[]
  upstreams: NginxUpstreamGroup[]
  streamZones: NginxStreamZone[]
  streamUpstreams: NginxStreamUpstreamGroup[]
  caches: NginxCache[]
  sharedZones: NginxSharedZone[]
  resolvers: NginxResolver[]
  workers: NginxWorker[]
  /** Optional: a proxy older than this build omits it entirely. */
  selfHeal?: SelfHealEvent[]
  ts?: number
}

/* ── formatting helpers ─────────────────────────────────────────── */

export function nf(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return Math.round(n).toLocaleString('en-US')
}

/** Compact count: 1.2k / 3.4M. */
export function nfk(n: number): string {
  if (!Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}k`
  return String(Math.round(n))
}

export function fmtBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let i = 0
  let v = n
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`
}

export function fmtRate(bytesPerSec: number | null): string {
  if (bytesPerSec == null || !Number.isFinite(bytesPerSec)) return '—'
  return `${fmtBytes(bytesPerSec)}/s`
}

export function fmtDuration(sec: number | null): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return '—'
  let s = Math.floor(sec)
  const d = Math.floor(s / 86400)
  s -= d * 86400
  const h = Math.floor(s / 3600)
  s -= h * 3600
  const m = Math.floor(s / 60)
  s -= m * 60
  const pad = (x: number) => String(x).padStart(2, '0')
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`
}

export function fmtMsec(ms: number): string {
  return Number.isFinite(ms) && ms > 0 ? `${Math.round(ms)} ms` : '—'
}

export function fmtPercent(fraction: number | null, digits = 1): string {
  if (fraction == null || !Number.isFinite(fraction)) return '—'
  return `${(fraction * 100).toFixed(digits)}%`
}

/* ── Deployment zone annotations ────────────────────────────────
 * Friendly two-line labels for the HTTP server-zone table, keyed by the VTS
 * per-path filter-bucket key (`vhost_traffic_status_filter_by_set_key <key>
 * apen`) — so the table reads like the /test/ mock (name + sub-description)
 * instead of a bare zone id. Unmatched zones fall back to their raw name with
 * no sub-line.
 *
 * IMPORTANT: keep these keys in lock-step with the `filter_by_set_key` keys in
 * nginx/server.conf (group `apen`) — see proxy/NGINX_VTS_RUNBOOK.md. Until that
 * filter group is configured, the backend serves host-based zones, so only
 * `apensupport.blcse.mil` matches today; once the `apen` filter group exists,
 * `main`/`speedtest`/`api`/`winget`/`mirrors` light up. */
export interface ZoneAnnotation {
  label: string
  sub: string
}

export const HTTP_ZONE_ANNOTATIONS: Record<string, ZoneAnnotation> = {
  main:                     { label: 'apensupport.blcse.mil', sub: 'main site (static export)' },
  'apensupport.blcse.mil': { label: 'apensupport.blcse.mil', sub: 'main site (static export)' },
  speedtest:                { label: '/speedtest/',            sub: '→ 127.0.0.1:8085 uvicorn' },
  api:                      { label: '/api/ (voltron+stats)',  sub: '→ 8787 / 8788' },
  winget:                   { label: '/winget/',               sub: '→ apenwingetrepo (SNI)' },
  mirrors:                  { label: 'mirror panels',          sub: '/cran /pip /iso → 8080-8082' },
}

/** Friendly {label, sub} for an HTTP server-zone name, or the raw name (no sub).
 *  `extra` layers admin-managed labels (keyed by zone key) on top of the
 *  built-in map so managed zones show their configured name + description. */
export function zoneAnnotation(name: string, extra?: Record<string, ZoneAnnotation>): ZoneAnnotation {
  return (extra && extra[name]) ?? HTTP_ZONE_ANNOTATIONS[name] ?? { label: name, sub: '' }
}

/* ── Admin-managed zones/upstreams (added from /admin#nginx) ─────── */

/** One managed entry — a NEW proxied path that becomes a VTS zone + upstream.
 *  Mirrors proxy/nginx-managed.mjs. */
export interface NginxManagedEntry {
  key: string
  path: string
  label: string
  sub: string
  backends: string[]
}

/** Status of a managed-config Publish & Reload (mirrors the backend). */
export interface NginxReloadStatus {
  state: 'idle' | 'running' | 'success' | 'error' | 'pending'
  startedAt?: string
  finishedAt?: string
  by?: string
  message?: string
}

export function sourceLabel(source: NginxStatusSource): string {
  switch (source) {
    case 'vts':
      return 'VTS module'
    case 'stub':
      return 'stub_status'
    default:
      return 'offline'
  }
}

/** Count peers across all upstream groups, plus how many are up. */
export function countUpstreams(groups: NginxUpstreamGroup[]): { total: number; up: number; down: number } {
  let total = 0
  let up = 0
  let down = 0
  for (const g of groups) {
    for (const s of g.servers) {
      total++
      if (s.state === 'down' || s.state === 'unavail') down++
      else up++
    }
  }
  return { total, up, down }
}

/** Sum response classes across all server zones, plus the overall 5xx fraction. */
export function aggregateResponses(zones: NginxServerZone[]): NginxResponses & { fivexxPct: number | null } {
  const acc = { c1: 0, c2: 0, c3: 0, c4: 0, c5: 0, total: 0 }
  for (const z of zones) {
    acc.c1 += z.responses.c1
    acc.c2 += z.responses.c2
    acc.c3 += z.responses.c3
    acc.c4 += z.responses.c4
    acc.c5 += z.responses.c5
    acc.total += z.responses.total
  }
  return { ...acc, fivexxPct: acc.total ? acc.c5 / acc.total : null }
}
