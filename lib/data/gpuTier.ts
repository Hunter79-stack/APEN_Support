/**
 * gpuTier.ts — Runtime GPU capability detection for adaptive rendering.
 *
 * Returns one of three tiers so components can choose the right rendering path:
 *
 *  'high' — Dedicated GPU (NVIDIA GeForce/Quadro/RTX, AMD Radeon RX/Pro,
 *           Apple M-series, ARM Mali high-tier, Adreno high-tier).
 *           Full WebGL effects, full backdrop-filter blur.
 *
 *  'mid'  — Integrated GPU (Intel HD/UHD/Iris, AMD Ryzen Vega/Radeon Graphics
 *           APU, low-tier mobile GPUs).
 *           Reduced WebGL complexity, lighter backdrop-filter blur.
 *
 *  'none' — Software renderer or no GPU detected (SwiftShader, llvmpipe, Mesa
 *           offscreen, Microsoft Basic Render Driver, hardware-acceleration
 *           disabled). CSS-only fallback — zero WebGL, zero rAF loop.
 *
 * The result is cached after the first call (detection is synchronous and cheap).
 *
 * Design notes — how this changed in 2026-05:
 *   - User-preference signals (prefers-reduced-motion, save-data, low CPU/RAM)
 *     no longer override hardware GPU detection. They still influence whether
 *     animations run, but that's the CSS layer's job (data-render-budget
 *     attribute, separate from data-gpu-tier).
 *   - When WEBGL_debug_renderer_info is unavailable (privacy mode, locked-down
 *     enterprise browsers), fall back to capability heuristics rather than
 *     defaulting to 'mid' — which was making every GPU device look "low".
 *   - AMD discrete-vs-integrated discrimination was loose ("radeon" + "graphics"
 *     anywhere in the string). Discrete cards regularly include both words
 *     (e.g. "AMD Radeon RX 6800 XT Graphics"). Tightened to specific patterns.
 */

export type GpuTier = 'high' | 'mid' | 'none'

/** Separate hint exposed alongside tier; CSS uses it to gate animations. */
export type RenderBudget = 'full' | 'reduced'

let _cached: GpuTier | null = null
let _cachedBudget: RenderBudget | null = null

type NavigatorWithDeviceHints = Navigator & {
  deviceMemory?: number
  connection?: {
    effectiveType?: string
    saveData?: boolean
  }
  gpu?: unknown
}

/**
 * User/system signals that say "render less, regardless of how powerful the GPU is."
 * Returned as a separate value so the GPU tier can stay accurate; the CSS layer
 * can still respond to this via the `data-render-budget` attribute.
 */
export function getRenderBudget(): RenderBudget {
  if (typeof window === 'undefined') return 'full'

  // Trust the inline pre-hydration script's value when present — same
  // reasoning as in getGpuTier above.
  const fromInline =
    (window as Window & { __APEN_RENDER_BUDGET__?: RenderBudget }).__APEN_RENDER_BUDGET__
  if (fromInline === 'full' || fromInline === 'reduced') {
    _cachedBudget = fromInline
    return _cachedBudget
  }

  if (_cachedBudget !== null) return _cachedBudget

  const nav = window.navigator as NavigatorWithDeviceHints
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  const saveData = nav.connection?.saveData === true
  const slowConnection =
    nav.connection?.effectiveType === 'slow-2g' || nav.connection?.effectiveType === '2g'

  // ONLY treat the device as "reduced" when both memory AND CPU look weak.
  // A modern 4-core laptop with a discrete GPU shouldn't be downgraded just
  // because the browser caps `hardwareConcurrency` reporting.
  const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2
  const lowCpu = typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 2

  _cachedBudget = (reducedMotion || saveData || slowConnection || (lowMemory && lowCpu))
    ? 'reduced'
    : 'full'
  return _cachedBudget
}

/**
 * Fallback classifier when the renderer string is unavailable (extension blocked).
 * Uses capability hints — WebGPU support, deviceMemory, hardwareConcurrency — to
 * guess intelligently rather than defaulting everyone to 'mid'.
 */
