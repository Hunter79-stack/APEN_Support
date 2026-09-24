'use client'

/**
 * InfrastructureNodesPanel
 *
 * Read path:   GET /api/site-stats              (services array — public-ish)
 * Admin path:  GET/POST/DELETE /api/admin/infrastructure-nodes
 *              POST /api/admin/infrastructure-nodes/probe
 */

import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { GlowCard } from '@/components/ui/spotlight-card'
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Edit3,
  ExternalLink,
  Plus,
  RefreshCw,
  Trash2,
  Clock,
  Wifi,
  WifiOff,
  CheckCircle2,
  Save,
  X,
  XCircle,
} from 'lucide-react'
import { API_ENDPOINTS } from '@/lib/data/runtime'
import { adminContentClient, adminAuthHeaders } from '@/lib/data/admin-content'
import type { AdminServiceItem } from '@/lib/data/admin'

interface InfrastructureNodesPanelProps {
  /** Services array from the latest site-stats refresh. The panel keeps
   *  using this until its own admin fetch returns a richer payload. */
  services: AdminServiceItem[]
}

interface NodeDraft {
  id: string
  name: string
  kind: 'http' | 'tcp'
  target: string
  healthCheckUrl: string
  localAddress: string
  probeViaProxy: boolean
  description: string
  timeoutMs: number
  expectedStatusInput: string
}

const EMPTY_DRAFT: NodeDraft = {
  id: '',
  name: '',
  kind: 'http',
  target: '',
  healthCheckUrl: '',
  localAddress: '',
  probeViaProxy: false,
  description: '',
  timeoutMs: 5000,
  expectedStatusInput: '',
}

/**
 * Turn a non-OK fetch response into a sentence the admin can act on.
 * Prefers the proxy's own JSON `error` field, falls back to the response
 * body, and tacks on a hint for the most common failure modes (proxy not
 * restarted, token rejected, etc).
 */
async function explainHttpError(res: Response, attemptedUrl: string, action: string): Promise<string> {
  let serverMsg = ''
  // Try JSON first since our proxy returns { error: "…" } on failures.
  const cloned = res.clone()
  try {
    const data = await res.json()
    if (typeof data?.error === 'string') serverMsg = data.error
  } catch {
    // Not JSON — pull the first line of the raw body so we still get *something*.
    try { serverMsg = (await cloned.text()).split('\n')[0].slice(0, 200) } catch { /* ignore */ }
  }

  const head = `Couldn't ${action} — HTTP ${res.status} from ${attemptedUrl}`
  const tail = serverMsg ? ` — ${serverMsg}` : ''

  let hint = ''
  if (res.status === 404) {
    hint = ' This usually means the site-stats proxy doesn\'t know about that endpoint yet. Restart it (`npm run stats` or `npm run dev:all`) so it picks up the latest code, then try again.'
  } else if (res.status === 401) {
    hint = ' Your admin session or its CSRF token was rejected — most often the session expired, or you are signed in as a non-admin user. Sign in again and retry. (If this proxy is running without a session, re-enter the admin token on the Edit pages & cards tab.)'
  } else if (res.status === 403) {
    hint = ' The proxy refused the request. Check that nginx (in production) or the proxy IP allowlist permits this workstation.'
  } else if (res.status === 405) {
    hint = ' The proxy doesn\'t accept that HTTP method on that URL. If you just upgraded the proxy code, restart it.'
  } else if (res.status === 408 || res.status === 504) {
    hint = ' The proxy timed out. One of the probed nodes may be slow or hung — check the terminal output for the offending target.'
  } else if (res.status === 413) {
    hint = ' Request body was too large. This shouldn\'t happen for probe-now; report it.'
  } else if (res.status >= 500) {
    hint = ' The proxy hit an internal error. Check the npm run stats terminal output for the stack trace.'
  }

  return `${head}${tail}.${hint}`
}

/** Wrap a fetch that may fail with a network error, so the user always sees
 *  the URL we tried to reach instead of a bare "Failed to fetch". */
async function fetchOrExplain(url: string, init: RequestInit, action: string): Promise<{ ok: true; res: Response } | { ok: false; message: string }> {
  try {
    const res = await fetch(url, init)
    if (!res.ok) return { ok: false, message: await explainHttpError(res, url, action) }
    return { ok: true, res }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      ok: false,
      message: `Couldn't ${action} — could not reach ${url}. ${msg}. Is the site-stats proxy running? (try \`npm run stats\` or \`npm run dev:all\`).`,
    }
  }
}

