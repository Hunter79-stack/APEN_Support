'use client'

/**
 * Shared ISO listing — one compact tile per image.
 *
 * The three ISO pages were the same component with a different import: a p-8
 * GlowCard per image that expanded, on click, to reveal exactly ONE
 * DownloadRow. The expand hid the only thing the visitor came for, so the tile
 * shows the file and its download button outright and the release / distro
 * family becomes a section heading.
 *
 * NO multi-select here, deliberately: these are multi-gigabyte images and a
 * "download all" would kick off several concurrent multi-GB transfers.
 *
 * `scope` is passed in as a literal by each page so the existing admin override
 * keys survive verbatim — including 'isos/enterprise-linux', which does NOT
 * match its route (/downloads/iso/linux/enterprise). Card ids pass through
 * untouched for the same reason: applyScopeOverride joins a saved sysadmin edit
 * to a card BY ID, so renaming one silently drops that edit.
 */

import { useMemo } from 'react'
import { TileGrid, type TileItem } from '@/components/cards/TileGrid'
import { useCardOverrides } from '@/lib/data/admin-content'
import type { ISOCard } from '@/lib/types/cards'

/** How images are bucketed into sections. A string, not a callback: these are
 *  rendered from server components, which cannot pass functions as props. */
export type ISOGrouping = 'first-tag' | 'client-server'

function categoryOf(iso: ISOCard, grouping: ISOGrouping): string {
  if (grouping === 'client-server') return /server/i.test(iso.title) ? 'Server' : 'Client'
  return iso.tags[0] ?? ''
}

export function ISOTiles({ scope, cards, grouping = 'first-tag', categoryOrder, fallbackIcon, showIcons = true }: {
  scope: string
  cards: ISOCard[]
  grouping?: ISOGrouping
  categoryOrder?: readonly string[]
  fallbackIcon?: string
  /** Off where every image shares one mark (Windows: all three are LOGOS.windows). */
  showIcons?: boolean
}) {
  const isos = useCardOverrides<ISOCard>(scope, cards)

  const items = useMemo<TileItem[]>(
    () => isos.map((iso) => ({
      id: iso.id,
      title: iso.title,
      // The filename is what a visitor checks before a multi-GB download, and
      // keeping it as visible text also keeps it in the search index.
      subtitle: iso.file,
      // Kept as visible text (clamped to two lines) rather than dropped: these
      // descriptions carry the codename and edition — "Jammy Jellyfish",
      // "Long-term support release" — and the search index only sees text that
      // is actually rendered. Dropping them cost this page half its indexed
      // content.
      description: iso.description,
      icon: iso.logo,
      category: categoryOf(iso, grouping),
      downloads: iso.href ? [{ label: iso.file, href: iso.href }] : [],
    })),
    [isos, grouping],
  )

  return (
    <TileGrid
      items={items}
      categoryOrder={categoryOrder}
      showCounts
      unitLabel="image"
      gridCols="sm:grid-cols-2 lg:grid-cols-3"
      fallbackIcon={fallbackIcon}
      showIcons={showIcons}
      emptyMessage="No ISO images are published here yet."
    />
  )
}
