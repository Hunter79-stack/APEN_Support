import { PageHeader } from '@/components/layout/PageHeader'
// Single source of truth lives at app/dren/trellix/DRENTrellixUbuntuCards.tsx —
// this page re-uses it so the Ubuntu guide stays identical whether visitors
// come in from /dren/trellix or from the deep-linked /dren/trellix/ubuntu URL.
import { DRENTrellixUbuntuCards } from '../DRENTrellixUbuntuCards'
import { DREN_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Trellix — DREN Ubuntu' }

export default function DRENTrellixUbuntuPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Ubuntu"
        subtitle="Install the Trellix Agent and Endpoint Security (ENS) on Ubuntu 22 and Ubuntu 24 systems connected to the DREN network."
        badge="DREN Trellix"
        backHref="/dren/trellix"
        backColor="cyan"
        logo={DREN_PAGE_LOGOS['/dren/trellix/ubuntu']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <DRENTrellixUbuntuCards />
      </div>
    </div>
  )
}
