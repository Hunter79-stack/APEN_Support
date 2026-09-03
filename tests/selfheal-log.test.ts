import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { parseSelfHealLine, readSelfHealEvents } from '../proxy/selfheal-log.mjs'

test('severity is inferred from the message text', () => {
  // A mislabelled RECOVERED/FAILED changes the panel's colour and, with it,
  // whether anyone investigates. That classification is the part worth pinning.
  const recovered = parseSelfHealLine(
    '[2026-08-10 18:27:22] RECOVERED: nginx realigned to 1.30.4 and restarted',
    'autorepair',
  )
  assert.ok(recovered)   // narrows away the null return before the field asserts
  assert.equal(recovered.severity, 'recovered')
  assert.equal(recovered.source, 'autorepair')
  assert.equal(recovered.at, '2026-08-10 18:27:22')
  assert.equal(recovered.message, 'RECOVERED: nginx realigned to 1.30.4 and restarted')
  assert.ok(Number.isFinite(recovered.atMs))

  assert.equal(parseSelfHealLine('[2026-08-10 18:31:28] ALERT: starting WITHOUT VTS stats', 'guard')?.severity, 'alert')
  assert.equal(parseSelfHealLine('[2026-08-10 18:27:22] FAILED: could not recover automatically.', 'autorepair')?.severity, 'failed')
  assert.equal(parseSelfHealLine('[2026-08-10 18:27:15] === autorepair triggered ===', 'autorepair')?.severity, 'info')
})

test('lines that are not events are dropped, not rendered blank', () => {
  // autorepair tees raw dpkg output into the same file, so unparseable lines
  // are normal input rather than an error case.
  assert.equal(parseSelfHealLine('Unpacking nginx (1.30.4-1~noble) ...', 'autorepair'), null)
  assert.equal(parseSelfHealLine('', 'guard'), null)
  assert.equal(parseSelfHealLine('[2026-08-10 18:27:22]   ', 'guard'), null)
  assert.equal(parseSelfHealLine('[not-a-date] RECOVERED: nope', 'guard'), null)
})

test('events merge newest-first across sources, and a missing log is skipped', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'selfheal-'))
  const a = path.join(dir, 'a.log')
  const b = path.join(dir, 'b.log')
  fs.writeFileSync(a, '[2026-08-10 10:00:00] ALERT: older\n')
  fs.writeFileSync(b, '[2026-08-10 12:00:00] RECOVERED: newer\n')

  const events = await readSelfHealEvents({
    // The third path does not exist: one unreadable source must not lose the
    // others, because a partial view beats an error on a status page.
    NGINX_SELFHEAL_LOGS: `${a}:guard,${b}:autorepair,${dir}/missing.log:ghost`,
  })

  assert.equal(events.length, 2)
  assert.equal(events[0].message, 'RECOVERED: newer')
  assert.equal(events[0].source, 'autorepair')
  assert.equal(events[1].message, 'ALERT: older')
  assert.ok(events[0].atMs > events[1].atMs)

  fs.rmSync(dir, { recursive: true, force: true })
})

