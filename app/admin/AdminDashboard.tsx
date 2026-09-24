'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { getGpuTier, type GpuTier } from '@/lib/data/gpuTier'
import { GlowCard } from '@/components/ui/spotlight-card'
import { ActivityChartCard } from '@/components/ui/activity-chart-card'
import {
  STATIC_ADMIN_ALERTS,
  ADMIN_ALERT_FILTERS,
  ADMIN_ACKNOWLEDGED_ALERTS_STORAGE_KEY,
  ADMIN_ACKNOWLEDGED_ALERTS_CHANGED_EVENT,
  ADMIN_NOTIFICATION_SETTINGS_STORAGE_KEY,
  DEFAULT_ADMIN_NOTIFICATION_SETTINGS,
  normalizeAcknowledgedAlertIds,
  type AdminAlertFilter,
  type AdminAlertItem,
  type AdminDismissalRecord,
  type AdminNotificationSettings,
  type AdminServiceItem,
} from '@/lib/data/admin'
// The alert-visibility rules live in their own pure module so the cog badge,
// the stat tiles and the panel filter cannot drift apart again.
import { visibleAlerts, summarizeAlerts } from '@/lib/data/admin-health'
import { API_ENDPOINTS, RUNTIME_INTERVALS } from '@/lib/data/runtime'
import { SITE_HISTORY_ANNOUNCEMENTS } from '@/lib/data/announcements'
import { ADMIN_SECTIONS, isAdminTab, type AdminTab } from '@/lib/data/admin-sections'
import { adminContentClient, type AdminWhoami } from '@/lib/data/admin-content'
import {
  CheckCircle2, ChevronRight, Clock, LogOut, Mail, Save, Shield, Trash2, FileEdit, FolderTree, Wand2, Activity,
  Boxes, Package, ExternalLink, Undo2, UserX, MessageSquarePlus, MessageSquareText, Server, AlertTriangle,
  ShieldAlert, Bot,
} from 'lucide-react'
import { AdminContentEditor } from './AdminContentEditor'
import { AdminAssistantChipsPanel } from './AdminAssistantChipsPanel'
import { AdminAssistantPromptPanel } from './AdminAssistantPromptPanel'
import { AdminPageWizard } from './AdminPageWizard'
import { AdminCustomPagesPanel } from './AdminCustomPagesPanel'
import { AdminChatTranscriptsPanel } from './AdminChatTranscriptsPanel'
import { AuthEventsPanel } from './AuthEventsPanel'
import { ExportBar } from '@/components/admin/ExportBar'
import type { ExportColumn } from '@/lib/admin/export'
import { InfrastructureNodesPanel } from './InfrastructureNodesPanel'
import { AnnouncementPathsPanel } from './AnnouncementPathsPanel'
import { NginxStatusSummary } from './NginxStatusSummary'
import { NginxServerStatusPanel } from './NginxServerStatusPanel'
import { NginxManagedEditor } from './NginxManagedEditor'

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Hardware Tier Detection
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
// GPU tier for the GFX badge — uses the site-wide detector (getGpuTier), which
// handles blocked WEBGL_debug_renderer_info (locked-down / VDI browsers) and
// integrated GPUs via capability hints instead of crudely reporting "low".

function resolveNotificationSettings(settings: Partial<AdminNotificationSettings> = {}): AdminNotificationSettings {
  return {
    ...DEFAULT_ADMIN_NOTIFICATION_SETTINGS,
    ...settings,
    emailAddress: typeof settings.emailAddress === 'string' ? settings.emailAddress : DEFAULT_ADMIN_NOTIFICATION_SETTINGS.emailAddress,
  }
}

function dispatchAcknowledgedAlertIdsChanged(alertIds: string[]) {
  window.dispatchEvent(new CustomEvent(ADMIN_ACKNOWLEDGED_ALERTS_CHANGED_EVENT, { detail: { alertIds } }))
}

function readAcknowledgedAlertIdsFromStorage() {
  if (typeof window === 'undefined') return []

  try {
    return normalizeAcknowledgedAlertIds(JSON.parse(window.localStorage.getItem(ADMIN_ACKNOWLEDGED_ALERTS_STORAGE_KEY) ?? '[]'))
  } catch {
    return []
  }
}

function persistAcknowledgedAlertIds(alertIds: string[]) {
  window.localStorage.setItem(ADMIN_ACKNOWLEDGED_ALERTS_STORAGE_KEY, JSON.stringify(alertIds))
  dispatchAcknowledgedAlertIdsChanged(alertIds)
}

