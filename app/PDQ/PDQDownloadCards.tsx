'use client'

import { HoverRevealCard } from '@/components/cards'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { pdqCards, type PDQCard } from '@/lib/data/pdq'
import { useCardOverrides } from '@/lib/data/admin-content'

export function PDQDownloadCards() {
  const cards = useCardOverrides<PDQCard>('pdq/cards', pdqCards)
  return (
    <div className="grid md:grid-cols-3 gap-5">
      {cards.map((card, index) => {
        // These are download cards, not links to an external website. Cards with
        // a direct installer (downloadHref) present as a "Download …" action and
        // download in place (external=false); the repository card is a directory
        // listing, so it stays an "Browse" action that opens in a new tab.
        const isDownload = !!card.downloadHref
        return (
          <HoverRevealCard
            key={card.id}
            title={card.title}
            description={card.description}
            href={card.downloadHref ?? card.repoHref ?? '#'}
            logo={card.logo}
            glowColor={getCardGlowColor(index)}
            tags={card.tags}
            subtitle={isDownload ? 'Installer download' : 'Browse & download'}
            ctaLabel={isDownload ? (card.downloadLabel ?? 'Download') : 'Browse'}
            external={!isDownload}
          />
        )
      })}
    </div>
  )
}
