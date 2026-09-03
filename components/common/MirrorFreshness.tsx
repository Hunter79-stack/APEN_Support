'use client'

/**
 * MirrorFreshness — "Mirror last updated" badges for the repo doc pages.
 *
 * Fetches /api/repo-freshness (served by site-stats.mjs, which derives the
 * stamp from directory mtimes on the mirror roots — see proxy/repo-freshness.mjs).
 * Renders nothing at all if the endpoint is unreachable or returns no data,
 * so the static pages degrade cleanly when the stats proxy is down.
 */

import { useEffect, useState } from 'react'
import { Clock, AlertTriangle } from 'lucide-react'
import { API_ENDPOINTS } from '@/lib/data/runtime'

interface RepoStamp {
  id: string
  label: string
  publicPath: string | null
  lastUpdated: string | null
  ageDays?: number
  error?: string
}

/** Mirrors older than this many days get an amber "stale?" treatment. */
const STALE_AFTER_DAYS = 14

export function MirrorFreshness({ repos }: { repos?: string[] }) {
  const [stamps, setStamps] = useState<RepoStamp[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(API_ENDPOINTS.repoFreshness, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.repos)) setStamps(data.repos)
      })
      .catch(() => { /* stats proxy unreachable — render nothing */ })
    return () => { cancelled = true }
  }, [])

  if (!stamps) return null
  const visible = stamps.filter((s) => s.lastUpdated && (!repos || repos.includes(s.id)))
  if (visible.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((s) => {
        const stale = (s.ageDays ?? 0) > STALE_AFTER_DAYS
        const when = new Date(s.lastUpdated as string).toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric',
        })
        return (
          <span
            key={s.id}
            title={stale ? `No sync activity detected in ${s.ageDays} days` : undefined}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs
              ${stale
                ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                : 'border-emerald-400/20 bg-emerald-400/5 text-emerald-300/90'}`}
          >
            {stale ? <AlertTriangle size={12} aria-hidden="true" /> : <Clock size={12} aria-hidden="true" />}
            {repos && repos.length === 1 ? 'Mirror last updated' : s.label} — {when}
          </span>
        )
      })}
    </div>
  )
}
