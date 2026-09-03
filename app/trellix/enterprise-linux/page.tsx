import { PageHeader } from '@/components/layout/PageHeader'
import { TrellixELCards } from './TrellixELCards'
import { TRELLIX_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Trellix — Enterprise Linux' }

export default function TrellixELPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Enterprise Linux"
        subtitle="Install the Trellix Agent and Endpoint Security (ENS) on AlmaLinux 8/9, Rocky Linux 8, and CentOS 7."
        badge="Trellix"
        backHref="/trellix"
        backColor="orange"
        logo={TRELLIX_PAGE_LOGOS['/trellix/enterprise-linux']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <TrellixELCards />
      </div>
    </div>
  )
}
