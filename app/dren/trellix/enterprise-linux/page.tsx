import { PageHeader } from '@/components/layout/PageHeader'
// Single source of truth lives at app/dren/trellix/DRENTrellixELCards.tsx —
// this page re-uses it so the EL guide stays identical whether visitors come
// in from /dren/trellix or from the deep-linked /dren/trellix/enterprise-linux URL.
import { DRENTrellixELCards } from '../DRENTrellixELCards'
import { DREN_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Trellix — DREN Enterprise Linux' }

export default function DRENTrellixELPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Enterprise Linux"
        subtitle="Install the Trellix Agent and Endpoint Security (ENS) on AlmaLinux 8/9, RockyLinux 8, and CentOS 7 systems connected to the DREN network."
        badge="DREN Trellix"
        backHref="/dren/trellix"
        backColor="cyan"
        logo={DREN_PAGE_LOGOS['/dren/trellix/enterprise-linux']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <DRENTrellixELCards />
      </div>
    </div>
  )
}
