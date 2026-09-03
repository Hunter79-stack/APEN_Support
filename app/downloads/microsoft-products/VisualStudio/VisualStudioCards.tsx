'use client'

import { HoverRevealCard } from '@/components/cards'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { visualStudioCards, type VisualStudioCard } from '@/lib/data/visual-studio'
import { useCardOverrides } from '@/lib/data/admin-content'

export function VisualStudioCards() {
  const editions = useCardOverrides<VisualStudioCard>('visual-studio/editions', visualStudioCards)
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {editions.map(({ license, latestVersion, latestDate, ...ed }, index) => (
        <HoverRevealCard key={ed.href} {...ed} glowColor={getCardGlowColor(index)} subtitle={`Latest: ${latestVersion}`} />
      ))}
    </div>
  )
}
