'use client'

/**
 * NginxServerStatusPanel — the "NGINX status" console tab.
 *
 * Mirrors the /test/ UI mock (the NGINX Live-Activity dashboard): a top status
 * bar with rollup metrics, a Dashboard overview (stat cards + req/s sparkline +
 * connection states), and per-section tabs — HTTP zones/upstreams, TCP/UDP
 * zones/upstreams, caches, shared zones, resolvers, workers.
 *
 * Unlike the mock, every number here is REAL — normalized from
 * nginx-module-vts / open-source stub_status via
 * GET /api/admin/nginx-stats. Sections the current source can't provide degrade
 * to honest empty states or "—"; nothing is fabricated (that's the mock's job).
 */

import { Fragment, useEffect, useState } from 'react'
import {
  WifiOff, Lock, RefreshCw, Activity, Zap, Shield, AlertCircle, AlertTriangle,
} from 'lucide-react'
import { GlowCard } from '@/components/ui/spotlight-card'
import {
  nf, nfk, fmtBytes, fmtMsec, fmtPercent, fmtDuration, sourceLabel, countUpstreams, aggregateResponses, zoneAnnotation,
  type NginxResponses, type NginxPeerState, type ZoneAnnotation, type SelfHealEvent,
} from '@/lib/data/nginx-stats'
import { adminContentClient } from '@/lib/data/admin-content'
import { useNginxStatus } from './useNginxStatus'
import { RefreshSelect, Sparkline, StateBars } from './nginx-ui'

type Tab = 'dash' | 'zones' | 'upstreams' | 'szones' | 'sups' | 'caches'

/* ── small shared bits ─────────────────────────────────────────── */

