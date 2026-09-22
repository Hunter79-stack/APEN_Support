'use client'

/**
 * nginx-ui — shared presentational bits for the admin NGINX surfaces (summary
 * card + NGINX status tab), styled to match the /test/ mock but driven by the
 * real normalized status feed.
 */

import { Wifi, WifiOff, Lock, Info } from 'lucide-react'
import { nf, nfk, fmtPercent, sourceLabel, type NginxStatusSource, type NginxConnections } from '@/lib/data/nginx-stats'

/** Live req/s sparkline (SVG). Renders a "collecting" hint until 2+ samples. */
export function Sparkline({ data, height = 72 }: { data: number[]; height?: number }) {
  const W = 600
  const H = height
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center text-[11px] text-slate-400" style={{ height: H }}>
        collecting samples…
      </div>
    )
  }
  const max = Math.max(...data) * 1.15 || 1
  const step = W / (data.length - 1)
  const pts = data.map((v, i) => [i * step, H - (v / max) * (H - 8) - 4] as const)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id="nginx-spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(34,211,238,0.30)" />
          <stop offset="100%" stopColor="rgba(34,211,238,0)" />
        </linearGradient>
      </defs>
      <path d={`${line} L${W} ${H} L0 ${H} Z`} fill="url(#nginx-spark)" />
      <path d={line} fill="none" stroke="#22d3ee" strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function StatTile({ label, value, sub, tone = 'text-white', tip }: { label: string; value: string; sub?: string; tone?: string; tip?: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3" title={tip}>
      <div className="flex items-center gap-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">{label}</p>
        {tip ? <Info size={10} className="text-slate-400" aria-hidden="true" /> : null}
      </div>
      <p className={`mt-1 text-2xl font-bold tabular-nums tracking-tight ${tone}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p> : null}
    </div>
  )
}

/** Reading / writing / waiting bars. */
export function StateBars({ reading, writing, waiting }: { reading: number; writing: number; waiting: number }) {
  const max = Math.max(reading, writing, waiting, 1)
  const rows: { label: string; value: number; tone: string }[] = [
    { label: 'Reading', value: reading, tone: 'bg-cyan-400' },
    { label: 'Writing', value: writing, tone: 'bg-indigo-400' },
    { label: 'Waiting', value: waiting, tone: 'bg-slate-500' },
  ]
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[64px_1fr_52px] items-center gap-3">
          <span className="text-[11px] text-slate-400">{r.label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-white/5">
            <span className={`block h-full rounded-full ${r.tone} transition-[width] duration-500`} style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="text-right text-xs font-semibold tabular-nums text-slate-200">{nf(r.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function SourcePill({ source }: { source: NginxStatusSource }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-slate-400">
      {sourceLabel(source)}
    </span>
  )
}

export function LivePill({ live, loading, unauthorized }: { live: boolean; loading?: boolean; unauthorized?: boolean }) {
  if (live) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
        <Wifi size={10} /> Live
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-400/10 px-2 py-0.5 text-[10px] font-bold text-slate-400">
      {unauthorized ? <Lock size={10} /> : <WifiOff size={10} />} {loading ? 'Loading' : unauthorized ? 'Locked' : 'Offline'}
    </span>
  )
}

/**
 * Shared dashboard overview: 4 stat tiles + live req/s sparkline + connection
 * states. Used identically by the Monitor-tab summary card and the NGINX status
 * tab header so the two surfaces stay uniform.
 */
export function NginxOverview({
  conn,
  fivexxPct,
  requestsPerSec,
  history,
}: {
  conn: NginxConnections
  fivexxPct: number | null
  requestsPerSec: number | null
  history: number[]
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Active connections"
          value={nf(conn.active)}
          sub={`${nf(conn.waiting)} idle`}
          tip="Client connections nginx is handling right now — reading a request, writing a response, or idle keep-alive (idle = waiting)."
        />
        <StatTile
          label="Requests / sec"
          value={requestsPerSec == null ? '—' : nf(requestsPerSec)}
          sub="all server zones"
          tone="text-cyan-300"
          tip="HTTP requests per second across all server zones, derived from the total request counter between refreshes."
        />
        <StatTile
          label="5xx rate"
          value={fmtPercent(fivexxPct, 2)}
          sub="of responses"
          tone={fivexxPct != null && fivexxPct > 0.01 ? 'text-red-300' : fivexxPct ? 'text-amber-300' : 'text-emerald-300'}
          tip="Share of responses that are 5xx server errors across all server zones (cumulative since nginx started)."
        />
        <StatTile
          label="Total requests"
          value={nfk(conn.requests)}
          sub={`${nfk(conn.accepted)} accepted`}
          tip="Total HTTP requests handled since nginx started; 'accepted' is the total client connections accepted."
        />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div
          className="rounded-xl border border-white/5 bg-black/20 p-4 lg:col-span-2"
          title="Recent requests/sec — one sample per refresh, newest on the right."
        >
          <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Requests / sec — recent <Info size={10} className="text-slate-400" aria-hidden="true" />
          </p>
          <Sparkline data={history} height={84} />
        </div>
        <div
          className="rounded-xl border border-white/5 bg-black/20 p-4"
          title="Reading = parsing request headers · Writing = sending a response · Waiting = idle keep-alive connections."
        >
          <p className="mb-3 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Connection states <Info size={10} className="text-slate-400" aria-hidden="true" />
          </p>
          <StateBars reading={conn.reading} writing={conn.writing} waiting={conn.waiting} />
        </div>
      </div>
    </>
  )
}

/** Refresh-interval dropdown (mirrors the mock's selector). */
export function RefreshSelect({ value, onChange }: { value: number; onChange: (ms: number) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10) || 5000)}
      title="Refresh interval"
      className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[11px] font-semibold text-slate-300 outline-none hover:border-cyan-400/30"
    >
      <option value={2000}>2s</option>
      <option value={5000}>5s</option>
      <option value={10000}>10s</option>
      <option value={30000}>30s</option>
    </select>
  )
}
