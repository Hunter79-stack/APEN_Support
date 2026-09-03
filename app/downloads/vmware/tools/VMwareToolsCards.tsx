'use client'

/**
 * VMware Tools & VMRC — one tile per product, files behind the expander.
 *
 * Matches the /downloads/microsoft-products/office layout. Both cards carry
 * several files (Windows .exe, Windows .iso and the ESXi offline depot for
 * Tools; Windows .zip and the Linux .bundle for VMRC), so each keeps a
 * disclosure list rather than a single button.
 *
 * `downloads[]` keeps its exact shape on purpose: this scope has a LIVE
 * published admin override that patches vmrc's download rows slot by slot, and
 * the editor addresses them as downloads.0.href … downloads.2.href. Changing
 * the array shape or the card ids would silently drop that edit.
 */

import { useMemo } from 'react'
import { TileGrid, type TileItem } from '@/components/cards/TileGrid'
import { vmwareToolCards } from '@/lib/data/vmware'
import { useCardOverrides } from '@/lib/data/admin-content'
import type { DownloadCard } from '@/lib/types/cards'

export function VMwareToolsCards() {
  const cards = useCardOverrides<DownloadCard>('vmware/tools', vmwareToolCards)

  const items = useMemo<TileItem[]>(
    () => cards.map((card) => ({
      id: card.id,
      title: card.title,
      subtitle: 'VMware, Inc.',
      icon: card.logo,
      description: card.description,
      downloads: (card.downloads ?? []).map((d) => ({ label: d.label, href: d.href })),
    })),
    [cards],
  )

  return (
    <TileGrid
      items={items}
      gridCols="sm:grid-cols-2 lg:grid-cols-3"
      emptyMessage="No VMware utilities are published yet."
    />
  )
}
