'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { StaticLink } from '@/components/common/StaticLink'
import { ThemedLogo } from '@/components/common/ThemedLogo'
import { GlowCard } from '@/components/ui/spotlight-card'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { getCardImageTuning } from '@/lib/data/card-image-tuning'
import type { BaseCard, CardGridConfig } from '@/lib/types/cards'

/* ─── Default card body renderer ─────────────────────────── */
function DefaultCardBody<T extends BaseCard & { logo?: string }>({
  card,
  isOpen,
}: {
  card: T
  isOpen: boolean
}) {
  return (
    <>
      {/* Logo + close handled by parent */}
      <div className="flex-1">
        <p className="text-lg font-semibold text-white">{card.title}</p>
        <p
          className={`text-sm leading-relaxed mt-1.5 ${
            isOpen ? 'text-slate-300' : 'text-slate-400'
          }`}
        >
          {card.description}
        </p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {card.tags.map((t) => (
          <span
            key={t}
            className="px-2 py-0.5 rounded-md text-xs bg-white/5 text-slate-400 border border-white/5"
          >
            {t}
          </span>
        ))}
      </div>
    </>
  )
}

/* ─── Default collapsed footer ───────────────────────────── */
function DefaultFooter({ hint }: { hint?: string }) {
  return (
    <p className="text-xs text-cyan-400 mt-auto">
      {hint ?? 'Click to view →'}
    </p>
  )
}

/* ─── Nav-card expanded content (simple link button) ─────── */
export function NavExpandedContent({
  href,
  label,
}: {
  href: string
  label: string
}) {
  return (
    <div
      className="border-t border-white/10 pt-3"
      onClick={(e) => e.stopPropagation()}
    >
      <StaticLink
        href={href}
        className="btn-primary w-full justify-center text-sm block text-center"
      >
        {label}
      </StaticLink>
    </div>
  )
}

/* ─── Main ExpandableCardGrid component ──────────────────── */
export function ExpandableCardGrid<T extends BaseCard & { logo?: string }>({
  cards,
  config,
  renderCard,
  renderExpanded,
  renderFooter,
  atmosphere = true,
}: {
  cards: T[]
  config: CardGridConfig
  renderCard?: (card: T, isOpen: boolean) => ReactNode
  renderExpanded?: (card: T) => ReactNode
  renderFooter?: (card: T) => ReactNode
  atmosphere?: boolean
}) {
  const [openCard, setOpenCard] = useState<string | null>(null)
  const scale = config.scaleFactor ?? 1.08
  const gap = config.gap ?? 'gap-6'

  function toggle(id: string) {
    setOpenCard((prev) => (prev === id ? null : id))
  }

  return (
    <section
      className={atmosphere ? 'apen-section' : 'relative'}
      style={atmosphere ? { overflow: 'visible' } : undefined}
    >
      {atmosphere && (
        <>
          {/* ── Atmospheric backdrop layers (Hero.tsx visual DNA).
              overflow: visible above so the open-card scale isn't clipped
              by the panel edge. The blob/shimmer layers carry their own
              overflow:hidden internally so they stay contained. ── */}
          <div className="apen-section-blobs" aria-hidden="true">
            <span />
          </div>
          <div className="apen-section-shimmer" aria-hidden="true" />
          <div className="apen-section-vignette" aria-hidden="true" />
        </>
      )}

      {/* Backdrop overlay — fixed to viewport, unaffected by section bounds */}
      {openCard && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
          style={{ zIndex: 50 }}
          onClick={() => setOpenCard(null)}
        />
      )}

      <div
        className={`apen-section-content grid responsive-card-grid ${config.gridCols} ${gap}`}
        style={{ '--card-min': '16rem' } as CSSProperties}
      >
        {cards.map((card, index) => {
          const isOpen = openCard === card.id
          const glowColor = getCardGlowColor(index)
          return (
            <div key={card.id} className="relative">
              <div
                onClick={() => toggle(card.id)}
                className={`cursor-pointer select-none transition-all duration-300 ease-out ${
                  isOpen
                    ? 'lg:absolute lg:inset-x-0 lg:top-0 lg:z-[60]'
                    : 'h-full'
                }`}
                style={{
                  transform: isOpen ? `scale(${scale})` : 'scale(1)',
                  transformOrigin: 'top center',
                }}
                role="button"
                aria-expanded={isOpen}
                tabIndex={0}
                onKeyDown={(e) =>
                  (e.key === 'Enter' || e.key === ' ') && toggle(card.id)
                }
              >
                <GlowCard
                  className={`p-8 flex flex-col gap-6 h-full w-full transition-all duration-300
                    ${
                      isOpen
                        ? 'ring-2 ring-cyan-400 shadow-[0_0_90px_rgba(0,212,255,0.8)]'
                        : 'hover:ring-2 hover:ring-sky-300/70'
                    }`}
                  glowColor={glowColor}
                >
                  {/* Header row — logo + close button */}
                  <div className="flex items-start justify-between">
                    {card.logo && (() => {
                      /* Per-card image tuning sourced from the single
                         tuning file at lib/data/card-image-tuning.ts.
                         className overrides apply on top of ThemedLogo's
                         defaults. glass is off site-wide to match the
                         "no shadow box" treatment of HoverRevealCard. */
                      const tuning = getCardImageTuning(card.title)
                      return (
                        <ThemedLogo
                          src={card.logo}
                          alt={card.title}
                          size="xl"
                          glass={false}
                          glow
                          variant="square"
                          priority
                          className={tuning.shellClassName ?? tuning.imageWrapperClassName}
                        />
                      )
                    })()}
                    {isOpen && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenCard(null)
                        }}
                        className="text-slate-500 hover:text-white transition-colors p-1 rounded"
                        aria-label="Close"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Card body — custom or default */}
                  {renderCard ? (
                    renderCard(card, isOpen)
                  ) : (
                    <DefaultCardBody card={card} isOpen={isOpen} />
                  )}

                  {/* Collapsed footer */}
                  {!isOpen &&
                    (renderFooter ? (
                      renderFooter(card)
                    ) : (
                      <DefaultFooter />
                    ))}

                  {/* Expanded content */}
                  {isOpen && renderExpanded && renderExpanded(card)}
                </GlowCard>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
