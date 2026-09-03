'use client'

import { ISOTiles } from '../../ISOTiles'
import { OS_LOGOS } from '@/lib/data/logos'
import { ubuntuISOCards } from '@/lib/data/isos'

/** Section order. Cards bucket by their first tag, which already reads
 *  'Ubuntu 22.04' / 'Ubuntu 24.04' / 'Ubuntu 26.04' — no data change needed.
 *  A release not listed here still renders, in first-seen order.
 *
 *  Note: the 26.04 cards still carry the ids ubuntu25-desktop/-server from when
 *  that release was 25.x. Cosmetic drift, deliberately NOT renamed — an id is
 *  the join key for published admin edits, so renaming it would silently drop
 *  any sysadmin override saved against those cards. */
const RELEASES = ['Ubuntu 22.04', 'Ubuntu 24.04', 'Ubuntu 26.04'] as const

export function UbuntuOSCards() {
  return (
    <ISOTiles
      scope="isos/ubuntu"
      cards={ubuntuISOCards}
      categoryOrder={RELEASES}
      fallbackIcon={OS_LOGOS.ubuntu}
    />
  )
}
