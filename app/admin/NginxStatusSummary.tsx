'use client'

/**
 * NginxStatusSummary — full-width live nginx card on the Monitor tab, stacked
 * directly under the Site Activity card. Uses the same NginxOverview block as
 * the NGINX status tab (stat tiles + live req/s sparkline + connection states)
 * so the two surfaces look uniform. Degrades to honest "not detected" / "sign
 * in" states — never fabricated numbers.
 */

import { Server, WifiOff, Lock } from 'lucide-react'
import { GlowCard } from '@/components/ui/spotlight-card'
import { fmtDuration, aggregateResponses } from '@/lib/data/nginx-stats'
import { useNginxStatus } from './useNginxStatus'
import { SourcePill, LivePill, NginxOverview } from './nginx-ui'

export function NginxStatusSummary() {
  const { data, rates, history, live, reachable, unauthorized, loading } = useNginxStatus()
  const conn = data?.connections ?? null
  const agg = data ? aggregateResponses(data.serverZones) : null

  return (
    <GlowCard glowColor={live ? 'cyan' : 'indigo'} className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Server size={16} className="text-cyan-300" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white">NGINX Server</p>
          {live && data?.source && <SourcePill source={data.source} />}
          {live && data?.nginxVersion && (
            <span className="hidden text-[10px] font-mono text-slate-600 sm:inline">
              nginx {data.nginxVersion}
              {data.uptimeSec != null ? ` · up ${fmtDuration(data.uptimeSec)}` : ''}
            </span>
          )}
        </div>
        <LivePill live={live} loading={loading} unauthorized={unauthorized} />
      </div>

      {/* Unauthorized */}
      {unauthorized && (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <Lock size={20} className="text-slate-500" />
          <p className="text-xs text-slate-400">Not authorized for nginx status.</p>
          <p className="max-w-md text-[11px] leading-relaxed text-slate-600">
            Sign in via <span className="text-cyan-300">Edit pages &amp; cards</span>, or open from an allowlisted
            workstation so nginx injects the admin token.
          </p>
        </div>
      )}

      {/* Reachable but no module */}
      {!unauthorized && reachable && data && !data.available && (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <WifiOff size={20} className="text-amber-400/70" />
          <p className="text-xs text-amber-200/90">VTS not detected.</p>
          <p className="max-w-md text-[11px] leading-relaxed text-slate-500">
            Live metrics need the nginx-module-vts module. See
            <code className="text-cyan-400"> proxy/NGINX_VTS_RUNBOOK.md</code>.
          </p>
        </div>
      )}

      {/* Unreachable */}
      {!unauthorized && !reachable && !loading && (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <WifiOff size={20} className="text-red-400/70" />
          <p className="text-xs text-red-200/90">Status endpoint unreachable.</p>
          <p className="max-w-md text-[11px] leading-relaxed text-slate-600">
            Check <code className="text-cyan-400">pm2 status apen-stats-api</code>.
          </p>
        </div>
      )}

      {/* Live */}
      {conn && (live || data?.source === 'stub') && agg && (
        <NginxOverview conn={conn} fivexxPct={agg.fivexxPct} requestsPerSec={rates.requestsPerSec} history={history} />
      )}
    </GlowCard>
  )
}
