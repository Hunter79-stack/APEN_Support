'use client'

import { HoverRevealCard } from '@/components/cards'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { restrictedAppCards } from '@/lib/data/restricted-apps'

export function ApplicationCards() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {restrictedAppCards.map(({ itemCount, hrefLabel, ...card }, index) => (
        <HoverRevealCard key={card.href} {...card} glowColor={getCardGlowColor(index)} subtitle={itemCount} />
      ))}
    </div>
  )
}
