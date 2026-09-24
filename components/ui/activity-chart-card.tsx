'use client'

import * as React from 'react'
import { motion, AnimatePresence, MotionConfig, type Variants } from 'framer-motion'
import { ChevronDown, Activity, Wifi, WifiOff, Users } from 'lucide-react'
import { cn } from '@/lib/data/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { RUNTIME_INTERVALS } from '@/lib/data/runtime'

export interface DataPoint {
  day: string
  /** Requests in this bucket — the bar height. */
  value: number
  /** Unique connections in this bucket. Always <= value, usually far lower. */
  connections?: number
}
export interface ConnectionLocation { path: string; count: number }
export interface TopIP { ip: string; count: number; locations?: ConnectionLocation[] }

interface ActivityChartCardProps {
  title?: string
  totalValue?: string
  data?: DataPoint[]
  className?: string
  dropdownOptions?: string[]
  /** When provided, fetches live data from this endpoint instead of using static data */
  apiEndpoint?: string
  /** Show top IPs table beneath the chart */
  showTopIPs?: boolean
}

/* ── Empty-state chart data ─────────────────────────────────
 *
 * We never display fabricated traffic numbers. When the live API is offline
 * (or hasn't responded yet), the chart still shows the correct period axis
 * — same hour / weekday / week / month labels the proxy will produce when
 * it comes back online — but every bucket is zero. That way the chart axis
 * matches what the user will see live, the bars stay flat, and the "Offline"
 * pill in the card header makes the state explicit.
 *
 * The bucket counts and labels mirror the proxy's `compute{Daily,Weekly,
 * Monthly,Yearly}` helpers in `proxy/site-stats.mjs` so the empty state and
 * the live state are visually identical aside from bar heights.
 */

function hourLabel(hour: number): string {
  if (hour === 0) return '12a'
  if (hour === 12) return '12p'
  return hour < 12 ? `${hour}a` : `${hour - 12}p`
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_LABELS   = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const HOUR_MS = 3_600_000
const DAY_MS  = 86_400_000

export function buildEmptyChartData(selected: string, todaySeed?: string): DataPoint[] {
  // `todaySeed` is the toDateString() value the component recomputes nightly.
  // Fall back to the current moment if it's missing or unparseable.
  const parsed = todaySeed ? new Date(todaySeed) : null
  const now = parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date()

  switch (selected) {
    case 'Daily': {
      const out: DataPoint[] = []
      const startHour = new Date(now); startHour.setMinutes(0, 0, 0)
      for (let i = 11; i >= 0; i--) {
        const d = new Date(startHour.getTime() - i * HOUR_MS)
        out.push({ day: hourLabel(d.getHours()), value: 0 })
      }
      return out
    }
    case 'Weekly': {
      const start = new Date(now); start.setHours(0, 0, 0, 0)
      const out: DataPoint[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(start.getTime() - i * DAY_MS)
        out.push({ day: WEEKDAY_LABELS[d.getDay()], value: 0 })
      }
      return out
    }
    case 'Monthly':
      return [
        { day: 'W1', value: 0 },
        { day: 'W2', value: 0 },
        { day: 'W3', value: 0 },
        { day: 'W4', value: 0 },
      ]
    case 'Yearly': {
      const out: DataPoint[] = []
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        out.push({ day: MONTH_LABELS[d.getMonth()], value: 0 })
      }
      return out
    }
    default:
      return []
  }
}

/* ── Live data hook ────────────────────────────────────────── */
export interface LiveStats {
  chart: Record<string, DataPoint[]>
  totals: Record<string, string>
  topIPs?: Record<string, TopIP[]>
  /** One connection list per chart bucket, aligned by index with chart[period]. */
  bucketIPs?: Record<string, TopIP[][]>
  totalToday: number
}