// "Remove from view" dismissals are server-persisted and shared across all
// admins (each stamped with the dismisser's name) — see adminContentClient
// .fetchDismissals / .dismissAlert / .restoreAlert. Unlike acknowledgements
// (which stay local to each browser), these are intentionally global.
function formatDismissedAt(at: string): string {
  if (!at) return ''
  const ts = new Date(at)
  if (Number.isNaN(ts.getTime())) return ''
  return ts.toLocaleString()
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Alerts & Feedback Panel
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function NotificationSettingsPanel({
  settings,
  onSettingsChange,
}: {
  settings: AdminNotificationSettings
  onSettingsChange: (settings: AdminNotificationSettings) => void
}) {
  const [draft, setDraft] = useState<AdminNotificationSettings>(settings)
  const [status, setStatus] = useState('')
  // Reset the draft when the parent hands down new settings. Adjusted during
  // render rather than in an effect, so there is no extra commit.
  const [seenSettings, setSeenSettings] = useState(settings)
  if (settings !== seenSettings) { setSeenSettings(settings); setDraft(settings) }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextSettings = resolveNotificationSettings({
      ...draft,
      emailAddress: draft.emailAddress.trim(),
      lastSavedAt: new Date().toISOString(),
    })

    onSettingsChange(nextSettings)
    window.localStorage.setItem(ADMIN_NOTIFICATION_SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings))
    setStatus('Saved locally')

    try {
      const response = await fetch(API_ENDPOINTS.notificationSettings, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextSettings),
      })

      setStatus(response.ok ? 'Saved to notification proxy' : 'Saved locally; proxy unavailable')
    } catch {
      setStatus('Saved locally; proxy unavailable')
    }
  }

  return (
    <GlowCard glowColor="cyan" className="p-5">
      <form onSubmit={handleSave} className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <Mail size={16} className="text-cyan-300" aria-hidden="true" />
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white">Notification Email</p>
          </div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400" htmlFor="admin-notification-email">
            Send alerts and feedback notices to
          </label>
          <input
            id="admin-notification-email"
            type="email"
            value={draft.emailAddress}
            onChange={(event) => setDraft((current) => ({ ...current, emailAddress: event.target.value }))}
            placeholder="admin-notifications@example.mil"
            className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none transition-colors placeholder:text-slate-400 focus:border-cyan-400/60"
          />
          <div className="mt-3 flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))}
                className="h-4 w-4 accent-cyan-500"
              />
              Email enabled
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.notifyOnSystemEvents}
                onChange={(event) => setDraft((current) => ({ ...current, notifyOnSystemEvents: event.target.checked }))}
                className="h-4 w-4 accent-cyan-500"
              />
              System events
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.notifyOnFeedback}
                onChange={(event) => setDraft((current) => ({ ...current, notifyOnFeedback: event.target.checked }))}
                className="h-4 w-4 accent-cyan-500"
              />
              Feedback
            </label>
          </div>
          {status && (
            <p className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
              <CheckCircle2 size={12} aria-hidden="true" />
              {status}
            </p>
          )}
        </div>
        <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 text-[10px] font-black uppercase tracking-widest text-cyan-300 transition-colors hover:bg-cyan-400/20">
          <Save size={14} aria-hidden="true" />
          Save
        </button>
      </form>
    </GlowCard>
  )
}

const ALERT_EXPORT_COLUMNS: ExportColumn<AdminAlertItem>[] = [
  { label: 'Title', value: (a) => a.title },
  { label: 'Type', value: (a) => a.type },
  { label: 'Category', value: (a) => a.category },
  { label: 'Message', value: (a) => a.message },
  { label: 'Timestamp', value: (a) => a.timestamp },
  { label: 'Source', value: (a) => a.source },
]

