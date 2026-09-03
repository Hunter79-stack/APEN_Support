'use client'

import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { HoverRevealCard, type GlowColorName } from '@/components/cards'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { useCardOverrides } from '@/lib/data/admin-content'

interface LinkItem {
  id: string
  title: string
  description: string
  href: string
  logo: string
  external?: boolean
  /** Per-card glow override. When set, wins over the section's generated
   *  palette — used to keep a card's color from clashing with its logo. */
  glowColor?: GlowColorName
}
/* Per-card image tuning (size, position, bare/shell chrome) lives in
   the single tuning file at lib/data/card-image-tuning.ts and is
   read by HoverRevealCard automatically — no need to set anything
   per-item here. */

interface LinksGridProps {
  title: string
  subtitle?: string
  items: LinkItem[]
  /** Admin-content scope. When set, admin edits from /admin are layered on
   *  top of `items` at render time via useCardOverrides. */
  scope?: string
  colors: GlowColorName[]
  /** Tailwind height utility for each card (e.g. 'h-32', 'h-48'). Per-section. */
  heightClass?: string
  /** Short label rendered above the heading in accent red. Per-section. */
  eyebrow?: string
  /**
   * Caps each card at this width so cards STAY a fixed size regardless of
   * how many entries the section has — without this, the auto-fit grid
   * stretches cards to fill the row.
   *
   * NOTE: this only constrains the CARDS. The section box itself always
   * uses the full width of its parent container. To make the three
   * `/home` sections look uniform, set the same parent-width container
   * around them all (currently `max-w-7xl mx-auto` in app/home/page.tsx).
   *
   * Accepts any CSS length, e.g. '14rem', '240px'.
   */
  cardMaxWidth?: string
}

/* ── Animation variants — staggered card reveal ── */
const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
  },
}

const gridContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
}

export function LinksGrid({
  title,
  subtitle,
  items,
  scope,
  colors,
  heightClass,
  eyebrow,
  cardMaxWidth,
}: LinksGridProps) {
  // Layer admin edits (/admin > Edit pages & cards) over the static items.
  // With no scope the hook short-circuits and returns `items` untouched.
  const resolvedItems = useCardOverrides<LinkItem>(scope ?? '', items)
  /* The section box is always full-width within its parent container —
     the three /home sections look uniform because they all live inside
     the same `max-w-7xl mx-auto` wrapper in app/home/page.tsx. The
     cardMaxWidth prop ONLY caps individual cards (via --card-max on
     the inner grid) so cards keep a stable size regardless of how many
     items the section has. */
  return (
    <motion.section
      className="apen-section"
      variants={sectionVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
    >
      {/* ── Atmospheric backdrop layers ── */}
      <div className="apen-section-blobs" aria-hidden="true">
      <span />
      </div>
      <div className="apen-section-shimmer" aria-hidden="true" />
      <div className="apen-section-vignette" aria-hidden="true" />

      {/* ── Foreground content ── */}
      <div className="apen-section-content">
        <header className="mb-8">
          {eyebrow && <span className="apen-section-eyebrow">{eyebrow}</span>}
          <h2 className="apen-section-heading">{title}</h2>
          <div className="apen-section-heading-bar" aria-hidden="true" />
          {subtitle && <p className="apen-section-subtitle">{subtitle}</p>}
        </header>

        <motion.div
          className="grid responsive-card-grid gap-4"
          style={{
            '--card-min': '13.5rem',
            ...(cardMaxWidth ? { '--card-max': cardMaxWidth } : {}),
          } as CSSProperties}
          variants={gridContainerVariants}
        >
          {resolvedItems.map((s, i) => (
            <motion.div key={s.id} variants={cardVariants}>
              <HoverRevealCard
                {...s}
                glowColor={s.glowColor ?? colors[i] ?? getCardGlowColor(i)}
                heightClass={heightClass}
                centerReveal
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  )
}
