'use client'

import React, { useState, useEffect } from 'react'
import { getGpuTier, getRenderBudget, type GpuTier } from '@/lib/data/gpuTier'

/**
 * StarfallBackground — Animated cyber-technology background.
 *
 * Inspired by dark cyber-security / network-operations aesthetics:
 *   • Perspective grid floor converging to a vanishing point
 *   • Horizontal glowing circuit traces with signal pulses
 *   • Pulsing connection nodes at key intersections
 *   • Ambient floating particles for depth
 *   • Radial gradient glow from the center for focal energy
 *   • Horizontal scan-line sweep
 *
 * 100 % CSS + inline SVG — zero canvas, zero WebGL, zero JS animation loops.
 */

/* ── Deterministic hash helper (SSR-safe, no Math.random) ── */
const hash = (i: number) => {
  const s = (i * 2654435761) >>> 0
  return (n: number) => ((s * n) % 1000) / 1000
}

/* ── Particle styles ── */
function particleStyle(i: number): React.CSSProperties {
  const frac = hash(i)
  const left    = frac(1) * 100
  const delay   = frac(2) * -30
  const dur     = 20 + frac(3) * 25
  const size    = 1 + frac(4) * 2
  const opacity = 0.12 + frac(5) * 0.28
  const hue     = i % 3 === 0 ? 195 + frac(6) * 20 : 225 + frac(7) * 35
  return {
    left: `${left}%`,
    width: `${size}px`,
    height: `${size}px`,
    opacity,
    animationDuration: `${dur}s`,
    animationDelay: `${delay}s`,
    background: `hsl(${hue}, 80%, 65%)`,
    boxShadow: `0 0 ${size * 3}px hsl(${hue}, 80%, 55%)`,
  }
}