function AlertsPanel({
  alerts,
  acknowledgedAlertIds,
  dismissalsById,
  onAcknowledgeAlert,
  onRemoveAlert,
  onRestoreAlert,
}: {
  alerts: AdminAlertItem[]
  acknowledgedAlertIds: Set<string>
  dismissalsById: Map<string, AdminDismissalRecord>
  onAcknowledgeAlert: (id: string) => void
  onRemoveAlert: (id: string) => void
  onRestoreAlert: (id: string) => void
}) {
  const [filter, setFilter] = useState<AdminAlertFilter>('all')
  // 'dismissed' is a state filter, not a category: it shows ONLY removed items
  // (with who removed them). Every other filter starts from visibleAlerts —
  // the same predicate the stat tiles count — then narrows by category.
  const visible = visibleAlerts(alerts, { dismissed: dismissalsById.keys() })
  const filtered = filter === 'dismissed'
    ? alerts.filter(a => dismissalsById.has(a.id))
    : visible.filter(a => filter === 'all' || a.category === filter)
  // Empty state numbers. "Sensors Clear" alone read as "nothing was ever
  // reported", which is what made 15 dismissed events look like a broken feed.
  const summary = summarizeAlerts(alerts, {
    acknowledged: acknowledgedAlertIds,
    dismissed: dismissalsById.keys(),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-2">
          {ADMIN_ALERT_FILTERS.map(t => (
            <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${filter === t ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-slate-400'}`}>
              {t}
            </button>
          ))}
        </div>
        <ExportBar rows={filtered} columns={ALERT_EXPORT_COLUMNS} filenameBase="system-events-feedback" title="APEN System Events & Feedback" />
      </div>
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-center py-8 text-slate-400 text-xs font-mono">
            {filter === 'dismissed'
              ? 'No Dismissed Items'
              : `Sensors Clear — ${summary.active} active · ${summary.dismissed} dismissed`}
          </p>
        )}
        {filtered.map(alert => {
          const acknowledged = acknowledgedAlertIds.has(alert.id)
          const dismissal = dismissalsById.get(alert.id)

          return (
            <GlowCard key={alert.id} className={`p-4 relative ${dismissal ? 'opacity-60' : acknowledged ? 'opacity-70' : ''}`} glowColor={alert.type === 'critical' ? 'red' : 'cyan'}>
               <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                 <div>
                   <p className="text-sm font-semibold text-white">{alert.title}</p>
                   <p className="text-xs text-slate-400 mt-1 leading-relaxed">{alert.message}</p>
                   {/* DTG line — timestamp, source, and (when dismissed) the
                       attribution of which admin removed it, inline on the same row. */}
                   <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1"><Clock size={10}/> {alert.timestamp}</span>
                      <span className="text-cyan-500/60 font-bold uppercase">{alert.source}</span>
                      {dismissal && (
                        <span className="flex items-center gap-1 text-amber-400/70 font-bold uppercase">
                          <UserX size={10} aria-hidden="true" />
                          Dismissed by {dismissal.by}{formatDismissedAt(dismissal.at) ? ` · ${formatDismissedAt(dismissal.at)}` : ''}
                        </span>
                      )}
                   </div>
                 </div>
                 {dismissal ? (
                   <button aria-label={`Restore ${alert.title} to view`} onClick={() => onRestoreAlert(alert.id)} className="inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-3 text-[10px] font-black uppercase tracking-widest text-cyan-300 transition-colors hover:border-cyan-300/40 hover:bg-cyan-500/20 hover:text-cyan-200">
                     <Undo2 size={13} aria-hidden="true" />
                     Restore
                   </button>
                 ) : acknowledged ? (
                   <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                     <span className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                       <CheckCircle2 size={13} aria-hidden="true" />
                       Retained for reports
                     </span>
                     <button aria-label={`Remove ${alert.title} from view`} onClick={() => onRemoveAlert(alert.id)} className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-red-400/20 bg-red-500/10 px-3 text-[10px] font-black uppercase tracking-widest text-red-300 transition-colors hover:border-red-300/40 hover:bg-red-500/20 hover:text-red-200">
                       <Trash2 size={13} aria-hidden="true" />
                       Remove from view
                     </button>
                   </div>
                 ) : (
                   <button aria-label={`Acknowledge ${alert.title}`} onClick={() => onAcknowledgeAlert(alert.id)} className="inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:border-emerald-400/30 hover:bg-emerald-400/10 hover:text-emerald-300">
                     <CheckCircle2 size={13} aria-hidden="true" />
                     Acknowledge
                   </button>
                 )}
               </div>
            </GlowCard>
          )
        })}
      </div>
    </div>
  )
}

/* The old hardcoded ServiceHealth grid was replaced by InfrastructureNodesPanel
   which pulls live probe data from the proxy and lets admins add/edit nodes
   inline. See ./InfrastructureNodesPanel.tsx. */

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Main Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function SectionHeader({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-6">
      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white/90">{label}</h2>
      <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">{hint}</span>
    </div>
  )
}

// Icon per console section. Section ids/labels live in ADMIN_SECTIONS (shared
// with the Navbar admin sub-menu); the icons stay here since they're UI-only.
const ADMIN_SECTION_ICONS: Record<AdminTab, React.ElementType> = {
  monitor: Activity,
  nginx: Server,
  content: FileEdit,
  chips: MessageSquarePlus,
  'assistant-prompt': Bot,
  wizard: Wand2,
  pages: FolderTree,
  transcripts: MessageSquareText,
  security: ShieldAlert,
}

