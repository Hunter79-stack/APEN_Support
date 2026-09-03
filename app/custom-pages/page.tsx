import type { Metadata } from 'next'
import { CustomPageRenderer } from './CustomPageRenderer'

export const metadata: Metadata = {
  title: 'Custom Pages | APEN CESC',
  description: 'Admin-published pages and resource collections.',
}

/**
 * /custom-pages/?slug=my-page
 *
 * One pre-built static route that renders any admin-published page at runtime
 * by reading the slug from the URL and fetching the page record from the
 * site-stats proxy. With the wizard publishing to this route, admins get a
 * proper unique URL per page without needing a rebuild.
 *
 * If `?slug` is missing, the page lists every published custom page so users
 * can discover them without an explicit link in the navbar.
 */
export default function CustomPagesEntry() {
  return (
    <div className="page-enter">
      <CustomPageRenderer />
    </div>
  )
}
