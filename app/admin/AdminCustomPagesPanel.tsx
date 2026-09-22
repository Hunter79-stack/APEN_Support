'use client'

/**
 * AdminCustomPagesPanel — read-only listing + delete for every page published
 * by the New Page Wizard. Lives in its own /admin/ tab so admins can audit
 * what's been created and remove stale entries without manually editing
 * proxy/custom-pages.json.
 *
 * Read path  : adminContentClient.fetchAll()   (returns audit metadata too)
 * Delete path: adminContentClient.deleteCustomPage(slug, updatedBy)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GlowCard } from '@/components/ui/spotlight-card'
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react'
import { adminContentClient, CUSTOM_PAGE_PARENTS, type CustomPage } from '@/lib/data/admin-content'
import { ExportBar } from '@/components/admin/ExportBar'
import type { ExportColumn } from '@/lib/admin/export'

type Feedback = { kind: 'ok' | 'err'; text: string }

function categoryLabel(value: string | undefined): string {
  const match = CUSTOM_PAGE_PARENTS.find((p) => p.value === value)
  return match ? match.label : (value || '—')
}

function formatTimestamp(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

const EXPORT_COLUMNS: ExportColumn<CustomPage>[] = [
  { label: 'Title', value: (p) => p.title },
  { label: 'Category', value: (p) => categoryLabel(p.category) },
  { label: 'URL', value: (p) => `/${p.category || 'general'}/${p.slug}` },
  { label: 'Cards', value: (p) => String(p.cards.length) },
  { label: 'Updated', value: (p) => formatTimestamp(p.updatedAt) },
  { label: 'Updated By', value: (p) => p.updatedBy || '' },
]

export function AdminCustomPagesPanel() {
  const [pages, setPages] = useState<CustomPage[]>([])
  const [loading, setLoading] = useState(true)
  const [busySlug, setBusySlug] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const refreshSeq = useRef(0) // latest request wins: an older list must not land after a newer one
  const refresh = useCallback(async () => {
    const seq = ++refreshSeq.current
    setLoading(true)
    const data = await adminContentClient.fetchAll()
    if (seq !== refreshSeq.current) return
    setLoading(false)
    if (!data) {
      setFeedback({ kind: 'err', text: 'Could not reach the admin API. Is the site-stats proxy running?' })
      return
    }
    setPages(data.customPages || [])
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const handleDelete = useCallback(async (slug: string, title: string) => {
    if (!window.confirm(`Permanently delete "${title}" (slug: ${slug})? This removes it from the site and from proxy/custom-pages.json.`)) return
    setBusySlug(slug)
    setFeedback(null)
    const result = await adminContentClient.deleteCustomPage(slug, 'admin-ui')
    setBusySlug(null)
    if (!result.ok) {
      setFeedback({ kind: 'err', text: `Delete failed: ${result.error}` })
      return
    }
    setFeedback({ kind: 'ok', text: `Removed "${title}".` })
    await refresh()
  }, [refresh])

  const sorted = useMemo(
    () => [...pages].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
    [pages],
  )

  const counts = useMemo(() => {
    const byCategory: Record<string, number> = {}
    for (const p of pages) byCategory[p.category || 'general'] = (byCategory[p.category || 'general'] || 0) + 1
    return { total: pages.length, byCategory }
  }, [pages])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <span className="text-cyan-200">{counts.total}</span>
          <span>page{counts.total === 1 ? '' : 's'} published</span>
          {Object.entries(counts.byCategory).map(([cat, n]) => (
            <span key={cat} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
              {categoryLabel(cat)}: {n}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ExportBar rows={sorted} columns={EXPORT_COLUMNS} filenameBase="custom-pages" title="APEN Custom Pages" />
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-cyan-400/30 hover:text-cyan-300 disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
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
          <button onClick={() => setFeedback(null)} aria-label="Dismiss" className="shrink-0 text-slate-400 hover:text-white">
            <X size={12} />
          </button>
        </div>
      )}

      {loading && pages.length === 0 && (
        <GlowCard glowColor="indigo" className="p-6 text-center">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Loading published pages…</p>
        </GlowCard>
      )}

      {!loading && sorted.length === 0 && (
        <GlowCard glowColor="indigo" className="p-6 text-center">
          <p className="text-sm text-slate-400">No pages have been published via the New Page Wizard yet.</p>
          <p className="mt-1 text-xs text-slate-400">
            Switch to the <span className="text-cyan-300">New page wizard</span> tab to create one.
          </p>
        </GlowCard>
      )}

      {sorted.length > 0 && (
        <div className="grid gap-3">
          {sorted.map((p) => {
            const url = `/${p.category || 'general'}/${p.slug}`
            return (
              <GlowCard
                key={p.slug}
                glowColor="cyan"
                className="p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="text-sm font-semibold text-white">{p.title}</p>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {categoryLabel(p.category)}
                      </span>
                      {p.published === false && (
                        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-200">
                          unpublished
                        </span>
                      )}
                    </div>
                    {p.subtitle && (
                      <p className="mt-1 text-xs text-slate-400 leading-relaxed line-clamp-2">{p.subtitle}</p>
                    )}
                    <p className="mt-1.5 text-[10px] font-mono text-cyan-400/80 truncate">{url}</p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {p.cards.length} card{p.cards.length === 1 ? '' : 's'}
                      {' · '}
                      updated {formatTimestamp(p.updatedAt)}
                      {p.updatedBy ? ` by ${p.updatedBy}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-cyan-400/30 hover:text-cyan-300"
                    >
                      <ExternalLink size={11} /> View
                    </a>
                    <button
                      onClick={() => handleDelete(p.slug, p.title)}
                      disabled={busySlug === p.slug}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-red-400/30 hover:text-red-300 disabled:opacity-50"
                    >
                      <Trash2 size={11} /> {busySlug === p.slug ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </GlowCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
