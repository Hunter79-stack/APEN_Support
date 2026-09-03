/**
 * Curated site-wide activity feed — shown on the home page.
 *
 * Rules:
 *   • Sort newest → oldest (top of list = most recent)
 *   • Items ≤ 30 days old automatically receive a "NEW" badge at runtime
 *   • Build-time autosensed items are merged from lib/data/site-updates.ts
 *   • Use this file for high-quality manually curated overrides
 *   • date format: 'YYYY-MM-DD'
 */

export interface Announcement {
  text: string
  href: string | null
  linkLabel: string | null
  date: string          // 'YYYY-MM-DD'
  Time?: string         // 'HH:MM' (24-hour, optional)
  category?: string     // optional tag: 'VMware' | 'Docs' | 'Software' | 'Security' | etc.
}

export const MANUAL_ANNOUNCEMENTS: Announcement[] = [
  // ── 2026 ─────────────────────────────────────────────────────
  {
    text: 'Decommissioned application pages removed — Ansible, AtomEngine, Openfire Chat, VASSAL, AFSIM, and RStudio are no longer accessible on the APEN.',
    href: '/applications', linkLabel: 'View Applications', date: '2026-07-20', Time: '', category: 'Site Update',
  },
  {
    text: 'APEN Support Site redesigned. The new Applications hub brings the on-network application consoles into the modern interface.',
    href: '/applications', linkLabel: 'View Applications', date: '2026-06-30', Time: '', category: 'Site Update',
  },
  {
    text: 'VMware vCenter 8.0 Update 3i (Build 25197330) and ESXi 8.0 Update 3i patches added.',
    href: '/downloads/vmware', linkLabel: 'View Patches', date: '2026-05-15', Time: '', category: 'VMware',
  },
  {
    text: 'Evaluate-STIG updated to version 1.2604.2.',
    href: '/security/evaluate-stig', linkLabel: 'View', date: '2026-05-15', Time: '', category: 'Security',
  },
  // ── 2025 ─────────────────────────────────────────────────────
  {
    text: 'VMware vCenter 8.0 Update 3h (Build 25092719) and ESXi 8.0 Update 3h patches added.',
    href: '/downloads/vmware', linkLabel: 'View Patches', date: '', Time: '', category: 'VMware',
  },
  {
    text: 'MS Store AppX Packages added — Paint, Snipping Tool, Windows Terminal, HEVC, HEIF, AV1, MPEG-2, VP9 Extensions.',
    href: '/mssoftware', linkLabel: 'View', date: '', Time: '', category: 'Software',
  },
  {
    text: 'PDQ Deploy and Inventory now available for Windows software deployment and inventory.',
    href: '/PDQ', linkLabel: 'View', date: '', Time: '', category: 'Software',
  },
  {
    text: 'VMware vCenter 8.0 Update 3g (Build 24853646) patches added.',
    href: '/downloads/vmware', linkLabel: 'View Patches', date: '', Time: '', category: 'VMware',
  },
  {
    text: 'VMware vCenter 7.0 Update 3s and ESXi 7.0 Update 3s added.',
    href: '/downloads/vmware', linkLabel: 'View', date: '', Time: '', category: 'VMware',
  },
  {
    text: 'AD Join/Leave, CA Trust, OpenSSL, Cron Job, and Systemctl guides added for Enterprise Linux and Ubuntu.',
    href: '/docs', linkLabel: 'View Docs', date: '', Time: '', category: 'Docs',
  },
  {
    text: 'VMware vCenter 8.0 Update 3e (Build 24674346) patches added.',
    href: '/downloads/vmware', linkLabel: 'View Patches', date: '', Time: '', category: 'VMware',
  },
  {
    text: 'VMware vCenter 7.0 Update 3r and ESXi 7.0 Update 3r added.',
    href: '/downloads/vmware', linkLabel: 'View', date: '', Time: '', category: 'VMware',
  },
  {
    text: 'WSUS Policy updated to support Windows 10 and 11 Features on Demand installation.',
    href: null, linkLabel: null, date: '', Time: '', category: 'Software',
  },
  // ── 2024 ─────────────────────────────────────────────────────
  {
    text: 'Windows 11 64Bit 21H2 SHB-A and Windows Server 2022 64Bit 21H2 added to Software and ISOs.',
    href: '/downloads/iso', linkLabel: 'View', date: '', Time: '', category: 'Software',
  },
  {
    text: 'VMware vCenter 8.0 Update 3d (Build 24322831) patches added.',
    href: '/downloads/vmware', linkLabel: 'View Patches', date: '', Time: '', category: 'VMware',
  },
  {
    text: 'VMware vCenter 8.0 Update 3c (Build 24305161) patches added.',
    href: '/downloads/vmware', linkLabel: 'View Patches', date: '', Time: '', category: 'VMware',
  },
  {
    text: 'VMware vCenter 8.0 Update 3b (Build 24262322) patches added.',
    href: '/downloads/vmware', linkLabel: 'View Patches', date: '', Time: '',  category: 'VMware',
  },
]

/** Days old a post can be and still get a "NEW" badge */
const NEW_THRESHOLD_DAYS = 30

/** Returns true when an announcement is recent enough to show a "NEW" badge */
export function isNew(a: Announcement): boolean {
  const posted = new Date(a.date).getTime()
  const now    = Date.now()
  const days   = (now - posted) / (1000 * 60 * 60 * 24)
  return days <= NEW_THRESHOLD_DAYS
}

/** Number of items shown by default before "Show older" is clicked */
export const DEFAULT_VISIBLE = 5

/* ─── Site history ───────────────────────────────────────────
 *
 * The home page announces what a user can now GET — a new ISO, a patch bundle,
 * an updated guide PDF. Site housekeeping (pages retired, a redesign, a logo
 * swap) is a historical record, not a download, and belongs in Admin only.
 *
 * The predicate lives here rather than in the home-page component so the feed
 * that HIDES these and the console view that SHOWS them can never disagree
 * about which is which.
 */

/** Categories used for site-chrome changes by both the curated list and the
 *  live proxy (which tags its /uploads and /logos scan roots this way). */
export const ADMINISTRATIVE_CATEGORIES = new Set(['Site Update'])

/** Removals and raw directory dumps, whatever category they carry. */
const SITE_HISTORY_PATTERNS = [
  /uploads detected:/i,
  /pages created or updated:/i,
  /\bdecommission(ed|ing)?\b/i,
  /\bno longer (accessible|available)\b/i,
  /\b(pages?|applications?|consoles?) removed\b/i,
  /\bredesigned\b/i,
]

/** True when an item is a historical record rather than a product or document
 *  update — hidden from /home, listed in the Admin console. */
export function isSiteHistoryAnnouncement(a: Announcement): boolean {
  if (a.category && ADMINISTRATIVE_CATEGORIES.has(a.category)) return true
  return SITE_HISTORY_PATTERNS.some((rx) => rx.test(a.text))
}

/** The curated historical record, newest first. Admin-only. */
export const SITE_HISTORY_ANNOUNCEMENTS: Announcement[] = MANUAL_ANNOUNCEMENTS
  .filter(isSiteHistoryAnnouncement)
  .sort((a, b) => b.date.localeCompare(a.date))
