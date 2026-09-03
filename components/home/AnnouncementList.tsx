'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { StaticLink } from '@/components/common/StaticLink'
import { GlowCard } from '@/components/ui/spotlight-card'
import { DEFAULT_VISIBLE, isNew, isSiteHistoryAnnouncement, type Announcement } from '@/lib/data/announcements'
import { CATEGORY_COLORS } from '@/lib/data/constants'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { API_ENDPOINTS, RUNTIME_INTERVALS } from '@/lib/data/runtime'

function announcementKey(a: Announcement): string {
  return `${a.date}-${a.category ?? 'general'}-${a.href ?? 'none'}-${a.text}`
}

function isAnnouncement(value: unknown): value is Announcement {
  if (!value || typeof value !== 'object') return false

  const item = value as Record<string, unknown>
  const href = item.href
  const linkLabel = item.linkLabel

  return (
    typeof item.text === 'string' &&
    typeof item.date === 'string' &&
    (href === null || typeof href === 'string') &&
    (linkLabel === null || typeof linkLabel === 'string') &&
    (item.category === undefined || typeof item.category === 'string')
  )
}

export function mergeAnnouncements(items: Announcement[]): Announcement[] {
  const seen = new Set<string>()

  return items
    // Gate BOTH sources here. This used to sit only on the live feed, so every
    // curated entry — including "Decommissioned application pages removed" —
    // walked straight past it onto the home page. The predicate itself lives in
    // lib/data/announcements.ts, shared with the Admin console view that lists
    // exactly what this drops.
    .filter((item) => !isSiteHistoryAnnouncement(item))
    .filter((item) => {
      const key = announcementKey(item)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

function readLiveAnnouncements(payload: unknown): Announcement[] {
  if (!payload || typeof payload !== 'object') return []

  const announcements = (payload as { announcements?: unknown }).announcements
  if (!Array.isArray(announcements)) return []

  // Shape check only — mergeAnnouncements applies the noise gate to every
  // source, so filtering here as well would just be a second place to forget.
  return announcements.filter(isAnnouncement)
}

function AnnouncementRow({ a, index }: { a: Announcement; index: number }) {
  const fresh = isNew(a)
  const catCls = a.category ? (CATEGORY_COLORS[a.category] ?? 'bg-white/10 text-white/50 border-white/10') : ''

  return (
    <GlowCard className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:gap-4" glowColor={getCardGlowColor(index)}>
      <span className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${fresh ? 'bg-cyan-400 animate-pulse' : 'bg-white/15'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          {fresh && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-400/20 border border-cyan-400/40 text-cyan-300 tracking-wider">NEW</span>}
          {a.category && <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${catCls}`}>{a.category}</span>}
          <span className="text-xs text-slate-600 font-mono">{a.date}</span>
        </div>
        <p className="max-w-full break-words text-slate-300 text-base leading-relaxed">{a.text}</p>
      </div>
      {a.href && a.linkLabel && (
        <StaticLink href={a.href} className="flex-shrink-0 text-sm text-cyan-400 hover:underline font-medium sm:self-center">
          {a.linkLabel} →
        </StaticLink>
      )}
    </GlowCard>
  )
}

export function AnnouncementList({ announcements }: { announcements: Announcement[] }) {
  const [showAll, setShowAll] = useState(false)
  const [liveAnnouncements, setLiveAnnouncements] = useState<Announcement[]>([])
  const mergedAnnouncements = useMemo(
    () => mergeAnnouncements([...liveAnnouncements, ...announcements]),
    [announcements, liveAnnouncements]
  )
  const visible = showAll ? mergedAnnouncements : mergedAnnouncements.slice(0, DEFAULT_VISIBLE)

  useEffect(() => {
    let cancelled = false
    let controller: AbortController | null = null

    const loadLiveAnnouncements = async () => {
      controller?.abort()
      controller = new AbortController()

      try {
        const response = await fetch(API_ENDPOINTS.liveAnnouncements, {
          cache: 'no-store',
          signal: controller.signal,
        })

        if (!response.ok) return

        const next = readLiveAnnouncements(await response.json())
        if (!cancelled) setLiveAnnouncements(next)
      } catch {
        // Static export fallback: keep build-time announcements when the live API is unavailable.
      }
    }

    loadLiveAnnouncements()
    const interval = window.setInterval(loadLiveAnnouncements, RUNTIME_INTERVALS.liveAnnouncementsRefreshMs)

    return () => {
      cancelled = true
      controller?.abort()
      window.clearInterval(interval)
    }
  }, [])

  return (
    <>
      <div className="space-y-2 mt-4">
        {visible.map((a, index) => <AnnouncementRow key={announcementKey(a)} a={a} index={index} />)}
      </div>
      {mergedAnnouncements.length > DEFAULT_VISIBLE && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-slate-400 border border-white/8 hover:bg-white/5 w-full"
        >
          <ChevronDown size={15} className={`text-cyan-400 transition-transform ${showAll ? 'rotate-180' : ''}`} />
          {showAll ? 'Show fewer' : `Show all ${mergedAnnouncements.length}`}
        </button>
      )}
    </>
  )
}
