'use client'

import { HoverRevealCard } from '@/components/cards'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { ubCategoryCards } from '@/lib/data/docs'
import { useCardOverrides } from '@/lib/data/admin-content'
import type { NavCard } from '@/lib/types/cards'

const REGISTRY_MANAGED_FIELDS = ['logo'] as const

export function UbuntuProductCards() {
  const cards = useCardOverrides<NavCard>('docs/ub/categories', ubCategoryCards, REGISTRY_MANAGED_FIELDS)
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map(({ itemCount, hrefLabel, ...card }, index) => (
        <HoverRevealCard key={card.href} {...card} glowColor={getCardGlowColor(index)} subtitle={itemCount} ctaLabel={hrefLabel} />
      ))}
    </div>
  )
}
