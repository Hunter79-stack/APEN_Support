'use client'

import { HoverRevealCard } from '@/components/cards'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { docsCategoryCards } from '@/lib/data/docs'
import { useCardOverrides } from '@/lib/data/admin-content'
import type { NavCard } from '@/lib/types/cards'

const REGISTRY_MANAGED_FIELDS = ['logo'] as const

export function DocsCategoryCards() {
  const cats = useCardOverrides<NavCard>('docs/landing/cards', docsCategoryCards, REGISTRY_MANAGED_FIELDS)
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {cats.map(({ itemCount, hrefLabel, ...cat }, index) => (
        <HoverRevealCard key={cat.href} {...cat} glowColor={getCardGlowColor(index)} subtitle={itemCount} ctaLabel={hrefLabel} />
      ))}
    </div>
  )
}
