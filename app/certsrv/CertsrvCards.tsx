'use client'

import { HoverRevealCard } from '@/components/cards'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { certsrvCards } from '@/lib/data/certsrv'
import { useCardOverrides } from '@/lib/data/admin-content'
import type { NavCard } from '@/lib/types/cards'

export function CertsrvCards() {
  // Layer admin edits (/admin > Edit pages & cards) over the static list.
  const cards = useCardOverrides<NavCard>('certsrv/cards', certsrvCards)
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {cards.map(({ itemCount, hrefLabel, ...card }, index) => (
        <HoverRevealCard key={card.href} {...card} glowColor={getCardGlowColor(index)} subtitle={itemCount} ctaLabel={hrefLabel} />
      ))}
    </div>
  )
}
