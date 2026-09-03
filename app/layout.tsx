import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { preload } from 'react-dom'
import './globals.css'

import { AppShell } from '@/components/layout/AppShell'
import { StarfallBackground } from '@/components/layout/StarfallBackground'
import { GpuTierDetector } from '@/components/common/GpuTierDetector'
import { SiteInspectionGuard } from '@/components/common/SiteInspectionGuard'

/*
 * Inline pre-hydration GPU tier detector.
 *
 * Why an inline script instead of a React component:
 *   - The React `GpuTierDetector` only runs after hydration. Until then the
 *     body sits at `data-gpu-tier="none"` (the SSR default) and every
 *     `[data-gpu-tier="none"]` rule in globals.css is active. On a workstation
 *     with a real GPU that's just visual lag during hydration; in practice it
 *     was sticking — either because dev-mode HMR cached an old detection
 *     result on the module, or because hydration on a complex client tree
 *     gets deferred long enough that the user perceives it as "stuck".
 *   - Running the same logic in an inline script before paint sets the tier
 *     on the very first frame, with no dependency on React mounting. The
 *     React component still runs after hydration and dispatches the
 *     `apen-gpu-tier-change` event so dynamic consumers (Starfall, etc.)
 *     pick up the same tier.
 *   - We mark this with `data-gpu-tier-inline="ran"` so React's hydrator
 *     doesn't argue with the attributes we just changed.
 *
 * Keep this list of patterns mirrored with lib/data/gpuTier.ts. Duplication
 * is a deliberate trade-off — bundling the TS module would defeat the
 * whole point of running before bundle execution.
 */
const GPU_TIER_INLINE_SCRIPT = `
(function () {
  try {
    var detect = function () {
      try {
        // Size the canvas to a real (non-zero) dimension and pass
        // powerPreference: 'high-performance' so Chrome doesn't hand us the
        // Microsoft Basic Render Driver on dual-adapter Windows systems.
        // Without these, an offscreen canvas can land on the secondary
        // (software) adapter even when the page's main WebGL context
        // is using the discrete GPU.
        var canvas = document.createElement('canvas')
        canvas.width = 1
        canvas.height = 1
        var attrs = { powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false, antialias: false, depth: false, stencil: false, alpha: false, preserveDrawingBuffer: false }
        var gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs)
        if (!gl) return 'none'
        var ext = gl.getExtension('WEBGL_debug_renderer_info')
        var nav = window.navigator || {}
        if (!ext) {
          if (typeof nav.gpu !== 'undefined' && nav.gpu !== null) return 'high'
          var mem = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : 8
          var cores = typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : 8
          if (mem >= 8 && cores >= 8) return 'high'
          if (mem >= 4 && cores >= 4) return 'mid'
          return 'none'
        }
        var rRaw = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
        var vRaw = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)
        var r = (typeof rRaw === 'string' ? rRaw : '').toLowerCase()
        var v = (typeof vRaw === 'string' ? vRaw : '').toLowerCase()
        if (
          r.indexOf('swiftshader') >= 0 ||
          r.indexOf('llvmpipe') >= 0 ||
          r.indexOf('softwarerenderer') >= 0 ||
          r.indexOf('mesa offscreen') >= 0 ||
          r.indexOf('microsoft basic render') >= 0 ||
          r.indexOf('angle (software)') >= 0 ||
          r.indexOf('d3d9 software') >= 0 ||
          v.indexOf('google swiftshader') >= 0 ||
          v.indexOf('brian paul') >= 0
        ) {
          // Software WebGL (HW-accel off / VDI): keep the lighter 'mid' theme on
          // a capable CPU/RAM; only weak devices drop to 'none'. Mirror of the
          // software-renderer branch in lib/data/gpuTier.ts.
          if (typeof nav.gpu !== 'undefined' && nav.gpu !== null) return 'mid'
          var swMem = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : 8
          var swCores = typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : 8
          if (swMem >= 4 && swCores >= 4) return 'mid'
          return 'none'
        }
        var isDiscreteAmd =
          /\\brx\\s*\\d/.test(r) ||
          /radeon\\s*pro\\b/.test(r) ||
          /\\bw\\s*\\d{4}\\b/.test(r) ||
          /\\bhd\\s*\\d{4}\\b/.test(r)
        if (
          r.indexOf('intel hd') >= 0 ||
          r.indexOf('intel(r) hd') >= 0 ||
          r.indexOf('intel uhd') >= 0 ||
          r.indexOf('intel(r) uhd') >= 0 ||
          r.indexOf('intel iris') >= 0 ||
          r.indexOf('hd graphics') >= 0 ||
          r.indexOf('iris xe graphics') >= 0 ||
          r.indexOf('iris plus') >= 0 ||
          r.indexOf('mali-') >= 0 ||
          /adreno\\s*(?:\\(tm\\)\\s*)?[1-5]\\d{2}\\b/.test(r) ||
          (
            (r.indexOf('amd') >= 0 || r.indexOf('radeon') >= 0) &&
            !isDiscreteAmd &&
            (r.indexOf('vega') >= 0 || /radeon\\(tm\\)\\s+graphics/.test(r) || /radeon\\s+graphics$/.test(r))
          )
        ) return 'mid'
        return 'high'
      } catch (e) { return 'mid' }
    }
    var tier = detect()
    var prefersReduced = false
    try { prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch (e) { prefersReduced = false }
    var budget = prefersReduced ? 'reduced' : 'full'
    window.__APEN_GPU_TIER__ = tier
    window.__APEN_RENDER_BUDGET__ = budget

    // <html> exists already — set its attributes synchronously so the
    // SSR HTML never paints a stale tier value if any rule keys off
    // html[data-gpu-tier=...] instead of body.
    var html = document.documentElement
    if (html) {
      html.setAttribute('data-gpu-tier', tier)
      html.setAttribute('data-gpu-ready', 'true')
      html.setAttribute('data-render-budget', budget)
    }

    // <body> may or may not exist yet depending on where this script runs.
    // Try both: set immediately if available, AND register a fallback to
    // run as soon as the body element is parsed. Apply once.
    var applied = false
    var applyToBody = function () {
      if (applied) return
      var body = document.body
      if (!body) return
      applied = true
      body.setAttribute('data-gpu-tier', tier)
      body.setAttribute('data-gpu-ready', 'true')
      body.setAttribute('data-render-budget', budget)
      body.setAttribute('data-gpu-tier-inline', 'ran')
    }
    applyToBody()
    if (!applied) {
      // Polling for body is cheaper than a MutationObserver and runs only
      // until the body element exists. Bail out aggressively.
      var tries = 0
      var poll = function () {
        applyToBody()
        if (applied || tries++ > 200) return
        setTimeout(poll, 5)
      }
      poll()
      // Also catch the DOMContentLoaded path in case polling misses it.
      if (document.addEventListener) {
        document.addEventListener('DOMContentLoaded', applyToBody, { once: true })
      }
    }
  } catch (e) { /* swallow — fall back to React detector */ }
})()
`

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#040a16',
}

