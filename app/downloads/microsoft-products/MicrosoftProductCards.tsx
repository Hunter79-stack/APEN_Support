'use client'

import { HoverRevealCard } from '@/components/cards'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { microsoftCategoryCards } from '@/lib/data/microsoft'
import { useCardOverrides } from '@/lib/data/admin-content'
import type { NavCard } from '@/lib/types/cards'

export function MicrosoftProductCards() {
  const cards = useCardOverrides<NavCard>('microsoft/landing/cards', microsoftCategoryCards)
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map(({ itemCount, hrefLabel, ...card }, index) => (
        <HoverRevealCard key={card.href} {...card} glowColor={getCardGlowColor(index)} subtitle={itemCount} ctaLabel={hrefLabel} />
      ))}
    </div>
  )
}
