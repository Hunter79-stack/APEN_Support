'use client'

import { ISOTiles } from '../ISOTiles'
import { windowsISOCards } from '@/lib/data/isos'

/** All three images carry the same LOGOS.windows mark, so a 48px icon column
 *  would render one identical logo three times. The Client / Server headings
 *  carry that distinction instead — no new artwork needed. */
const KINDS = ['Client', 'Server'] as const

export function WindowsOSCards() {
  return (
    <ISOTiles
      scope="isos/windows"
      cards={windowsISOCards}
      grouping="client-server"
      categoryOrder={KINDS}
      showIcons={false}
    />
  )
}
