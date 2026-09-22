'use client'

import { usePathname } from 'next/navigation'
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  Menu, X, ChevronDown, ChevronRight,
  Home, BookOpen, Download, Shield, LayoutGrid, Video, Lock, Settings, Search, LogOut
} from 'lucide-react'
import { StaticLink } from '@/components/common/StaticLink'
import { ThemedLogo } from '@/components/common/ThemedLogo'
import { type AdminNotificationCounts } from '@/lib/data/admin'
import { LOGOS } from '@/lib/data/logos'
import { adminNavItems, navItemLogos, publicNavItems, type NavItem } from '@/lib/data/navigation'
import { API_ENDPOINTS } from '@/lib/data/runtime'
import { adminContentClient, type CustomPage } from '@/lib/data/admin-content'
import { useResolvedPageImages } from '@/lib/hooks/useRouteImage'
import { useAdminNotificationCounts } from '@/lib/hooks/useAdminNotificationCounts'

/* Lucide icon per top-level section */
const SECTION_ICONS: Record<string, React.ElementType> = {
  Home:          Home,
  Search:        Search,
  Documentation: BookOpen,
  Downloads:     Download,
  Security:      Shield,
  'Applications Tools': LayoutGrid,
  Videos:        Video,
  DREN:          Lock,
  Admin:         Settings,
}

// Map custom page categories to their parent section labels. Custom tool
// pages (published at /tools/<slug>) surface under Applications Tools, where
// the Tools catalog now lives.
const categoryToSection: Record<string, string> = {
  'vmware': 'Downloads',
  'docs': 'Documentation',
  'downloads': 'Downloads',
  'tools': 'Applications Tools',
  'isos': 'Downloads',
  'security': 'Security',
  'general': 'Home',
  'support': 'Home',
}

// Merge custom pages into the navigation structure
function buildNavItemsWithCustomPages(baseItems: NavItem[], customPages: CustomPage[]): NavItem[] {
  const result = [...baseItems]

  // Group custom pages by category and then by section
  const pagesBySection: Record<string, NavItem[]> = {}

  customPages.forEach((page) => {
    const category = page.category || 'general'
    const sectionLabel = categoryToSection[category] || 'Home'
    const sectionIndex = result.findIndex((item) => item.label === sectionLabel)

    if (sectionIndex === -1) return // Section not found

    if (!pagesBySection[sectionLabel]) {
      pagesBySection[sectionLabel] = []
    }

    pagesBySection[sectionLabel].push({
      label: page.title,
      href: `/${category}/${page.slug}`,
      children: undefined,
    })
  })

  // Add custom pages as children to their sections
  Object.entries(pagesBySection).forEach(([sectionLabel, customItems]) => {
    const sectionIndex = result.findIndex((item) => item.label === sectionLabel)
    if (sectionIndex !== -1) {
      const section = result[sectionIndex]
      result[sectionIndex] = {
        ...section,
        children: [...(section.children || []), ...customItems],
      }
    }
  })

  return result
}


function getAdminNotificationLabel(counts: AdminNotificationCounts) {
  const total = counts.systemEvents + counts.feedback
  return `Admin, ${total} notifications: ${counts.systemEvents} system events, ${counts.feedback} feedback`
}

/** Section icon with the Admin notification badge. The desktop sidebar uses
 *  the 22 px form, the mobile drawer the 16 px one. */
function NavIcon({ label, size, total }: { label: string; size: 22 | 16; total: number }) {
  const Icon = SECTION_ICONS[label] ?? Home
  const box = size === 22 ? 'h-6 w-6' : 'h-5 w-5 opacity-80'
  return (
    <span className={`relative flex ${box} flex-shrink-0 items-center justify-center`}>
      <Icon size={size} aria-hidden="true" />
      {label === 'Admin' && <AdminNotificationCountBadge total={total} />}
    </span>
  )
}

