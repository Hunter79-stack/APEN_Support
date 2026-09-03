import { RedirectStub } from '@/components/common/RedirectStub'

/**
 * Legacy page, retired. It rendered two inlined arrays: four Office downloads
 * and eleven Store AppX names.
 *
 * The Office four now live in lib/data/microsoft.ts (microsoftOfficeCards), so
 * they are finally covered by scripts/audit-download-links.mjs and editable in
 * /admin#content. The eleven AppX names were a stale subset of the 46 packages
 * the live WinGet catalog serves on /downloads/microsoft-products/store.
 *
 * The route stays as a redirect rather than being deleted: the announcement in
 * lib/data/announcements.ts still points here, as do old bookmarks and links
 * from the legacy site.
 */
export const metadata = { title: 'Moved' }

export default function Moved() {
  return <RedirectStub to="/downloads/microsoft-products" />
}