/** Tiny health dot — green/amber/red by 5xx share (mirrors the mock's status dot). */
function StatusDot({ ratio }: { ratio: number }) {
  const tone = ratio > 0.01 ? 'bg-red-400' : ratio > 0.004 ? 'bg-amber-400' : 'bg-emerald-400'
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${tone}`} />
}

/** Stacked 1xx–5xx response-mix bar. */
function MixBar({ r }: { r: NginxResponses }) {
  const total = r.total || r.c1 + r.c2 + r.c3 + r.c4 + r.c5 || 1
  const seg = (v: number, cls: string) => (v > 0 ? <span className={cls} style={{ width: `${(v / total) * 100}%` }} /> : null)
  return (
    <span className="inline-flex h-2 w-[110px] overflow-hidden rounded bg-white/10 align-middle">
      {seg(r.c1, 'bg-slate-500')}
      {seg(r.c2, 'bg-emerald-400')}
      {seg(r.c3, 'bg-cyan-400')}
      {seg(r.c4, 'bg-amber-400')}
      {seg(r.c5, 'bg-red-400')}
    </span>
  )
}

/**
 * Recent nginx self-healing activity, parsed server-side from
 * /var/log/nginx-vts-guard.log and /var/log/nginx-autorepair.log.
 *
 * Why this is on screen at all: nginx now recovers from a VTS module mismatch
 * on its own — it starts without stats rather than not starting. That is the
 * right behaviour, but it means an outage can happen, resolve, and leave no
 * trace anyone sees. A recovery nobody notices the third time it fires is a
 * failing component nobody is fixing.
 */
/** "10 days ago" — a raw 2026-08-10 timestamp gives no clue whether the panel
 *  is describing an outage happening now or one long since fixed. */
function relativeAge(atMs: number, nowMs: number): string {
  const sec = Math.max(0, Math.round((nowMs - atMs) / 1000))
  if (sec < 90) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 90) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 36) return `${hr} hr ago`
  const days = Math.round(hr / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

function SelfHealCard({ events }: { events: SelfHealEvent[] }) {
  const tone: Record<string, string> = {
    recovered: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    alert: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
    failed: 'border-red-400/40 bg-red-500/15 text-red-200',
    info: 'border-white/10 bg-white/5 text-slate-300',
  }

  // Relative ages are computed on the client, so pin "now" per render instead
  // of calling Date.now() inside the map — otherwise rows in one paint can
  // disagree, and the value differs between the server render and hydration.
  const [nowMs, setNowMs] = useState<number | null>(null)
  useEffect(() => {
    setNowMs(Date.now())
    const t = setInterval(() => setNowMs(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  // ONLY unresolved problems colour the card. A failure the scripts already
  // recovered from is history; treating it as current is how a ten-day-old
  // test run kept this card red and taught everyone to ignore it.
  const unresolved = events.filter((e) => e.resolved === false)
  const worst = unresolved.some((e) => e.severity === 'failed')
    ? 'red'
    : unresolved.some((e) => e.severity === 'alert')
      ? 'amber'
      : 'cyan'
  const lastActivityMs = events.reduce((max, e) => Math.max(max, e.atMs), 0)

  return (
    <GlowCard glowColor={worst} className="p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h3 className="text-[13px] font-semibold text-white">Self-Heal Events</h3>
          {events.length > 0 && (
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                unresolved.length > 0
                  ? tone[unresolved.some((e) => e.severity === 'failed') ? 'failed' : 'alert']
                  : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
              }`}
            >
              {unresolved.length > 0 ? `${unresolved.length} unresolved` : 'all resolved'}
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-600">
          {lastActivityMs > 0 && nowMs !== null
            ? `last activity ${relativeAge(lastActivityMs, nowMs)} — VTS guard and version autorepair.`
            : 'nginx recovery activity — VTS guard and version autorepair.'}
        </p>
      </div>

      {events.length === 0 ? (
        <p className="py-6 text-center text-[11px] text-slate-600">
          No self-heal events recorded. nginx has not needed to recover.
        </p>
      ) : (
        <div className="space-y-1.5">
          {events.map((e) => (
            <div
              key={`${e.source}-${e.atMs}-${e.seq ?? 0}-${e.message.slice(0, 24)}`}
              className={`flex items-start gap-3 rounded-xl border border-white/5 px-3 py-2 ${
                e.stale ? 'bg-black/10 opacity-70' : 'bg-black/20'
              }`}
            >
              <span className="font-mono text-[10px] tabular-nums text-slate-500">
                {e.at}
                {nowMs !== null && (
                  <span className="ml-1.5 not-italic text-slate-600">({relativeAge(e.atMs, nowMs)})</span>
                )}
              </span>
              <span
                className={`inline-flex flex-none items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${tone[e.severity] || tone.info}`}
              >
                {e.severity}
              </span>
              <span className="flex-none rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-widest text-slate-400">
                {e.source}
              </span>
              {/* Say which failures are already dealt with, so a red badge in
                  the list is not mistaken for something still burning. */}
              {e.resolved && (e.severity === 'failed' || e.severity === 'alert') && (
                <span className="flex-none rounded-full border border-emerald-400/20 bg-emerald-400/5 px-2 py-0.5 text-[10px] uppercase tracking-widest text-emerald-300/80">
                  resolved
                </span>
              )}
              <span className="min-w-0 flex-1 break-words text-[11px] leading-relaxed text-slate-300">
                {e.message}
              </span>
            </div>
          ))}
        </div>
      )}
    </GlowCard>
  )
}

function PeerBadge({ state }: { state: NginxPeerState }) {
  const map: Record<string, string> = {
    up: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    down: 'border-red-400/40 bg-red-500/15 text-red-200',
    unavail: 'border-red-400/40 bg-red-500/15 text-red-200',
    draining: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
    backup: 'border-slate-400/20 bg-white/5 text-slate-300',
    checking: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200',
  }
  const cls = map[state] || 'border-white/10 bg-white/5 text-slate-300'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {state}
    </span>
  )
}

