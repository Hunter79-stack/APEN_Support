'use client'

/**
 * Evaluate-STIG documents — one tile per card.
 *
 * Five expanding GlowCards holding nine files, where three of the five held
 * exactly ONE file: the click revealed a single download row. The two that held
 * the rest — STIG Viewer and the STIG library/GPO package — were payloads
 * rather than reading material and now live on /downloads/evaluate-stig, so
 * this page is the three documents and nothing else.
 *
 * The card stays the unit and `downloads[]` keeps its shape: the scope joins to
 * the card by id, so splitting these into per-file tiles would detach every
 * saved admin edit.
 *
 * No icon column — all five rendered the same Evaluate-STIG mark, and
 * app/docs/** may not reference LOGOS (validate-image-registry SELECTION rule).
 */

import { useMemo } from 'react'
import { TileGrid, type TileItem } from '@/components/cards/TileGrid'
import { evalDocCards, type EvalDocCard } from '@/lib/data/evaluate-stig'
import { useCardOverrides } from '@/lib/data/admin-content'

export function EvalDocsCards() {
  const docCards = useCardOverrides<EvalDocCard>('evaluate-stig/documents', evalDocCards)

  const items = useMemo<TileItem[]>(
    () => docCards.map((card) => ({
      id: card.id,
      title: card.title,
      subtitle: card.tags[0],
      description: card.description,
      downloads: (card.downloads ?? []).map((d) => ({ label: d.label, href: d.href })),
    })),
    [docCards],
  )

  return (
    <TileGrid
      items={items}
      showIcons={false}
      gridCols="sm:grid-cols-2 lg:grid-cols-3"
      emptyMessage="No Evaluate-STIG documents are published yet."
    />
  )
}
