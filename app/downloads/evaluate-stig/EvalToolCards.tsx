'use client'

/**
 * Evaluate-STIG tool downloads — STIG Viewer and the STIG library/GPO package.
 *
 * Moved off /docs/evaluate-stig/documents, which is for reading material. These
 * two cards are payloads you install or unpack (four STIG Viewer builds, two
 * ZIPs), so they belong under /downloads with the rest of the software.
 *
 * Card ids (`stigviewer`, `library`) and downloads[] keep their exact shape, so
 * the move changes only which scope edits them.
 */

import { useMemo } from 'react'
import { TileGrid, type TileItem } from '@/components/cards/TileGrid'
import { evalToolCards, type EvalDocCard } from '@/lib/data/evaluate-stig'
import { useCardOverrides } from '@/lib/data/admin-content'

export function EvalToolCards() {
  const cards = useCardOverrides<EvalDocCard>('evaluate-stig/downloads', evalToolCards)

  const items = useMemo<TileItem[]>(
    () => cards.map((card) => ({
      id: card.id,
      title: card.title,
      subtitle: card.tags[0],
      description: card.description,
      downloads: (card.downloads ?? []).map((d) => ({ label: d.label, href: d.href })),
    })),
    [cards],
  )

  return (
    <TileGrid
      items={items}
      // Both cards carry the same Evaluate-STIG mark, so an icon column would
      // be one image twice.
      showIcons={false}
      gridCols="sm:grid-cols-2"
      emptyMessage="No Evaluate-STIG tools are published yet."
    />
  )
}
