/**
 * Admin console health derivation — pure, no React, unit-testable.
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * Three places counted the same alert feed and each filtered it differently:
 *
 *   Navbar cog badge      hid acknowledged AND dismissed   (Navbar.tsx)
 *   activeAlertCount tile hid dismissed only               (AdminDashboard.tsx)
 *   AlertsPanel filter    hid dismissed only               (AdminDashboard.tsx)
 *
 * Today every acknowledged id is also dismissed, so the three agree by luck.
 * Acknowledge one item WITHOUT dismissing it and the cog and the tile disagree
 * about the same feed, which is what made "Sensors Clear" look broken while a
 * red badge sat on the cog.
 *
 * The fix is not one predicate — the cog and the panel genuinely want different
 * things, and collapsing them would make the cog nag about items an admin has
 * already looked at. The fix is one MODULE, so the two rules are written down
 * once, next to each other, and drift is visible in a diff.
 *
 *   visibleAlerts()          what the panel renders    — hides dismissed
 *   alertsNeedingAttention() what a badge may count    — also hides acknowledged
 *
 * `alertsNeedingAttention` is always a subset of `visibleAlerts`, and
 * assertAlertInvariant() below states that as an executable claim.
 *
 * It lives here rather than in AdminDashboard.tsx deliberately:
 * tests/ui-behavior.test.ts has negative assertions forbidding
 * `filterAcknowledgedAlerts` from appearing in that file, so the obvious
 * implementation fails the suite via a doesNotMatch buried in a 60-assertion
 * test.
 */

import type { AdminAlertItem } from '@/lib/data/admin'

export type AdminTone = 'critical' | 'warn' | 'ok'

/** The id sets an alert is filtered against. Both accept any iterable so a
 *  caller can pass a Set, a Map's keys, or a plain array without converting. */
export interface AlertVisibility {
  /** Ids an admin has marked "seen". Still listed in the panel. */
  acknowledged?: Iterable<string>
  /** Ids an admin has removed from view. Hidden everywhere but the
   *  "dismissed" filter, which shows them WITH who removed them. */
  dismissed?: Iterable<string>
}

/**
 * What the alerts panel shows under any filter except "dismissed".
 *
 * Acknowledged items stay: acknowledging is "I have seen this", not "this is
 * gone", and an admin must still be able to find one afterwards.
 */
export function visibleAlerts(
  alerts: readonly AdminAlertItem[],
  { dismissed }: AlertVisibility = {},
): AdminAlertItem[] {
  const hidden = new Set(dismissed ?? [])
  return alerts.filter((alert) => !hidden.has(alert.id))
}

/**
 * What still wants an admin's attention — the only thing a badge may count.
 *
 * Both acknowledged and dismissed drop out. A badge exists to say "something
 * is wrong or waiting for you"; an item someone has already acknowledged is
 * neither, and counting it is how the cog ended up permanently red.
 */
export function alertsNeedingAttention(
  alerts: readonly AdminAlertItem[],
  { acknowledged, dismissed }: AlertVisibility = {},
): AdminAlertItem[] {
  const handled = new Set<string>([...(acknowledged ?? []), ...(dismissed ?? [])])
  return alerts.filter((alert) => !handled.has(alert.id))
}

/** Counts behind the panel's empty state, so it can say what is actually
 *  there ("0 active · 15 dismissed") instead of a bare "Sensors Clear" that
 *  reads as "nothing was ever reported". */
export interface AlertSummary {
  /** Not dismissed — the rows the panel renders. */
  active: number
  /** Removed from view. Reachable under the "dismissed" filter. */
  dismissed: number
  /** Seen but not removed — visible in the panel, silent on the badge. */
  acknowledged: number
  /** Neither seen nor removed. What a badge counts. */
  needsAttention: number
  /** Highest severity among the items needing attention. */
  tone: AdminTone
}

export function summarizeAlerts(
  alerts: readonly AdminAlertItem[],
  visibility: AlertVisibility = {},
): AlertSummary {
  const active = visibleAlerts(alerts, visibility)
  const attention = alertsNeedingAttention(alerts, visibility)
  return {
    active: active.length,
    dismissed: alerts.length - active.length,
    acknowledged: active.length - attention.length,
    needsAttention: attention.length,
    // OK is silent: a badge only ever means something is wrong or waiting.
    tone: attention.some((alert) => alert.type === 'critical')
      ? 'critical'
      : attention.length > 0 ? 'warn' : 'ok',
  }
}

/**
 * The invariant the three old counters violated, as a runnable check.
 *
 * Returns an error string, or '' when the counts hold together. Kept as a
 * returned message rather than a throw so a caller can assert on it in a test
 * without the module ever being able to break a live admin page.
 */
export function assertAlertInvariant(
  alerts: readonly AdminAlertItem[],
  visibility: AlertVisibility = {},
): string {
  const summary = summarizeAlerts(alerts, visibility)
  const attention = alertsNeedingAttention(alerts, visibility)
  const activeIds = new Set(visibleAlerts(alerts, visibility).map((alert) => alert.id))
  const escaped = attention.find((alert) => !activeIds.has(alert.id))
  if (escaped) return `alert ${escaped.id} needs attention but is not visible in the panel`
  if (summary.active + summary.dismissed !== alerts.length) {
    return `active(${summary.active}) + dismissed(${summary.dismissed}) != total(${alerts.length})`
  }
  if (summary.acknowledged + summary.needsAttention !== summary.active) {
    return `acknowledged(${summary.acknowledged}) + needsAttention(${summary.needsAttention}) != active(${summary.active})`
  }
  return ''
}
