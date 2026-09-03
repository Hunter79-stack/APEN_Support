'use client'

/**
 * FacilitatePro FAQ — 22 questions as compact disclosure rows.
 *
 * This is the largest homogeneous set on the site, and it was 22 p-8 GlowCards
 * in a 3-column grid, each stamped with the same FacilitatePro logo and each
 * hiding its answer behind a click on a `div role="button"` — the nested-widget
 * pattern the repo already bans for CustomPageView.
 *
 * The payload here is prose, not a file, so the tile keeps the compact row and
 * swaps the download button for a native disclosure button. The icon column is
 * off: every entry would show the identical mark, and app/docs/** may not
 * reference LOGOS at all (validate-image-registry.mjs SELECTION rule).
 */

import { useMemo } from 'react'
import { TileGrid, type TileItem } from '@/components/cards/TileGrid'
import { faqCards } from '@/lib/data/docs'
import { useCardOverrides } from '@/lib/data/admin-content'
import type { FAQCard } from '@/lib/types/cards'

const SECTIONS = ['APEN / CESC Support', 'FacilitatePro Product FAQ'] as const

export function FAQCards() {
  // Layer admin edits (/admin > Edit pages & cards) over the static FAQ list.
  const cards = useCardOverrides<FAQCard>('docs/facpro/faq', faqCards)

  const items = useMemo<TileItem[]>(
    () => cards.map((faq) => ({
      id: faq.id,
      title: faq.title,
      // The existing id prefix already encodes the split the data file
      // documents in a comment: 10 support questions, 12 vendor questions.
      category: faq.id.startsWith('vendor-') ? SECTIONS[1] : SECTIONS[0],
      body: faq.answer,
    })),
    [cards],
  )

  return (
    <TileGrid
      items={items}
      categoryOrder={SECTIONS}
      showCounts
      unitLabel="question"
      showIcons={false}
      gridCols="sm:grid-cols-2 lg:grid-cols-3"
      emptyMessage="No FAQ entries are published yet."
    />
  )
}
