'use client'

import { HoverRevealCard } from '@/components/cards'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { drenToolCards, type DRENToolCard } from '@/lib/data/dren'
import { useCardOverrides } from '@/lib/data/admin-content'

export function DRENToolCards() {
  const tools = useCardOverrides<DRENToolCard>('dren/landing/cards', drenToolCards)
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {tools.map(({ comingSoon, ...tool }, index) => (
        <HoverRevealCard key={tool.href} {...tool} glowColor={getCardGlowColor(index)} />
      ))}
    </div>
  )
}
