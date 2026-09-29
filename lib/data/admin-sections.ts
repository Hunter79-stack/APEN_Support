/**
 * Single source of truth for the /admin/ console sections.
 *
 * Shared by the AdminDashboard side nav (app/admin/AdminDashboard.tsx) and
 * the Navbar admin sub-menu (lib/data/navigation.ts) so the two never drift.
 * Each `id` doubles as the URL hash used to deep-link a section: `/admin#<id>`.
 * AdminDashboard reads the hash on load + on hashchange to open that section.
 *
 * `group` is the heading the side nav files the section under; sections are
 * listed in group order so the Navbar sub-menu reads the same way.
 */
export const ADMIN_SECTIONS = [
  { id: 'monitor', label: 'Monitoring', group: 'Observe' },
  { id: 'nginx', label: 'NGINX status', group: 'Observe' },
  { id: 'security', label: 'Sign-in security', group: 'Observe' },
  { id: 'transcripts', label: 'Chat transcripts', group: 'Observe' },
  { id: 'content', label: 'Edit pages & cards', group: 'Publish' },
  { id: 'wizard', label: 'New page wizard', group: 'Publish' },
  { id: 'pages', label: 'Custom pages', group: 'Publish' },
  { id: 'chips', label: 'Chat chips', group: 'Assistant' },
  { id: 'assistant-prompt', label: 'Assistant knowledge', group: 'Assistant' },
] as const

export type AdminTab = (typeof ADMIN_SECTIONS)[number]['id']
export type AdminSectionGroup = (typeof ADMIN_SECTIONS)[number]['group']

export const ADMIN_TAB_IDS: readonly AdminTab[] = ADMIN_SECTIONS.map((s) => s.id)

/** Group headings in the order they first appear. */
export const ADMIN_SECTION_GROUPS: readonly AdminSectionGroup[] = Array.from(new Set(ADMIN_SECTIONS.map((s) => s.group)))

/** Type guard: is the string one of the admin section ids (e.g. from a URL hash)? */
export function isAdminTab(value: string): value is AdminTab {
  return (ADMIN_TAB_IDS as readonly string[]).includes(value)
}