export const metadata: Metadata = {
  /* Plain string title — no template suffix. Pages that set their own
     metadata.title still override this; pages that don't fall back to
     this exact string in the browser tab. */
  title: 'APEN Service & Support',
  description: 'APEN Services and Support — CESC tools, documentation, downloads, and resources.',
  /* Favicons are managed via the Next.js App Router file conventions:
       app/favicon.ico    → multi-resolution ICO (16/32/48), auto-served
                             at /favicon.ico and auto-linked from <head>.
       app/apple-icon.png → 192×192 PNG, auto-served at /apple-icon and
                             auto-linked as <link rel="apple-touch-icon">.
     No manual `icons` metadata needed — Next handles the <link> tags
     and immutable cache headers from those files alone. To regenerate
     from a different source logo, run `npm run favicons` (the script
     lives at scripts/build-favicon.mjs and uses the project-local sharp
     install — no system dependencies). */
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  // Preload the Inter latin subset — the UI font the LCP heading + body render
  // in (self-hosted; see the @font-face block in globals.css) — so it fetches
  // same-origin in parallel with the CSS instead of being discovered only after
  // the stylesheet parses. Use React 19's preload() resource API rather than a
  // hand-written <link rel="preload"> in <head>: a raw head link was emitted
  // TWICE by React (once hoisted+normalized, once raw), and Chrome flagged the
  // redundant copy as "preloaded but not used." preload() dedupes to exactly one
  // hoisted <link>. `crossOrigin` is required (fonts fetch in CORS/anonymous
  // mode) or the browser downloads the file twice. JetBrains Mono is code-only,
  // off the critical path, so it's left to load on demand.
  preload('/fonts/inter-latin.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' })

  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/*
          Native inline <script> placed in <head> — runs SYNCHRONOUSLY during
          HTML parsing, before any React/Next.js JS executes. This is the only
          way to update the body's `data-gpu-tier` attribute before the first
          paint. We previously wrapped this in next/script with
          strategy="beforeInteractive", but that pushes the source into the
          Next.js loader queue (self.__next_s) instead of injecting an
          executable script tag — so the detection was running long after
          hydration, sometimes never. A plain <script
          dangerouslySetInnerHTML> bypasses Next.js entirely and behaves like
          any normal inline script in the page.

          The script targets document.documentElement immediately and queues
          a DOMContentLoaded listener for body — covering both the case
          where head scripts run before body parse and where the user's
          browser parses fast enough that body already exists.
        */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: GPU_TIER_INLINE_SCRIPT }}
        />
      </head>
      {/*
        SSR default tier is "high" — if for any reason the inline script
        above fails to run (extension blocking, very old browser), the user
        sees the full-effect styling rather than the reduced fallback. The
        inline script will demote to mid/none on weak hardware before paint.
      */}
      <body data-gpu-tier="high" data-gpu-ready="false" data-render-budget="full" suppressHydrationWarning className="min-h-screen overflow-x-hidden bg-[#040a16] font-sans antialiased text-slate-200">
        <a href="#main-content" className="skip-to-content">Skip to content</a>

        {/* Atmospheric backdrop — renders behind every route, including the
            intro. Pointer-events: none so it never intercepts clicks. */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <StarfallBackground />
        </div>

        {/*
          AppShell decides whether the current route renders the navbar
          and the sidebar-compensating padding. The click-through intro
          at `/` is rendered chromeless; every other route keeps the
          existing layout. See components/AppShell.tsx for the rules.
        */}
        <AppShell>{children}</AppShell>

        {/* GPU detection stays outside AppShell because it runs on every route. */}
        <GpuTierDetector />

        {/* Right-click / devtools shortcuts are suppressed for everyone except
            admin-ACL members (LDAP admin session or allowlisted workstation IP),
            who keep native inspection. Runs on every route, so it lives here
            rather than inside AppShell. */}
        <SiteInspectionGuard />
      </body>
    </html>
  )
}