/* ── Node styles ── */
function nodeStyle(i: number): React.CSSProperties {
  const frac = hash(i + 80)
  const left  = 8 + frac(1) * 84
  const top   = 8 + frac(2) * 84
  const size  = 2.5 + frac(3) * 3
  const dur   = 3 + frac(4) * 5
  const delay = frac(5) * -8
  const hue   = i % 2 === 0 ? 195 + frac(6) * 20 : 230 + frac(7) * 30
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${size}px`,
    height: `${size}px`,
    animationDuration: `${dur}s`,
    animationDelay: `${delay}s`,
    background: `hsl(${hue}, 75%, 58%)`,
    boxShadow: `0 0 ${size * 4}px hsl(${hue}, 80%, 50%),
                0 0 ${size * 10}px hsl(${hue}, 60%, 30%)`,
  }
}

/* ── Horizontal circuit-trace line styles ── */
function traceStyle(i: number): React.CSSProperties {
  const frac = hash(i + 200)
  const top     = 10 + (i * 18) + frac(1) * 8     // evenly spaced vertically
  const width   = 30 + frac(2) * 50                // 30–80% width
  const left    = frac(3) * (100 - width)           // random horizontal start
  const hue     = i % 2 === 0 ? 200 : 240
  const opacity = 0.08 + frac(6) * 0.12
  return {
    position: 'absolute' as const,
    top: `${top}%`,
    left: `${left}%`,
    width: `${width}%`,
    height: '1px',
    background: `linear-gradient(90deg, transparent, hsla(${hue},80%,55%,${opacity}) 20%, hsla(${hue},80%,55%,${opacity * 1.5}) 50%, hsla(${hue},80%,55%,${opacity}) 80%, transparent)`,
    boxShadow: `0 0 8px hsla(${hue},70%,50%,${opacity * 0.8})`,
    // Distance the signal pulse travels = this trace's width. The trace is a
    // % of the full-viewport background container, so `${width}vw` matches its
    // rendered px width. Consumed by the `signalTravel` keyframes (globals.css)
    // as `transform: translateX(var(--pulse-travel))` — GPU-composited instead
    // of the old main-thread `left` animation.
    '--pulse-travel': `${width}vw`,
  } as React.CSSProperties
}

/* ── Signal pulse styles (travels along the trace) ── */
function pulseStyle(i: number): React.CSSProperties {
  const frac = hash(i + 300)
  const dur   = 3 + frac(1) * 4
  const delay = frac(2) * -7
  const hue   = i % 2 === 0 ? 195 : 235
  return {
    animationDuration: `${dur}s`,
    animationDelay: `${delay}s`,
    background: `radial-gradient(circle, hsla(${hue},90%,70%,0.9) 0%, hsla(${hue},80%,55%,0.4) 40%, transparent 70%)`,
  }
}

/* ── Tier-based counts ── */
const TIER_CONFIG: Record<GpuTier, { particles: number; nodes: number; traces: number; scanline: boolean }> = {
  high: { particles: 35, nodes: 16, traces: 5, scanline: true },
  mid:  { particles: 12, nodes: 6,  traces: 3, scanline: false },
  none: { particles: 0,  nodes: 0,  traces: 0, scanline: false },
}

/* ── Component ── */
export function StarfallBackground() {
  const [tier, setTier] = useState<GpuTier>('none')

  useEffect(() => {
    // A reduced render budget (prefers-reduced-motion, save-data, weak
    // device) wins over the GPU tier: render nothing rather than 35 particles
    // and 16 nodes the reduced-motion CSS then hides.
    const pick = (gpuTier: GpuTier, budget: string) => (budget === 'reduced' ? 'none' : gpuTier)
    const handleTierChange = (event: Event) => {
      const detail = (event as CustomEvent<{ tier?: GpuTier; budget?: string }>).detail
      if (detail?.tier) setTier(pick(detail.tier, detail.budget ?? getRenderBudget()))
    }
    window.addEventListener('apen-gpu-tier-change', handleTierChange)

    // Detect synchronously so the initial paint can already pick the right
    // tier instead of starting in 'none' and re-rendering after an idle tick.
    // GpuTierDetector also dispatches `apen-gpu-tier-change` on mount, which
    // covers the case where this component mounts before the detector.
    setTier(pick(getGpuTier(), getRenderBudget()))

    return () => {
      window.removeEventListener('apen-gpu-tier-change', handleTierChange)
    }
  }, [])

  const cfg = TIER_CONFIG[tier]

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      style={{ background: '#040a16' }}
    >
      {/* Layer 0a: APEN-section visual DNA — animated colour blobs.
          Mirrors the backdrop on the home-page LinksGrid sections so the
          chrome reads as a single continuous atmosphere instead of two
          competing systems. Sits beneath the cyber layers so the circuit
          traces / nodes / scanline still cut crisply over the top. */}
      <div className="apen-bg-blobs">
        <span className="apen-bg-blob-c" />
        <span className="apen-bg-blob-d" />
      </div>

      {/* Layer 0b: Slow diagonal shimmer sweep — broader and slower than the
          section variant so it feels ambient rather than decorative. */}
      <div className="apen-bg-shimmer" />

      {/* Layer 1: Radial depth glow — always shown (cheap) */}
      <div className="cyber-glow" />

      {/* Perspective grid floor (cyber-grid) and vertical accent lines
          (cyber-verticals) used to render here. They produced the visible
          "grid lines" pattern on top of the dark background, which felt
          loud against the rest of the chrome. The atmosphere now relies
          on the radial glow + circuit traces + particles + nodes +
          scanline + vignette, which carry the cyber feel without the
          static grid pattern. If you ever want the grid back, drop the
          two divs back in here under their `tier !== 'none'` guards. */}

      {/* Layer 2: Horizontal circuit traces with signal pulses */}
      {cfg.traces > 0 && (
        <div className="cyber-traces">
          {Array.from({ length: cfg.traces }).map((_, i) => (
            <div key={i} className="cyber-trace" style={traceStyle(i)}>
              <span className="cyber-pulse" style={pulseStyle(i)} />
            </div>
          ))}
        </div>
      )}

      {/* Layer 3: Pulsing connection nodes */}
      {cfg.nodes > 0 && (
        <div className="cyber-nodes">
          {Array.from({ length: cfg.nodes }).map((_, i) => (
            <span key={i} className="cyber-node" style={nodeStyle(i)} />
          ))}
        </div>
      )}

      {/* Layer 4: Scan-line sweep — high tier only */}
      {cfg.scanline && <div className="cyber-scanline" />}

      {/* Layer 5: Ambient floating particles */}
      {cfg.particles > 0 && (
        <div className="cyber-particles">
          {Array.from({ length: cfg.particles }).map((_, i) => (
            <span key={i} className="cyber-particle" style={particleStyle(i)} />
          ))}
        </div>
      )}

      {/* Layer 6: Edge vignette for depth — always shown (cheap).
          Uses the APEN-section vignette recipe (deeper falloff, larger
          ellipse) so the page edges feel consistent with the glass panels
          on the home page. */}
      <div className="apen-bg-vignette" />
    </div>
  )
}
