'use client'

import { HoverRevealCard } from '@/components/cards'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { elCategoryCards } from '@/lib/data/docs'
import { useCardOverrides } from '@/lib/data/admin-content'
import type { NavCard } from '@/lib/types/cards'

const REGISTRY_MANAGED_FIELDS = ['logo'] as const

export function EnterpriseCards() {
  const cards = useCardOverrides<NavCard>('docs/el/categories', elCategoryCards, REGISTRY_MANAGED_FIELDS)
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {cards.map(({ itemCount, hrefLabel, ...card }, index) => (
        <HoverRevealCard key={card.href} {...card} glowColor={getCardGlowColor(index)} subtitle={itemCount} ctaLabel={hrefLabel} />
      ))}
    </div>
  )
}
