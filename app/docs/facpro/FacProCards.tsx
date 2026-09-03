'use client'

import { HoverRevealCard } from '@/components/cards'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { facproCategoryCards } from '@/lib/data/docs'
import { useCardOverrides } from '@/lib/data/admin-content'
import type { NavCard } from '@/lib/types/cards'

const REGISTRY_MANAGED_FIELDS = ['logo'] as const

export function FacProCards() {
  // Layer admin edits (/admin > Edit pages & cards) over the static list.
  const cards = useCardOverrides<NavCard>('docs/facpro/categories', facproCategoryCards, REGISTRY_MANAGED_FIELDS)
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {cards.map(({ itemCount, hrefLabel, ...card }, index) => (
        <HoverRevealCard key={card.href} {...card} glowColor={getCardGlowColor(index)} subtitle={itemCount} />
      ))}
    </div>
  )
}
