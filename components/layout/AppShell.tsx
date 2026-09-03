'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { SessionIdleRedirect } from '@/components/layout/SessionIdleRedirect'
import { FloatingAiAssistant } from '@/components/ui/APEN-chat-assistant'

/**
 * Page chrome wrapper. Decides whether the current route gets the navbar
 * (sidebar on desktop, top-bar on mobile), the floating AI assistant
 * button, and the layout padding that compensates for the sidebar.
 *
 * The click-through intro at `/` renders chromeless — no sidebar, no
 * top-bar, no AI assistant, no padding offset — so the "Enter the Site"
 * call-to-action is the only interactive element on screen. Every other
 * route keeps the existing chrome.
 *
 * The StarfallBackground (atmospheric backdrop) is rendered globally in
 * the root layout, NOT here, so it shows on every route including the
 * intro.
 *
 * Implemented as a client component so it can call `usePathname`. The
 * Navbar / FloatingAiAssistant components stay unchanged; we just skip
 * mounting them on the chromeless route.
 */
const CHROMELESS_PATHS = new Set<string>([
  '/',
  // No sidebar/navbar/chat bubble on the login page — an anonymous visitor
  // has no session yet, so the Navbar's whoami probe and the chat widget
  // have nothing useful to do here, and the login form is the only thing
  // that should be on screen.
  '/login',
])

function isChromelessPath(pathname: string | null): boolean {
  if (!pathname) return false
  // trailingSlash: true in next.config.js means most paths arrive as
  // `/foo/` from the dev server. Strip a trailing slash before lookup so
  // `/` and `/'` both still match the chromeless set.
  const normalized = pathname !== '/' && pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname
  return CHROMELESS_PATHS.has(normalized)
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const chromeless = isChromelessPath(pathname)

  if (chromeless) {
    // No navbar, no left padding for the sidebar, no top padding for
    // the mobile bar, no floating AI bubble. The starfield backdrop
    // from the root layout still shows through behind the children.
    return (
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Mounted on the chromeless branch too: `/` and `/login` exempt
            themselves inside the component, but any future chromeless route
            still needs the idle timeout to apply. */}
        <SessionIdleRedirect />
        <main id="main-content" className="flex-1">
          {children}
        </main>
      </div>
    )
  }

  return (
    <>
      <div className="relative z-10 flex min-h-screen flex-col lg:pl-[4.5rem]">
        <SessionIdleRedirect />
        <Navbar />
        <main id="main-content" className="flex-1 pt-14 lg:pt-0">
          {children}
        </main>
      </div>
      <FloatingAiAssistant />
    </>
  )
}
