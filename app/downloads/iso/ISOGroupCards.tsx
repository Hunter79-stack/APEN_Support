'use client'

import { HoverRevealCard } from '@/components/cards'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { isoCategoryCards } from '@/lib/data/isos'
import { useCardOverrides } from '@/lib/data/admin-content'
import type { NavCard } from '@/lib/types/cards'

export function ISOGroupCards() {
  const groups = useCardOverrides<NavCard>('isos/landing/groups', isoCategoryCards)
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {groups.map(({ itemCount, hrefLabel, ...group }, index) => (
        <HoverRevealCard key={group.href} {...group} glowColor={getCardGlowColor(index)} subtitle={itemCount} ctaLabel={hrefLabel} />
      ))}
    </div>
  )
}
