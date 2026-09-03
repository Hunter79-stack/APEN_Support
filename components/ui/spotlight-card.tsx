'use client'

import React, { useEffect, useRef, useState, ReactNode } from 'react'
import { cn } from '@/lib/data/utils'
import { getGpuTier } from '@/lib/data/gpuTier'
import { getGlowSpotlightDefinition, type GlowColorName } from '@/lib/data/card-colors'

interface GlowCardProps {
  children: ReactNode
  className?: string
  glowColor?: GlowColorName
  customSize?: boolean
  style?: React.CSSProperties
  onClick?: () => void
  as?: React.ElementType
  href?: string
}

/* --- Global spotlight CSS injected once --- */
const SPOTLIGHT_STYLES = `
[data-glow-card]::before,
[data-glow-card]::after {
  pointer-events: none;
  content: "";
  position: absolute;
  inset: calc(var(--border-size, 1px) * -1);
  border: var(--border-size, 1px) solid transparent;
  border-radius: inherit;
  background-repeat: no-repeat;
  mask: linear-gradient(transparent, transparent), linear-gradient(white, white);
  mask-clip: padding-box, border-box;
  mask-composite: intersect;
}
[data-glow-card]::before {
  background-image: radial-gradient(
    calc(var(--spotlight-size, 200px) * 0.75) calc(var(--spotlight-size, 200px) * 0.75)
    at var(--mouse-x, -9999px) var(--mouse-y, -9999px),
    hsl(var(--glow-hue, 195) 100% 50% / 1.0), transparent 100%
  );
  filter: brightness(3.5);
}
[data-glow-card]::after {
  background-image: radial-gradient(
    calc(var(--spotlight-size, 200px) * 0.5) calc(var(--spotlight-size, 200px) * 0.5)
    at var(--mouse-x, -9999px) var(--mouse-y, -9999px),
    hsl(0 100% 100% / 0.75), transparent 100%
  );
}
`

let styleInjected = false
function injectSpotlightStyles() {
  if (styleInjected || typeof document === 'undefined') return
  const tag = document.createElement('style')
  tag.innerHTML = SPOTLIGHT_STYLES
  document.head.appendChild(tag)
  styleInjected = true
}

export function GlowCard({
  children,
  className = '',
  glowColor = 'cyan',
  customSize = false,
  style,
  onClick,
  as: Tag = 'div',
  href,
}: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const { base, spread } = getGlowSpotlightDefinition(glowColor)

  // Randomised hue + GPU-dependent blur are set after mount to avoid
  // server/client hydration mismatches (Math.random & getGpuTier differ
  // between SSR and the browser).
  const [glowHue, setGlowHue] = useState(base)
  const [blurPx, setBlurPx] = useState(12)

  const [gpuTier, setGpuTier] = useState<'high' | 'mid' | 'none'>('high')

  useEffect(() => {
    injectSpotlightStyles()
    setGlowHue(base + Math.random() * spread)
    const tier = getGpuTier()
    setGpuTier(tier)
    setBlurPx(tier === 'none' ? 0 : tier === 'high' ? 12 : 6)
  }, [base, spread])

  // Skip mouse tracking entirely on software renderers — saves CPU
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!cardRef.current || gpuTier === 'none') return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    cardRef.current.style.setProperty('--mouse-x', `${x}px`)
    cardRef.current.style.setProperty('--mouse-y', `${y}px`)
  }

  const handlePointerLeave = () => {
    if (!cardRef.current || gpuTier === 'none') return
    cardRef.current.style.setProperty('--mouse-x', `-9999px`)
    cardRef.current.style.setProperty('--mouse-y', `-9999px`)
  }

  /*
    Card body is transparent at rest so the parent apen-section's animated
    blobs read through. The only background paint is the mouse-tracked
    radial spotlight (which fades to transparent away from the cursor),
    so as soon as the user moves over the card, the colored glow rises
    out of the blob field — that's the "hover effect" preserved here.
    Border, ring, and conic-spotlight pseudo-elements continue to provide
    the rest of the interaction feedback.
  */
  const inlineStyles: React.CSSProperties = {
    '--glow-hue':        `${glowHue}`,
    '--spotlight-size':  '380px',
    '--border-size':     '1px',
    background: `radial-gradient(
      var(--spotlight-size) var(--spotlight-size)
      at var(--mouse-x, -9999px) var(--mouse-y, -9999px),
      hsl(var(--glow-hue, 195) 100% 70% / 0.35), transparent
    )`,
    position: 'relative',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)',
    transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
    ...style,
  } as React.CSSProperties

  const Comp = (href ? 'a' : Tag) as React.ElementType

  return (
    <Comp
      ref={cardRef}
      data-glow-card
      href={href}
      onClick={onClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={inlineStyles}
      className={cn(
        'border rounded-xl transition-all duration-300 overflow-hidden',
        'border-white/10 hover:border-cyan-400/60',
        !customSize && '',
        className
      )}
    >
      {children}
    </Comp>
  )
}
