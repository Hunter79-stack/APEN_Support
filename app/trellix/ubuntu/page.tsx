import { PageHeader } from '@/components/layout/PageHeader'
import { TrellixUbuntuCards } from './TrellixUbuntuCards'
import { TRELLIX_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Trellix — Ubuntu' }

export default function TrellixUbuntuPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Ubuntu"
        subtitle="Install the Trellix Agent and Endpoint Security (ENS) on Ubuntu 22 and Ubuntu 24 systems."
        badge="Trellix"
        backHref="/trellix"
        backColor="orange"
        logo={TRELLIX_PAGE_LOGOS['/trellix/ubuntu']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <TrellixUbuntuCards />
      </div>
    </div>
  )
}
