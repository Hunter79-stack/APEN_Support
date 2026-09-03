/**
 * Admin IA Phase 0 — the counter-agreement regression.
 *
 * Three consumers filtered the same alert feed with three separately-written
 * rules (Navbar cog, the Active Alerts tile, the AlertsPanel filter). Every
 * acknowledged id happened to also be dismissed, so they agreed by accident and
 * nothing caught the divergence. The case below that would have failed before
 * the fix is "acknowledged but NOT dismissed" — the one real production data
 * never happened to contain.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  visibleAlerts,
  alertsNeedingAttention,
  summarizeAlerts,
  assertAlertInvariant,
} from '../lib/data/admin-health'
import type { AdminAlertItem } from '../lib/data/admin'

function alert(id: string, type: AdminAlertItem['type'] = 'info', category: AdminAlertItem['category'] = 'alert'): AdminAlertItem {
  return { id, type, category, title: `t-${id}`, message: `m-${id}`, timestamp: '2026-08-25T00:00:00.000Z', source: 'test' }
}

function ids(alerts: readonly AdminAlertItem[]) {
  return alerts.map((a) => a.id)
}

const FEED = [alert('a1', 'critical'), alert('a2', 'warning'), alert('a3'), alert('f1', 'info', 'feedback')]

test('an acknowledged-but-not-dismissed alert stays in the panel and leaves the badge', () => {
  // THE regression. Before Phase 0 the cog hid a2 while the Active Alerts tile
  // still counted it, so the tile and the badge disagreed about one feed.
  const seen = { acknowledged: ['a2'], dismissed: [] as string[] }

  assert.deepEqual(
    ids(visibleAlerts(FEED, seen)),
    ['a1', 'a2', 'a3', 'f1'],
    'acknowledging is "I have seen this", not "this is gone" — the row must remain findable',
  )
  assert.deepEqual(
    ids(alertsNeedingAttention(FEED, seen)),
    ['a1', 'a3', 'f1'],
    'the badge must stop nagging about an item someone already acknowledged',
  )
  assert.equal(assertAlertInvariant(FEED, seen), '')
})

test('a dismissed alert leaves both the panel and the badge', () => {
  const seen = { acknowledged: [] as string[], dismissed: ['a1'] }
  assert.deepEqual(ids(visibleAlerts(FEED, seen)), ['a2', 'a3', 'f1'])
  assert.deepEqual(ids(alertsNeedingAttention(FEED, seen)), ['a2', 'a3', 'f1'])
})

test('needing attention is always a subset of what the panel shows', () => {
  // The property the three old inline filters could violate. Exercised across
  // every acknowledged/dismissed split of a small feed, not just one example.
  const all = ids(FEED)
  for (let ackMask = 0; ackMask < 1 << all.length; ackMask++) {
    for (let disMask = 0; disMask < 1 << all.length; disMask++) {
      const seen = {
        acknowledged: all.filter((_, i) => ackMask & (1 << i)),
        dismissed: all.filter((_, i) => disMask & (1 << i)),
      }
      assert.equal(assertAlertInvariant(FEED, seen), '', `broke at ack=${ackMask} dis=${disMask}`)
    }
  }
})

test('critical outranks warn, and an empty or fully-handled feed is silent', () => {
  assert.equal(summarizeAlerts(FEED).tone, 'critical')
  assert.equal(summarizeAlerts([alert('w', 'warning')]).tone, 'warn')
  assert.equal(summarizeAlerts([]).tone, 'ok')
  // A critical that has been dismissed must NOT keep the tone at critical —
  // that is the 10-day-red-card failure mode the plan called out.
  assert.equal(summarizeAlerts(FEED, { dismissed: ['a1'] }).tone, 'warn')
  assert.equal(summarizeAlerts(FEED, { dismissed: ids(FEED) }).tone, 'ok')
})

test('the empty state can say what is actually there', () => {
  // "Sensors Clear" alone read as "nothing was ever reported", which is what
  // made 15 dismissed events look like a broken feed.
  const summary = summarizeAlerts(FEED, { acknowledged: ['a2'], dismissed: ids(FEED) })
  assert.equal(summary.active, 0)
  assert.equal(summary.dismissed, 4)
  assert.equal(summary.needsAttention, 0)
  assert.equal(
    `Sensors Clear — ${summary.active} active · ${summary.dismissed} dismissed`,
    'Sensors Clear — 0 active · 4 dismissed',
  )
})

test('an id in both sets is counted once, and unknown ids are ignored', () => {
  const seen = { acknowledged: ['a1', 'nope'], dismissed: ['a1'] }
  const summary = summarizeAlerts(FEED, seen)
  assert.equal(summary.active, 3, 'a1 is removed once, not twice')
  assert.equal(summary.dismissed, 1)
  assert.equal(summary.acknowledged, 0, 'a1 is dismissed, so it is not also counted as merely acknowledged')
  assert.equal(assertAlertInvariant(FEED, seen), '')
})