test('an unexpected probe status explains itself instead of showing a bare code', async () => {
  const { describeUnexpectedStatus } = await import('../proxy/site-stats-probe.mjs')

  // The case that prompted this: /repos/rpm/ 301s to its guide page on purpose,
  // so the card said "Returned HTTP 301" and nothing about why that mattered.
  const redirect = describeUnexpectedStatus(301, [200], 'https://host/repos/rpm/', '/docs/repos/rpm')
  assert.match(redirect, /returned HTTP 301/)
  assert.match(redirect, /accepts 200/)
  assert.match(redirect, /points at \/docs\/repos\/rpm/)

  // A redirect with no Location must still explain itself, not print "undefined".
  const noLocation = describeUnexpectedStatus(302, [200], 'https://host/x', null)
  assert.match(noLocation, /redirects rather than serving/)
  assert.doesNotMatch(noLocation, /undefined|null/)

  // Each class gets its own cause, and every message names code and expectation.
  for (const [code, rx] of [[500, /check that service's own logs/], [404, /nothing at that path/], [403, /allowlist/], [401, /requires authentication/], [429, /rate-limiting/], [418, /not with a status this node treats as healthy/]] as Array<[number, RegExp]>) {
    const message = describeUnexpectedStatus(code, [200, 204], 'https://host/y', null)
    assert.match(message, rx, `HTTP ${code} lacked its explanation`)
    assert.match(message, new RegExp(`returned HTTP ${code}`))
    assert.match(message, /accepts 200, 204/)
  }
})

/* ── Card tone, resolution, and same-second ordering ──────────────────────
 * A ten-day-old test run left one FAILED line in the autorepair log. The card
 * scanned every event regardless of age or of the RECOVERED that followed
 * eight minutes later, so it rendered red permanently — the alarm fatigue the
 * card exists to prevent. These pin the three fixes.
 */

interface RawEvent { source: string; severity: string; message: string; at: string; atMs: number; seq: number }
interface AnnotatedEvent extends RawEvent { resolved: boolean; stale: boolean }

const T0 = new Date(2026, 7, 10, 18, 27, 15).getTime()
const ev = (severity: string, source: string, offsetSec: number, seq: number, message = severity): RawEvent => ({
  source, severity, message, at: 'x', atMs: T0 + offsetSec * 1000, seq,
})

test('a failure a later RECOVERED superseded stops colouring the card', async () => {
  const mod = await import('../proxy/selfheal-log.mjs') as unknown as {
    annotateSelfHealEvents: (e: RawEvent[], now?: number, fresh?: number) => AnnotatedEvent[]
    summarizeSelfHeal: (e: AnnotatedEvent[]) => { tone: string; unresolvedCount: number }
  }

  // The real shape: autorepair FAILED, then autorepair RECOVERED 8 min later.
  const annotated = mod.annotateSelfHealEvents([
    ev('recovered', 'autorepair', 462, 1),
    ev('failed', 'autorepair', 0, 0),
  ])
  assert.equal(annotated.find((e) => e.severity === 'failed')?.resolved, true)
  assert.equal(mod.summarizeSelfHeal(annotated).tone, 'ok', 'a recovered incident must not keep the card red')
})

test('a failure with no recovery still colours the card, however old', async () => {
  const mod = await import('../proxy/selfheal-log.mjs') as unknown as {
    annotateSelfHealEvents: (e: RawEvent[], now?: number, fresh?: number) => AnnotatedEvent[]
    summarizeSelfHeal: (e: AnnotatedEvent[]) => { tone: string; unresolvedCount: number }
  }

  // Age must NOT downgrade this: a week-old unfixed failure is worse, not better.
  const annotated = mod.annotateSelfHealEvents([ev('failed', 'autorepair', 0, 0)], T0 + 9 * 86_400_000)
  assert.equal(annotated[0].resolved, false)
  assert.equal(annotated[0].stale, true, 'it is still history for display purposes')
  assert.equal(mod.summarizeSelfHeal(annotated).tone, 'failed')

  // A recovery from a DIFFERENT source must not clear it.
  const crossSource = mod.annotateSelfHealEvents([
    ev('recovered', 'guard', 60, 0),
    ev('failed', 'autorepair', 0, 0),
  ])
  assert.equal(crossSource.find((e) => e.severity === 'failed')?.resolved, false)
  assert.equal(mod.summarizeSelfHeal(crossSource).tone, 'failed')
})

test('same-second events order by file position, newest first', async () => {
  const mod = await import('../proxy/selfheal-log.mjs') as unknown as {
    readSelfHealEvents: (env: Record<string, string>) => Promise<AnnotatedEvent[]>
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'selfheal-order-'))
  const log = path.join(dir, 'guard.log')
  // Exactly the guard's real behaviour: a whole incident inside one second.
  fs.writeFileSync(log, [
    '[2026-08-10 18:43:15] disabling VTS to try to bring nginx up without stats',
    '[2026-08-10 18:43:15] ALERT: nginx starting WITHOUT VTS stats.',
    '[2026-08-10 18:43:15] RECOVERED: VTS re-enabled, stats are back',
  ].join('\n') + '\n')

  const events = await mod.readSelfHealEvents({ NGINX_SELFHEAL_LOGS: `${log}:guard` })
  assert.equal(events[0].severity, 'recovered', 'the RECOVERED must sort above the alert it resolved')
  assert.equal(events[events.length - 1].message, 'disabling VTS to try to bring nginx up without stats')
  assert.equal(events.find((e) => e.severity === 'alert')?.resolved, true)
  fs.rmSync(dir, { recursive: true, force: true })
})