function classifyFromCapabilityHints(): GpuTier {
  const nav = window.navigator as NavigatorWithDeviceHints

  // WebGPU is only enabled when there's a real hardware GPU. Strong signal of 'high'.
  if (typeof nav.gpu !== 'undefined' && nav.gpu !== null) return 'high'

  const memory = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null
  const cores = typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null

  // Plenty of RAM AND many cores → likely a real desktop/laptop with a usable GPU.
  // (deviceMemory is capped by browsers — 8 means "8 or more", which covers most
  // modern hardware. Firefox doesn't report at all → memory === null → still pass
  // the cores-only check below.)
  if ((memory ?? 8) >= 8 && (cores ?? 8) >= 8) return 'high'

  // Mid-range: enough resources to run effects but not abundantly so.
  if ((memory ?? 4) >= 4 && (cores ?? 4) >= 4) return 'mid'

  // Anything weaker, AND we couldn't read the renderer → safest is software-fallback.
  return 'none'
}

/** True if the renderer string identifies a software/CPU-only WebGL backend. */
function isSoftwareRenderer(renderer: string, vendor: string): boolean {
  return (
    renderer.includes('swiftshader') ||              // Chrome software fallback
    renderer.includes('llvmpipe') ||                 // Mesa CPU renderer (Linux servers)
    renderer.includes('softwarerenderer') ||
    renderer.includes('mesa offscreen') ||
    renderer.includes('microsoft basic render') ||   // Windows "Basic Display Adapter"
    renderer.includes('angle (software)') ||         // ANGLE software path
    renderer.includes('d3d9 software') ||
    vendor.includes('google swiftshader') ||
    vendor.includes('brian paul')                    // Mesa llvmpipe vendor string
  )
}

/**
 * True if the renderer string is an INTEGRATED GPU.
 *
 * The previous version of this matcher was overly broad on AMD: it treated any
 * "radeon" + "graphics" combination as integrated, but discrete AMD cards
 * regularly report names like "AMD Radeon RX 6800 XT Graphics" — and got
 * misclassified as `mid`. The Ryzen APU pattern is specifically "Radeon Vega"
 * or "Radeon(TM) Graphics" with NO "RX"/"Pro"/"Vega 64"/etc. discrete model
 * marker, so we check for that explicitly and then bail.
 */
function isIntegratedRenderer(renderer: string): boolean {
  // Intel — almost always integrated. Iris Xe is technically the high end of
  // integrated; we still mark it as 'mid' since it's much weaker than discrete.
  if (
    renderer.includes('intel hd') ||
    renderer.includes('intel(r) hd') ||
    renderer.includes('intel uhd') ||
    renderer.includes('intel(r) uhd') ||
    renderer.includes('intel iris') ||
    renderer.includes('hd graphics') ||
    renderer.includes('iris xe graphics') ||
    renderer.includes('iris plus')
  ) return true

  // Apple integrated — older Intel Macs reported these. Apple Silicon ("Apple M1"
  // through "Apple M4 Max") falls through to 'high'.
  if (renderer.includes('intel iris pro')) return true

  // ARM Mali / Adreno low-tier — typical of phones, mid-tier tablets, ChromeOS
  // tablets. Adreno >= 600 are reasonably capable but still not desktop-class.
  if (renderer.includes('mali-')) return true
  if (/adreno\s*(?:\(tm\)\s*)?[1-5]\d{2}\b/.test(renderer)) return true

  // AMD integrated (Ryzen APU). The discrete cards advertise an RX/Pro/HD model.
  // We only flag as integrated when:
  //   - "Vega" appears WITHOUT "RX" (Vega 8/11 = APU; "Radeon RX Vega 64" = discrete)
  //   - "Radeon Graphics" appears with no model number AT ALL
  if (renderer.includes('amd') || renderer.includes('radeon')) {
    const isDiscreteAmd =
      /\brx\s*\d/.test(renderer) ||         // RX 480, RX 6800, RX 7900, etc.
      /radeon\s*pro\b/.test(renderer) ||    // Radeon Pro 5500M etc.
      /\bw\s*\d{4}\b/.test(renderer) ||     // Radeon Pro WX 9100 / W 6800 etc.
      /\bhd\s*\d{4}\b/.test(renderer)       // older HD 7950 etc. (still discrete)
    if (isDiscreteAmd) return false

    if (renderer.includes('vega')) return true                    // APU Vega 8/11
    if (/radeon\(tm\)\s+graphics/.test(renderer)) return true     // generic APU branding
    if (/radeon\s+graphics$/.test(renderer)) return true          // trailing "Radeon Graphics"
  }

  return false
}

