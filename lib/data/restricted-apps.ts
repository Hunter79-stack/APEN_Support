/**
 * Restricted-enclave apps & service portals — APEN Support Site (Restricted)
 *
 * This file is the single source of truth for the content that is UNIQUE to
 * the restricted deployment (the legacy static site's apps and the service
 * tile grid on its home page). The shared product families (VMware, ISOs,
 * Repos, Microsoft, PDQ, Evaluate-STIG, Trellix, etc.) continue to come from
 * their existing data files — this only adds what the live site did not have.
 *
 *   • restrictedServiceLinks   → /home "Operational Services" grid (lean set that
 *                                mirrors the live site's 5 operational tiles)
 *   • restrictedServicePortals → /home "Service Portals" grid (its own section
 *                                between Operational Services and Quick Reference)
 *   • restrictedAppCards       → /applications hub app grid
 *
 * Item shapes intentionally match lib/data/homepage.ts (LinksGrid items) and
 * lib/types/cards.ts (NavCard) so they drop into the existing components.
 */

import { LOGOS, TOOLS_PAGE_LOGOS } from '@/lib/data/logos'
import { RESTRICTED_SERVICE_URLS } from '@/lib/data/constants'
import type { NavCard } from '@/lib/types/cards'

/* ──────────────────────────────────────────────────────────────
 * Operational Services — the lean home-page service tiles
 * ──────────────────────────────────────────────────────────────
 * Mirrors the live site's /home "Operational Services" row. The live
 * home page surfaces only five operational tiles (Service Catalog,
 * ticketing, Speed Test, Tenable, Voltron); the APEN Service Catalog
 * card is prepended in lib/data/homepage.ts, and these four are the
 * restricted-enclave equivalents of the remaining live tiles — kept
 * in the live order (ticketing → Speed Test → Tenable → Voltron).
 *
 * The enclave's other on-network portals live in
 * `restrictedServicePortals` below (their own "Service Portals" home
 * section), so this row stays as lean as the live site's without
 * losing access to anything.  All external destinations open in a new tab.
 * ────────────────────────────────────────────────────────────── */
export const restrictedServiceLinks = [
  {
    id: 'osticket', title: 'APEN osTicket',
    href: RESTRICTED_SERVICE_URLS.osticket, logo: LOGOS.osticket, external: true,
    description: 'Open and track APEN help-desk tickets in osTicket.',
  },
  {
    id: 'speed-test', title: 'APEN Speed Test',
    href: '/applications/speedtest', logo: TOOLS_PAGE_LOGOS['/applications/speedtest'],
    description: 'Measure network throughput, latency, and run endpoint diagnostics.',
  },
  {
    id: 'tenable', title: 'Tenable Security Center',
    href: RESTRICTED_SERVICE_URLS.tenable, logo: LOGOS.tenableRes, external: true,
    description: 'Vulnerability scan dashboards and reporting (ACAS).',
  },
  {
    id: 'voltron', title: 'APEN Voltron',
    href: RESTRICTED_SERVICE_URLS.voltron, logo: LOGOS.voltron, external: true,
    description: 'Launch APEN Voltron, the on-network AI assistant.',
  },
]

/* ──────────────────────────────────────────────────────────────
 * Service Portals — the enclave-only on-network portals
 * ──────────────────────────────────────────────────────────────
 * These get their own "Service Portals" section on /home, sitting
 * between Operational Services and Quick Reference (the live public
 * home page doesn't carry them): SharePoint, OWA, QSpace, JupyterHub,
 * and GitLab. Ported from the legacy restricted index.html "Service
 * Links". All destinations open in a new tab.
 * ────────────────────────────────────────────────────────────── */
export const restrictedServicePortals = [
  {
    id: 'sharepoint', title: 'SharePoint',
    href: RESTRICTED_SERVICE_URLS.sharepoint, logo: LOGOS.sharepoint, external: true,
    description: 'BLCSE portal and document collaboration on SharePoint.',
  },
  {
    id: 'owa', title: 'Outlook Web Access',
    href: RESTRICTED_SERVICE_URLS.owa, logo: LOGOS.owa, external: true,
    description: 'Web-based email through Outlook Web Access.',
  },
  {
    id: 'qspace', title: 'APEN QSpace',
    href: RESTRICTED_SERVICE_URLS.qspace, logo: LOGOS.qspace, external: true,
    description: 'Quantum modeling & simulation workspace.',
  },
  {
    id: 'jupyterhub', title: 'JupyterHub',
    href: RESTRICTED_SERVICE_URLS.jupyterhub, logo: LOGOS.jupyterhub, external: true,
    description: 'Shared Jupyter notebook environment for the APEN.',
  },
  {
    id: 'gitlab', title: 'APEN GitLab',
    href: RESTRICTED_SERVICE_URLS.gitlab, logo: LOGOS.gitlab, external: true,
    description: 'Source control, CI/CD, and issue tracking on APEN GitLab.',
  },
  // AD Certificate Services, Trellix ePO, and FacilitatePro used to live
  // here too. They were pulled out of this grid and now live under their
  // parent nav sections instead: Certificate Services + Trellix under
  // Security, FacilitatePro under Videos. RStudio was removed from the site
  // entirely in 2026-07 (service no longer accessible).
]

/* ──────────────────────────────────────────────────────────────
 * APEN Applications — restricted-only app pages (new-style ports)
 * These render as NavCards on the /applications hub.
 * glowColor is a placeholder; the grid assigns a rainbow by index.
 * Ansible, AtomEngine, Openfire Chat, VASSAL, and AFSIM were removed
 * 2026-07 — their backing services are no longer accessible.
 * ────────────────────────────────────────────────────────────── */
export const restrictedAppCards: NavCard[] = [
  {
    id: 'network-analysis',
    title: 'Network Analysis',
    description: 'Combined APEN Speed Test and NetDiag console — WAN throughput plus agent-based endpoint diagnostics and reports.',
    logo: TOOLS_PAGE_LOGOS['/applications/speedtest'], glowColor: 'cyan', tags: ['Speed Test', 'NetDiag', 'Reports'],
    // Opens the Speed Test page — its APEN Network Analysis tab bar hosts
    // both tools; /network-analysis (the proxied shell) is no longer linked.
    href: '/applications/speedtest', hrefLabel: 'Open Speed Test →', itemCount: 'Speed + NetDiag',
  },
  {
    id: 'color-picker',
    title: 'HEX Color Picker',
    description: 'Pick any color and instantly copy HEX, RGB, and HSL values. Includes a channel breakdown and quick presets.',
    logo: TOOLS_PAGE_LOGOS['/applications/color-picker'], glowColor: 'amber', tags: ['Browser Tool'],
    href: '/applications/color-picker', hrefLabel: 'Open Color Picker →', itemCount: 'Browser tool',
  },
]