/** Status → visual treatment. Keeps every "what does this state look like?"
 *  decision in one place so the dot, the pill, and the card border all stay
 *  in lockstep. The intent is that an offline node is unmistakably offline
 *  the second your eye lands on it — bigger dot, tighter pulse, and an
 *  alarm-coloured ring around the whole card. */
type StatusKind = 'online' | 'degraded' | 'offline' | 'probing' | 'unknown'

function statusKind(status: string | undefined | null): StatusKind {
  if (status === 'online' || status === 'degraded' || status === 'offline' || status === 'probing') return status
  return 'unknown'
}

interface StatusVisual {
  label: string
  /** Tailwind classes for the lit dot in the card header. */
  dotClass: string
  /** Tailwind classes for the status pill background+text. */
  pillClass: string
  /** Card-level ring/border classes — applied to the GlowCard wrapper. */
  cardRing: string
  /** Icon component shown inside the pill. */
  Icon: typeof CheckCircle2
}

function statusVisualFor(status: string | undefined | null): StatusVisual {
  switch (statusKind(status)) {
    case 'online':
      return {
        label: 'Online',
        // Small, calm pulse — green is the boring "everything is fine" state.
        dotClass: 'w-2 h-2 bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse',
        pillClass: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
        cardRing: '',
        Icon: CheckCircle2,
      }
    case 'degraded':
      return {
        label: 'Degraded',
        // Larger dot, tinted ring so the eye lands on it before the green ones.
        dotClass: 'w-2.5 h-2.5 bg-amber-400 shadow-[0_0_12px_#fbbf24] ring-2 ring-amber-300/40 animate-pulse',
        pillClass: 'border-amber-400/40 bg-amber-400/15 text-amber-100',
        cardRing: 'ring-1 ring-amber-400/30',
        Icon: AlertTriangle,
      }
    case 'offline':
      return {
        label: 'Probe failed',
        // Biggest dot, brightest glow, a wider red ring around the dot. The
        // .animate-ping on a sibling inside StatusDot adds the urgent ripple.
        dotClass: 'w-3 h-3 bg-red-500 shadow-[0_0_16px_#ef4444] ring-2 ring-red-400/60 animate-pulse',
        pillClass: 'border-red-400/60 bg-red-500/25 text-red-100',
        cardRing: 'ring-1 ring-red-400/50',
        Icon: XCircle,
      }
    case 'probing':
      return {
        label: 'Probing',
        dotClass: 'w-2 h-2 bg-cyan-400 animate-pulse',
        pillClass: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
        cardRing: '',
        Icon: Activity,
      }
    default:
      return {
        label: status || 'Unknown',
        dotClass: 'w-2 h-2 bg-slate-500',
        pillClass: 'border-white/10 bg-white/5 text-slate-300',
        cardRing: '',
        Icon: Activity,
      }
  }
}

/** A bigger, state-aware indicator dot. For failed/degraded states it adds a
 *  second `animate-ping` ring so the badge actively grabs the admin's eye —
 *  green stays calm, red ripples until the probe succeeds again. */
function StatusDot({ status }: { status: string | undefined | null }) {
  const visual = statusVisualFor(status)
  const kind = statusKind(status)
  const showPing = kind === 'offline' || kind === 'degraded'
  const pingClass = kind === 'offline' ? 'bg-red-400/40' : 'bg-amber-400/30'
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" aria-hidden="true">
      {showPing && (
        <span className={`absolute inline-flex h-4 w-4 rounded-full ${pingClass} animate-ping`} />
      )}
      <span className={`relative rounded-full ${visual.dotClass}`} />
    </span>
  )
}

/** A coloured pill-shaped label so the textual status reinforces the dot. */
function StatusPill({ status }: { status: string | undefined | null }) {
  const visual = statusVisualFor(status)
  const Icon = visual.Icon
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${visual.pillClass}`}
      role="status"
      aria-label={`Status: ${visual.label}`}
    >
      <Icon size={10} aria-hidden="true" />
      {visual.label}
    </span>
  )
}

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return 'never'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 'never'
  const seconds = Math.max(0, Math.round((Date.now() - t) / 1000))
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`
  if (seconds < 86_400) return `${Math.round(seconds / 3600)}h ago`
  return `${Math.round(seconds / 86_400)}d ago`
}

