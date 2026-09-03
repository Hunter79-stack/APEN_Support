'use client'

import React, { useRef, useCallback } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { StaticLink } from '@/components/common/StaticLink'
import { LottieMark } from '@/components/common/LottieMark'
import { getGpuTier } from '@/lib/data/gpuTier'
import { getCardColorDefinition, type GlowColorName } from '@/lib/data/card-colors'
import { getCardImageTuning } from '@/lib/data/card-image-tuning'
import { cn } from '@/lib/data/utils'
import { useRouteImage } from '@/lib/hooks/useRouteImage'

/* ── Props ─────────────────────────────────────────────────── */
export interface HoverRevealCardProps {
  title: string
  description: string
  href: string
  /** Glow colour name — maps to gradient hues and conic border */
  glowColor?: GlowColorName
  /** Override gradient hue range directly */
  hueFrom?: number
  hueTo?: number
  /** Path to a logo image (e.g. from LOGOS) */
  logo?: string
  /** Lucide icon component (fallback if no logo) */
  icon?: React.ElementType
  /** Open link in new tab */
  external?: boolean
  /** Overrides the hover-reveal call-to-action label. Defaults to
   *  "Open site" (external) / "Open". Use e.g. "Download" for download cards. */
  ctaLabel?: string
  /** Optional subtitle shown on the resting label */
  subtitle?: string
  /** Optional tags shown on reveal panel */
  tags?: string[]
  /** Custom height class (default h-56) */
  heightClass?: string
  /** When true, the hover-reveal panel fills the whole card and vertically
   *  centres its text. Use for short tiles (e.g. the /home link grids) where a
   *  bottom-anchored, auto-height panel would otherwise push the text to the
   *  top. Taller cards leave this off and keep the bottom-anchored panel. */
  centerReveal?: boolean
  /* ── Per-card image tuning ──────────────────────────────────
   * Each of these is optional and applies ONLY to this card.
   * Other cards in the same grid are unaffected. Pass Tailwind
   * classes; `cn()` merges them over the defaults, so e.g.
   * `imageClassName="w-20 h-20"` overrides the default `w-14 h-14`.
   * Use `imageWrapperClassName` to shift the logo's position
   * inside the card (e.g. `items-start` to push it to the top,
   * `pt-6` to nudge it down, etc.). */
  /** Tailwind classes for the outer centring wrapper (controls where
      the icon sits inside the card — top/bottom/left/right). */
  imageWrapperClassName?: string
  /** Tailwind classes for the coloured shell box around the logo
      (controls the shell's size, rounding, border). */
  shellClassName?: string
  /** Tailwind classes for the `<img>` itself (controls size and
      object-fit of the actual logo image). */
  imageClassName?: string
}

