'use client'

import { HoverRevealCard } from '@/components/cards'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { securityCategoryCards } from '@/lib/data/security'
import { useCardOverrides } from '@/lib/data/admin-content'
import type { NavCard } from '@/lib/types/cards'

export function SecurityProductCards() {
  // Layer admin edits from /admin > Edit pages & cards on top of the static list.
  const cards = useCardOverrides<NavCard>('security/landing/cards', securityCategoryCards)
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map(({ itemCount, hrefLabel, ...card }, index) => (
        <HoverRevealCard key={card.href} {...card} glowColor={getCardGlowColor(index)} subtitle={itemCount} ctaLabel={hrefLabel} />
      ))}
    </div>
  )
}
