'use client'

import { useEffect } from 'react'
import { StaticLink } from '@/components/common/StaticLink'

/**
 * Client-side redirect for pages that have moved to a new URL. Static export
 * can't issue server redirects, so a thin stub page renders this: it replaces
 * the history entry with the new path on mount and shows a manual link as a
 * no-JS / slow-network fallback. Keeps old bookmarks and external links working
 * after the route reorganization.
 */
export function RedirectStub({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to)
  }, [to])

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm text-slate-400">This page has moved.</p>
      <StaticLink href={to} className="text-sm font-semibold text-cyan-300 underline hover:text-cyan-200">
        Continue to {to}
      </StaticLink>
    </div>
  )
}
