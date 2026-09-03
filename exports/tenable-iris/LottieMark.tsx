'use client'

import { useEffect, useRef } from 'react'

/**
 * Lottie mark — renders a Lottie JSON animation (e.g. the Tenable iris)
 * using the vendored lottie_light SVG player.
 *
 * Self-contained by design: BOTH the player script and the animation JSON
 * are served from our own origin (/public → out/), so this works in the
 * static export with no npm dependency and no third-party runtime fetch.
 * Used by HoverRevealCard whenever a card's `logo` ends in `.json`.
 */

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lottie?: any
  }
}

const LIB_SRC = '/vendor/lottie_light.min.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadLottieLib(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.lottie) return Promise.resolve(window.lottie)
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-lottie-lib]')
    if (existing) {
      existing.addEventListener('load', () => resolve(window.lottie))
      existing.addEventListener('error', reject)
      if (window.lottie) resolve(window.lottie)
      return
    }
    const s = document.createElement('script')
    s.src = LIB_SRC
    s.async = true
    s.setAttribute('data-lottie-lib', '')
    s.addEventListener('load', () => resolve(window.lottie))
    s.addEventListener('error', reject)
    document.head.appendChild(s)
  })
}

interface LottieMarkProps {
  /** Path to a Lottie JSON animation served from /public (e.g. /logos/products/tenable-iris.json) */
  src: string
  /** Accessible label describing the mark */
  label?: string
  className?: string
}

export function LottieMark({ src, label, className }: LottieMarkProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let anim: any
    let cancelled = false
    const container = ref.current
    if (!container) return
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const start = () => {
      loadLottieLib()
        .then((lottie) => {
          if (cancelled || !ref.current || !lottie) return
          anim = lottie.loadAnimation({
            container: ref.current,
            renderer: 'svg',
            loop: !reduce,
            autoplay: true,
            path: src,
            rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
          })
          // With reduced motion, settle on the fully-assembled mark.
          if (reduce) {
            anim.addEventListener('DOMLoaded', () =>
              anim.goToAndStop(Math.max(0, anim.totalFrames - 1), true),
            )
          }
        })
        .catch(() => {
          /* player failed to load — container simply stays empty */
        })
    }

    // Defer pulling the ~168 KB lottie_light player (+ parse) until the mark is
    // at or near the viewport. The only home-page consumer (the Tenable iris
    // card) is below the fold, so this keeps the entire Lottie runtime off the
    // initial load and out of the LCP critical path. Falls back to eager load
    // where IntersectionObserver is unavailable.
    let observer: IntersectionObserver | undefined
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            observer?.disconnect()
            start()
          }
        },
        { rootMargin: '200px' },
      )
      observer.observe(container)
    } else {
      start()
    }

    return () => {
      cancelled = true
      observer?.disconnect()
      try {
        anim?.destroy()
      } catch {
        /* noop */
      }
    }
  }, [src])

  return <div ref={ref} className={className} role="img" aria-label={label} />
}
