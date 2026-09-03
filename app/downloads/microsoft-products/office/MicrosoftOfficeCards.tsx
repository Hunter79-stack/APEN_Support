'use client'

/**
 * Microsoft Office downloads — one tile per card.
 *
 * One tile per product — Office, Project and Visio Professional, 2021 and
 * 2024 — grouped by release. Each is an Office Deployment Tool package rather
 * than a standalone installer, so a tile links that release's setup.exe and its
 * description carries the /configure command. The configuration XMLs are not
 * linked: they embed volume licence keys.
 *
 * The card is the unit, NOT the individual file: admin overrides join to a card
 * by id, so splitting one into per-file tiles would detach any saved edit for
 * it. Adding cards is safe; renaming or splitting is not. (Retiring Office 2019
 * did change ids — deliberately, since the product is gone; the orphan guard in
 * applyScopeOverride drops the stale patch instead of rendering a phantom.)
 */

import { useMemo } from 'react'
import { TileGrid, type TileItem } from '@/components/cards/TileGrid'
import { microsoftOfficeCards, type MicrosoftOfficeCard } from '@/lib/data/microsoft'
import { useCardOverrides } from '@/lib/data/admin-content'

// Grouped by release, newest first. This used to be
// ['Applications', 'Installation media & deployment'] with everything that was
// not the single `office2019` card falling into the second bucket — a split
// that no longer describes anything now that the catalogue is six ODT products
// across two releases.
const SECTIONS = ['Office 2024', 'Office 2021'] as const

export function MicrosoftOfficeCards() {
  const cards = useCardOverrides<MicrosoftOfficeCard>('microsoft/office', microsoftOfficeCards)

  const items = useMemo<TileItem[]>(
    () => cards.map((card) => ({
      id: card.id,
      title: card.title,
      subtitle: 'Microsoft',
      icon: card.logo,
      // Release is derived from the card id (office2024, project2021, …) rather
      // than stored, so an admin-added card lands in the right group without a
      // new field. Anything that names neither year falls under 2024.
      category: card.id.includes('2021') ? SECTIONS[1] : SECTIONS[0],
      description: card.description,
      // No copyText/body here on purpose. Deployment instructions are not
      // published to this page at all — see lib/data/microsoft.ts. `items` is
      // normally empty, so these render as informational tiles; the mapping
      // stays so a genuinely user-installable file can be added later.
      downloads: (card.items ?? []).map((item) => ({ label: item.label, href: item.href })),
    })),
    [cards],
  )

  return (
    <TileGrid
      items={items}
      categoryOrder={SECTIONS}
      // No showCounts/unitLabel: these tiles carry no files, so a per-group
      // "0 downloads" count would be both noise and wrong about what the page
      // offers.
      gridCols="sm:grid-cols-2 lg:grid-cols-3"
      emptyMessage="No Office downloads are published yet."
    />
  )
}