export function InfrastructureNodesPanel({ services }: InfrastructureNodesPanelProps) {
  // The panel keeps its own copy of the services list so it can refresh more
  // aggressively than the dashboard's 15s sync (e.g. right after the admin
  // saves a new node, we re-fetch immediately).
  const [liveServices, setLiveServices] = useState<AdminServiceItem[]>(services)
  const [openNodeId, setOpenNodeId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<NodeDraft>(EMPTY_DRAFT)
  const [showAddForm, setShowAddForm] = useState(false)
  const [busy, setBusy] = useState<'idle' | 'probing' | 'saving' | 'deleting'>('idle')
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [adminAvailable, setAdminAvailable] = useState<boolean | null>(null)

  // Sync the parent's services into local state whenever the parent refreshes
  // (adjusted during render rather than in an effect: no extra commit).
  const [seenServices, setSeenServices] = useState(services)
  if (services !== seenServices) { setSeenServices(services); setLiveServices(services) }

  /** Pull the admin-only payload (which includes raw node config). Probes the
   *  proxy without a token first so an "open" proxy (no ADMIN_API_TOKEN set,
   *  or ADMIN_AUTH_DISABLED=1) unlocks the editor without any UI step. Only
   *  falls back to "needs token" on a real 401. */
  const refreshAdmin = useCallback(async () => {
    try {
      const res = await fetch(API_ENDPOINTS.adminInfrastructureNodes, {
        cache: 'no-store',
        headers: adminAuthHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data?.services)) setLiveServices(data.services as AdminServiceItem[])
        setAdminAvailable(true)
        return data
      }
      if (res.status === 401) setAdminAvailable(false)
      else {
        // Non-401 failures (404, 5xx) DO get surfaced so the admin knows the
        // panel is showing stale state — they likely need to restart the proxy.
        setFeedback({
          kind: 'err',
          text: await explainHttpError(res, API_ENDPOINTS.adminInfrastructureNodes, 'load infrastructure nodes'),
        })
      }
    } catch {
      setAdminAvailable(false)
    }
    return null
  }, [])

  useEffect(() => { refreshAdmin() }, [refreshAdmin])

  const handleProbeNow = useCallback(async () => {
    setBusy('probing')
    setFeedback(null)
    const result = await fetchOrExplain(
      API_ENDPOINTS.adminInfrastructureNodesProbe,
      { method: 'POST', headers: adminAuthHeaders({ write: true }) },
      're-probe nodes',
    )
    if (!result.ok) {
      setFeedback({ kind: 'err', text: result.message })
      setBusy('idle')
      return
    }
    try {
      const data = await result.res.json()
      if (Array.isArray(data?.services)) setLiveServices(data.services as AdminServiceItem[])
      setFeedback({ kind: 'ok', text: 'All nodes re-probed.' })
    } catch (err) {
      setFeedback({
        kind: 'err',
        text: `Re-probe finished but the response wasn't valid JSON (${err instanceof Error ? err.message : String(err)}). Status pills may be stale until the next 30-second sweep.`,
      })
    } finally {
      setBusy('idle')
    }
  }, [])

  const beginEdit = useCallback((service: AdminServiceItem) => {
    setEditingId(service.id)
    setShowAddForm(false)
    setDraft({
      id: service.id,
      name: service.name,
      kind: (service.kind as 'http' | 'tcp') || 'http',
      target: service.target || '',
      healthCheckUrl: service.healthCheckUrl || '',
      localAddress: service.localAddress || '',
      probeViaProxy: !!service.probeViaProxy,
      description: service.description || '',
      timeoutMs: service.timeoutMs ?? 5000,
      expectedStatusInput: (service.expectedStatus || []).join(', '),
    })
  }, [])

  const beginAdd = useCallback(() => {
    setShowAddForm(true)
    setEditingId(null)
    setDraft(EMPTY_DRAFT)
  }, [])

  const handleSave = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy('saving')
    setFeedback(null)
    // The server's POST is an upsert keyed on id, and it REPLACES the record
    // rather than merging. Without this guard, adding a node whose id already
    // exists silently destroys that node's whole config and still reports
    // "Node added." The slice(0, 64) mirrors sanitizeNode's truncation, so a
    // longer id that collides only after truncation is caught too.
    const wantedId = draft.id.trim().slice(0, 64)
    if (!editingId && liveServices.some((s) => s.id === wantedId)) {
      setFeedback({
        kind: 'err',
        text: `A node with id "${wantedId}" already exists. Pick a different id, or expand that card and use Edit.`,
      })
      setBusy('idle')
      return
    }
    const expectedStatus = draft.expectedStatusInput
      .split(',')
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n))
    const payload = {
      id: draft.id,
      name: draft.name,
      kind: draft.kind,
      target: draft.target,
      healthCheckUrl: draft.healthCheckUrl.trim() || undefined,
      localAddress: draft.localAddress.trim() || undefined,
      // probeViaProxy only applies to http probes.
      probeViaProxy: draft.kind === 'http' ? draft.probeViaProxy : undefined,
      description: draft.description,
      timeoutMs: draft.timeoutMs,
      expectedStatus: expectedStatus.length ? expectedStatus : undefined,
    }
    const result = await fetchOrExplain(
      API_ENDPOINTS.adminInfrastructureNodes,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders({ write: true }) },
        body: JSON.stringify(payload),
      },
      editingId ? 'update node' : 'add node',
    )
    if (!result.ok) {
      setFeedback({ kind: 'err', text: result.message })
      setBusy('idle')
      return
    }
    setFeedback({ kind: 'ok', text: editingId ? 'Node updated.' : 'Node added.' })
    setEditingId(null)
    setShowAddForm(false)
    setDraft(EMPTY_DRAFT)
    await refreshAdmin()
    setBusy('idle')
  }, [draft, editingId, liveServices, refreshAdmin])

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (!window.confirm(`Stop monitoring "${name}"? The node will be removed from this list.`)) return
    setBusy('deleting')
    setFeedback(null)
    const result = await fetchOrExplain(
      API_ENDPOINTS.adminInfrastructureNodes,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders({ write: true }) },
        body: JSON.stringify({ id }),
      },
      `remove node "${name}"`,
    )
    if (!result.ok) {
      setFeedback({ kind: 'err', text: result.message })
      setBusy('idle')
      return
    }
    setFeedback({ kind: 'ok', text: `Removed "${name}".` })
    if (editingId === id) { setEditingId(null); setDraft(EMPTY_DRAFT) }
    await refreshAdmin()
    setBusy('idle')
  }, [editingId, refreshAdmin])

  const counts = useMemo(() => {
    // Classify with the same helper the cards use. Re-deriving it here is what
    // let an unrecognised status show as "probing" in the toolbar and
    // "Unknown" on the card at the same time.
    const out = { online: 0, offline: 0, degraded: 0, probing: 0, unknown: 0, total: liveServices.length }
    for (const s of liveServices) out[statusKind(s.status)]++
    return out
  }, [liveServices])

  /* ── Staleness ─────────────────────────────────────────────────────────
   * A dead monitor is invisible on a monitoring tab: AdminDashboard keeps the
   * last good snapshot when its poll fails (no `else` on `if (res.ok)`), so if
   * apen-stats-api stops, every card sits green forever. The nodes' own
   * lastCheckedAt is the honest clock — when the newest one stops advancing,
   * the probe loop is not running, whatever the pills say. Ticks locally
   * because a failed parent poll produces no new props to re-render on. */
  const [nowMs, setNowMs] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 5_000)
    return () => clearInterval(id)
  }, [])

  const staleSeconds = useMemo(() => {
    if (!nowMs) return null
    let newest = 0
    for (const s of liveServices) {
      const t = s.lastCheckedAt ? Date.parse(s.lastCheckedAt) : NaN
      if (Number.isFinite(t) && t > newest) newest = t
    }
    if (!newest) return null
    return Math.max(0, Math.round((nowMs - newest) / 1000))
  }, [liveServices, nowMs])

  // The server polls every NODE_POLL_INTERVAL_MS (30s default). Three missed
  // cycles is the threshold — long enough that one slow sweep is not an alarm.
  const isStale = staleSeconds !== null && staleSeconds > 95

  return (
    <div className="space-y-4">
      {isStale && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-xs text-amber-100">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>
            <strong className="font-black uppercase tracking-widest">Stale data.</strong>{' '}
            No node has been probed for {staleSeconds}s (the server probes every 30s). The statuses
            below are a frozen snapshot and may no longer be true — the site-stats service is
            probably down or unreachable. Check <code className="text-amber-200">pm2 status apen-stats-api</code>.
          </span>
        </div>
      )}
      {/* Toolbar — counts + probe-now + add. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-200">
            <Wifi size={11} /> {counts.online} online
          </span>
          {counts.unknown > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-300">
              <Activity size={11} /> {counts.unknown} unknown
            </span>
          )}
          {counts.degraded > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-200">
              <AlertTriangle size={11} /> {counts.degraded} degraded
            </span>
          )}
          {counts.offline > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-red-200">
              <WifiOff size={11} /> {counts.offline} offline
            </span>
          )}
          {counts.probing > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-200">
              <Activity size={11} /> {counts.probing} probing
            </span>
          )}
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{counts.total} total</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleProbeNow}
            disabled={busy === 'probing'}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-cyan-400/30 hover:text-cyan-300 disabled:opacity-50"
          >
            <RefreshCw size={12} className={busy === 'probing' ? 'animate-spin' : ''} /> Probe now
          </button>
          {adminAvailable !== false && (
            <button
              onClick={beginAdd}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 text-[10px] font-black uppercase tracking-widest text-cyan-200 hover:bg-cyan-400/20"
            >
              <Plus size={12} /> Add node
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          role={feedback.kind === 'err' ? 'alert' : 'status'}
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed ${
            feedback.kind === 'ok'
              ? 'border-emerald-400/30 bg-emerald-400/5 text-emerald-200'
              : 'border-red-400/30 bg-red-500/5 text-red-200'
          }`}
        >
          {feedback.kind === 'ok'
            ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
            : <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          }
          <span className="flex-1 whitespace-pre-wrap break-words">{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="shrink-0 text-slate-400 hover:text-white"
            aria-label="Dismiss message"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {adminAvailable === false && (
        <InlineTokenForm
          onAuthorized={async () => {
            setAdminAvailable(null)
            await refreshAdmin()
          }}
        />
      )}

      {/* Add-node form (top of list) */}
      {showAddForm && adminAvailable !== false && (
        <NodeForm
          draft={draft}
          setDraft={setDraft}
          onSubmit={handleSave}
          onCancel={() => { setShowAddForm(false); setDraft(EMPTY_DRAFT) }}
          submitLabel="Add node"
          busy={busy === 'saving'}
          isEditing={false}
        />
      )}

      {/* Node cards.
          `items-start` keeps each card sized to its own content. Without it,
          CSS grid's default align-items:stretch makes the un-expanded card in
          a row balloon to match the expanded sibling's height. With it, an
          expanded card can grow downward freely while its row-mates stay
          collapsed at their natural size. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {liveServices.length === 0 && (
          <GlowCard glowColor="indigo" className="p-6 text-center lg:col-span-2">
            <p className="text-sm text-slate-400">No nodes configured yet.</p>
            <p className="text-xs text-slate-400 mt-1">Click <span className="text-cyan-300">Add node</span> to start monitoring something.</p>
          </GlowCard>
        )}
        {liveServices.map((service) => {
          const isOpen = openNodeId === service.id
          const isEditing = editingId === service.id
          const visual = statusVisualFor(service.status)
          const kind = statusKind(service.status)
          const probeFailed = kind === 'offline' || kind === 'degraded'
          return (
            <GlowCard
              key={service.id}
              className={`p-4 ${visual.cardRing}`}
              glowColor={kind === 'offline' ? 'red' : kind === 'degraded' ? 'amber' : 'cyan'}
            >
              {/* Header row — click to expand */}
              <button
                type="button"
                onClick={() => setOpenNodeId(isOpen ? null : service.id)}
                className="flex w-full items-start justify-between gap-3 text-left"
                aria-label={`${service.name} — status ${visual.label}`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="pt-1">
                    <StatusDot status={service.status} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{service.name}</p>
                    <p className="text-[10px] font-mono text-slate-400 truncate">{service.target || service.id}</p>
                    {/* Inline probe-failure preview when the card is collapsed.
                        Surfaces *why* the dot is red without making the admin
                        click to expand. Hidden once the card is opened (the
                        full error gets its own callout below). */}
                    {!isOpen && probeFailed && service.error && (
                      <p
                        className={`mt-1 text-[10px] font-medium truncate ${
                          kind === 'offline' ? 'text-red-300' : 'text-amber-300'
                        }`}
                        title={service.error}
                      >
                        ⚠ {service.error}
                      </p>
                    )}
                    {!isOpen && probeFailed && !service.error && service.httpStatus != null && (
                      <p className="mt-1 text-[10px] font-medium text-amber-300 truncate">
                        ⚠ Returned HTTP {service.httpStatus}
                        {service.expectedStatus && service.expectedStatus.length
                          ? ` (expected ${service.expectedStatus.join(', ')})`
                          : ''}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                  <StatusPill status={service.status} />
                  <span className="text-[10px] font-mono text-slate-400">{service.latency}</span>
                  {isOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                </div>
              </button>

              {/* Expanded — details + history */}
              {isOpen && !isEditing && (
                <div className="mt-4 space-y-3 border-t border-white/5 pt-3">
                  {service.description && (
                    <p className="text-xs text-slate-400 leading-relaxed">{service.description}</p>
                  )}
                  <dl className="grid grid-cols-2 gap-2 text-[11px]">
                    <Stat label="Probe type" value={service.kind?.toUpperCase() || '—'} />
                    <Stat label={service.healthCheckUrl ? 'Link target' : 'Target'} value={service.target || '—'} mono />
                    {service.healthCheckUrl && (
                      <Stat label="Probed (health-check)" value={service.healthCheckUrl} mono />
                    )}
                    {service.localAddress && (
                      <Stat label="Source IP (NIC)" value={service.localAddress} mono />
                    )}
                    {service.probeViaProxy && (
                      <Stat label="Routing" value="Via site nginx (loopback)" />
                    )}
                    <Stat label="Last response" value={service.latencyMs != null ? `${service.latencyMs} ms` : '—'} />
                    <Stat label="Last checked" value={formatRelativeTime(service.lastCheckedAt)} hint={service.lastCheckedAt ? new Date(service.lastCheckedAt).toLocaleString() : undefined} />
                    {service.kind === 'http' && (
                      <Stat label="HTTP status" value={service.httpStatus != null ? String(service.httpStatus) : '—'} />
                    )}
                    {service.kind === 'http' && service.expectedStatus && service.expectedStatus.length > 0 && (
                      <Stat label="Expected" value={service.expectedStatus.join(', ')} />
                    )}
                    <Stat label="Timeout" value={service.timeoutMs ? `${service.timeoutMs} ms` : '—'} />
                  </dl>
                  {service.error && (
                    <p className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
                      <strong className="font-bold uppercase tracking-widest mr-1">Error:</strong>
                      <code className="font-mono">{service.error}</code>
                    </p>
                  )}
                  {service.history && service.history.length > 0 && (
                    <HistorySparkline history={service.history} />
                  )}
                  {/* Action row */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {service.kind === 'http' && service.target && (
                      <a
                        href={service.target}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-cyan-400/30 hover:text-cyan-300"
                      >
                        <ExternalLink size={11} /> Open URL
                      </a>
                    )}
                    {adminAvailable !== false && (
                      <>
                        <button
                          onClick={() => beginEdit(service)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 text-[10px] font-black uppercase tracking-widest text-cyan-300 hover:bg-cyan-400/20"
                        >
                          <Edit3 size={11} /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(service.id, service.name)}
                          disabled={busy === 'deleting'}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-red-400/30 hover:text-red-300 disabled:opacity-50"
                        >
                          <Trash2 size={11} /> Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Inline edit form */}
              {isOpen && isEditing && (
                <div className="mt-4 border-t border-white/5 pt-3">
                  <NodeForm
                    draft={draft}
                    setDraft={setDraft}
                    onSubmit={handleSave}
                    onCancel={() => { setEditingId(null); setDraft(EMPTY_DRAFT) }}
                    submitLabel="Save changes"
                    busy={busy === 'saving'}
                    isEditing
                  />
                </div>
              )}
            </GlowCard>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Inline token entry — shown when the proxy returned 401 and the panel
       needs a token to enable add/edit/delete actions. Mirrors the TokenGate
       in AdminContentEditor so admins can authenticate without leaving this
       tab. */
function InlineTokenForm({ onAuthorized }: { onAuthorized: () => Promise<void> | void }) {
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault()
        if (!token.trim()) return
        setError('')
        setBusy(true)
        adminContentClient.setToken(token.trim())
        try {
          const res = await fetch(API_ENDPOINTS.adminInfrastructureNodes, {
            cache: 'no-store',
            headers: { 'x-admin-token': token.trim() },
          })
          if (res.ok) {
            await onAuthorized()
            setToken('')
          } else if (res.status === 401) {
            adminContentClient.clearToken()
            setError('Token rejected by the proxy. Check the value of ADMIN_API_TOKEN in .env.local.')
          } else {
            setError(await explainHttpError(res, API_ENDPOINTS.adminInfrastructureNodes, 'unlock infrastructure nodes'))
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err))
        } finally {
          setBusy(false)
        }
      }}
      className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-3 text-xs text-amber-200"
    >
      <p className="mb-2 leading-relaxed">
        Adding or editing nodes requires the admin token. Paste the value of
        <code className="mx-1 text-cyan-300">ADMIN_API_TOKEN</code> from your <code className="text-cyan-300">.env.local</code>
        — it&apos;s stored in this tab&apos;s sessionStorage only.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste ADMIN_API_TOKEN"
          autoComplete="off"
          className="h-9 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
        />
        <button
          type="submit"
          disabled={busy || !token.trim()}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 text-[10px] font-black uppercase tracking-widest text-cyan-300 hover:bg-cyan-400/20 disabled:opacity-50"
        >
          {busy ? 'Unlocking…' : 'Unlock'}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-[11px] text-red-300 leading-relaxed">{error}</p>
      )}
    </form>
  )
}

/* ─── Small stat display ─── */
function Stat({ label, value, hint, mono }: { label: string; value: string; hint?: string; mono?: boolean }) {
  return (
    <div title={hint}>
      <dt className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</dt>
      <dd className={`${mono ? 'font-mono break-all' : ''} text-slate-200 mt-0.5`}>{value}</dd>
    </div>
  )
}

/* ─── Mini sparkline of recent probes ─── */
function HistorySparkline({ history }: { history: NonNullable<AdminServiceItem['history']> }) {
  // Render newest at the right (reverse the array since the proxy stores newest-first).
  const reversed = useMemo(() => [...history].reverse(), [history])
  const maxLatency = useMemo(() => {
    const values = reversed.map((h) => h.latencyMs ?? 0).filter((v) => Number.isFinite(v))
    return Math.max(1, ...values)
  }, [reversed])
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">
        Recent probes ({reversed.length})
      </p>
      <div className="flex h-10 items-end gap-0.5">
        {reversed.map((h, i) => {
          const tone = h.status === 'online'
            ? 'bg-emerald-500/70'
            : h.status === 'degraded'
              ? 'bg-amber-400/80'
              : 'bg-red-500/70'
          const heightPct = h.latencyMs != null ? Math.max(8, (h.latencyMs / maxLatency) * 100) : 8
          return (
            <div
              key={i}
              className={`w-full ${tone} rounded-t-sm`}
              style={{ height: `${heightPct}%` }}
              title={`${h.status} · ${h.latencyMs != null ? `${h.latencyMs}ms` : 'no rtt'} · ${formatRelativeTime(h.at)}${h.error ? ` · ${h.error}` : ''}`}
            />
          )
        })}
      </div>
      <p className="mt-1 flex items-center gap-1 text-[9px] text-slate-400">
        <Clock size={9} /> oldest → newest
      </p>
    </div>
  )
}

/* ─── Node add/edit form ─── */
function NodeForm({
  draft,
  setDraft,
  onSubmit,
  onCancel,
  submitLabel,
  busy,
  isEditing,
}: {
  draft: NodeDraft
  setDraft: (next: NodeDraft) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  submitLabel: string
  busy: boolean
  isEditing: boolean
}) {
  const uid = useId() // label/control association; unique per rendered instance
  return (
    <GlowCard glowColor="cyan" className="p-4">
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2 flex items-baseline justify-between">
          <p className="text-xs font-black uppercase tracking-widest text-cyan-200">
            {isEditing ? 'Edit node' : 'New infrastructure node'}
          </p>
          <button type="button" onClick={onCancel} className="text-slate-400 hover:text-white" aria-label="Cancel">
            <X size={14} />
          </button>
        </div>
        {/* #3 — set expectations up front: probes run server-side, not from the
            admin's browser. This single line heads off the most common "but it
            opens for me!" confusion on segmented/multi-homed networks. */}
        <p className="sm:col-span-2 flex items-start gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-[11px] leading-relaxed text-cyan-100/80">
          <Activity size={13} className="mt-0.5 shrink-0 text-cyan-300" aria-hidden="true" />
          <span>
            Health checks run <strong className="font-bold">from the server</strong>, not your browser. A URL that opens
            for you may be unreachable from the server if they&apos;re on different network segments — use the
            <span className="text-cyan-300"> network options</span> below to point the probe at a reachable address.
          </span>
        </p>
        <div>
          <label htmlFor={`${uid}-f0`} className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Display name *</label>
          <input
            id={`${uid}-f0`}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="e.g. APEN Nginx Edge"
            required
            className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
          />
        </div>
        <div>
          <label htmlFor={`${uid}-f1`} className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Internal id *</label>
          <input
            id={`${uid}-f1`}
            value={draft.id}
            onChange={(e) => setDraft({ ...draft, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-') })}
            placeholder="web-edge"
            required
            disabled={isEditing}
            className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white font-mono outline-none focus:border-cyan-400/60 disabled:opacity-50"
          />
          <p className="mt-1 text-[10px] text-slate-400">Lowercase a-z, 0-9, hyphens. {isEditing ? 'Locked while editing.' : ''}</p>
        </div>
        <div>
          <label htmlFor={`${uid}-f2`} className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Probe type</label>
          <select
            id={`${uid}-f2`}
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value as 'http' | 'tcp' })}
            className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
          >
            <option value="http">HTTP / HTTPS request</option>
            <option value="tcp">TCP connect</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${uid}-f3`} className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Probe timeout (ms)</label>
          <input
            id={`${uid}-f3`}
            type="number"
            min={250}
            max={30_000}
            step={250}
            value={draft.timeoutMs}
            onChange={(e) => setDraft({ ...draft, timeoutMs: Number.parseInt(e.target.value, 10) || 5000 })}
            className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${uid}-f4`} className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {draft.kind === 'http' ? 'URL (link + default probe) *' : 'Host:port (link + default probe) *'}
          </label>
          <input
            id={`${uid}-f4`}
            value={draft.target}
            onChange={(e) => setDraft({ ...draft, target: e.target.value })}
            placeholder={draft.kind === 'http' ? 'https://apensupport.blcse.mil/' : 'db.internal:5432'}
            required
            className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white font-mono outline-none focus:border-cyan-400/60"
          />
          <p className="mt-1 text-[10px] text-slate-400">
            The browser-facing address — used for the <span className="text-slate-400">Open URL</span> link and probed by
            default. Override what the server checks with a Health-check URL below.
          </p>
        </div>
        {draft.kind === 'http' && (
          <div className="sm:col-span-2">
            <label htmlFor={`${uid}-f5`} className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Allowed HTTP statuses</label>
            <input
              id={`${uid}-f5`}
              value={draft.expectedStatusInput}
              onChange={(e) => setDraft({ ...draft, expectedStatusInput: e.target.value })}
              placeholder="200, 301, 302"
              className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
            />
            <p className="mt-1 text-[10px] text-slate-400">Comma-separated. Anything outside this list is reported as <span className="text-amber-300">degraded</span>. Leave blank for sane defaults (2xx + 3xx).</p>
          </div>
        )}
        {/* ── Network reachability options (#1 + #4) ───────────────────────
            Everything here is optional and only matters when the server can't
            reach the target the same way a browser can. Grouped + labelled so
            non-network admins know they're advanced. */}
        <div className="sm:col-span-2 rounded-lg border border-white/10 bg-black/20 p-3 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Network options <span className="font-normal normal-case tracking-normal text-slate-400">— optional, for server-side reachability</span>
          </p>
          <div>
            <label htmlFor={`${uid}-f6`} className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {draft.kind === 'http' ? 'Health-check URL' : 'Health-check host:port'}
            </label>
            <input
              id={`${uid}-f6`}
              value={draft.healthCheckUrl}
              onChange={(e) => setDraft({ ...draft, healthCheckUrl: e.target.value })}
              placeholder={draft.kind === 'http' ? 'e.g. https://172.16.2.22/api/  (leave blank to use the URL above)' : 'e.g. 172.16.2.22:443'}
              className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white font-mono outline-none focus:border-cyan-400/60"
            />
            <p className="mt-1 text-[10px] text-slate-400">
              What the <span className="text-slate-400">server</span> actually probes, when it differs from the link above.
              Point it at an IP or same-origin path the server can reach. Blank = probe the URL above.
            </p>
          </div>
          <div>
            <label htmlFor={`${uid}-f7`} className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Source IP (NIC)</label>
            <input
              id={`${uid}-f7`}
              value={draft.localAddress}
              onChange={(e) => setDraft({ ...draft, localAddress: e.target.value })}
              placeholder="e.g. 172.16.2.18 — bind the probe to a specific interface"
              className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white font-mono outline-none focus:border-cyan-400/60"
            />
            <p className="mt-1 text-[10px] text-slate-400">
              For multi-homed servers: force the probe out a specific network interface. Blank = let the OS choose.
            </p>
          </div>
          {draft.kind === 'http' && (
            <label className="flex items-start gap-2 text-[11px] text-slate-300">
              <input
                type="checkbox"
                checked={draft.probeViaProxy}
                onChange={(e) => setDraft({ ...draft, probeViaProxy: e.target.checked })}
                className="mt-0.5 h-4 w-4 accent-cyan-500"
              />
              <span>
                Probe via this site&apos;s nginx (loopback)
                <span className="block text-[10px] text-slate-400">
                  Sends the check through 127.0.0.1 keeping the original Host/SNI — use when the target is only
                  reachable through this site&apos;s reverse proxy, not directly from the server.
                </span>
              </span>
            </label>
          )}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${uid}-f8`} className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Description</label>
          <textarea
            id={`${uid}-f8`}
            rows={2}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="A short note about what this node does — shown when admins expand the card."
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
          />
        </div>
        <div className="sm:col-span-2 flex items-center gap-2 pt-2">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 text-[10px] font-black uppercase tracking-widest text-emerald-200 hover:bg-emerald-400/20 disabled:opacity-50"
          >
            <Save size={12} /> {busy ? 'Saving…' : submitLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-white/20"
          >
            Cancel
          </button>
        </div>
      </form>
    </GlowCard>
  )
}
