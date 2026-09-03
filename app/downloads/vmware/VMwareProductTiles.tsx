'use client'

/**
 * VMware product releases — one tile per product, everything else behind the
 * expander.
 *
 * Matches the /downloads/microsoft-products/office layout: a compact tile per
 * card, with the files in a disclosure list. What makes these pages different
 * is the SIZE of that list — vCenter 8 carries an installer, an update bundle
 * and seven patches, each patch with both a payload and a release-notes PDF.
 * All of it stays reachable, newest first, so an admin who needs an older
 * build still has it; it is just no longer the first thing on screen.
 *
 * The card stays the unit and installer / updateBundle / patches keep their
 * shape. Admin overrides join to a card BY ID and the editor addresses these
 * rows as installer.href, so flattening each patch into its own card would
 * detach every saved edit.
 *
 * This replaces three near-identical page components, two of which carried
 * their own slightly-drifted copy of the same PatchList.
 */

import { useMemo } from 'react'
import { TileGrid, type TileDownload, type TileItem } from '@/components/cards/TileGrid'
import { useCardOverrides } from '@/lib/data/admin-content'
import type { VMwareProductCard } from '@/lib/types/cards'

/** The rows for one patch: its payload, then its release notes. */
function patchRows(patch: NonNullable<VMwareProductCard['patches']>[number]): TileDownload[] {
  const rows: TileDownload[] = []
  if (patch.dlHref) rows.push({ label: `${patch.build} — released ${patch.release}`, href: patch.dlHref })
  if (patch.notesHref) rows.push({ label: `${patch.build} — release notes`, href: patch.notesHref, external: true })
  return rows
}

/**
 * What the card shows when opened: the installer, the update bundle, and the
 * CURRENT patch only.
 *
 * Patches are stored newest-first, so [0] is the one an admin almost always
 * wants. Listing all of them flat pushed the current release of vCenter 8 into
 * a sixteen-row wall where the newest build looked no different from a
 * two-year-old one.
 */
function currentDownloads(card: VMwareProductCard): TileDownload[] {
  const rows: TileDownload[] = []
  if (card.installer?.href) rows.push({ label: card.installer.label, href: card.installer.href })
  if (card.updateBundle?.href) rows.push({ label: card.updateBundle.label, href: card.updateBundle.href })
  const [latest] = card.patches ?? []
  if (latest) rows.push(...patchRows(latest))
  return rows
}

/** Everything superseded — one more click away, never gone. */
function supersededDownloads(card: VMwareProductCard): TileDownload[] {
  return (card.patches ?? []).slice(1).flatMap(patchRows)
}

export function VMwareProductTiles({ scope, cards, categoryOrder }: {
  scope: string
  cards: VMwareProductCard[]
  categoryOrder?: readonly string[]
}) {
  const products = useCardOverrides<VMwareProductCard>(scope, cards)

  const items = useMemo<TileItem[]>(
    () => products.map((card) => {
      const patchCount = card.patches?.length ?? 0
      const patchLabel = `${patchCount} patch${patchCount === 1 ? '' : 'es'}`
      const superseded = supersededDownloads(card)
      // Two link rows per patch (payload + notes), so count patches, not rows.
      const olderCount = Math.max(0, patchCount - 1)
      return {
        id: card.id,
        title: card.title,
        subtitle: 'VMware, Inc.',
        // Only the v9 cards carry an explicit `version`; the older ones put the
        // release in their tags, so this states what the expander holds rather
        // than inventing a version string.
        version: card.version
          ? `Version ${card.version}${patchCount ? ` · ${patchLabel}` : ''}`
          : patchCount
            ? `${patchLabel} available`
            : undefined,
        icon: card.logo,
        category: card.tags[0],
        description: card.description,
        downloads: currentDownloads(card),
        moreDownloads: superseded,
        moreLabel: `${olderCount} older patch${olderCount === 1 ? '' : 'es'}`,
      }
    }),
    [products],
  )

  return (
    <TileGrid
      items={items}
      categoryOrder={categoryOrder}
      showCounts
      unitLabel="product"
      gridCols="sm:grid-cols-2 lg:grid-cols-3"
      emptyMessage="No products are published for this release yet."
    />
  )
}