function Meter({ fraction }: { fraction: number | null }) {
  if (fraction == null) return <span className="text-slate-600">—</span>
  const pct = Math.min(100, Math.max(0, fraction * 100))
  const tone = fraction > 0.85 ? 'bg-red-400' : fraction > 0.6 ? 'bg-amber-400' : 'bg-cyan-400'
  return (
    <span className="inline-flex items-center gap-2 align-middle">
      <span className="inline-block h-1.5 w-24 overflow-hidden rounded bg-white/10">
        <span className={`block h-full rounded ${tone}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="tabular-nums text-[11px] text-slate-400">{pct.toFixed(0)}%</span>
    </span>
  )
}

function Th({ children, align = 'left', colSpan }: { children?: React.ReactNode; align?: 'left' | 'right' | 'center'; colSpan?: number }) {
  const a = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
  return (
    <th colSpan={colSpan} className={`whitespace-nowrap px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 ${a}`}>
      {children}
    </th>
  )
}
/** Group-header cell — the mock's Requests / Responses / Traffic bands. Labelled
 *  bands get a centred underline; empty spacer cells (no children) stay bare. */
function GroupTh({ children, colSpan }: { children?: React.ReactNode; colSpan?: number }) {
  const bare = children == null
  return (
    <th colSpan={colSpan} className={`whitespace-nowrap px-3 pb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500 ${bare ? '' : 'border-b border-white/5'}`}>
      {children}
    </th>
  )
}
function Td({ children, align = 'left', className = '' }: { children?: React.ReactNode; align?: 'left' | 'right' | 'center'; className?: string }) {
  const a = align === 'right' ? 'text-right tabular-nums' : align === 'center' ? 'text-center' : ''
  return <td className={`whitespace-nowrap border-t border-white/5 px-3 py-2.5 ${a} ${className}`}>{children}</td>
}

function TableCard({ title, hint, children }: { title: string; hint: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20">
      <div className="px-4 pb-3 pt-4">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{hint}</p>
      </div>
      <div className="overflow-x-auto px-2 pb-2">
        <table className="w-full text-xs">{children}</table>
      </div>
    </div>
  )
}

function EmptyRow({ span, text }: { span: number; text: string }) {
  return (
    <tr>
      <td colSpan={span} className="border-t border-white/5 px-3 py-8 text-center text-xs text-slate-600">{text}</td>
    </tr>
  )
}

function GroupRow({ span, children }: { span: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={span} className="px-3 pb-1 pt-4 text-[10px] font-black uppercase tracking-widest text-indigo-300">{children}</td>
    </tr>
  )
}

/** One rollup metric in the top status bar (Connections / Requests / SSL). */
function BarMetric({ label, value, sub, first, tip }: { label: string; value: string; sub: string; first?: boolean; tip?: string }) {
  return (
    <div className={`px-4 ${first ? '' : 'border-l border-white/8'}`} title={tip}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">{label}</div>
      <div className="mt-0.5 text-lg font-bold tabular-nums text-white">{value}</div>
      <div className="mt-0.5 text-[11px] tabular-nums text-slate-500">{sub}</div>
    </div>
  )
}

/** A Dashboard overview stat card. */
function StatCard({ icon: Icon, iconClass, label, value, delta, valueClass = 'text-white' }: {
  icon: typeof Activity; iconClass: string; label: string; value: string; delta: string; valueClass?: string
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-4">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <Icon size={13} className={iconClass} /> {label}
      </div>
      <div className={`mt-1.5 text-3xl font-bold tabular-nums tracking-tight ${valueClass}`}>{value}</div>
      <div className="mt-1 text-[11px] text-slate-600">{delta}</div>
    </div>
  )
}

/* ── tabs ──────────────────────────────────────────────────────── */

const TABS: { id: Tab; label: string }[] = [
  { id: 'dash', label: 'Dashboard' },
  { id: 'zones', label: 'HTTP Zones' },
  { id: 'upstreams', label: 'HTTP Upstreams' },
  { id: 'szones', label: 'TCP/UDP Zones' },
  { id: 'sups', label: 'TCP/UDP Upstreams' },
  { id: 'caches', label: 'Caches' },
]

/* ── main panel ────────────────────────────────────────────────── */

export function NginxServerStatusPanel() {
  const [pollMs, setPollMs] = useState(5000)
  const { data, rates, history, live, reachable, unauthorized, loading, error, refresh } = useNginxStatus(pollMs)
  const [tab, setTab] = useState<Tab>('dash')
  const [host, setHost] = useState('')
  useEffect(() => { setHost(window.location.host) }, [])

  // Friendly labels for admin-managed zones (added via NginxManagedEditor), keyed
  // by zone key. Layered over the built-in HTTP_ZONE_ANNOTATIONS so managed zones
  // show their configured name/description in the HTTP Zones table.
  const [managedLabels, setManagedLabels] = useState<Record<string, ZoneAnnotation>>({})
  useEffect(() => {
    adminContentClient.fetchNginxManaged().then((r) => {
      if (!r) return
      const m: Record<string, ZoneAnnotation> = {}
      for (const e of r.entries) m[e.key] = { label: e.label || e.path || e.key, sub: e.sub || '' }
      setManagedLabels(m)
    })
  }, [])

  /* ── gating states ── */
  if (unauthorized) {
    return (
      <GlowCard glowColor="indigo" className="flex flex-col items-center gap-2 p-10 text-center">
        <Lock size={26} className="text-slate-500" />
        <p className="text-sm text-slate-300">Not authorized for nginx status.</p>
        <p className="max-w-md text-xs leading-relaxed text-slate-500">
          Sign in via <span className="text-cyan-300">Edit pages &amp; cards</span>, or open this console from an
          allowlisted workstation so nginx injects the admin token upstream.
        </p>
      </GlowCard>
    )
  }
  if (loading && !data) {
    return (
      <GlowCard glowColor="cyan" className="flex items-center justify-center gap-3 p-10 text-sm text-slate-400">
        <RefreshCw size={16} className="animate-spin" /> Connecting to nginx status…
      </GlowCard>
    )
  }
  if (!reachable && !data) {
    return (
      <GlowCard glowColor="red" className="flex flex-col items-center gap-2 p-10 text-center">
        <WifiOff size={26} className="text-red-400/70" />
        <p className="text-sm text-red-200">Status endpoint unreachable.</p>
        <p className="max-w-md text-xs leading-relaxed text-slate-500">
          The site-stats proxy may be down. Check <code className="text-cyan-400">pm2 status apen-stats-api</code>
          {error ? <> — <span className="font-mono">{error}</span></> : null}.
        </p>
      </GlowCard>
    )
  }
  if (data && !data.available) {
    return (
      <div className="space-y-4">
        <GlowCard glowColor="amber" className="flex flex-col items-center gap-3 p-10 text-center">
          <WifiOff size={26} className="text-amber-400/80" />
          <p className="text-sm text-amber-100">NGINX VTS status not detected.</p>
          <p className="max-w-lg text-xs leading-relaxed text-slate-400">
            These tables need the <code className="text-cyan-300">nginx-module-vts</code> module. The software is
            wired and ready — once the module is live this fills in automatically. See
            <code className="mx-1 text-cyan-400">proxy/NGINX_VTS_RUNBOOK.md</code> for the build + config steps.
          </p>
          {data.error ? <p className="max-w-lg font-mono text-[10px] text-slate-600">{data.error}</p> : null}
        </GlowCard>
        {/* Stats being down is usually the guard having disabled VTS to keep
            nginx serving. These events say whether that is what happened. */}
        <SelfHealCard events={data.selfHeal ?? []} />
      </div>
    )
  }
  if (!data) return null

  const conn = data.connections
  const ups = countUpstreams(data.upstreams)
  const isStub = data.source === 'stub'
  const agg = aggregateResponses(data.serverZones)
  const rps = rates.requestsPerSec
  const peak = history.length ? Math.max(...history) : null
  const min = history.length ? Math.min(...history) : null
  const supCount = data.streamUpstreams.reduce((n, g) => n + g.servers.length, 0)

  const tabCount: Record<Tab, number | null> = {
    dash: null,
    zones: data.serverZones.length,
    upstreams: ups.total,
    szones: data.streamZones.length,
    sups: supCount,
    caches: data.caches.length,
  }

  return (
    <div className="space-y-4">
      {/* ── top status bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-400 text-[17px] font-black text-[#04121a]">N</span>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-white">{host || 'nginx'}</div>
            <div className="text-[11px] text-slate-500">
              nginx <code className="text-cyan-300">{data.nginxVersion || '—'}</code> · <code className="text-cyan-300">{sourceLabel(data.source)}</code>
              {data.uptimeSec != null ? <> · up <span className="tabular-nums">{fmtDuration(data.uptimeSec)}</span></> : null}
            </div>
          </div>
        </div>

        {conn && (
          <div className="flex items-stretch">
            <BarMetric first label="Connections" value={nf(conn.active)} sub={`accepted ${nfk(conn.accepted)} · dropped ${nf(conn.dropped)}`} tip="Active client connections now; accepted/dropped are cumulative since start." />
            <BarMetric label="Requests" value={nfk(conn.requests)} sub={rps == null ? '— req/s' : `${nf(rps)} req/s`} tip="Total requests since start; the sub-line is the live derived rate." />
            <BarMetric label="SSL" value="—" sub="handshakes/s" tip="SSL handshake counters aren't exposed by open-source nginx (VTS / stub_status)." />
          </div>
        )}

        <div className="flex items-center gap-2">
          {live ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-slate-400">
              <WifiOff size={10} /> Offline
            </span>
          )}
          <RefreshSelect value={pollMs} onChange={setPollMs} />
          <button
            onClick={refresh}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-cyan-400/30 hover:text-cyan-300"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {isStub && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-[11px] leading-relaxed text-amber-200/90">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>
            Only <code className="text-amber-200">stub_status</code> is active, so the connection summary is live but the
            per-zone / per-upstream tables are empty. Install <code>nginx-module-vts</code> to
            populate them — see <code className="text-cyan-300">proxy/NGINX_VTS_RUNBOOK.md</code>.
          </span>
        </div>
      )}

      {/* ── tabs (underline style) ── */}
      <div className="flex flex-wrap gap-1 border-b border-white/8">
        {TABS.map(({ id, label }) => {
          const active = tab === id
          const c = tabCount[id]
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
                active ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-500 hover:text-slate-200'
              }`}
            >
              {label}{c != null ? <span className="ml-1.5 text-[10px] opacity-60">({c})</span> : null}
            </button>
          )
        })}
      </div>

      {/* ── Dashboard overview ── */}
      {tab === 'dash' && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Activity} iconClass="text-cyan-400" label="Active connections" value={conn ? nf(conn.active) : '—'} delta={conn ? `idle ${nf(conn.waiting)}` : ''} />
            <StatCard icon={Zap} iconClass="text-indigo-400" label="Requests / sec" value={rps == null ? '—' : nf(rps)} delta="all server zones" valueClass="text-cyan-300" />
            <StatCard icon={Shield} iconClass="text-emerald-400" label="SSL handshakes/s" value="—" delta="not exposed by VTS" />
            <StatCard
              icon={AlertCircle}
              iconClass="text-red-400"
              label="5xx rate"
              value={fmtPercent(agg.fivexxPct, 2)}
              delta="of responses"
              valueClass={agg.fivexxPct != null && agg.fivexxPct > 0.01 ? 'text-red-300' : agg.fivexxPct ? 'text-amber-300' : 'text-emerald-300'}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-white/5 bg-black/20 p-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-white">Requests / sec</h3>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">last {history.length} samples</span>
              </div>
              <p className="mb-2 mt-0.5 text-[11px] text-slate-600">Derived per-second throughput — one sample per refresh, newest on the right.</p>
              <Sparkline data={history} height={92} />
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold tabular-nums text-white">{rps == null ? '—' : nf(rps)}<span className="ml-1 text-xs font-semibold text-slate-500">req/s</span></span>
                <span className="text-[11px] text-slate-600">{peak == null ? '' : `peak ${nf(peak)} · min ${nf(min ?? 0)}`}</span>
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-black/20 p-4">
              <h3 className="text-[13px] font-semibold text-white">Connection states</h3>
              <p className="mb-3 mt-0.5 text-[11px] text-slate-600">Reading / writing / waiting — the only part open-source stub_status can produce.</p>
              {conn ? (
                <>
                  <StateBars reading={conn.reading} writing={conn.writing} waiting={conn.waiting} />
                  <div className="mt-3 flex justify-between border-t border-white/5 pt-3 text-[11px] text-slate-500">
                    <span>Accepted <b className="tabular-nums text-slate-200">{nfk(conn.accepted)}</b></span>
                    <span>Handled <b className="tabular-nums text-slate-200">{nfk(conn.handled)}</b></span>
                    <span>Dropped <b className={`tabular-nums ${conn.dropped > 0 ? 'text-red-300' : 'text-slate-200'}`}>{nf(conn.dropped)}</b></span>
                  </div>
                </>
              ) : (
                <p className="py-6 text-center text-[11px] text-slate-600">No connection data.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── HTTP Zones ── */}
      {tab === 'zones' && (
        <TableCard title="HTTP server zones" hint={<>Per-vhost traffic and response-code mix — the headline VTS feature (not available on plain stub_status).</>}>
          <thead>
            <tr>
              <GroupTh colSpan={2} /><GroupTh colSpan={2}>Requests</GroupTh><GroupTh colSpan={6}>Responses</GroupTh><GroupTh colSpan={2}>Traffic</GroupTh>
            </tr>
            <tr>
              <Th>Zone</Th><Th align="center">Status</Th><Th align="right">Total</Th><Th align="right">Req/s</Th>
              <Th align="right">1xx</Th><Th align="right">2xx</Th><Th align="right">3xx</Th><Th align="right">4xx</Th><Th align="right">5xx</Th><Th align="center">Mix</Th>
              <Th align="right">Sent</Th><Th align="right">Rcvd</Th>
            </tr>
          </thead>
          <tbody>
            {data.serverZones.length === 0 && <EmptyRow span={12} text="No HTTP server zones reported." />}
            {data.serverZones.map((z) => {
              const ratio = z.responses.total ? z.responses.c5 / z.responses.total : 0
              const za = zoneAnnotation(z.name, managedLabels)
              return (
                <tr key={z.name} className="hover:bg-white/[0.02]">
                  <Td>
                    <div className="font-semibold text-white">{za.label}</div>
                    {za.sub ? <div className="text-[11px] text-slate-500">{za.sub}</div> : null}
                  </Td>
                  <Td align="center"><StatusDot ratio={ratio} /></Td>
                  <Td align="right">{nf(z.requests)}</Td>
                  <Td align="right" className="text-cyan-300">{rates.zones[z.name] != null ? nf(rates.zones[z.name]) : '—'}</Td>
                  <Td align="right">{nfk(z.responses.c1)}</Td>
                  <Td align="right">{nfk(z.responses.c2)}</Td>
                  <Td align="right">{nfk(z.responses.c3)}</Td>
                  <Td align="right" className={z.responses.c4 > 0 ? 'text-amber-300' : ''}>{nfk(z.responses.c4)}</Td>
                  <Td align="right" className={z.responses.c5 > 0 ? 'text-red-300' : ''}>{nfk(z.responses.c5)}</Td>
                  <Td align="center"><MixBar r={z.responses} /></Td>
                  <Td align="right">{fmtBytes(z.sentBytes)}</Td>
                  <Td align="right">{fmtBytes(z.rcvdBytes)}</Td>
                </tr>
              )
            })}
          </tbody>
        </TableCard>
      )}

      {/* ── HTTP Upstreams ── */}
      {tab === 'upstreams' && (
        <TableCard title="HTTP upstreams" hint={<>Per-backend health, connections and response time. VTS reports requests/response-time/fails; <code>active</code>, <code>checks</code> and <code>downtime</code> aren&apos;t tracked by VTS (they need active health checks).</>}>
          <thead>
            <tr>
              <GroupTh colSpan={2} /><GroupTh colSpan={2}>Requests</GroupTh><GroupTh colSpan={2}>Responses</GroupTh><GroupTh /><GroupTh colSpan={3}>Health monitors</GroupTh>
            </tr>
            <tr>
              <Th>Server</Th><Th align="center">State</Th><Th align="right">Req/s</Th><Th align="right">Active</Th>
              <Th align="right">4xx</Th><Th align="right">5xx</Th><Th align="right">Resp&nbsp;time</Th><Th align="right">Checks</Th><Th align="right">Fails</Th><Th align="right">Downtime</Th>
            </tr>
          </thead>
          <tbody>
            {ups.total === 0 && <EmptyRow span={10} text="No HTTP upstreams reported." />}
            {data.upstreams.map((g) => (
              <Fragment key={g.group}>
                <GroupRow span={10}>{g.group}</GroupRow>
                {g.servers.map((s) => {
                  const rtc = s.responseMsec > 800 ? 'text-red-300' : s.responseMsec > 400 ? 'text-amber-300' : ''
                  return (
                    <tr key={`${g.group}:${s.server}`} className="hover:bg-white/[0.02]">
                      <Td className="font-mono text-slate-200">{s.server}</Td>
                      <Td align="center"><PeerBadge state={s.state} /></Td>
                      <Td align="right" className="text-cyan-300">{rates.upstreams[s.server] != null ? nf(rates.upstreams[s.server]) : '—'}</Td>
                      <Td align="right">{s.active == null ? '—' : nf(s.active)}</Td>
                      <Td align="right" className={s.responses.c4 > 0 ? 'text-amber-300' : ''}>{nf(s.responses.c4)}</Td>
                      <Td align="right" className={s.responses.c5 > 0 ? 'text-red-300' : ''}>{nf(s.responses.c5)}</Td>
                      <Td align="right" className={rtc}>{fmtMsec(s.responseMsec)}</Td>
                      <Td align="right">{s.checks == null ? '—' : nf(s.checks)}</Td>
                      <Td align="right" className={s.fails > 5 ? 'text-amber-300' : ''}>{nf(s.fails)}</Td>
                      <Td align="right">{s.downtime ? fmtDuration(s.downtime) : '—'}</Td>
                    </tr>
                  )
                })}
              </Fragment>
            ))}
          </tbody>
        </TableCard>
      )}

      {/* ── TCP/UDP Zones ── */}
      {tab === 'szones' && (
        <TableCard title="TCP/UDP (stream) zones" hint={<>stream {'{}'} server zones — present only if you proxy raw TCP/UDP.</>}>
          <thead>
            <tr><Th>Zone</Th><Th align="right">Connections</Th><Th align="right">Sessions</Th><Th align="right">Bytes In</Th><Th align="right">Bytes Out</Th></tr>
          </thead>
          <tbody>
            {data.streamZones.length === 0 && <EmptyRow span={5} text="No TCP/UDP (stream) zones configured." />}
            {data.streamZones.map((z) => (
              <tr key={z.name} className="hover:bg-white/[0.02]">
                <Td className="font-mono text-slate-200">{z.name}</Td>
                <Td align="right">{z.connections == null ? '—' : nf(z.connections)}</Td>
                <Td align="right">{nf(z.sessions)}</Td>
                <Td align="right">{fmtBytes(z.bytesIn)}</Td>
                <Td align="right">{fmtBytes(z.bytesOut)}</Td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      )}

      {/* ── TCP/UDP Upstreams ── */}
      {tab === 'sups' && (
        <TableCard title="TCP/UDP (stream) upstreams" hint={<>stream {'{}'} upstream servers.</>}>
          <thead>
            <tr><Th>Server</Th><Th align="center">State</Th><Th align="right">Active</Th><Th align="right">Bytes In</Th><Th align="right">Bytes Out</Th><Th align="right">Resp&nbsp;time</Th></tr>
          </thead>
          <tbody>
            {supCount === 0 && <EmptyRow span={6} text="No TCP/UDP (stream) upstreams configured." />}
            {data.streamUpstreams.map((g) => (
              <Fragment key={g.group}>
                <GroupRow span={6}>{g.group}</GroupRow>
                {g.servers.map((s) => (
                  <tr key={`${g.group}:${s.server}`} className="hover:bg-white/[0.02]">
                    <Td className="font-mono text-slate-200">{s.server}</Td>
                    <Td align="center"><PeerBadge state={s.state} /></Td>
                    <Td align="right">{s.active == null ? '—' : nf(s.active)}</Td>
                    <Td align="right">{fmtBytes(s.bytesIn)}</Td>
                    <Td align="right">{fmtBytes(s.bytesOut)}</Td>
                    <Td align="right">{fmtMsec(s.responseMsec)}</Td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </TableCard>
      )}

      {/* ── Caches ── */}
      {tab === 'caches' && (
        <TableCard title="Caches" hint={<>proxy_cache zones — hit ratio and disk usage.</>}>
          <thead>
            <tr><Th>Cache zone</Th><Th align="center">State</Th><Th align="right">Hit ratio</Th><Th>Used</Th><Th align="right">Max size</Th><Th align="right">Served</Th><Th align="right">Written</Th><Th align="right">Bypassed</Th></tr>
          </thead>
          <tbody>
            {data.caches.length === 0 && <EmptyRow span={8} text="No proxy_cache zones reported." />}
            {data.caches.map((c) => (
              <tr key={c.name} className="hover:bg-white/[0.02]">
                <Td className="font-mono text-slate-200">{c.name}</Td>
                <Td align="center"><span className="text-[11px] uppercase tracking-widest text-slate-400">{c.state}</span></Td>
                <Td align="right" className="text-emerald-300">{fmtPercent(c.hitRatio)}</Td>
                <Td><Meter fraction={c.used} /></Td>
                <Td align="right">{fmtBytes(c.max)}</Td>
                <Td align="right">{fmtBytes(c.served)}</Td>
                <Td align="right">{fmtBytes(c.written)}</Td>
                <Td align="right">{nfk(c.bypassed)}</Td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      )}

      <SelfHealCard events={data.selfHeal ?? []} />
    </div>
  )
}
