/**
 * /home page data — items consumed by the three LinksGrid sections.
 *
 * Each section pairs two exports:
 *
 *   ┌─────────────────────────┬──────────────────────────┬───────────────────────┐
 *   │ Section on /home        │ Items export             │ Colour-palette export │
 *   ├─────────────────────────┼──────────────────────────┼───────────────────────┤
 *   │ Where should I start?   │ homepageSupportPathways  │ supportPathwayColors  │
 *   │ Operational Services    │ serviceLinks             │ serviceLinkColors     │
 *   │ Service Portals         │ servicePortals           │ servicePortalColors   │
 *   │ Quick Reference         │ supportLinks             │ supportLinkColors     │
 *   └─────────────────────────┴──────────────────────────┴───────────────────────┘
 *
 * Per-card image tuning (padding, position, custom classes) lives in
 *   lib/data/card-image-tuning.ts            (keyed by card title)
 *
 * Section-box styling (background, blur, blobs, heading typography) lives in
 *   app/globals.css                          (search ".apen-section")
 *
 * Per-section sizing (heightClass, cardMaxWidth, eyebrow, title) is set
 * inline at the call site in
 *   app/home/page.tsx
 */

import { LOGOS } from '@/lib/data/logos'
import { getUniqueCardGlowColors } from '@/lib/data/card-colors'
import { downloadsCategoryCards } from '@/lib/data/downloads'
import { restrictedServiceLinks, restrictedServicePortals } from '@/lib/data/restricted-apps'

/* ──────────────────────────────────────────────────────────────
 * Per-card glow-colour palettes
 * ──────────────────────────────────────────────────────────────
 * Each call returns an array of unique hue names sized for the
 * grid it serves. The seed argument keeps hues stable across
 * builds — bump the seed only if you want different colours.
 *
 *                                              count   seed
 *                                              ─────   ────                            */
export const supportPathwayColors = getUniqueCardGlowColors(2,    17)
export const serviceLinkColors    = getUniqueCardGlowColors(5,    24)
export const servicePortalColors  = getUniqueCardGlowColors(5,    35)
export const supportLinkColors    = getUniqueCardGlowColors(5,    29)


/* ──────────────────────────────────────────────────────────────
 * "Where should I start?" pathways
 * ──────────────────────────────────────────────────────────────
 * Top-of-page entry points to the support flow. Keep technician intake and
 * self-service guidance here exactly once so the home page does not grow
 * competing account-access or password-reset shortcuts.
 */
export const homepageSupportPathways = [
  {
    id:          'ticket',
    title:       'Open a support ticket',
    href:        '/support/ticket',
    logo:        LOGOS.supportTicket,
    description: 'Send outages, blockers, access issues, hardware problems, and service requests to APEN support.',
  },
  {
    id:          'knowledge-base',
    title:       'Solve a known problem',
    href:        '/support/knowledge-base',
    logo:        LOGOS.knowledgeBase,
    description: 'Use APEN guides for account access, network connectivity, software, and hardware tasks.',
  },
] as const


/* ──────────────────────────────────────────────────────────────
 * Operational Services
 * ──────────────────────────────────────────────────────────────
 * The lean home-page service row, matching the live site's five
 * operational tiles: the local Service Catalog plus the enclave's
 * ticketing, Speed Test, Tenable, and Voltron tiles. Each card is
 * either an internal route or an EXTERNAL_URLS proxy key — never a
 * raw internal hostname. The enclave's remaining on-network portals
 * get their own "Service Portals" section below.
 */
export const serviceLinks = [
  {
    id:          'service-catalog',
    title:       'APEN Service Catalog',
    href:        '/support',
    logo:        LOGOS.helpdesk,
    description: 'Start, track, and route APEN support needs from the local service catalog.',
  },
  // The four restricted-enclave operational tiles that mirror the live
  // home page (ticketing, Speed Test, Tenable, Voltron). Maintained in
  // lib/data/restricted-apps.ts.
  ...restrictedServiceLinks,
]


/* ──────────────────────────────────────────────────────────────
 * Service Portals
 * ──────────────────────────────────────────────────────────────
 * Enclave-only on-network portals (SharePoint, OWA, QSpace, JupyterHub,
 * GitLab). Their own /home section, sitting between Operational Services
 * and Quick Reference. Maintained in lib/data/restricted-apps.ts; every
 * card is an external portal that opens in a new tab. (Certificate
 * Services, Trellix ePO, and FacilitatePro were pulled out of this grid
 * and live under their parent nav sections instead; RStudio was removed
 * from the site entirely in 2026-07.)
 */
export const servicePortals = restrictedServicePortals


/* ──────────────────────────────────────────────────────────────
 * Quick Links Library
 * ──────────────────────────────────────────────────────────────
 * Reference catalog — guides, repositories, downloads, and
 * platform-specific resources. All entries are internal routes.
 * Order is editorial (most-used first, then by category).
 */
/* ──────────────────────────────────────────────────────────────
 * "Quick Reference" tiles  (the /home section formerly "Quick Links Library")
 * ──────────────────────────────────────────────────────────────
 * Mirrors the live site's lean home page, which surfaces exactly the core
 * product download families: ISO, VMware, Microsoft, PDQ, Evaluate-STIG.
 *
 * DERIVED from `downloadsCategoryCards` — the SAME list that drives the
 * /downloads landing page — so it stays in sync automatically: add, remove,
 * or re-title a product download family there and this section follows.
 * (The restricted app cards are intentionally kept OFF the home grid — they
 * live on the /applications hub only, keeping the home page as tidy as the
 * live site.) Admin edits still layer on top at render time via the
 * 'home/quick-links' scope in app/home/page.tsx, and LinksGrid assigns each
 * card a distinct glow from supportLinkColors by index.
 */
export const supportLinks = downloadsCategoryCards.map((card) => ({
  id:          card.id,
  title:       card.title,
  href:        card.href,
  logo:        card.logo,
  description: card.description,
}))
