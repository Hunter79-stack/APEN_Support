export interface AdminAlertItem {
  id: string
  type: 'critical' | 'warning' | 'info'
  category: 'alert' | 'notification' | 'feedback'
  title: string
  message: string
  timestamp: string
  source: string
}

/** A single recorded probe result. */
export interface AdminServiceHistoryEntry {
  at: string
  status: 'online' | 'offline' | 'degraded' | 'probing' | string
  latencyMs: number | null
  httpStatus: number | null
  error: string | null
}

export interface AdminServiceItem {
  id: string
  name: string
  /** "online" / "offline" / "degraded" / "probing" — degraded means it
   *  responded but the HTTP status wasn't in the expected list. */
  status: 'online' | 'offline' | 'degraded' | 'probing' | string
  /** Pre-formatted display string ("12ms", "—", "n/a"). Always safe to render. */
  latency: string

  // ── Optional fields exposed by the live infrastructure-nodes payload.
  // The card panel uses these in the expanded view; older data sources can
  // omit them and the panel falls back gracefully.
  kind?: 'http' | 'tcp'
  /** URL or `host:port` shown to admins and used by the "Open URL" link.
   *  This is the *browser-facing* address; what the server actually probes
   *  may differ — see {@link healthCheckUrl}. */
  target?: string
  /** Optional separate address the SERVER probes, when it differs from the
   *  browser-facing {@link target}. Useful on segmented/multi-homed networks
   *  where the public URL opens in a workstation's browser but isn't routable
   *  from the server (e.g. probe a same-origin nginx path or a reachable IP).
   *  Falls back to {@link target} when empty. */
  healthCheckUrl?: string
  /** Optional source IP the probe binds to (multi-homed servers). Lets an
   *  admin force the check out a specific NIC/interface. */
  localAddress?: string
  /** When true, http probes are sent through THIS site's own nginx over
   *  loopback (127.0.0.1), preserving the original Host/SNI — so a target only
   *  reachable via the site's reverse proxy can still be health-checked. */
  probeViaProxy?: boolean
  description?: string
  /** Per-node probe timeout (ms). */
  timeoutMs?: number
  /** Allowed HTTP status codes (http nodes only). */
  expectedStatus?: number[]
  /** Numeric round-trip latency in ms; null when probing/offline. */
  latencyMs?: number | null
  /** Last HTTP status seen (http nodes only). */
  httpStatus?: number | null
  /** ISO timestamp of the most recent probe attempt. */
  lastCheckedAt?: string | null
  /** Last error message — populated when status is offline/degraded. */
  error?: string | null
  /** Recent probe history, newest first. */
  history?: AdminServiceHistoryEntry[]
}

export interface AdminNotificationSettings {
  enabled: boolean
  emailAddress: string
  notifyOnSystemEvents: boolean
  notifyOnFeedback: boolean
  lastSavedAt?: string
}

export interface AdminNotificationCounts {
  systemEvents: number
  feedback: number
}

// 'all' | 'alert' | 'notification' | 'feedback' are alert categories; 'dismissed'
// is a cross-cutting state filter that reveals items removed from view (and who
// removed them) rather than a category. AlertsPanel special-cases it.
export const ADMIN_ALERT_FILTERS = ['all', 'alert', 'notification', 'feedback', 'dismissed'] as const
export type AdminAlertFilter = typeof ADMIN_ALERT_FILTERS[number]

/** One "remove from view" dismissal, shared across admins and attributed to the
 *  admin who performed it. Persisted server-side by the stats proxy. */
export interface AdminDismissalRecord {
  /** id of the dismissed alert/event/feedback item */
  id: string
  /** username of the dismissing admin (LDAP), or 'admin' for legacy-token auth */
  by: string
  /** ISO-8601 timestamp of when it was dismissed */
  at: string
}

/** Parse/validate dismissal records from arbitrary JSON (server payload, disk
 *  file, or `{ dismissals: [...] }` envelope). Drops malformed entries and
 *  de-dupes by id, last-write-wins. */
export function normalizeDismissals(input: unknown): AdminDismissalRecord[] {
  const values = Array.isArray(input)
    ? input
    : typeof input === 'object' && input !== null && Array.isArray((input as { dismissals?: unknown }).dismissals)
      ? (input as { dismissals: unknown[] }).dismissals
      : []

  const byId = new Map<string, AdminDismissalRecord>()
  for (const value of values) {
    if (typeof value !== 'object' || value === null) continue
    const record = value as { id?: unknown; by?: unknown; at?: unknown }
    const id = typeof record.id === 'string' ? record.id.trim() : ''
    if (!id) continue
    const by = typeof record.by === 'string' && record.by.trim() ? record.by.trim() : 'admin'
    const at = typeof record.at === 'string' && record.at.trim() ? record.at.trim() : ''
    byId.set(id, { id, by, at })
  }
  return Array.from(byId.values())
}

export const ADMIN_NOTIFICATION_SETTINGS_STORAGE_KEY = 'apen-admin-notification-settings'
export const ADMIN_ACKNOWLEDGED_ALERTS_STORAGE_KEY = 'apen-admin-acknowledged-alert-ids'
export const ADMIN_ACKNOWLEDGED_ALERTS_CHANGED_EVENT = 'apen-admin-acknowledged-alerts-changed'

export const DEFAULT_ADMIN_NOTIFICATION_SETTINGS: AdminNotificationSettings = {
  enabled: false,
  emailAddress: '',
  notifyOnSystemEvents: true,
  notifyOnFeedback: true,
}

// Seed/demo alerts that are layered in alongside the live proxy feed. Kept as
// an empty array intentionally: the old hardcoded "Wildcard SSL Expiring"
// placeholder (id sys-1, a date already in the past) was counted by the cog
// badge's default state and showed a phantom "!" on every page even after it
// had been acknowledged + dismissed. Real alerts come from the site-stats
// proxy. Add a static entry here only for a genuinely permanent notice.
export const STATIC_ADMIN_ALERTS: AdminAlertItem[] = []

export function countAdminNotifications(alerts: AdminAlertItem[]): AdminNotificationCounts {
  return alerts.reduce<AdminNotificationCounts>(
    (counts, alert) => {
      if (alert.category === 'feedback') {
        counts.feedback += 1
      } else {
        counts.systemEvents += 1
      }

      return counts
    },
    { systemEvents: 0, feedback: 0 },
  )
}

export function normalizeAcknowledgedAlertIds(input: unknown): string[] {
  const values = Array.isArray(input)
    ? input
    : typeof input === 'object' && input !== null && Array.isArray((input as { alertIds?: unknown }).alertIds)
      ? (input as { alertIds: unknown[] }).alertIds
      : []

  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  )
}

/* filterAcknowledgedAlerts used to live here. It took ONE id set and every
 * caller decided for itself what to put in it — which is how the cog badge, the
 * Active Alerts tile and the AlertsPanel filter ended up applying three
 * different rules to the same feed. The rules are now named and written down
 * together in lib/data/admin-health.ts: visibleAlerts (hides dismissed) and
 * alertsNeedingAttention (also hides acknowledged). */
