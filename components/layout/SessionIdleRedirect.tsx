'use client'

/**
 * SessionIdleRedirect — sends a browser whose session has gone idle or stale
 * to the sign-in page.
 *
 * Renders nothing. Mounted once from AppShell so it covers every route.
 *
 * Scope note: this is the CLIENT half. It ends the user's view of the session,
 * which is what makes the timeout visible, but it is not an access control —
 * anything that stops the script (a closed tab reopened from cache, JS
 * disabled) skips it. Enforcing the timeout for real also requires the server
 * to reject the cookie, in proxy/site-stats.mjs's findSessionByCookie.
 */

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { SESSION_IDLE, hasSessionGoneIdle, isSessionIdleExemptPath } from '@/lib/data/session-idle'

/* Capture-phase + passive. Capture so activity still registers even if a
   handler below stops propagation; passive because none of these ever call
   preventDefault, and a non-passive wheel/touch/scroll listener blocks the
   compositor on every event. */
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const
const LISTENER_OPTIONS = { passive: true, capture: true } as const

export function SessionIdleRedirect() {
  const pathname = usePathname()
  /* Seeded to 0 rather than Date.now(): reading the clock during render is an
     impure call (react-hooks/purity). The effect below stamps it before
     anything can read it, and it re-stamps on every navigation. */
  const lastActivityRef = useRef(0)
  // Latches so a slow navigation can't fire the redirect repeatedly.
  const redirectedRef = useRef(false)

  useEffect(() => {
    if (isSessionIdleExemptPath(pathname)) return

    // Mounting or navigating IS user activity. Without this, arriving from an
    // exempt route carrying a long-stale timestamp would redirect instantly.
    lastActivityRef.current = Date.now()

    const markActive = () => { lastActivityRef.current = Date.now() }
    ACTIVITY_EVENTS.forEach((type) => window.addEventListener(type, markActive, LISTENER_OPTIONS))

    const expireIfStale = () => {
      if (redirectedRef.current) return
      if (!hasSessionGoneIdle(lastActivityRef.current, Date.now())) return
      redirectedRef.current = true
      // replace(), not assign(): Back must not restore the dead page.
      window.location.replace(SESSION_IDLE.redirectUrl)
    }

    const poll = window.setInterval(expireIfStale, SESSION_IDLE.pollMs)

    // Coming back to the tab is exactly when staleness matters, and timers may
    // have been throttled or suspended meanwhile — check immediately rather
    // than waiting out a poll interval.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') expireIfStale()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', expireIfStale)

    return () => {
      ACTIVITY_EVENTS.forEach((type) => window.removeEventListener(type, markActive, LISTENER_OPTIONS))
      window.clearInterval(poll)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', expireIfStale)
    }
  }, [pathname])

  return null
}
