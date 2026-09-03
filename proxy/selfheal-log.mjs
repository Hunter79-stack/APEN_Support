// ──────────────────────────────────────────────────────────────
//  selfheal-log.mjs — nginx self-heal history for the Admin NGINX tab
// ──────────────────────────────────────────────────────────────
//
// nginx can now recover from a broken VTS module on its own: nginx-vts-guard.sh
// disables stats so nginx still starts, and nginx-autorepair.sh realigns the
// package version. That is the right behaviour — but it means an outage can
// happen, resolve, and leave no trace anyone sees. A recovery nobody notices
// the third time it fires is a failing component nobody is fixing.
//
// These two logs are the only record, so this turns them into structured
// events for /api/admin/nginx-stats.
//
// Split out of site-stats.mjs (which binds a port on import) so the parser can
// be unit-tested without side effects — same reasoning as repo-freshness.mjs.
//
// Config (optional):
//   NGINX_SELFHEAL_LOGS  "path:label,path:label"

import { createReadStream, statSync } from 'node:fs'
import { createInterface } from 'node:readline'

// Both files are 0644 root-owned, so the pm2 user reads them directly:
// no sudo, no group grant, no copy job.
const DEFAULT_LOGS = '/var/log/nginx-vts-guard.log:guard,/var/log/nginx-autorepair.log:autorepair'

// ponytail: tail-only read; the files are ~2 KB today and the admin tab polls
// every 5s, so re-reading a whole log each poll would be fine right up until
// it wasn't. Raise if the logs ever grow.
const TAIL_BYTES = 64 * 1024
const MAX_EVENTS = 40

/** Older than this and an event is history, not news. */
export const SELFHEAL_FRESH_MS = 24 * 60 * 60 * 1000

const LINE_RE = /^\[(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\]\s*(.*)$/

/**
 * Parse one log line into an event, or null if it is not one.
 *
 * Severity comes from the message text rather than a separate field: the
 * producers are plain shell scripts, and a structured format there would be
 * one more thing to keep in sync with this parser.
 */
export function parseSelfHealLine(line, source) {
  const m = LINE_RE.exec(line)
  if (!m) return null
  const [, y, mo, d, hh, mm, ss, msg] = m
  const text = msg.trim()
  if (!text) return null
  const severity = /\bRECOVERED\b/.test(text) ? 'recovered'
    : /\bFAILED\b/.test(text) ? 'failed'
      : /\bALERT\b/.test(text) ? 'alert'
        : 'info'
  return {
    source,
    severity,
    message: text,
    at: `${y}-${mo}-${d} ${hh}:${mm}:${ss}`,                  // raw; rendered verbatim, no TZ shift
    atMs: new Date(+y, +mo - 1, +d, +hh, +mm, +ss).getTime(), // server-local, for sorting only
  }
}

/**
 * Mark each event with whether a later RECOVERED superseded it, and whether it
 * is old enough to be history.
 *
 * These scripts log a whole incident in one second, so `resolved` cannot be
 * decided on the timestamp alone — it needs the line order within the file,
 * which is what `seq` carries. Without this a FAILED line from a resolved
 * incident stays indistinguishable from one nobody ever fixed, which is how a
 * ten-day-old test run kept the Self-Heal card pinned red.
 */
export function annotateSelfHealEvents(events, nowMs = Date.now(), freshMs = SELFHEAL_FRESH_MS) {
  // Last recovery per source, by (atMs, seq) — anything at or before it is done.
  const lastRecovery = new Map()
  for (const e of events) {
    if (e.severity !== 'recovered') continue
    const prev = lastRecovery.get(e.source)
    if (!prev || e.atMs > prev.atMs || (e.atMs === prev.atMs && e.seq > prev.seq)) {
      lastRecovery.set(e.source, { atMs: e.atMs, seq: e.seq })
    }
  }

  return events.map((e) => {
    const rec = lastRecovery.get(e.source)
    const superseded = Boolean(rec) && (rec.atMs > e.atMs || (rec.atMs === e.atMs && rec.seq > e.seq))
    return {
      ...e,
      // 'info' and 'recovered' lines are not problems, so they are never
      // "unresolved" — only a failure or an alert can be.
      resolved: e.severity === 'failed' || e.severity === 'alert' ? superseded : true,
      stale: nowMs - e.atMs > freshMs,
    }
  })
}

/**
 * Card-level verdict. Only UNRESOLVED problems set the tone: a failure the
 * scripts already recovered from is history, and colouring the card red for it
 * forever is the alarm fatigue this card exists to prevent.
 *
 * Age deliberately does NOT downgrade the tone. An unresolved failure that is
 * a week old is not less broken for being ignored a week — it is more. Staleness
 * is surfaced in the UI as relative age instead.
 */
export function summarizeSelfHeal(events) {
  const unresolved = events.filter((e) => !e.resolved)
  const tone = unresolved.some((e) => e.severity === 'failed') ? 'failed'
    : unresolved.some((e) => e.severity === 'alert') ? 'alert'
      : 'ok'
  const lastActivityMs = events.reduce((max, e) => Math.max(max, e.atMs), 0) || null
  return { tone, unresolvedCount: unresolved.length, lastActivityMs }
}

/**
 * Newest-first events across every configured log, capped. Never throws.
 *
 * @param {Record<string, string | undefined>} [env] overrides for the log list;
 *   defaults to process.env. Typed loosely on purpose so callers (tests) can
 *   pass just the one key instead of a whole ProcessEnv.
 */
export async function readSelfHealEvents(env = process.env) {
  const spec = (env.NGINX_SELFHEAL_LOGS || DEFAULT_LOGS).trim()
  const out = []

  for (const part of spec.split(',').map((s) => s.trim()).filter(Boolean)) {
    const i = part.lastIndexOf(':')
    if (i < 1) continue
    const file = part.slice(0, i).trim()
    const source = part.slice(i + 1).trim()
    try {
      const { size } = statSync(file)
      const stream = createReadStream(file, { start: Math.max(0, size - TAIL_BYTES) })
      const rl = createInterface({ input: stream, crlfDelay: Infinity })
      let seq = 0
      for await (const line of rl) {
        const e = parseSelfHealLine(line, source)
        // File order within a source. These scripts write a whole incident in
        // the same second, so the timestamp alone cannot say which line came
        // first — without this the RECOVERED sorted BELOW the alerts it
        // resolved, reading as though it happened before them.
        if (e) out.push({ ...e, seq: seq++ })
      }
    } catch {
      // Missing, unreadable, or rotated mid-read: skip this source so the other
      // still renders. A partial view beats an error on a status page.
    }
  }

  const sorted = out
    .sort((a, b) => (b.atMs - a.atMs) || (b.seq - a.seq))
    .slice(0, MAX_EVENTS)
  return annotateSelfHealEvents(sorted)
}