/* ── Component ─────────────────────────────────────────────── */
export function HoverRevealCard({
  title,
  description,
  href,
  glowColor = 'cyan',
  hueFrom,
  hueTo,
  logo: defaultLogo,
  icon: Icon,
  external = false,
  ctaLabel,
  subtitle,
  tags,
  heightClass = 'h-56',
  centerReveal = false,
  imageWrapperClassName,
  shellClassName,
  imageClassName,
}: HoverRevealCardProps) {
  // A registered destination route owns one effective image across every card,
  // its PageHeader, and Navbar. Non-route/external cards retain their own logo.
  const logo = useRouteImage(href, defaultLogo)

  /* Resolve image tuning: an explicit prop at the call site wins; if
     nothing was passed it reads from the single tuning file at
     lib/data/card-image-tuning.ts, keyed by the card's title. */
  const tuning = getCardImageTuning(title)
  const resolvedImageWrapper       = imageWrapperClassName ?? tuning.imageWrapperClassName
  const resolvedShellClassName     = shellClassName        ?? tuning.shellClassName
  const resolvedImageClassName     = imageClassName        ?? tuning.imageClassName
  const colorDef = getCardColorDefinition(glowColor)
  const [fromH, toH] = hueFrom != null && hueTo != null
    ? [hueFrom, hueTo]
    : colorDef.hue
  const midH = Math.round((fromH + toH) / 2)

  const wrapRef = useRef<HTMLDivElement>(null)
  const spotRef = useRef<HTMLDivElement>(null)
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!wrapRef.current || !spotRef.current || getGpuTier() !== 'high' || e.pointerType !== 'mouse') return
    const rect = wrapRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    spotRef.current.style.setProperty('--spot-x', `${x}px`)
    spotRef.current.style.setProperty('--spot-y', `${y}px`)
    spotRef.current.style.opacity = '1'
  }, [])

  const handlePointerLeave = useCallback(() => {
    if (!spotRef.current || getGpuTier() === 'none') return
    spotRef.current.style.opacity = '0'
  }, [])

  const linkProps = external
    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
    : {}

  return (
    <div
      ref={wrapRef}
      className="conic-border-wrap group"
      style={{
        '--conic-from': colorDef.from,
        '--conic-to':   colorDef.to,
        '--conic-via':  colorDef.via,
      } as React.CSSProperties}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <StaticLink
        href={href}
        {...linkProps}
        className={`glass-card relative flex flex-col overflow-hidden ${heightClass} cursor-pointer select-none`}
        aria-label={title}
      >
        {/* ── Background: translucent gradient overlay.
            Opacity-0 at rest so the parent apen-section's animated blobs
            show through the card, then fades in on hover/focus to provide
            the saturated coloured wash that frames the reveal panel. ── */}
        <div
          className="card-gradient-overlay absolute inset-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-[opacity,transform] duration-700 ease-out group-hover:scale-[1.04] group-focus-within:scale-[1.04]"
          style={{
            background: `linear-gradient(135deg,hsla(${fromH},30%,7%,0.55) 0%,hsla(${toH},38%,12%,0.55) 100%)`,
          }}
        />

        {/* ── Mouse-tracking spotlight glow ── */}
        <div
          ref={spotRef}
          className="card-spotlight absolute inset-0 z-[1] pointer-events-none transition-opacity duration-300"
          style={{
            opacity: 0,
            background: `radial-gradient(320px 320px at var(--spot-x, -999px) var(--spot-y, -999px), hsla(${midH},80%,60%,0.25), transparent 70%)`,
          }}
        />

        {/* ── Logo / icon — fills the entire card ──
            At rest the image (or icon) IS the card's visual content.
            Title and description live in the hover reveal panel below. */}
        <div className={cn('relative flex-1 flex overflow-hidden', resolvedImageWrapper)}>
          {logo ? (
            <div
              className={cn(
                `card-icon-shell flex items-center justify-center w-full h-full
                 transition-all duration-500 ease-out overflow-hidden
                 group-hover:scale-[0.85] group-hover:opacity-50 group-focus-within:scale-[0.85] group-focus-within:opacity-50`,
                resolvedShellClassName,
              )}
            >
              {/* A `.json` logo is a Lottie animation (e.g. the Tenable iris)
                  rendered by the vendored SVG player; anything else is a
                  plain raster/vector served via <img>. */}
              {logo.toLowerCase().endsWith('.json') ? (
                <LottieMark
                  src={logo}
                  label={title}
                  className={cn('w-full h-full p-6', resolvedImageClassName)}
                />
              ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logo}
                alt={title}
                /* Image fills the card with a small breathing margin
                   so it doesn't kiss the edges. p-3 stays usable on
                   short cards (e.g. h-24); tall cards still look
                   composed because the image is object-contained.
                   Override per-card via imageClassName (e.g. 'p-6'
                   for more breathing room, 'p-0' to bleed to edges). */
                className={cn('w-full h-full object-contain p-3', resolvedImageClassName)}
                loading="eager"
                decoding="async"
                width={56}
                height={56}
              />
              )}
            </div>
          ) : Icon ? (
            <div
              className={cn(
                `card-icon-shell flex items-center justify-center w-full h-full
                 transition-all duration-500 ease-out
                 group-hover:scale-[0.85] group-hover:opacity-50 group-focus-within:scale-[0.85] group-focus-within:opacity-50`,
                resolvedShellClassName,
              )}
            >
              <Icon size={64} className="text-white" />
            </div>
          ) : null}
        </div>

        {/* ── Reveal panel: slides up from below ──
            Default: bottom-anchored, auto-height (tall cards show info at the
            bottom with the dimmed logo above). centerReveal: panel fills the
            whole card and vertically centres the text — for short tiles where a
            bottom-anchored panel would otherwise hug the top edge. */}
        <div
          className={cn(
            'card-reveal-panel glass-card-reveal absolute left-0 right-0 translate-y-full group-hover:translate-y-0 group-focus-within:translate-y-0 p-5',
            centerReveal ? 'top-0 bottom-0 flex flex-col justify-center' : 'bottom-0',
          )}
          style={{
            background: `linear-gradient(135deg,hsla(${fromH},72%,30%,0.85),hsla(${toH},62%,24%,0.85))`,
            borderTop: `1px solid hsla(${fromH},80%,60%,0.30)`,
            transition: `transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-snug">{title}</p>
              {subtitle && (
                <p className="text-white/55 text-[11px] font-mono mt-0.5">{subtitle}</p>
              )}
              <p className="text-white/65 text-xs mt-1.5 leading-relaxed line-clamp-2">{description}</p>
              {tags && tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.slice(0, 4).map(t => (
                    <span key={t} className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/60">{t}</span>
                  ))}
                  {tags.length > 4 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/40">+{tags.length - 4}</span>
                  )}
                </div>
              )}
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-white/85">
                {ctaLabel ?? (external ? 'Open site' : 'Open')}
                <ArrowUpRight size={13} aria-hidden="true" />
              </span>
            </div>
          </div>
        </div>
      </StaticLink>
    </div>
  )
}
