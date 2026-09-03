'use client'

import { ISOTiles } from '../../ISOTiles'
import { LOGOS } from '@/lib/data/logos'
import { linuxISOCards } from '@/lib/data/isos'

/** Section order. Cards bucket by their first tag, which is already the distro
 *  family ('AlmaLinux' / 'CentOS' / 'RockyLinux') — no data change needed. */
const DISTROS = ['AlmaLinux', 'CentOS', 'RockyLinux'] as const

export function LINUXOSCards() {
  return (
    <ISOTiles
      // Historical key — it does NOT match the route
      // (/downloads/iso/linux/enterprise). Kept verbatim: the scope string is
      // what an admin's saved override is filed under.
      scope="isos/enterprise-linux"
      cards={linuxISOCards}
      categoryOrder={DISTROS}
      fallbackIcon={LOGOS.linuxTux}
    />
  )
}
