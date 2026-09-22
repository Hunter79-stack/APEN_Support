'use client'

/**
 * The launcher's introduction: the first-visit greeting card (shown once per
 * browser, banked only when genuinely consumed) and the name pill that
 * retracts around the Voltron head once the introduction is over. Lifted out
 * of APEN-chat-assistant.tsx (code-quality #76).
 */
import { useCallback, useEffect, useState } from 'react'
import { ASSISTANT_GREETING, ASSISTANT_PILL_INTRO_MS } from '@/lib/data/assistant'

function hasSeenAssistantGreeting(): boolean {
  try {
    return window.localStorage.getItem(ASSISTANT_GREETING.storageKey) === '1'
  } catch {
    return false
  }
}

function markAssistantGreetingSeen(): void {
  try {
    window.localStorage.setItem(ASSISTANT_GREETING.storageKey, '1')
  } catch {
    // Storage unavailable — the greeting simply isn't remembered.
  }
}

/** Ignore the global open shortcut while the visitor is typing somewhere else. */

export function useLauncherIntro({ isVisible, mounted, open }: {
  isVisible: boolean
  /** Client has mounted, so localStorage is safe to read. */
  mounted: boolean
  /** The panel is open — never introduce over it, and bank the flag once seen. */
  open: boolean
}) {
  /* ── First-visit greeting card ──────────────────────────────────────────
     The proactive introduction that names the widget before anyone has to
     guess what the robot head does. Retired permanently (for this browser)
     the first time the panel is opened by ANY route — someone who has found
     the assistant does not need to be introduced to it. */
  const [greetingOpen, setGreetingOpen] = useState(false)

  /* ── Name pill collapse ─────────────────────────────────────────────────
     The label introduces itself, then gets out of the way: the capsule
     retracts around the Voltron head once its introduction is over, leaving
     the plain circle. "Over" means the greeting card closed (dismissed or
     timed out), or — on a visit where no greeting is due — a short window
     elapsed. Hover or keyboard focus brings the label back, so the icon stays
     self-explanatory without the label living on screen permanently. */
  const [pillIntroDone, setPillIntroDone] = useState(false)
  const [pillHovered, setPillHovered] = useState(false)
  const [pillFocused, setPillFocused] = useState(false)
  /* Natural (extended) width, measured once. Needed because max-width cannot
     animate from `auto`; transitioning from a generous fixed cap instead would
     spend the first slice of the animation doing nothing visible. */
  const [pillNaturalWidth, setPillNaturalWidth] = useState<number | null>(null)
  const pillExpanded = !pillIntroDone || pillHovered || pillFocused

  /* Measured in a ref callback rather than an effect: it runs during commit,
     so there is no post-paint flash, and it avoids a setState-in-effect.
     offsetWidth (not getBoundingClientRect) because the entrance animation
     applies a scaleX transform the rect would include and layout width won't. */
  const measurePill = useCallback((node: HTMLSpanElement | null) => {
    if (node && pillNaturalWidth === null) setPillNaturalWidth(node.offsetWidth)
  }, [pillNaturalWidth])

  const dismissGreeting = useCallback(() => {
    markAssistantGreetingSeen()
    setGreetingOpen(false)
    setPillIntroDone(true)
  }, [])

  /* Slide the greeting out a few seconds after the page settles — never over
     an already-open panel, and never for a browser that has seen it before.
     `mounted` gates on the client so localStorage is safe to read. */
  useEffect(() => {
    if (!isVisible || !mounted || open) return
    if (hasSeenAssistantGreeting()) return

    const showTimer = window.setTimeout(() => setGreetingOpen(true), ASSISTANT_GREETING.delayMs)
    return () => window.clearTimeout(showTimer)
  }, [isVisible, mounted, open])

  /* Retract the greeting if it is ignored — and only THEN bank the
     once-per-browser flag. Banking it at display time (the original approach)
     meant anyone who reloaded or navigated during the 5s delay, or a few
     seconds into the card, permanently burned their only impression without
     ever having really seen it. The flag now records genuine consumption:
     dismissed, opened, or shown for its full window. */
  useEffect(() => {
    if (!greetingOpen) return
    const hideTimer = window.setTimeout(() => {
      markAssistantGreetingSeen()
      setGreetingOpen(false)
      setPillIntroDone(true)
    }, ASSISTANT_GREETING.autoHideMs)
    return () => window.clearTimeout(hideTimer)
  }, [greetingOpen])

  /* Backstop that retracts the pill when the greeting path never runs — a
     return visit (card already seen), or a first visit where the panel was
     opened before the card was due. Sized to outlast the whole greeting
     sequence so it can never cut a live card short; the dismiss and auto-hide
     handlers above collapse earlier in the cases that do show one. */
  useEffect(() => {
    if (!isVisible || !mounted || pillIntroDone) return

    const introMs = hasSeenAssistantGreeting()
      ? ASSISTANT_PILL_INTRO_MS
      : ASSISTANT_GREETING.delayMs + ASSISTANT_GREETING.autoHideMs
    const introTimer = window.setTimeout(() => setPillIntroDone(true), introMs)

    return () => window.clearTimeout(introTimer)
  }, [isVisible, mounted, pillIntroDone])

  /* Opening the panel by ANY route (click, shortcut, feedback event, chip)
     means the assistant has been found — never introduce it again. Every
     open path already clears greetingOpen itself, so this only has to write
     the flag; no setState here, and therefore no cascading render. */
  useEffect(() => {
    if (open) markAssistantGreetingSeen()
  }, [open])

  return {
    greetingOpen, setGreetingOpen, dismissGreeting,
    pillExpanded, pillNaturalWidth, measurePill, setPillHovered, setPillFocused,
  }
}
