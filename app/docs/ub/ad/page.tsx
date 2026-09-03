import { PageHeader } from '@/components/layout/PageHeader'
import { ADMgmtCards } from './ADMgmtCards'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Ubuntu Active Directory' }

export default function UbuntuADPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Active Directory"
        subtitle="Join and leave the BLCSE.MIL Active Directory domain using Realmd and SSSD on Ubuntu systems."
        badge="Ubuntu"
        backHref="/docs/ub"
        backColor="orange"
        logo={DOCS_PAGE_LOGOS['/docs/ub/ad']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <ADMgmtCards />
      </div>
    </div>
  )
}
