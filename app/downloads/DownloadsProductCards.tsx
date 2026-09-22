'use client'

import { HoverRevealCard } from '@/components/cards'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { downloadsCategoryCards } from '@/lib/data/downloads'
import { useCardOverrides } from '@/lib/data/admin-content'
import type { NavCard } from '@/lib/types/cards'

export function DownloadsProductCards() {
  // Layer admin edits from /admin > Edit pages & cards on top of the static list.
  const cards = useCardOverrides<NavCard>('downloads/landing/cards', downloadsCategoryCards)
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map(({ itemCount, hrefLabel, ...card }, index) => (
        <HoverRevealCard key={card.href} {...card} glowColor={getCardGlowColor(index)} subtitle={itemCount} ctaLabel={hrefLabel} />
      ))}
    </div>
  )
}
