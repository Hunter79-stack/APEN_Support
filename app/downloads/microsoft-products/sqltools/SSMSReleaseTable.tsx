'use client'

/**
 * SSMS releases — one tile per release.
 *
 * Was a p-8 GlowCard in a 3-column grid holding a single release, where
 * click-to-expand revealed one installer link. It also carried a hand-rolled
 * copy of the download-row markup, which is exactly the drift the shared
 * DownloadRow exists to prevent; both links now go through it.
 *
 * `notesHref` is optional in the data and offered by the admin editor, so a
 * release that has one renders two files (installer + notes) and the tile
 * switches to its disclosure list automatically.
 */

import { useMemo } from 'react'
import { TileGrid, type TileItem } from '@/components/cards/TileGrid'
import { DOWNLOADS_PAGE_LOGOS } from '@/lib/data/logos'
import { ssmsReleaseCards, type SSMSReleaseCard } from '@/lib/data/sql-tools'
import { useCardOverrides } from '@/lib/data/admin-content'

export function SSMSReleaseTable() {
  // Source of truth: lib/data/sql-tools.ts (ssmsReleaseCards). Admins edit
  // titles, descriptions, installer URLs, etc. through the admin editor at
  // scope 'sqltools/ssms' — keyed on the card id, which is unchanged.
  const releases = useCardOverrides<SSMSReleaseCard>('sqltools/ssms', ssmsReleaseCards)

  const items = useMemo<TileItem[]>(
    () => releases.map((r) => ({
      id: r.id,
      title: r.title,
      subtitle: `Released ${r.date}`,
      // Verbatim: these version strings are prose ("21.4.8", and elsewhere
      // "VS 2022 (offline layout)"), so the tile must not prefix a "v".
      version: r.version,
      icon: r.logo || DOWNLOADS_PAGE_LOGOS['/downloads/microsoft-products/sqltools'],
      downloads: [
        ...(r.installerHref ? [{ label: `${r.title} installer`, href: r.installerHref }] : []),
        ...(r.notesHref ? [{ label: `Release notes (${r.version})`, href: r.notesHref, external: true }] : []),
      ],
    })),
    [releases],
  )

  return (
    <TileGrid
      items={items}
      gridCols="sm:grid-cols-2 lg:grid-cols-3"
      emptyMessage="No SSMS releases are published yet."
    />
  )
}
