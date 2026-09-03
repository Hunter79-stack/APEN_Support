'use client'

/**
 * Visual Studio releases — one tile per release row.
 *
 * Two bugs died with the old card markup:
 *   - it rendered `v{version}`, and these version strings are prose, so the
 *     page literally read "vVS 2022 (offline layout)". TileItem.version is
 *     rendered verbatim.
 *   - it hardcoded a ".exe" button label for what is actually an .html install
 *     guide. DownloadButton derives the extension from the href instead.
 *
 * It also gained admin wiring: the three edition pages used to receive their
 * rows as a prop and never called useCardOverrides, which made them the only
 * content pages on the site a sysadmin could not edit at all.
 */

import { useMemo } from 'react'
import { TileGrid, type TileItem } from '@/components/cards/TileGrid'
import { useCardOverrides } from '@/lib/data/admin-content'
import {
  visualStudioReleases,
  type VisualStudioEdition,
  type VisualStudioRelease,
} from '@/lib/data/visual-studio'

export function VSReleaseTable({ edition, label, logo }: {
  edition: VisualStudioEdition
  /** Edition name used in the download labels, e.g. "VS 2022 Community". */
  label: string
  logo: string
}) {
  // Overrides are applied to the WHOLE array before filtering, so a patch keeps
  // matching by id no matter which edition page is rendering.
  const releases = useCardOverrides<VisualStudioRelease>('visual-studio/releases', visualStudioReleases)

  const items = useMemo<TileItem[]>(
    () => releases
      .filter((r) => r.edition === edition)
      .map((r) => ({
        id: r.id,
        title: r.title,
        subtitle: `Released ${r.date}`,
        version: r.version,
        icon: logo,
        downloads: [
          ...(r.installerHref ? [{ label: `${label} install guide`, href: r.installerHref }] : []),
          ...(r.layoutHref ? [{ label: `${label} offline layout`, href: r.layoutHref, external: true }] : []),
          ...(r.notesHref ? [{ label: `${label} release notes`, href: r.notesHref, external: true }] : []),
        ],
      })),
    [releases, edition, label, logo],
  )

  return (
    <TileGrid
      items={items}
      gridCols="sm:grid-cols-2 lg:grid-cols-3"
      emptyMessage="No releases are published for this edition yet."
    />
  )
}