function useLiveStats(endpoint: string | undefined) {
  const [stats, setStats] = React.useState<LiveStats | null>(null)
  const [live, setLive]   = React.useState(false)
  const [error, setError] = React.useState(false)

  React.useEffect(() => {
    if (!endpoint) return
    const statsEndpoint = endpoint
    let cancelled = false

    async function fetchStats() {
      try {
        const res = await fetch(statsEndpoint)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (cancelled) return
        setStats(data)
        setLive(true)
        setError(false)
      } catch {
        if (cancelled) return
        setError(true)
        setLive(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, RUNTIME_INTERVALS.activityStatsRefreshMs)
    return () => { cancelled = true; clearInterval(interval) }
  }, [endpoint])

  return { stats, live, error }
}

interface ResolveActivityChartDataArgs {
  selected: string
  today: string
  data?: DataPoint[]
  totalValue?: string
  live: boolean
  stats: LiveStats | null
  showTopIPs?: boolean
  /** Bar the admin clicked, or null for the whole window. */
  bucketIndex?: number | null
}

interface ResolvedActivityChartData {
  activeData: DataPoint[]
  activeTotal: string
  topIPs: TopIP[]
  /** Label of the bucket the list is scoped to, or null when window-wide. */
  bucketLabel: string | null
}

export function resolveActivityChartData({
  selected,
  today,
  data,
  totalValue,
  live,
  stats,
  showTopIPs = false,
  bucketIndex = null,
}: ResolveActivityChartDataArgs): ResolvedActivityChartData {
  const liveData = live ? stats?.chart?.[selected] : undefined
  const liveTotal = live ? stats?.totals?.[selected] : undefined
  // A clicked bar scopes the list to THAT bucket. Falling back to the
  // window-wide list here would be worse than showing nothing: it puts the
  // period's connections under one hour's heading, which is what made 4p claim
  // every connection of the day.
  const liveTopIPs = live && showTopIPs
    ? (bucketIndex === null
        ? stats?.topIPs?.[selected]
        : stats?.bucketIPs?.[selected]?.[bucketIndex])
    : undefined

  // Fallback is always a zero-valued shape with real period labels. Never
  // fabricated traffic numbers — see buildEmptyChartData() above.
  const fallbackData = buildEmptyChartData(selected, today)

  const activeData = Array.isArray(data)
    ? data
    : Array.isArray(liveData)
      ? liveData
      : fallbackData

  const activeTotal = totalValue
    ?? (typeof liveTotal === 'string' ? liveTotal : undefined)
    ?? '—'

  const topIPs = Array.isArray(liveTopIPs) ? liveTopIPs : []
  const bucketLabel = bucketIndex === null ? null : activeData[bucketIndex]?.day ?? null

  return { activeData, activeTotal, topIPs, bucketLabel }
}

/* ── Component ─────────────────────────────────────────────── */
export function ActivityChartCard({
  title = 'Site Activity',
  totalValue,
  data,
  className,
  dropdownOptions = ['Daily', 'Weekly', 'Monthly', 'Yearly'],
  apiEndpoint,
  showTopIPs = false,
}: ActivityChartCardProps) {
  const [selected, setSelected] = React.useState(dropdownOptions[0])
  const [today, setToday] = React.useState(() => new Date().toDateString())
  const [expanded, setExpanded] = React.useState(false)
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null)
  const [expandedIps, setExpandedIps] = React.useState<Set<string>>(() => new Set())
  const connectionsPanelId = React.useId()
  // Which bar the admin clicked. null = the whole selected period.
  const [bucketIndex, setBucketIndex] = React.useState<number | null>(null)

  // Clicking anywhere on the timeline opens the connection list. The bars are
  // the obvious thing to click, so making them inert forced a detour through
  // the header's Show IDs button.
  //
  // NOTE: this deliberately does NOT filter to the clicked bucket. topIPs is
  // keyed by the selected PERIOD (stats.topIPs[selected]), not per bar, so
  // there is no per-bucket breakdown to show — pretending otherwise would put
  // whole-period IPs under a single bar's heading.
  const openConnections = React.useCallback((index: number) => {
    if (!showTopIPs) return
    setBucketIndex(index)
    setExpanded(true)
  }, [showTopIPs])

  // A bucket of one period means nothing in another, and the bars themselves
  // change, so drop the scope whenever the period does. Open connection rows
  // go too — the IDs differ per window, so stale open rows would be meaningless.
  const selectPeriod = (opt: typeof selected) => {
    setSelected(opt)
    setBucketIndex(null)
    setExpandedIps(new Set())
  }
  const toggleIp = React.useCallback((ip: string) => {
    setExpandedIps((prev) => {
      const next = new Set(prev)
      if (next.has(ip)) next.delete(ip)
      else next.add(ip)
      return next
    })
  }, [])

  React.useEffect(() => {
    function scheduleReset() {
      const now = new Date()
      const msUntilMidnight =
        new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0).getTime() - now.getTime()
      return setTimeout(() => {
        setToday(new Date().toDateString())
        scheduleReset()
      }, msUntilMidnight)
    }
    const timer = scheduleReset()
    return () => clearTimeout(timer)
  }, [])

  const { stats, live, error } = useLiveStats(apiEndpoint)

  // Choose data source: live API -> explicit props -> static fallback.
  const { activeData, activeTotal, topIPs, bucketLabel } = resolveActivityChartData({
    selected,
    today,
    data,
    totalValue,
    live,
    stats,
    showTopIPs,
    bucketIndex,
  })

  const maxValue = Math.max(...activeData.map((d) => d.value), 1)

  const chartVariants: Variants = {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
  }
  const barVariants: Variants = {
    hidden:  { scaleY: 0, opacity: 0, originY: 1 },
    visible: { scaleY: 1, opacity: 1, originY: 1, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const } },
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-cyan-400" />
            <CardTitle className="text-base">{title}</CardTitle>
            {/* Live / offline indicator */}
            {apiEndpoint && (
              <span className={cn('flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full',
                live  ? 'bg-emerald-400/10 text-emerald-400' :
                error ? 'bg-red-400/10 text-red-400' :
                        'bg-slate-400/10 text-slate-400'
              )}>
                {live ? <Wifi size={10} /> : <WifiOff size={10} />}
                {live ? 'Live' : error ? 'Offline' : 'Loading'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {showTopIPs && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-label={expanded ? 'Hide unique connection IDs' : 'Show unique connection IDs'}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
              >
                {expanded ? 'Hide IDs' : 'Show IDs'}
                <ChevronDown size={12} className={cn('transition-transform duration-200', expanded && 'rotate-180')} />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-1 text-xs text-slate-400 hover:text-white">
                  {selected} <ChevronDown size={12} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {dropdownOptions.map((opt) => (
                  <DropdownMenuItem key={opt} onSelect={() => selectPeriod(opt)} className="text-xs">
                    {opt}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6">
          {/* Total */}
          <div className="flex-shrink-0">
            <p className="text-4xl font-bold tracking-tighter text-white tabular-nums">
              {activeTotal}
            </p>
            <CardDescription className="flex items-center gap-1 mt-1">
              {live ? (
                <>
                  <Users size={13} className="text-cyan-400" />
                  <span className="text-xs">
                    {`unique connections (${selected.toLowerCase()})`}
                  </span>
                </>
              ) : (
                <>
                  <Users size={13} className="text-slate-400" />
                  <span className="text-xs text-slate-400">
                    unique connections — waiting for live data
                  </span>
                </>
              )}
            </CardDescription>
          </div>

          {/* Bars */}
          <div className="relative w-full">
            <MotionConfig reducedMotion="user">
            <AnimatePresence mode="wait">
              <motion.div
                key={selected}
                className="flex h-24 w-full items-end gap-1"
                variants={chartVariants}
                initial="hidden"
                animate="visible"
              >
                {activeData.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onFocus={() => setHoveredIndex(i)}
                    onBlur={() => setHoveredIndex(null)}
                    onClick={() => openConnections(i)}
                    aria-expanded={showTopIPs ? expanded && bucketIndex === i : undefined}
                    aria-controls={showTopIPs ? connectionsPanelId : undefined}
                    aria-label={`${item.day}: ${item.value.toLocaleString()} requests`
                      + (typeof item.connections === 'number' ? `, ${item.connections.toLocaleString()} unique connections` : '')
                      + (showTopIPs ? ` — show the connections for ${item.day}` : '')}
                    className={cn(
                      'relative flex h-full w-full flex-col items-center justify-end gap-1.5 rounded-sm',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70',
                      showTopIPs ? 'cursor-pointer' : 'cursor-default',
                    )}
                  >
                    {hoveredIndex === i && (
                      <div className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-cyan-400/30 bg-black/85 px-2 py-1 text-[11px] font-bold tabular-nums text-cyan-300 shadow-lg backdrop-blur-sm">
                        {item.value.toLocaleString()} req
                        {typeof item.connections === 'number' && (
                          <span className="ml-1 font-normal text-slate-400">
                            · {item.connections.toLocaleString()} conn
                          </span>
                        )}
                      </div>
                    )}
                    <motion.div
                      className="w-full rounded-t-sm"
                      style={{
                        height: `${(item.value / maxValue) * 100}%`,
                        background: hoveredIndex === i || (expanded && bucketIndex === i)
                          ? 'linear-gradient(to top, rgba(0,212,255,0.85), rgba(99,102,241,0.7))'
                          : 'linear-gradient(to top, rgba(0,212,255,0.5), rgba(99,102,241,0.4))',
                        minHeight: '2px',
                        transition: 'background 150ms ease',
                      }}
                      variants={barVariants}
                    />
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">{item.day}</span>
                  </button>
                ))}
              </motion.div>
            </AnimatePresence>
            </MotionConfig>

            {/* Empty-state overlay shown when there's no live data yet. The
                bars beneath are real (zero-valued with proper period labels),
                so the axis still matches what the live chart will look like. */}
            {apiEndpoint && !live && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 backdrop-blur-sm">
                  {error ? 'Live data unavailable' : 'Waiting for live data…'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Unique Connection IDs — revealed via the header expand toggle. Each
            connection expands to show which site locations it viewed. */}
        {showTopIPs && expanded && (
          <div id={connectionsPanelId} className="mt-6 border-t border-white/5 pt-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Unique Connection IDs ({bucketLabel ?? selected.toLowerCase()})
                </p>
                {/* Scoped to one bar — say so, and offer the way back out. The
                    old heading always read "(daily)" even while the list was a
                    single hour's, which is the confusion this whole change is
                    about. */}
                {bucketLabel && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setBucketIndex(null)}
                    className="h-auto px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-cyan-400 hover:text-cyan-300"
                  >
                    show all {selected.toLowerCase()}
                  </Button>
                )}
              </div>
              {topIPs.length > 0 && (
                <span className="text-[10px] uppercase tracking-widest text-slate-400">{topIPs.length} shown · click to expand</span>
              )}
            </div>
            {topIPs.length === 0 && bucketLabel ? (
              <p className="py-3 text-xs text-slate-400">
                No connections recorded in the {bucketLabel} bucket.
              </p>
            ) : topIPs.length > 0 ? (
              <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
                {topIPs.map((entry, i) => {
                  const isOpen = expandedIps.has(entry.ip)
                  const locations = entry.locations ?? []
                  return (
                    <div key={entry.ip} className="overflow-hidden rounded border border-white/5">
                      <button
                        type="button"
                        onClick={() => toggleIp(entry.ip)}
                        aria-expanded={isOpen}
                        aria-label={isOpen ? `Hide pages viewed by ${entry.ip}` : `Show pages viewed by ${entry.ip}`}
                        className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-xs transition-colors hover:bg-white/5"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <ChevronDown size={12} className={cn('shrink-0 text-slate-400 transition-transform duration-200', isOpen && 'rotate-180')} />
                          <span className="w-5 text-right tabular-nums text-slate-400">{i + 1}</span>
                          <code className="truncate font-mono text-xs text-slate-300">{entry.ip}</code>
                        </span>
                        <span className="shrink-0 tabular-nums text-slate-400">{entry.count.toLocaleString()} hits</span>
                      </button>
                      {isOpen && (
                        <div className="border-t border-white/5 bg-black/20 px-2 py-2">
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Locations viewed</p>
                          {locations.length > 0 ? (
                            <ul className="space-y-0.5">
                              {locations.map((loc) => (
                                <li key={loc.path} className="flex items-center justify-between gap-3 text-[11px]">
                                  <code className="truncate font-mono text-slate-400">{loc.path}</code>
                                  <span className="shrink-0 tabular-nums text-slate-400">{loc.count.toLocaleString()}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-[11px] italic text-slate-400">No page-level detail recorded for this connection.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs italic text-slate-400">
                {live ? 'No connection data for this period yet.' : 'Waiting for live data…'}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
