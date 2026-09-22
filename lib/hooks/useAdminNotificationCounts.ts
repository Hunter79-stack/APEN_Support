'use client'

/**
 * Live count for the Admin cog badge. Polls the shared acknowledged and
 * dismissed lists plus the live alerts so the badge matches what the
 * AlertsPanel shows; falls back to the tab-local ack mirror when the proxy is
 * unreachable. Lifted out of Navbar.tsx so the nav is layout only.
 */
import { useEffect, useState } from 'react'
import {
  ADMIN_ACKNOWLEDGED_ALERTS_STORAGE_KEY,
  ADMIN_ACKNOWLEDGED_ALERTS_CHANGED_EVENT,
  STATIC_ADMIN_ALERTS,
  countAdminNotifications,
  normalizeAcknowledgedAlertIds,
  type AdminAlertItem,
  type AdminNotificationCounts,
} from '@/lib/data/admin'
import { alertsNeedingAttention } from '@/lib/data/admin-health'
import { adminContentClient } from '@/lib/data/admin-content'
import { API_ENDPOINTS, RUNTIME_INTERVALS } from '@/lib/data/runtime'

const DEFAULT_ADMIN_NOTIFICATION_COUNTS = countAdminNotifications(STATIC_ADMIN_ALERTS)

function readAcknowledgedAlertIdsFromStorage() {
  if (typeof window === 'undefined') return []

  try {
    return normalizeAcknowledgedAlertIds(JSON.parse(window.localStorage.getItem(ADMIN_ACKNOWLEDGED_ALERTS_STORAGE_KEY) ?? '[]'))
  } catch {
    return []
  }
}

// Order-insensitive id-set equality, used to avoid re-render loops when the
// shared acknowledged list comes back from the server unchanged.
function sameIds(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((id) => set.has(id))
}

export function useAdminNotificationCounts(active: boolean) {
  const [counts, setCounts] = useState<AdminNotificationCounts>(DEFAULT_ADMIN_NOTIFICATION_COUNTS)
  const [acknowledgedAlertIds, setAcknowledgedAlertIds] = useState<string[]>(readAcknowledgedAlertIdsFromStorage)

  useEffect(() => {
    if (!active) return

    const syncAcknowledgedAlertIdsFromEvent = (event: Event) => {
      if (event instanceof CustomEvent) {
        setAcknowledgedAlertIds(normalizeAcknowledgedAlertIds(event.detail))
      }
    }

    window.addEventListener(ADMIN_ACKNOWLEDGED_ALERTS_CHANGED_EVENT, syncAcknowledgedAlertIdsFromEvent)

    return () => {
      window.removeEventListener(ADMIN_ACKNOWLEDGED_ALERTS_CHANGED_EVENT, syncAcknowledgedAlertIdsFromEvent)
    }
  }, [active])

  useEffect(() => {
    if (!active) return
    let cancelled = false

    async function syncNotificationCounts() {
      // Pull the shared acknowledged AND dismissed lists so the badge reflects
      // what the AlertsPanel actually shows. Acks made by other admins, and
      // "removed from view" dismissals, both mean "handled — stop nagging."
      // Without the dismissed list the cog stays red over items that are
      // invisible in the panel. Fall back to the local ack mirror if the proxy
      // is unreachable.
      const [serverAck, dismissals] = await Promise.all([
        adminContentClient.fetchAcknowledgedAlerts(),
        adminContentClient.fetchDismissals(),
      ])
      const effectiveAck = serverAck ?? acknowledgedAlertIds
      if (serverAck && !cancelled) {
        setAcknowledgedAlertIds((prev) => (sameIds(prev, serverAck) ? prev : serverAck))
      }
      // Anything acknowledged or dismissed is hidden from the badge. The rule
      // lives in lib/data/admin-health.ts alongside the one the AlertsPanel
      // filters with, because these two used to be written out separately here
      // and in AdminDashboard and could drift without anything noticing.
      const dismissedIds = Array.isArray(dismissals) ? dismissals.map((d) => d.id) : []
      const seen = { acknowledged: effectiveAck, dismissed: dismissedIds }
      try {
        const response = await fetch(API_ENDPOINTS.siteStats)
        if (!response.ok) {
          if (!cancelled) setCounts(countAdminNotifications(alertsNeedingAttention(STATIC_ADMIN_ALERTS, seen)))
          return
        }
        const json = await response.json()
        const liveAlerts: AdminAlertItem[] = Array.isArray(json.alerts) ? json.alerts : []
        if (!cancelled) {
          setCounts(countAdminNotifications(alertsNeedingAttention([...liveAlerts, ...STATIC_ADMIN_ALERTS], seen)))
        }
      } catch {
        if (!cancelled) setCounts(countAdminNotifications(alertsNeedingAttention(STATIC_ADMIN_ALERTS, seen)))
      }
    }

    syncNotificationCounts()
    const syncId = globalThis.setInterval(syncNotificationCounts, RUNTIME_INTERVALS.adminStatsRefreshMs)

    return () => {
      cancelled = true
      globalThis.clearInterval(syncId)
    }
  }, [active, acknowledgedAlertIds])

  return counts
}

