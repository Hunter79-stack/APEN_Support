'use client'

import { HoverRevealCard } from '@/components/cards'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { useCardOverrides } from '@/lib/data/admin-content'
import { VIDEOS_PAGE_LOGOS } from '@/lib/data/logos'
import type { NavCard } from '@/lib/types/cards'

// Video category cards — add entries to the `videoCategories` array below
// as new video sections are QA/QC'd and ready to publish. The FacilitatePro
// guides moved here from /docs/facpro/videos so docs and videos stay
// separated by media type rather than by application.
const videoCategories: NavCard[] = [
  {
    id: 'facpro',
    title: 'FacilitatePro',
    description: 'Step-by-step video tutorials for the FacilitatePro platform — session creation, facilitation, and exporting results.',
    logo: VIDEOS_PAGE_LOGOS['/videos/facpro'],
    glowColor: 'cyan',
    tags: ['FacilitatePro', 'Tutorials', 'How-To'],
    href: '/videos/facpro',
    hrefLabel: 'Watch playlist →',
    itemCount: '5 videos',
  },
  // Future video categories go here.
]

export function VideosCategoryCards() {
  // Layer admin overrides on top so the editor at /admin can rename or
  // reorder these cards without a code change.
  const cards = useCardOverrides<NavCard>('videos/landing/cards', videoCategories)

  if (cards.length === 0) {
    return (
      <p className="text-sm text-slate-600 italic">
        No video categories are published yet. Check back soon.
      </p>
    )
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {cards.map(({ itemCount, hrefLabel, ...card }, index) => (
        <HoverRevealCard
          key={card.href}
          {...card}
          glowColor={getCardGlowColor(index)}
          subtitle={itemCount}
        />
      ))}
    </div>
  )
}
