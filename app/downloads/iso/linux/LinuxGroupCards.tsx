'use client'

import { HoverRevealCard } from '@/components/cards'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { isoCategoryCards } from '@/lib/data/isos'
import { useCardOverrides } from '@/lib/data/admin-content'
import type { NavCard } from '@/lib/types/cards'

/* The two Linux distro families from the ISO landing (Enterprise Linux + Ubuntu),
   surfaced on their own /downloads/iso/linux landing so the single "Linux" nav
   entry has a destination scoped to just Linux (Windows stays on /downloads/iso). */
const linuxGroups = isoCategoryCards.filter((c) => c.id === 'el' || c.id === 'ubuntu')

export function LinuxGroupCards() {
  const groups = useCardOverrides<NavCard>('isos/linux/groups', linuxGroups)
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {groups.map(({ itemCount, hrefLabel, ...group }, index) => (
        <HoverRevealCard key={group.href} {...group} glowColor={getCardGlowColor(index)} subtitle={itemCount} />
      ))}
    </div>
  )
}