/** One child row, in the desktop flyout (a menuitem) or the mobile drawer. */
function NavChildLink({ child, icon, active, variant, onNavigate }: {
  child: { href: string; label: string }
  icon: string | undefined
  active: boolean
  variant: 'flyout' | 'drawer'
  onNavigate: () => void
}) {
  const isExternal = /^https?:\/\//.test(child.href)
  const flyout = variant === 'flyout'
  return (
    <StaticLink
      href={child.href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      role={flyout ? 'menuitem' : undefined}
      tabIndex={flyout ? -1 : undefined}
      className={flyout
        ? `sidebar-flyout-item ${active ? 'sidebar-child-active' : ''}`
        : 'flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 transition'}
      // Navigating from a child closes the menu so the new page does not
      // render with a leftover floating flyout / open drawer.
      onClick={onNavigate}
    >
      {icon ? (
        <ThemedLogo src={icon} alt={child.label} size="xs" variant="square" glass={false} className={flyout ? 'flex-shrink-0 opacity-70 hover:opacity-100' : 'opacity-70'} />
      ) : flyout ? (
        <span className="w-4" />
      ) : null}
      <span className="truncate">{child.label}</span>
    </StaticLink>
  )
}

function AdminNotificationCountBadge({ total }: { total: number }) {
  if (total <= 0) return null
  // The cog-wheel badge is an at-a-glance "you have stuff to look at" cue, not
  // a precise inbox counter. The exact count is already shown inside the
  // Admin page itself, and surfacing "1" / "2" / "12" here just adds noise
  // (and looked weird at the small size). An exclamation mark conveys the
  // same urgency at any count and is what admins recognize as "go check it."
  return (
    <span
      className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border border-red-300/70 bg-red-600 px-1 text-[11px] font-black leading-none text-white shadow-[0_0_12px_rgba(220,38,38,0.75)]"
      aria-hidden="true"
    >
      !
    </span>
  )
}

function getDesktopTriggerId(label: string) {
  return `desktop-nav-trigger-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

function getDesktopMenuId(label: string) {
  return `desktop-nav-menu-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

export function Navbar() {
  const resolvedPageImages = useResolvedPageImages() as Readonly<Record<string, string>>
  const pathname = usePathname()
  const [mobileOpen,   setMobileOpen]   = useState(false)
  const [expanded,     setExpanded]     = useState(false)
  const [openSection,  setOpenSection]  = useState<string | null>(null)
  /** Expanded section in the mobile drawer — separate from the desktop
   *  flyout's openSection so one never drives the other. */
  const [mobileSection, setMobileSection] = useState<string | null>(null)
  const [flyoutTop,    setFlyoutTop]    = useState(0)
  const [isAdmin,      setIsAdmin]      = useState(false)
  /** Username of the current session, or null when nobody is signed in.
   *  Drives the Sign out control — an anonymous visitor (e.g. the dev server
   *  with no nginx auth gate in front) has nothing to sign out of. */
  const [signedInUser, setSignedInUser] = useState<string | null>(null)
  const [customPages,  setCustomPages]  = useState<CustomPage[]>([])

  const navRef = useRef<HTMLElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Combined nav items based on verified access and custom pages
  const navItems: NavItem[] = useMemo(
    () => buildNavItemsWithCustomPages(isAdmin ? [...publicNavItems, ...adminNavItems] : publicNavItems, customPages),
    [isAdmin, customPages],
  )
  const isAdminRoute = pathname?.startsWith('/admin') ?? false
  // Reconcile the cog badge for ANY admin on ANY page — not just while sitting
  // on /admin. Gating on isAdminRoute (the old behavior) froze the badge at the
  // static default everywhere else, so it stayed red over already-handled
  // items. Gating on isAdmin keeps it accurate as you browse, and non-admins
  // never poll (isAdmin stays false for them).
  // The route fallback keeps the badge live while SessionGate is establishing
  // the Admin identity; a verified admin continues receiving updates elsewhere.
  const notificationCounts = useAdminNotificationCounts(isAdmin || isAdminRoute)
  const notificationTotal = notificationCounts.systemEvents + notificationCounts.feedback
  const adminNotificationLabel = getAdminNotificationLabel(notificationCounts)

  /* Probe for Admin Access on Mount.
   *
   * Uses /api/auth/whoami. Every logged-in visitor (general OR admin) gets a
   * valid session now, so this must key off the `admin` flag specifically
   * (kind==='admin' server-side), not just "is there a session at all" —
   * otherwise every ordinary logged-in user would see the admin gear icon.
   */
  useEffect(() => {
    let cancelled = false
    adminContentClient.whoami().then((who) => {
      if (cancelled) return
      setIsAdmin(Boolean(who?.admin))
      setSignedInUser(who ? (who.username || 'this session') : null)
    })
    return () => { cancelled = true }
  }, [])

  /* Sign out.
   *
   * /api/auth/logout drops the session from the server-side stores (both the
   * admin and the general session lists) and expires the HttpOnly cookie, so
   * the session id cannot be replayed afterwards. We also clear the tab-local
   * admin token and CSRF token, then do a FULL page navigation — not
   * client-side routing — to /login/. That full request is what makes nginx's
   * site-wide auth_request gate re-run with no valid cookie, so the visitor
   * must authenticate again before any page renders. replace() rather than
   * assign() so Back doesn't land back on the signed-in history entry.
   */
  const handleSignOut = useCallback(async () => {
    await adminContentClient.logout()
    adminContentClient.clearToken()
    if (typeof window !== 'undefined') window.location.replace('/login/')
  }, [])

  /* Fetch Custom Pages for Navigation */
  useEffect(() => {
    let cancelled = false

    async function fetchCustomPages() {
      try {
        const res = await fetch(API_ENDPOINTS.contentOverrides, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()

        if (cancelled) return

        // Extract custom pages from the response
        if (data && Array.isArray(data.customPages)) {
          const pages = (data.customPages as CustomPage[]).filter((p) => p.published !== false)
          setCustomPages(pages)
        }
      } catch {
        // API unavailable, use empty list
      }
    }

    fetchCustomPages()
    return () => { cancelled = true }
  }, [])

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : (pathname?.startsWith(href) ?? false) && href !== '#'

  /**
   * How long the sidebar / flyout stays open after the cursor moves
   * outside their bounding boxes. The original 300 ms felt twitchy — admins
   * complained that the menu collapsed the moment they moused down to a
   * card to read it. 1500 ms gives breathing room without keeping a
   * forgotten menu pinned forever, and the new outside-click + Escape
   * handlers below give an immediate dismiss path when the user wants one.
   */
  const HOVER_CLOSE_DELAY_MS = 1500

  const cancelClose = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
  }, [])

  const closeAll = useCallback(() => {
    setExpanded(false)
    setOpenSection(null)
  }, [])

  const scheduleClose = useCallback(() => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpenSection(null), HOVER_CLOSE_DELAY_MS)
  }, [cancelClose])

  const scheduleSidebarClose = useCallback(() => {
    cancelClose()
    closeTimer.current = setTimeout(closeAll, HOVER_CLOSE_DELAY_MS)
  }, [cancelClose, closeAll])

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current) }, [])

  /* Outside-click + Escape dismiss.
   * When the menu is open, ANY click that lands outside the sidebar AND
   * outside the active flyout closes both immediately. This is the
   * "intent-to-leave" signal — separate from the hover timeout, which
   * is forgiving enough that fast mouse movements don't trigger close.
   * Escape mirrors the same behavior for keyboard users. */
  useEffect(() => {
    if (!expanded && !openSection) return
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (navRef.current?.contains(target)) return
      // The flyout lives outside navRef (it's a sibling), so check the DOM.
      const flyout = document.querySelector('[data-nav-flyout="true"]')
      if (flyout?.contains(target)) return
      cancelClose()
      closeAll()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { cancelClose(); closeAll() }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [expanded, openSection, cancelClose, closeAll])

  const handleSectionEnter = useCallback((label: string, e: React.MouseEvent) => {
    cancelClose()
    const btn = (e.currentTarget as HTMLElement)
    const rect = btn.getBoundingClientRect()
    setFlyoutTop(rect.top)
    setOpenSection(label)
  }, [cancelClose])

  const focusFirstFlyoutItem = useCallback((label: string) => {
    globalThis.requestAnimationFrame(() => {
      document
        .getElementById(getDesktopMenuId(label))
        ?.querySelector<HTMLElement>('[role="menuitem"]')
        ?.focus()
    })
  }, [])

  const handleDesktopTriggerKeyDown = useCallback((
    label: string,
    event: React.KeyboardEvent<HTMLAnchorElement>,
  ) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === ' ') {
      event.preventDefault()
      cancelClose()
      setExpanded(true)
      setFlyoutTop(event.currentTarget.getBoundingClientRect().top)
      setOpenSection(label)
      focusFirstFlyoutItem(label)
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      cancelClose()
      closeAll()
    }
  }, [cancelClose, closeAll, focusFirstFlyoutItem])

  const handleFlyoutKeyDown = useCallback((
    label: string,
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    const menuItems = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    )
    const activeIndex = menuItems.indexOf(document.activeElement as HTMLElement)
    const focusItem = (index: number) => menuItems[index]?.focus()

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusItem(activeIndex < 0 || activeIndex === menuItems.length - 1 ? 0 : activeIndex + 1)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusItem(activeIndex <= 0 ? menuItems.length - 1 : activeIndex - 1)
      return
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      focusItem(event.key === 'Home' ? 0 : menuItems.length - 1)
      return
    }

    if (event.key === 'Escape' || event.key === 'ArrowLeft') {
      event.preventDefault()
      cancelClose()
      closeAll()
      globalThis.requestAnimationFrame(() => {
        document.getElementById(getDesktopTriggerId(label))?.focus()
      })
      return
    }

    if (event.key === 'Tab') {
      cancelClose()
      closeAll()
    }
  }, [cancelClose, closeAll])

  const sidebarWidth = expanded ? 240 : 72 
  const openDesktopItem = openSection
    ? navItems.find((item) => item.label === openSection)
    : undefined

  return (
    <>
      {/* ══════════════ DESKTOP SIDEBAR ══════════════ */}
      <nav
        ref={navRef}
        className={`glass-sidebar hidden lg:flex fixed top-0 left-0 h-full z-50
                    flex-col transition-[width] duration-300 ease-in-out
                    ${expanded ? 'w-60' : 'w-[4.5rem]'}`}
        onMouseEnter={() => { cancelClose(); setExpanded(true) }}
        onMouseLeave={scheduleSidebarClose}
      >
        {/*
          Sidebar logo → /home (the hub), not / (the intro). The intro is
          a once-per-arrival landing; clicking the logo while already
          browsing the site should jump back to the support hub, not the
          intro. The hero on the intro itself still uses the full APEN
          logo, so brand presence isn't lost there.
        */}
        <StaticLink href="/home" className="flex items-center gap-3 px-3 py-4 group flex-shrink-0">
          <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0
                          ring-1 ring-white/10 group-hover:ring-cyan-400/40
                          transition-all duration-300 shadow-cyan-glow-sm">
            <img
              src={LOGOS.apenRound}
              alt="APEN Logo"
              width={44}
              height={44}
              className="w-full h-full object-cover"
              /* lazy (not eager) suppresses React 19's auto image-preload; the
                 logo is in the viewport so it still fetches immediately, but it
                 no longer competes with the render-blocking CSS/font. */
              loading="lazy"
            />
          </div>
          {expanded && (
            <div className="leading-tight whitespace-nowrap overflow-hidden">
              <span className="font-semibold text-white text-sm">APEN</span>
              <span className="text-slate-400 text-sm"> Support</span>
            </div>
          )}
        </StaticLink>

        <div className="mx-3 h-px bg-white/8 mb-2" />

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 space-y-0.5 sidebar-scroll">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const hasChildren = !!item.children && item.children.length > 0
            const isAdminItem = item.label === 'Admin'

            return (
              <div
                key={item.label}
                onMouseEnter={(e) => hasChildren ? handleSectionEnter(item.label, e) : undefined}
                onMouseLeave={() => hasChildren && scheduleClose()}
              >
                {hasChildren ? (
                  // The label itself navigates to the section's own page, so a
                  // user who doesn't want the subtree can just click through.
                  // The subtree still opens on hover via the flyout (the parent
                  // div's onMouseEnter above). The chevron hints "more inside."
                  <StaticLink
                    id={getDesktopTriggerId(item.label)}
                    href={item.href}
                    aria-label={isAdminItem ? adminNotificationLabel : item.label}
                    aria-haspopup="menu"
                    aria-expanded={openSection === item.label}
                    aria-controls={getDesktopMenuId(item.label)}
                    className={`sidebar-item group w-full ${active ? 'sidebar-item-active' : ''}`}
                    onClick={() => { cancelClose(); closeAll() }}
                    onKeyDown={(event) => handleDesktopTriggerKeyDown(item.label, event)}
                  >
                    <NavIcon label={item.label} size={22} total={notificationTotal} />
                    {expanded && (
                      <>
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        <ChevronRight size={12} className="flex-shrink-0 opacity-40" />
                      </>
                    )}
                  </StaticLink>
                ) : (
                  <StaticLink
                    href={item.href}
                    aria-label={isAdminItem ? adminNotificationLabel : item.label}
                    className={`sidebar-item group ${active ? 'sidebar-item-active' : ''}`}
                  >
                    <NavIcon label={item.label} size={22} total={notificationTotal} />
                    {expanded && <span className="truncate">{item.label}</span>}
                  </StaticLink>
                )}
              </div>
            )
          })}
        </div>

        <div className="mx-3 h-px bg-white/8 mt-2" />
        <div className={`px-3.5 py-3 flex-shrink-0 flex items-center gap-2 ${expanded ? '' : 'justify-center'}`}>
          {signedInUser && (
            <button
              type="button"
              onClick={handleSignOut}
              title={`Sign out ${signedInUser}`}
              aria-label={`Sign out ${signedInUser}`}
              className="inline-flex h-7 flex-shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition hover:border-cyan-400/30 hover:text-cyan-300"
            >
              <LogOut size={12} aria-hidden="true" />
              {expanded && <span>Sign out</span>}
            </button>
          )}
          {expanded && (
            <p className="text-[10px] text-slate-400 font-mono tracking-wider truncate">
              CESC &bull; APEN
            </p>
          )}
        </div>
      </nav>

      {/* ══════════════ DESKTOP FLYOUT ══════════════
          The flyout butts up against the right edge of the sidebar (no gap)
          so the mouse can travel from a section button into the flyout
          without ever leaving a "hover region". Visual breathing-room is
          provided by the flyout's own internal padding instead of empty
          space outside it. The data-nav-flyout attribute lets the
          click-outside handler in the parent component recognize this
          element even though it's a DOM sibling of the sidebar. */}
      {openDesktopItem?.children && (
          <div
            id={getDesktopMenuId(openDesktopItem.label)}
            data-nav-flyout="true"
            // The flyout used to render the section name (e.g. "Documentation")
            // again at the top — but the user already clicked/hovered that
            // label in the sidebar to open the flyout, so it's redundant
            // visual chrome. We keep the section name on the aria-label of
            // the flyout itself for screen readers, and let the sub-items
            // speak for themselves visually.
            role="menu"
            aria-labelledby={getDesktopTriggerId(openDesktopItem.label)}
            className="hidden lg:block fixed z-[60] sidebar-flyout glass-dropdown"
            style={{ top: flyoutTop, left: sidebarWidth }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            onKeyDown={(event) => handleFlyoutKeyDown(openDesktopItem.label, event)}
          >
            {openDesktopItem.children.map((child) => (
              <NavChildLink
                key={child.href}
                child={child}
                icon={resolvedPageImages[child.href] ?? navItemLogos[child.href]}
                active={isActive(child.href)}
                variant="flyout"
                onNavigate={() => { cancelClose(); closeAll() }}
              />
            ))}
          </div>
      )}

      {/* ══════════════ MOBILE TOP BAR ══════════════ */}
      <nav className="glass-nav lg:hidden fixed top-0 left-0 right-0 z-50 h-14">
        <div className="px-4 h-full flex items-center justify-between">
          {/* Mobile top-bar logo → /home for the same reason as the desktop sidebar logo. */}
          <StaticLink href="/home" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden ring-1 ring-white/10">
              <img src={LOGOS.apenRound} alt="APEN" width={32} height={32} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <span className="font-semibold text-white text-sm">APEN <span className="text-slate-400">Support</span></span>
          </StaticLink>
          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="glass-dropdown border-t border-white/5 px-4 py-3 space-y-0.5 max-h-[80vh] overflow-y-auto">
            {navItems.map((item) => {
              const hasChildren = !!item.children && item.children.length > 0
              const sectionOpen = mobileSection === item.label
              const isAdminItem = item.label === 'Admin'

              return (
                <div key={item.label}>
                  {hasChildren ? (
                    // Split row: the label navigates to the section page (for
                    // users who don't want the subtree), and a separate chevron
                    // button expands/collapses the sub-items in place. No hover
                    // on touch devices, so the toggle has to be its own control.
                    <div className={`flex items-center rounded-lg text-sm text-slate-300 transition ${sectionOpen ? 'bg-white/5' : 'hover:bg-white/5'}`}>
                      <StaticLink
                        href={item.href}
                        aria-label={isAdminItem ? adminNotificationLabel : undefined}
                        className="flex flex-1 items-center gap-2.5 px-3 py-2.5 rounded-lg hover:text-white"
                        onClick={() => setMobileOpen(false)}
                      >
                        <NavIcon label={item.label} size={16} total={notificationTotal} />
                        <span className="flex-1 text-left">{item.label}</span>
                      </StaticLink>
                      <button
                        onClick={() => setMobileSection(sectionOpen ? null : item.label)}
                        aria-label={`${sectionOpen ? 'Collapse' : 'Expand'} ${item.label} submenu`}
                        aria-expanded={sectionOpen}
                        className="flex-shrink-0 self-stretch px-3 text-slate-400 hover:text-white"
                      >
                        <ChevronDown size={14} className={`opacity-60 transition-transform ${sectionOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  ) : (
                    <StaticLink
                      href={item.href}
                      aria-label={isAdminItem ? adminNotificationLabel : undefined}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/5 transition"
                      onClick={() => setMobileOpen(false)}
                    >
                      <NavIcon label={item.label} size={16} total={notificationTotal} />
                      {item.label}
                    </StaticLink>
                  )}

                  {hasChildren && sectionOpen && (
                    <div className="ml-4 pl-3 border-l border-white/8 space-y-0.5 mb-1">
                      {item.children?.map((child) => (
                        <NavChildLink
                          key={child.href}
                          child={child}
                          icon={resolvedPageImages[child.href] ?? navItemLogos[child.href]}
                          active={isActive(child.href)}
                          variant="drawer"
                          onNavigate={() => setMobileOpen(false)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* The mobile drawer has no "CESC • APEN" footer to sit beside,
                so the same sign-out control lands at the end of the list —
                otherwise phone/tablet visitors would have no way to sign
                out at all. */}
            {signedInUser && (
              <button
                type="button"
                onClick={handleSignOut}
                aria-label={`Sign out ${signedInUser}`}
                className="mt-1 flex w-full items-center gap-2.5 rounded-lg border-t border-white/5 px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center opacity-80">
                  <LogOut size={16} aria-hidden="true" />
                </span>
                Sign out
              </button>
            )}
          </div>
        )}
      </nav>
    </>
  )
}
