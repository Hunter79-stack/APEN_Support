'use client'

import { HoverRevealCard } from '@/components/cards'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { reposCategoryCards } from '@/lib/data/repos'
import { useCardOverrides } from '@/lib/data/admin-content'
import type { NavCard } from '@/lib/types/cards'

export function ReposCategoryCards() {
  // Layer admin edits (/admin > Edit pages & cards) over the static list.
  const cards = useCardOverrides<NavCard>('repos/landing/cards', reposCategoryCards)
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {cards.map(({ itemCount, hrefLabel, ...cat }, index) => (
        <HoverRevealCard key={cat.href} {...cat} glowColor={getCardGlowColor(index)} subtitle={itemCount} />
      ))}
    </div>
  )
}
