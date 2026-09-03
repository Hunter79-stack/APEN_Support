'use client'

import { HoverRevealCard } from '@/components/cards'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { evaluateSTIGCategoryCards } from '@/lib/data/evaluate-stig'
import { useCardOverrides } from '@/lib/data/admin-content'
import type { NavCard } from '@/lib/types/cards'

export function EvaluateSTIGCards() {
  const cards = useCardOverrides<NavCard>('evaluate-stig/landing/cards', evaluateSTIGCategoryCards)
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {cards.map(({ itemCount, hrefLabel, ...card }, index) => (
        <HoverRevealCard key={card.href} {...card} glowColor={getCardGlowColor(index)} subtitle={itemCount} />
      ))}
    </div>
  )
}
