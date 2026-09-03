/**
 * Idle/stale session policy for the client.
 *
 * A session that has seen no USER ACTIVITY for `timeoutMs` is treated as dead
 * and the browser is sent to `redirectUrl`.
 *
 * "User activity" deliberately means real input — pointer, key, wheel, touch,
 * scroll — and NOT network traffic. The site runs several background pollers
 * (live announcements every 30s, content overrides every 60s, activity stats
 * every 30s, admin notification counts every 15s; see RUNTIME_INTERVALS), and
 * every one of those requests passes through nginx's `auth_request` gate. So
 * an open tab is never quiet at the HTTP level, and any "time since last
 * request" definition of idle would never expire while a page sits open.
 */
export const SESSION_IDLE = {
  /** 30 minutes of no user input ends the session. */
  timeoutMs: 30 * 60_000,

  /**
   * Absolute URL, as specified. Unauthenticated requests to the site root are
   * bounced to /login/ by nginx's login-redirect.inc, so this lands the user
   * on the sign-in page.
   */
  redirectUrl: '/',

  /**
   * How often the watchdog compares wall-clock time against last activity.
   * A single long setTimeout is not good enough: browsers throttle timers in
   * background tabs and suspend them entirely while the machine sleeps, so one
   * timer would fire late or not at all. Polling a timestamp makes "stale"
   * (laptop shut for two hours) behave identically to "idle".
   */
  pollMs: 15_000,
} as const

/**
 * Routes where the redirect is skipped.
 *
 * `/` is the chromeless intro and is also the redirect target itself, and
 * `/login` is where an expired session is sent — bouncing either one would
 * reload the page the user is already on, in a loop.
 */
export function isSessionIdleExemptPath(pathname: string | null): boolean {
  const raw = pathname ?? ''
  const normalized = raw !== '/' && raw.endsWith('/') ? raw.replace(/\/+$/, '') : raw
  return normalized === '' || normalized === '/' || normalized === '/login'
}

/** Pure decision function, extracted so the timing rule is directly testable. */
export function hasSessionGoneIdle(
  lastActivityAt: number,
  now: number,
  timeoutMs: number = SESSION_IDLE.timeoutMs,
): boolean {
  return now - lastActivityAt >= timeoutMs
}