// One-line "what's in here" for each section's nav card.
const ADMIN_SECTION_DESCRIPTIONS: Record<AdminTab, string> = {
  monitor: 'Live traffic, alerts, infrastructure nodes, and notification routing.',
  nginx: 'Per-zone/upstream nginx metrics and managed zone/upstream config.',
  content: 'Edit cards and page content without redeploying.',
  chips: "Manage the chat assistant's suggested prompt chips.",
  'assistant-prompt': "Tune the assistant's persona and the services it knows about.",
  wizard: 'Create a new published page in four steps.',
  pages: 'Audit and delete pages published via the wizard.',
  transcripts: "Browse and export every signed-in user's chat history.",
  security: 'Refused sign-ins: spoofed domain claims and malformed names.',
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone = 'cyan',
  onOpen,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  tone?: 'cyan' | 'amber' | 'emerald'
  /** Opens the console section holding the detail behind this count. */
  onOpen?: () => void
}) {
  const toneClass = tone === 'amber'
    ? 'bg-amber-400/10 text-amber-300'
    : tone === 'emerald'
      ? 'bg-emerald-400/10 text-emerald-300'
      : 'bg-cyan-400/10 text-cyan-300'
  const body = (
    <>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneClass}`}>
        <Icon size={16} aria-hidden="true" />
      </div>
      <div className="min-w-0 text-left">
        <p className="text-xl font-black leading-none text-white">{value}</p>
        <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      </div>
    </>
  )

  // A tile with somewhere to go becomes a button. Every one of these numbers
  // already has a full section further down the console, but the tiles were
  // inert — the count was all an admin could see unless they already knew which
  // tab held the detail.
  if (!onOpen) {
    return <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">{body}</div>
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`Open ${label} — show the ${value} ${Number(value) === 1 ? 'entry' : 'entries'} behind this count`}
      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/5 focus:outline-none focus-visible:border-cyan-400/60"
    >
      {body}
      <ChevronRight size={14} className="ml-auto shrink-0 text-slate-400" aria-hidden="true" />
    </button>
  )
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Site History — admin-only record
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
// Retirements, redesigns and other housekeeping. Deliberately absent from the
// home feed — a visitor there is looking for something to download, not for what
// stopped existing. Kept rather than deleted so there is still a record of when
// a page went away. Same predicate as the home filter (isSiteHistoryAnnouncement).
function SiteHistoryPanel() {
  if (SITE_HISTORY_ANNOUNCEMENTS.length === 0) {
    return <p className="text-xs text-slate-400">No historical entries recorded.</p>
  }
  return (
    <ol className="space-y-2">
      {SITE_HISTORY_ANNOUNCEMENTS.map((entry) => (
        <li
          key={`${entry.date}-${entry.text}`}
          className="flex flex-col gap-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 sm:flex-row sm:items-start sm:gap-4"
        >
          <span className="shrink-0 font-mono text-[11px] text-slate-400">{entry.date || 'undated'}</span>
          <p className="min-w-0 flex-1 break-words text-xs leading-relaxed text-slate-300">{entry.text}</p>
          {entry.category && (
            <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {entry.category}
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}

export default function AdminDashboard() {
  const [data, setData] = useState<{ alerts: AdminAlertItem[]; services: AdminServiceItem[] }>({
    alerts: STATIC_ADMIN_ALERTS,
    services: [],
  })
  // "At a glance" counts for the stat strip — fetched once on mount (not
  // polled; a manual refresh of the page is enough for a landing summary).
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [transcriptCount, setTranscriptCount] = useState<number | null>(null)
  const [notificationSettings, setNotificationSettings] = useState<AdminNotificationSettings>(DEFAULT_ADMIN_NOTIFICATION_SETTINGS)
  const [acknowledgedAlertIds, setAcknowledgedAlertIds] = useState<Set<string>>(() => new Set())
  // Server-shared dismissals: every admin sees the same list, each attributed
  // to the admin who removed it. Indexed by alert id for O(1) lookup in render.
  const [dismissalsById, setDismissalsById] = useState<Map<string, AdminDismissalRecord>>(() => new Map())
  const [tier, setTier] = useState<GpuTier>('high')
  const [clock, setClock] = useState('')
  const [tab, setTab] = useState<AdminTab>('monitor')
  const [whoami, setWhoami] = useState<AdminWhoami | null>(null)

  // Deep-link support: /admin#<section> opens that console section. Read the
  // hash on mount and on change (e.g. clicks from the Navbar admin sub-menu).
  useEffect(() => {
    const applyHash = () => {
      const h = window.location.hash.slice(1)
      if (isAdminTab(h)) setTab(h)
    }
    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [])

  // Select a section and reflect it in the URL hash so the view is shareable.
  // replaceState (not the hash setter) avoids a redundant hashchange round-trip.
  const selectTab = useCallback((id: AdminTab) => {
    setTab(id)
    if (typeof window !== 'undefined') window.history.replaceState(null, '', `#${id}`)
  }, [])

  // Open the section a stat tile counts, then bring it into view. The scroll
  // waits a frame because the target section only mounts once its tab is the
  // active one — querying for it in the same tick finds nothing.
  const openSection = useCallback((id: AdminTab, anchor: string) => {
    selectTab(id)
    if (typeof window === 'undefined') return
    window.requestAnimationFrame(() => {
      document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [selectTab])

  // Probe whoami once on mount and again whenever the content tab is opened
  // (logging in via SessionGate happens inside that tab; the header needs to
  // pick up the new identity without a full page reload).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const who = await adminContentClient.whoami()
      if (!cancelled) setWhoami(who)
    })()
    return () => { cancelled = true }
  }, [tab])

  // Stat-strip counts — one fetch each on mount, independent of which
  // section tab is open, so the landing view has real numbers immediately.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [content, transcripts] = await Promise.all([
        adminContentClient.fetchAll(),
        adminContentClient.fetchChatTranscripts(),
      ])
      if (cancelled) return
      if (content) setPageCount(content.customPages?.length ?? 0)
      if (transcripts) setTranscriptCount(transcripts.length)
    })()
    return () => { cancelled = true }
  }, [])

  const handleSignOut = useCallback(async () => {
    await adminContentClient.logout()
    setWhoami(null)
    // Reload so any cached admin data clears and the SessionGate reappears.
    if (typeof window !== 'undefined') window.location.reload()
  }, [])

  useEffect(() => {
    setTier(getGpuTier())
    const timer = setInterval(() => setClock(new Date().toLocaleTimeString('en-US', { hour12: false })), RUNTIME_INTERVALS.adminClockMs)
    
    async function sync() {
      try {
        const res = await fetch(API_ENDPOINTS.siteStats)
        if (res.ok) {
          const json = await res.json()
          setData({
            alerts: [...(json.alerts || []), ...STATIC_ADMIN_ALERTS],
            services: json.services || []
          })
        }
      } catch (e) {
        console.error(e)
        setData((current) => ({
          ...current,
          alerts: current.alerts.length ? current.alerts : STATIC_ADMIN_ALERTS,
        }))
      }
    }
    sync(); const syncId = setInterval(sync, RUNTIME_INTERVALS.adminStatsRefreshMs)
    return () => { clearInterval(timer); clearInterval(syncId) }
  }, [])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ADMIN_NOTIFICATION_SETTINGS_STORAGE_KEY)
      if (stored) setNotificationSettings(resolveNotificationSettings(JSON.parse(stored)))
    } catch {
      // Keep the dashboard usable when localStorage is unavailable.
    }

    async function loadNotificationSettings() {
      try {
        const response = await fetch(API_ENDPOINTS.notificationSettings)
        if (!response.ok) return
        const loadedSettings = resolveNotificationSettings(await response.json())
        setNotificationSettings(loadedSettings)
        window.localStorage.setItem(ADMIN_NOTIFICATION_SETTINGS_STORAGE_KEY, JSON.stringify(loadedSettings))
      } catch {
        // Static exports can run without the notification proxy.
      }
    }

    loadNotificationSettings()
  }, [])

  // Acknowledgements are server-shared (visible to every admin). The local
  // storage mirror gives an instant first render and keeps the Navbar badge in
  // sync within the tab via the change event; the server is the source of truth.
  useEffect(() => {
    const syncAcknowledgedAlertIdsFromStorage = () => {
      setAcknowledgedAlertIds(new Set(readAcknowledgedAlertIdsFromStorage()))
    }

    syncAcknowledgedAlertIdsFromStorage()
    window.addEventListener(ADMIN_ACKNOWLEDGED_ALERTS_CHANGED_EVENT, syncAcknowledgedAlertIdsFromStorage)

    // Reconcile with the shared server list so acks made on other workstations
    // appear here too; seed the local mirror + notify the Navbar.
    let cancelled = false
    ;(async () => {
      const ids = await adminContentClient.fetchAcknowledgedAlerts()
      if (!cancelled && ids) {
        setAcknowledgedAlertIds(new Set(ids))
        persistAcknowledgedAlertIds(ids)
      }
    })()

    return () => {
      cancelled = true
      window.removeEventListener(ADMIN_ACKNOWLEDGED_ALERTS_CHANGED_EVENT, syncAcknowledgedAlertIdsFromStorage)
    }
  }, [])

  // Dismissals are server-shared: pull the canonical list on mount so they
  // persist across refresh AND rebuild and are visible to every admin.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const records = await adminContentClient.fetchDismissals()
      if (!cancelled && records) setDismissalsById(new Map(records.map((r) => [r.id, r])))
    })()
    return () => { cancelled = true }
  }, [])

  const acknowledgeAlert = useCallback(async (id: string) => {
    // Optimistic local update + mirror so the UI and Navbar badge react
    // instantly, then persist to the shared server list and reconcile.
    const optimistic = normalizeAcknowledgedAlertIds([...Array.from(acknowledgedAlertIds), id])
    setAcknowledgedAlertIds(new Set(optimistic))
    persistAcknowledgedAlertIds(optimistic)
    const ids = await adminContentClient.acknowledgeAlert(id)
    if (ids) {
      setAcknowledgedAlertIds(new Set(ids))
      persistAcknowledgedAlertIds(ids)
    }
  }, [acknowledgedAlertIds])

  const removeAlertFromView = useCallback(async (id: string) => {
    // Optimistic: attribute to the current admin immediately, then reconcile
    // with the server's authoritative list (real username + timestamp).
    const optimistic: AdminDismissalRecord = { id, by: whoami?.username || 'admin', at: new Date().toISOString() }
    setDismissalsById((current) => new Map(current).set(id, optimistic))
    const records = await adminContentClient.dismissAlert(id)
    if (records) setDismissalsById(new Map(records.map((r) => [r.id, r])))
  }, [whoami])

  const restoreAlert = useCallback(async (id: string) => {
    setDismissalsById((current) => {
      const next = new Map(current)
      next.delete(id)
      return next
    })
    const records = await adminContentClient.restoreAlert(id)
    if (records) setDismissalsById(new Map(records.map((r) => [r.id, r])))
  }, [])

  // Both tiles count through the SAME predicate the AlertsPanel filters with,
  // so the number on the tile is always the number of rows the panel renders.
  // They used to be two independent inline filters that happened to match.
  const activeAlerts = visibleAlerts(data.alerts, { dismissed: dismissalsById.keys() })
  const activeAlertCount = activeAlerts.length
  const feedbackCount = activeAlerts.filter((a) => a.category === 'feedback').length

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-2 text-cyan-500 mb-2">
            <Shield size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">SECURE ACCESS ONLY</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Admin Console</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {whoami && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-[10px] font-black uppercase tracking-widest text-cyan-200">
              <Shield size={12} />
              <span>{whoami.username}</span>
              <button
                onClick={handleSignOut}
                className="ml-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-slate-400 hover:text-red-300"
                title="Sign out of admin"
              >
                <LogOut size={12} /> Sign out
              </button>
            </div>
          )}
          <div className="px-4 py-2 rounded-xl bg-white/5 font-mono text-white text-lg tracking-widest">{clock}</div>
          <div className="px-4 py-2 rounded-xl bg-white/5 text-[10px] font-black text-cyan-400 uppercase tracking-widest">GFX: {tier}</div>
        </div>
      </div>

      {/* At-a-glance stats — visible immediately, no tab click required. */}
      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Alerts and Feedback share the monitor tab's one feed, so both tiles
              open it — the feed's own filter separates them. */}
          <StatTile icon={AlertTriangle} label="Active Alerts" value={activeAlertCount} tone={activeAlertCount > 0 ? 'amber' : 'emerald'} onOpen={() => openSection('monitor', 'system-events')} />
          <StatTile icon={MessageSquarePlus} label="Feedback" value={feedbackCount} onOpen={() => openSection('monitor', 'system-events')} />
          <StatTile icon={FolderTree} label="Custom Pages" value={pageCount ?? '—'} onOpen={() => openSection('pages', 'custom-pages')} />
          <StatTile icon={MessageSquareText} label="Chat Transcripts" value={transcriptCount ?? '—'} onOpen={() => openSection('transcripts', 'chat-transcripts')} />
        </div>
      </section>

      {/* Repository Controls — external management panels, placed above the
          section tabs. */}
      <section>
        <SectionHeader label="Repository Controls" hint="External Management Panels" />
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="https://apensupport.blcse.mil/cran-control/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-cyan-200 hover:bg-cyan-400/20"
          >
            <Boxes size={14} /> CRAN Control <ExternalLink size={11} className="opacity-60" />
          </a>
          <a
            href="https://apensupport.blcse.mil/pip-control/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-400/30 bg-indigo-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-indigo-200 hover:bg-indigo-400/20"
          >
            <Package size={14} /> PIP Control <ExternalLink size={11} className="opacity-60" />
          </a>
          <a
            href="https://apensupport.blcse.mil/iso-control/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-yellow-200 hover:bg-yellow-400/20"
          >
            <Boxes size={14} /> ISO Control <ExternalLink size={11} className="opacity-60" />
          </a>
          <a
            href="https://apenwingetrepo.blcse.mil/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-red-200 hover:bg-red-400/20"
          >
            <Boxes size={14} /> Winget Repo <ExternalLink size={11} className="opacity-60" />
          </a>
        </div>
      </section>

      {/* Console sections — switch between admin panels. Card grid (not a
          plain tab strip) so each section's purpose is visible at a glance,
          matching the /home and /applications hub visual language. */}
      <section>
        <SectionHeader label="Console Sections" hint="Select an admin panel" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ADMIN_SECTIONS.map(({ id, label }) => {
            const Icon = ADMIN_SECTION_ICONS[id]
            const active = tab === id
            return (
              <button key={id} onClick={() => selectTab(id)} className="text-left">
                <GlowCard
                  glowColor={active ? 'cyan' : 'indigo'}
                  className={`h-full p-4 transition-colors ${active ? 'border-cyan-400/40' : ''}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-cyan-400/15 text-cyan-300' : 'bg-white/5 text-slate-400'}`}>
                      <Icon size={15} aria-hidden="true" />
                    </div>
                    <p className={`text-xs font-black uppercase tracking-widest ${active ? 'text-cyan-200' : 'text-white'}`}>{label}</p>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{ADMIN_SECTION_DESCRIPTIONS[id]}</p>
                </GlowCard>
              </button>
            )
          })}
        </div>
      </section>

      {tab === 'monitor' && (
        <>
          <section>
            <SectionHeader label="Real-Time Traffic" hint="Nginx Edge Stats" />
            <div className="space-y-6">
              <ActivityChartCard title="Site Activity" apiEndpoint={API_ENDPOINTS.siteStats} showTopIPs />
              <NginxStatusSummary />
            </div>
          </section>

          <section>
            <SectionHeader label="Notification Routing" hint="Preferences only — no mail transport is connected on this host" />
            <NotificationSettingsPanel settings={notificationSettings} onSettingsChange={setNotificationSettings} />
          </section>

          <section id="system-events-feedback">
            <div id="site-history" className="scroll-mt-24" />
            <SectionHeader label="Site History" hint="Admin-only record — hidden from /home" />
            <div className="mb-12">
              <SiteHistoryPanel />
            </div>

            <div id="system-events" className="scroll-mt-24" />
            <SectionHeader label="System Events & Feedback" hint="Persisted Inbound Feed" />
            <AlertsPanel
              alerts={data.alerts}
              acknowledgedAlertIds={acknowledgedAlertIds}
              dismissalsById={dismissalsById}
              onAcknowledgeAlert={acknowledgeAlert}
              onRemoveAlert={removeAlertFromView}
              onRestoreAlert={restoreAlert}
            />
          </section>

          <section>
            <SectionHeader label="Infrastructure Nodes" hint="Live Endpoint Monitoring" />
            <p className="text-xs text-slate-400 -mt-3 mb-6 max-w-3xl leading-relaxed">
              Each card represents a real endpoint the site-stats proxy probes on a recurring interval.
              Click any card to see its target URL, recent uptime, and last response. Use
              <span className="text-cyan-300 mx-1">Add node</span> or <span className="text-cyan-300">Edit</span>
              to adjust what gets monitored — changes persist to <code className="text-cyan-400">infrastructure-nodes.json</code>.
            </p>
            <InfrastructureNodesPanel services={data.services} />
          </section>

          <section>
            <SectionHeader label="Live Announcement Scan Roots" hint="Home-page upload feed" />
            <p className="text-xs text-slate-400 -mt-3 mb-6 max-w-3xl leading-relaxed">
              These are the folders the site scans for newly uploaded files to surface in the
              home-page announcements feed. Changes save to
              <code className="text-cyan-400 mx-1">announcement-paths.json</code> and take effect
              immediately — no proxy restart or <code className="text-cyan-400">.env.local</code> edit needed.
            </p>
            <AnnouncementPathsPanel />
          </section>
        </>
      )}

      {tab === 'nginx' && (
        <section>
          <SectionHeader label="NGINX Server Status" hint="Live VTS metrics" />
          <p className="text-xs text-slate-400 -mt-3 mb-6 max-w-3xl leading-relaxed">
            The live activity view: per-zone, per-upstream, TCP/UDP and cache breakdowns. Data comes from the
            <code className="text-cyan-400 mx-1">nginx-module-vts</code> module via the site-stats proxy. If the
            module isn&apos;t installed yet, the panel says so rather than showing fabricated numbers — see
            <code className="text-cyan-400 mx-1">proxy/NGINX_VTS_RUNBOOK.md</code>.
          </p>
          <NginxServerStatusPanel />
          <div className="mt-6">
            <NginxManagedEditor />
          </div>
        </section>
      )}

      {tab === 'content' && (
        <section>
          <SectionHeader label="Live Content Overrides" hint="Update cards without redeploying" />
          <p className="text-xs text-slate-400 -mt-3 mb-6 max-w-3xl leading-relaxed">
            Pick a section, edit a card&apos;s fields, and save. The change is written to the proxy&apos;s
            <code className="text-cyan-400 mx-1">content-overrides.json</code> and is layered onto the live page on
            the next visit. Use <span className="text-cyan-300">Revert</span> to drop an override and fall back to
            the static defaults shipped at build time.
          </p>
          <AdminContentEditor />
        </section>
      )}

      {tab === 'chips' && (
        <section>
          <SectionHeader label="Chat Assistant Chips" hint="Suggested prompts on the APEN-chat-assistant" />
          <p className="text-xs text-slate-400 -mt-3 mb-6 max-w-3xl leading-relaxed">
            Add, remove, modify, or reorder the clickable prompt chips shown under
            <span className="text-cyan-300 mx-1">“APEN Knowledge Base Active”</span> when the chat is empty. Changes save to the
            proxy&apos;s <code className="text-cyan-400">assistant-prompts.json</code> and reach the chat on its next page load —
            no rebuild. <span className="text-cyan-300">Reset to defaults</span> restores the built-in chips.
          </p>
          <AdminAssistantChipsPanel />
        </section>
      )}

      {tab === 'assistant-prompt' && (
        <section>
          <SectionHeader label="Assistant Knowledge" hint="Who Voltron is and what the APEN offers" />
          <p className="text-xs text-slate-400 -mt-3 mb-6 max-w-3xl leading-relaxed">
            The editable half of the assistant&apos;s system prompt: its persona, the site sections it knows about,
            and the <span className="text-cyan-300">AI SERVICES</span> list it answers &ldquo;what AI do we have&rdquo;
            from. Saves to the proxy&apos;s <code className="text-cyan-400">assistant-system-prompt.json</code> and
            takes effect on the <em>next question asked</em> — no rebuild, no restart. Add a service here the moment it
            goes live; if it is not listed, the assistant is told to say so rather than guess.
            <br />
            The response-format and anti-hallucination rules are not editable here on purpose — they encode what the
            chat panel can render and what stops invented links. Those live in
            <code className="text-cyan-400 mx-1">proxy/assistant-knowledge.mjs</code> and change with a deploy.
          </p>
          <AdminAssistantPromptPanel />
        </section>
      )}

      {tab === 'wizard' && (
        <section>
          <SectionHeader label="New Page Wizard" hint="Create a published page in 4 steps" />
          <p className="text-xs text-slate-400 -mt-3 mb-6 max-w-3xl leading-relaxed">
            Walk through the wizard to create a brand-new page without writing code. The wizard validates every
            step, prevents slug collisions, and publishes to <code className="text-cyan-400">/&lt;section&gt;/&lt;slug&gt;</code>.
          </p>
          <AdminPageWizard />
        </section>
      )}

      {tab === 'pages' && (
        <section>
          <div id="custom-pages" className="scroll-mt-24" />
          <SectionHeader label="Custom Pages" hint="Everything published via the wizard" />
          <p className="text-xs text-slate-400 -mt-3 mb-6 max-w-3xl leading-relaxed">
            Read-only audit of every page created by the New Page Wizard. Each row shows the URL,
            section, last update, and a delete control. Use the wizard to create new pages.
          </p>
          <AdminCustomPagesPanel />
        </section>
      )}

      {tab === 'transcripts' && (
        <section>
          <div id="chat-transcripts" className="scroll-mt-24" />
          <SectionHeader label="Chat Transcripts" hint="Signed-in user conversations" />
          <p className="text-xs text-slate-400 -mt-3 mb-6 max-w-3xl leading-relaxed">
            Every signed-in user&apos;s chat transcript (one record per realm + username — the same document a user
            sees on any device once logged in there). Click a row to expand the full conversation. Export the whole
            list as Markdown, CSV, or PDF with <span className="text-cyan-300">Export</span> above.
          </p>
          <AdminChatTranscriptsPanel />
        </section>
      )}

      {tab === 'security' && (
        <section>
          <div id="sign-in-security" className="scroll-mt-24" />
          <SectionHeader label="Sign-In Security" hint="Refused sign-ins and spoof attempts" />
          <p className="text-xs text-slate-400 -mt-3 mb-6 max-w-3xl leading-relaxed">
            Sign-ins this server refused <span className="text-cyan-300">before</span> contacting a domain controller —
            so they appear in no Windows security log. A name that claims two domains at once (
            <span className="font-mono text-slate-400">DOMAIN\user@domain</span>), names a domain this site does not
            serve, or carries LDAP metacharacters is recorded as a <span className="text-red-300">spoof</span> attempt.
            Ordinary mistakes, such as omitting the domain, are recorded separately.
          </p>
          <AuthEventsPanel />
        </section>
      )}
    </div>
  )
}
