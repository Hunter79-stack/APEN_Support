'use client'

/**
 * Lists every wizard-published page whose `category` matches the prop, fetched
 * from the proxy at runtime. Dropped into each section landing page so admins
 * can publish a new page via /admin/ and have it appear under its section
 * without rebuilding or editing the section's hand-coded card grid.
 *
 * Renders nothing when there are no matching pages (silent no-op for sections
 * that don't have any wizard pages yet) so it doesn't add a stray heading to
 * pages that don't need it.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { GlowCard } from '@/components/ui/spotlight-card'
import { ThemedLogo } from '@/components/common/ThemedLogo'
import { SectionTitle } from '@/components/layout/PageHeader'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { API_ENDPOINTS } from '@/lib/data/runtime'
import type { CustomPage } from '@/lib/data/admin-content'

interface CategoryCustomPagesProps {
  category: string
  /** Optional section heading. Defaults to "Additional Resources". */
  title?: string
}

export function CategoryCustomPages({ category, title = 'Additional Resources' }: CategoryCustomPagesProps) {
  const [pages, setPages] = useState<CustomPage[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(API_ENDPOINTS.contentOverrides, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        if (data && Array.isArray(data.customPages)) {
          setPages(data.customPages as CustomPage[])
        }
      })
      .catch(() => { /* proxy offline → show nothing */ })
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [])

  const matches = useMemo(
    () => pages.filter((p) => p.category === category),
    [pages, category],
  )

  // Render nothing until we've loaded AND found at least one match. This keeps
  // sections that have no wizard pages from showing an empty header.
  if (!loaded || matches.length === 0) return null

  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <p className="text-slate-400 text-sm mb-6">
        Pages published via the New Page Wizard under <code className="text-cyan-300 font-mono">/{category}/</code>.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {matches.map((p, index) => (
          <Link key={p.slug} href={`/${p.category || category}/${p.slug}`} className="block h-full">
            <GlowCard
              glowColor={getCardGlowColor(index)}
              className="p-6 flex flex-col gap-4 h-full hover:ring-2 hover:ring-sky-300/70 transition-all duration-300"
            >
              {p.logo && (
                <ThemedLogo src={p.logo} alt={p.title} size="xl" glass glow variant="square" />
              )}
              <div className="flex-1">
                <p className="text-lg font-semibold text-white">{p.title}</p>
                {p.subtitle && (
                  <p className="text-sm leading-relaxed mt-1.5 text-slate-400">{p.subtitle}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-md text-xs bg-white/5 text-slate-400 border border-white/5">
                  {p.cards.length} card{p.cards.length === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-xs text-cyan-400 mt-auto">View page →</p>
            </GlowCard>
          </Link>
        ))}
      </div>
    </section>
  )
}
