'use client'

import { useEffect } from 'react'
import { getGpuTier, getRenderBudget } from '@/lib/data/gpuTier'

/**
 * Detects the GPU tier on mount and writes it to <html> + <body> so CSS can
 * key off `[data-gpu-tier="…"]` and `[data-gpu-ready="true"]`. Also writes a
 * separate `data-render-budget` attribute that captures user/system signals
 * (prefers-reduced-motion, save-data, very low memory + CPU) — so the CSS
 * layer can decide whether to run animations independent of GPU capability.
 *
 * Renders nothing — purely a side-effect component.
 *
 * Why this runs synchronously rather than inside requestIdleCallback:
 *   - The SSR markup defaults to data-gpu-tier="none" data-gpu-ready="false"
 *     (see app/layout.tsx). If the detector is deferred to idle time, the
 *     "none" rules apply for whatever stretch of time elapses before idle —
 *     and on a busy initial render that can be measured in seconds.
 *   - In React 18 strict mode the cleanup function fires between the mount
 *     and re-mount cycle. The previous version cancelled the idle callback
 *     in cleanup, which on some browsers meant the second mount's idle
 *     callback was never queued at all, leaving the body forever in the
 *     SSR default state.
 *   - GPU detection is a single synchronous WebGL context query — running
 *     it inline costs <1ms and unblocks the right CSS path immediately.
 */
export function GpuTierDetector() {
  useEffect(() => {
    const tier = getGpuTier()
    const budget = getRenderBudget()

    const html = document.documentElement
    const body = document.body
    html.setAttribute('data-gpu-tier', tier)
    html.setAttribute('data-gpu-ready', 'true')
    html.setAttribute('data-render-budget', budget)
    body.setAttribute('data-gpu-tier', tier)
    body.setAttribute('data-gpu-ready', 'true')
    body.setAttribute('data-render-budget', budget)

    // Notify any listeners (StarfallBackground, HoverRevealCard, etc.) so they
    // can re-pick their rendering strategy mid-session if needed.
    window.dispatchEvent(
      new CustomEvent('apen-gpu-tier-change', { detail: { tier, budget } })
    )
  }, [])

  return null
}
