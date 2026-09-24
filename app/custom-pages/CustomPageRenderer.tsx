'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { GlowCard } from '@/components/ui/spotlight-card'
import { ThemedLogo } from '@/components/common/ThemedLogo'
import { CustomPageView } from '@/components/common/CustomPageView'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { API_ENDPOINTS } from '@/lib/data/runtime'
import type { CustomPage } from '@/lib/data/admin-content'

/** Resolves the slug for the currently-viewed page from the browser URL.
 *  - Preferred: /<section>/<slug>  (the wizard's published URL pattern)
 *  - Legacy:    /custom-pages/?slug=<slug>  (kept so older bookmarks still work)
 *  Both styles return the same slug; the section segment is informational only,
 *  since slugs are globally unique across customPages.json. */
function readSlugFromUrl(): string {
  if (typeof window === 'undefined') return ''
  // Strip a trailing slash so /vmware/foo and /vmware/foo/ behave identically.
  const path = window.location.pathname.replace(/\/+$/, '')
  const pathMatch = path.match(/^\/[a-z0-9][a-z0-9_-]*\/([a-z0-9][a-z0-9_-]*)$/)
  if (pathMatch) return pathMatch[1]
  const params = new URLSearchParams(window.location.search)
  return params.get('slug') || ''
}

const subscribeToHistory = (onChange: () => void) => {
  window.addEventListener('popstate', onChange)
  return () => window.removeEventListener('popstate', onChange)
}

export function CustomPageRenderer() {
  const [pages, setPages] = useState<CustomPage[]>([])
  const [loading, setLoading] = useState(true)
  // '' on the server render, the real slug once hydrated, re-read on back/forward.
  const slug = useSyncExternalStore(subscribeToHistory, readSlugFromUrl, () => '')

  useEffect(() => {
    let cancelled = false
    fetch(API_ENDPOINTS.contentOverrides, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        if (data && Array.isArray(data.customPages)) setPages(data.customPages as CustomPage[])
      })
      .catch(() => { /* leave empty */ })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const page = useMemo(() => pages.find((p) => p.slug === slug && p.published !== false), [pages, slug])
  const visiblePages = useMemo(() => pages.filter((p) => p.published !== false), [pages])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 text-center">
        <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Loading admin-published pages…</p>
      </div>
    )
  }

  // No slug → directory of every published custom page (same Nav-card pattern).
  if (!slug) {
    return (
      <>
        <PageHeader
          title="Custom Pages"
          subtitle="Admin-published resource collections. Each page below was created with the in-app wizard."
          badge="Home"
          backHref="/home"
          backColor="cyan"
        />
        <div className="max-w-7xl mx-auto px-6 py-10">
          {visiblePages.length === 0 ? (
            <GlowCard glowColor="indigo" className="p-8 text-center">
              <p className="text-sm text-slate-400">No custom pages have been published yet.</p>
              <p className="text-xs text-slate-400 mt-2">
                Admins can create one via the New Page Wizard at <code className="text-cyan-400">/admin</code>.
              </p>
            </GlowCard>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {visiblePages.map((p, index) => (
                <Link key={p.slug} href={`/${p.category || 'general'}/${p.slug}`} className="block h-full">
                  <GlowCard glowColor={getCardGlowColor(index)} className="p-8 flex flex-col gap-6 h-full hover:ring-2 hover:ring-sky-300/70 transition-all duration-300">
                    <div className="flex items-start justify-between">
                      {p.logo && (
                        <ThemedLogo src={p.logo} alt={p.title} size="xl" glass glow variant="square" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-semibold text-white">{p.title}</p>
                      <p className="text-sm leading-relaxed mt-1.5 text-slate-400">{p.subtitle}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded-md text-xs bg-white/5 text-slate-400 border border-white/5">
                        {p.cards.length} card{p.cards.length === 1 ? '' : 's'}
                      </span>
                      {p.category && (
                        <span className="px-2 py-0.5 rounded-md text-xs bg-white/5 text-slate-400 border border-white/5">
                          {p.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-cyan-400 mt-auto">View page →</p>
                  </GlowCard>
                </Link>
              ))}
            </div>
          )}
        </div>
      </>
    )
  }

  if (!page) {
    return (
      <>
        <PageHeader
          title="Page not found"
          subtitle={`No published page exists for slug "${slug}".`}
          badge="Custom Pages"
          backHref="/custom-pages/"
          backColor="amber"
        />
        <div className="max-w-3xl mx-auto px-6 py-10">
          <GlowCard glowColor="orange" className="p-6 text-center">
            <p className="text-sm text-slate-400">
              Try the directory at <Link href="/custom-pages/" className="text-cyan-300">/custom-pages/</Link> or check that the slug is spelled correctly.
            </p>
          </GlowCard>
        </div>
      </>
    )
  }

  return <CustomPageView page={page} />
}
