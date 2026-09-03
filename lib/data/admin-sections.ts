/**
 * Single source of truth for the /admin/ console sections.
 *
 * Shared by the AdminDashboard tab switcher (app/admin/AdminDashboard.tsx) and
 * the Navbar admin sub-menu (lib/data/navigation.ts) so the two never drift.
 * Each `id` doubles as the URL hash used to deep-link a section: `/admin#<id>`.
 * AdminDashboard reads the hash on load + on hashchange to open that section.
 */
export const ADMIN_SECTIONS = [
  { id: 'monitor', label: 'Monitoring' },
  { id: 'nginx', label: 'NGINX status' },
  { id: 'content', label: 'Edit pages & cards' },
  { id: 'chips', label: 'Chat chips' },
  { id: 'assistant-prompt', label: 'Assistant knowledge' },
  { id: 'wizard', label: 'New page wizard' },
  { id: 'pages', label: 'Custom pages' },
  { id: 'transcripts', label: 'Chat transcripts' },
  { id: 'security', label: 'Sign-in security' },
] as const

export type AdminTab = (typeof ADMIN_SECTIONS)[number]['id']

export const ADMIN_TAB_IDS: readonly AdminTab[] = ADMIN_SECTIONS.map((s) => s.id)

/** Type guard: is the string one of the admin section ids (e.g. from a URL hash)? */
export function isAdminTab(value: string): value is AdminTab {
  return (ADMIN_TAB_IDS as readonly string[]).includes(value)
}
