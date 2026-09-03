'use client'

/**
 * SpeedtestFrame — chromeless, auto-sizing frame for the speedtest app.
 *
 * Loads /speedtest/?embed=1 (embed mode: the app drops its own backdrop and
 * goes transparent — see speedtest/frontend/layout_base.css), then keeps the
 * iframe's height locked to the embedded document's natural height. The app
 * is same-origin (nginx serves /speedtest/ from this project), so the height
 * is read directly from contentDocument — no postMessage, no inner scrollbar.
 *
 * Two things make this non-trivial:
 *   1. The completion report is a `position: fixed; inset: 0` overlay. Inside
 *      an iframe that's bounded to the iframe box, so a tall report would be
 *      trapped in a short scroll area. We measure the open report (.apen-modal)
 *      and grow the iframe to fit it, matching the standalone site's full view.
 *   2. Layout/fonts settle after onLoad, so we re-measure on a ResizeObserver
 *      (normal content) AND a MutationObserver (the overlay is appended to
 *      <body> when the test finishes), plus a few delayed re-syncs.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

const FALLBACK_HEIGHT = 820

const EMBED_STYLE_ID = 'apen-speedtest-embed-contract'

/* The embed contract, enforced from THIS side rather than trusted to the
 * embedded app.
 *
 * speedtest/frontend/ carries equivalent rules under `html.embed`, but that
 * frontend is baked into the speedtest Docker image at build time (see
 * speedtest/Dockerfile — `COPY frontend/ /app/frontend/`; only favicon.ico is
 * bind-mounted). So a repo edit does not reach the browser until the image is
 * rebuilt, and a container from before those rules existed serves a page with
 * no `.embed` class and no embed CSS at all. The visible result is the whole
 * chrome rendering inside the frame: `.backdrop` is `position: fixed; inset:0`
 * so its gradient, blobs and .grid-overlay paint across the entire iframe, and
 * `body { min-height: 100vh }` inflates the frame well past the app's real
 * height.
 *
 * Injecting these keeps the frame chromeless — only #app renders — whatever
 * build the container is on. The class is added too, so a rebuilt container
 * simply applies its own identical rules and the two agree.
 *
 * !important throughout: this <style> lands after the app's own stylesheets,
 * but those declare `body { background: #05060a }` and `min-height: 100vh` at
 * equal specificity, and the app's newer embed block itself uses !important. */
const EMBED_CONTRACT_CSS = `
html, body {
  background: transparent !important;
  background-color: transparent !important;
  color-scheme: normal !important;
  min-height: 0 !important;
}
html { overflow: hidden !important; }
.backdrop { display: none !important; }
body {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: flex-start !important;
  padding: 0 !important;
}
#app { box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.05) inset !important; }
`

export function SpeedtestFrame() {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(FALLBACK_HEIGHT)

  // Stable measurer: max of normal content height and any open report overlay.
  const measure = useCallback((doc: Document) => {
    const root = doc.documentElement
    const body = doc.body
    if (!body) return
    let h = Math.max(root.scrollHeight, body.scrollHeight)

    // The report overlay is position:fixed, so it isn't in scrollHeight.
    // Grow to fit its modal (+ the overlay's 32px top/bottom padding) so the
    // whole report is visible without an inner scrollbar.
    const modal = doc.querySelector('.apen-modal') as HTMLElement | null
    if (modal) h = Math.max(h, modal.offsetHeight + 64)

    if (h > 0) setHeight(h)
  }, [])

  /* Idempotent: safe to call again on re-load or if the app rewrites <head>. */
  const applyEmbedContract = useCallback((doc: Document) => {
    doc.documentElement.classList.add('embed')
    if (doc.getElementById(EMBED_STYLE_ID)) return

    const style = doc.createElement('style')
    style.id = EMBED_STYLE_ID
    style.textContent = EMBED_CONTRACT_CSS
    // documentElement, not head — head is present in practice, but this cannot
    // fail, and a style anywhere in the document still applies.
    ;(doc.head ?? doc.documentElement).appendChild(style)
  }, [])

  const handleLoad = useCallback(() => {
    const doc = frameRef.current?.contentDocument
    if (!doc?.body) return // cross-origin or failed load — keep the fallback

    // BEFORE the first measure: the contract drops `min-height: 100vh`, so
    // measuring first would lock in the inflated full-viewport height.
    applyEmbedContract(doc)

    const sync = () => measure(doc)

    sync()
    // Re-measure as fonts/layout settle after first paint.
    const timers = [60, 200, 500, 1200].map((ms) => window.setTimeout(sync, ms))

    const ro = new ResizeObserver(sync)
    ro.observe(doc.documentElement)
    ro.observe(doc.body)

    // The completion report is appended to <body>; catch it appearing/leaving.
    const mo = new MutationObserver(sync)
    mo.observe(doc.body, { childList: true, subtree: true })

    cleanupRef.current = () => {
      timers.forEach(clearTimeout)
      ro.disconnect()
      mo.disconnect()
    }
  }, [measure, applyEmbedContract])

  const cleanupRef = useRef<(() => void) | null>(null)
  useEffect(() => () => cleanupRef.current?.(), [])

  return (
    <iframe
      ref={frameRef}
      onLoad={handleLoad}
      src="/speedtest/?embed=1"
      title="APEN Speed Test"
      scrolling="no"
      className="block w-full border-0"
      // colorScheme:normal stops the browser painting a dark canvas behind the
      // (transparent) embedded page — that dark canvas was the "black box".
      style={{ height: `${height}px`, background: 'transparent', colorScheme: 'normal' }}
    />
  )
}
