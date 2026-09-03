'use client'

import type { CSSProperties } from 'react'
import { HoverRevealCard } from './HoverRevealCard'
import type { HoverRevealCardProps } from './HoverRevealCard'
import { getCardGlowColor } from '@/lib/data/card-colors'

export interface HoverRevealGridProps {
  cards: HoverRevealCardProps[]
  /** Tailwind grid classes (default: 'grid-cols-2 lg:grid-cols-4') */
  gridCols?: string
  /** Gap class (default: 'gap-4') */
  gap?: string
  atmosphere?: boolean
}

export function HoverRevealGrid({
  cards,
  gridCols = 'grid-cols-2 lg:grid-cols-4',
  gap = 'gap-4',
  atmosphere = true,
}: HoverRevealGridProps) {
  const grid = (
    <div
      className={`grid responsive-card-grid ${gridCols} ${gap}`}
      style={{ '--card-min': '14rem' } as CSSProperties}
    >
      {cards.map((card, index) => (
        <HoverRevealCard key={card.title} {...card} glowColor={getCardGlowColor(index)} />
      ))}
    </div>
  )

  if (!atmosphere) return grid

  return (
    <section className="apen-section">
      {/* ── Atmospheric backdrop layers (Hero.tsx visual DNA) ── */}
      <div className="apen-section-blobs" aria-hidden="true">
        <span />
      </div>
      <div className="apen-section-shimmer" aria-hidden="true" />
      <div className="apen-section-vignette" aria-hidden="true" />

      <div className="apen-section-content">{grid}</div>
    </section>
  )
}
