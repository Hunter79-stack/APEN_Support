'use client'

/**
 * /admin#security — sign-ins the proxy refused before contacting a domain
 * controller.
 *
 * These attempts leave NO trace in the Windows security log, because no DC
 * ever saw them: the name was rejected by proxy/ldap-domain.mjs first. This
 * panel is the only place they surface.
 *
 * Spoof attempts are separated from typos on purpose. A name carrying two
 * domain claims ("blcse\rshoop.ou@blcse.mil"), a domain this site doesn't
 * serve, or LDAP filter metacharacters in the account name are someone
 * probing the parser; "no domain given" is a user who forgot the prefix. Both
 * are recorded, but mixing them in one list would bury the first in the
 * second.
 */

import { useCallback, useEffect, useState } from 'react'
import { ShieldAlert, RefreshCw, AlertTriangle, Info } from 'lucide-react'
import { GlowCard } from '@/components/ui/spotlight-card'
import { adminContentClient, type AuthEvent } from '@/lib/data/admin-content'
import { RUNTIME_INTERVALS } from '@/lib/data/runtime'

const REASON_LABELS: Record<string, string> = {
  'mixed-forms': 'Two domain claims in one name',
  'multiple-separators': 'Multiple domain separators',
  'unknown-domain': 'Domain not served here',
  'ldap-metachars': 'LDAP metacharacters in account name',
  'upn-form': 'UPN form (user@domain)',
  'missing-domain': 'No domain given',
  'bad-account': 'Unusable account name',
  'too-long': 'Over-long username',
  empty: 'Empty username',
  'not-configured': 'Realm not configured',
}

function formatWhen(iso: string): string {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return iso
  return parsed.toLocaleString('en-US', { hour12: false })
}

export function AuthEventsPanel() {
  const [events, setEvents] = useState<AuthEvent[]>([])
  const [spoofCount, setSpoofCount] = useState(0)
  const [state, setState] = useState<'loading' | 'ready' | 'denied'>('loading')
  const [filter, setFilter] = useState<'spoof' | 'all'>('spoof')

  const load = useCallback(async () => {
    const data = await adminContentClient.fetchAuthEvents()
    if (!data) { setState('denied'); return }
    setEvents(data.events)
    setSpoofCount(data.spoofCount)
    setState('ready')
  }, [])

  useEffect(() => {
    load()
    // Same cadence as the rest of the console's live panels.
    const timer = setInterval(load, RUNTIME_INTERVALS.adminStatsRefreshMs)
    return () => clearInterval(timer)
  }, [load])

  const shown = filter === 'spoof' ? events.filter((e) => e.severity === 'spoof') : events

  if (state === 'denied') {
    return (
      <GlowCard glowColor="orange" className="p-5">
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-300" aria-hidden="true" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white">Unavailable</p>
        </div>
        <p className="text-xs leading-relaxed text-slate-400">
          The sign-in security log could not be read. It requires an admin session on an allowlisted workstation.
        </p>
      </GlowCard>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2">
          <ShieldAlert size={14} className="text-red-300" aria-hidden="true" />
          <span className="text-[10px] font-black uppercase tracking-widest text-red-200">
            {spoofCount} spoof {spoofCount === 1 ? 'attempt' : 'attempts'}
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
          {(['spoof', 'all'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded px-2.5 py-1 text-[10px] font-black uppercase tracking-widest transition ${
                filter === value ? 'bg-cyan-400/20 text-cyan-200' : 'text-slate-400 hover:text-white'
              }`}
            >
              {value === 'spoof' ? 'Spoof only' : 'All refusals'}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-300 transition hover:border-cyan-400/30 hover:text-cyan-300"
        >
          <RefreshCw size={12} aria-hidden="true" /> Refresh
        </button>
      </div>

      {state === 'loading' && (
        <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Loading…</p>
      )}

      {state === 'ready' && shown.length === 0 && (
        <GlowCard glowColor="cyan" className="p-5">
          <div className="mb-2 flex items-center gap-2">
            <Info size={16} className="text-cyan-300" aria-hidden="true" />
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white">Nothing recorded</p>
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            {filter === 'spoof'
              ? 'No spoofed domain claims have been attempted. Switch to All refusals to see ordinary mistyped sign-ins.'
              : 'No sign-in has been refused before reaching a domain controller.'}
          </p>
        </GlowCard>
      )}

      {state === 'ready' && shown.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[46rem] text-left text-xs">
            <thead className="bg-white/5 text-[10px] uppercase tracking-widest text-slate-400">
              <tr>
                <th scope="col" className="px-3 py-2 font-bold">When</th>
                <th scope="col" className="px-3 py-2 font-bold">Severity</th>
                <th scope="col" className="px-3 py-2 font-bold">What was typed</th>
                <th scope="col" className="px-3 py-2 font-bold">Reason</th>
                <th scope="col" className="px-3 py-2 font-bold">Source</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((event) => (
                <tr key={event.id} className="border-t border-white/5 align-top">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-400">{formatWhen(event.at)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                        event.severity === 'spoof'
                          ? 'bg-red-400/15 text-red-200'
                          : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {event.severity}
                    </span>
                  </td>
                  {/* Whatever a stranger typed, rendered as text by React — no
                      markup, no interpolation into anything executable. */}
                  <td className="px-3 py-2 font-mono text-[11px] text-white break-all">{event.typed}</td>
                  <td className="px-3 py-2 text-slate-400">
                    <span className="text-slate-300">{REASON_LABELS[event.reason] ?? event.reason}</span>
                    {event.detail && <span className="block text-[10px] leading-relaxed text-slate-400">{event.detail}</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-400 break-all">
                    {event.ip || '—'}
                    {event.userAgent && (
                      <span className="block max-w-[18rem] truncate text-[10px] text-slate-400" title={event.userAgent}>
                        {event.userAgent}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[10px] leading-relaxed text-slate-400">
        These sign-ins never reached a domain controller, so they appear in no Windows security log. Records are kept
        newest-first and cannot be cleared from this console. The typed value is the username box only — passwords are
        never recorded.
      </p>
    </div>
  )
}