export function getGpuTier(): GpuTier {
  // SSR guard — can only detect on the client. The server returns 'high' so
  // SSR markup doesn't downgrade by default; the body element in layout.tsx
  // overrides this until the client-side detector runs.
  if (typeof window === 'undefined') return 'high'

  // Prefer the value the inline pre-hydration script in app/layout.tsx
  // already computed — that ran with the SAME logic as below before any
  // React code touched the page, so trust its answer. This also dodges a
  // dev-mode pitfall where HMR can reuse this module while the cached
  // value still references a previous (incorrect) detection.
  const fromInline =
    (window as Window & { __APEN_GPU_TIER__?: GpuTier }).__APEN_GPU_TIER__
  if (fromInline === 'high' || fromInline === 'mid' || fromInline === 'none') {
    _cached = fromInline
    return _cached
  }

  // Return cached value immediately on repeat calls
  if (_cached !== null) return _cached

  try {
    // Size the canvas (default 0×0 sometimes triggers the software adapter
    // on Windows) and explicitly request the high-performance adapter via
    // `powerPreference`. Without this, dual-adapter Windows systems with
    // a discrete GPU + Microsoft Basic Render Driver can hand back the
    // software adapter for offscreen canvases, even when the page-level
    // WebGL context (e.g. a WebGL <canvas> in the DOM) is using the
    // discrete GPU. Setting other allocation hints to `false` reduces the
    // odds of the browser picking a different backing config.
    const testCanvas = document.createElement('canvas')
    testCanvas.width = 1
    testCanvas.height = 1
    const ctxAttrs: WebGLContextAttributes = {
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
      antialias: false,
      depth: false,
      stencil: false,
      alpha: false,
      preserveDrawingBuffer: false,
    }
    const gl = (
      testCanvas.getContext('webgl', ctxAttrs) ??
      (testCanvas.getContext('experimental-webgl', ctxAttrs) as WebGLRenderingContext | null)
    )

    if (!gl) {
      _cached = 'none'
      return _cached
    }

    const ext = gl.getExtension('WEBGL_debug_renderer_info')

    if (!ext) {
      // Extension blocked (e.g. Firefox privacy.resistFingerprinting, locked-
      // down enterprise browsers). Don't blanket-default to 'mid' — that
      // misclassifies every modern device that just happens to be in a privacy
      // browser. Use device-capability hints instead.
      _cached = classifyFromCapabilityHints()
      return _cached
    }

    const rawRenderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
    const rawVendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)
    const renderer = (typeof rawRenderer === 'string' ? rawRenderer : '').toLowerCase()
    const vendor = (typeof rawVendor === 'string' ? rawVendor : '').toLowerCase()

    if (isSoftwareRenderer(renderer, vendor)) {
      // Software / CPU WebGL — hardware acceleration is off, or this is a
      // VDI/RDP session. Don't strip ALL polish: skip the heavy WebGL but keep
      // the lighter 'mid' theme on a capable CPU/RAM (very common on enterprise
      // workstations with HW-accel disabled by policy). Only the weakest
      // devices fall all the way to 'none'. Cap at 'mid' — never 'high' — since
      // there's no real GPU here.
      const hint = classifyFromCapabilityHints()
      _cached = hint === 'high' ? 'mid' : hint
      return _cached
    }

    if (isIntegratedRenderer(renderer)) {
      _cached = 'mid'
      return _cached
    }

    // Real hardware that is neither software-rendered nor integrated → 'high'.
    _cached = 'high'
    return _cached
  } catch {
    // Unexpected error during detection — defer to capability hints rather than
    // assuming the worst. A try/catch failure shouldn't punish a fast device.
    _cached = classifyFromCapabilityHints()
    return _cached
  }
}

/** Test-only: clear the memoized tier so detection runs again. */
export function _resetGpuTierCacheForTests(): void {
  _cached = null
  _cachedBudget = null
}
