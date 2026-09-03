'use client'

/**
 * NetworkAnalysisTabs — the "APEN Network Analysis" tab bar, scoped to the
 * APEN Speed Test page only (it used to be the site-wide shell served at
 * /network-analysis/ by the combined FastAPI service; links now land here
 * instead so the bar appears on this page and nowhere else).
 *
 * Speed Test renders the auto-sizing SpeedtestFrame. Network Diagnostics
 * lazy-loads /netdiag/ (the nginx-proxied NetDiag WebUI) on first activation
 * and then stays mounted, so switching tabs never restarts a running test or
 * drops NetDiag's live agent websocket.
 */

import { useState } from 'react'
import { SpeedtestFrame } from './SpeedtestFrame'

type Tab = 'speed' | 'net'

const TABS: { id: Tab; label: string }[] = [
  { id: 'speed', label: 'Speed Test' },
  { id: 'net', label: 'Network Diagnostics' },
]

export function NetworkAnalysisTabs() {
  const [tab, setTab] = useState<Tab>('speed')
  const [netdiagLoaded, setNetdiagLoaded] = useState(false)

  const select = (next: Tab) => {
    setTab(next)
    if (next === 'net') setNetdiagLoaded(true)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5">
        <span className="text-sm font-semibold tracking-tight text-white">APEN Network Analysis</span>
        <nav role="tablist" aria-label="Network analysis tools" className="flex gap-1 rounded-lg border border-white/10 bg-black/30 p-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => select(id)}
              className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
                tab === id
                  ? 'border border-cyan-400/40 bg-cyan-400/15 text-cyan-300'
                  : 'border border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div hidden={tab !== 'speed'}>
        <SpeedtestFrame />
      </div>
      {netdiagLoaded && (
        <div hidden={tab !== 'net'}>
          <iframe
            src="/netdiag/"
            title="APEN Network Diagnostics"
            className="block h-[80vh] min-h-[560px] w-full rounded-xl border border-white/10 bg-black/20"
          />
        </div>
      )}
    </div>
  )
}
