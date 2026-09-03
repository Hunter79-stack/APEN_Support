import { PageHeader } from '@/components/layout/PageHeader'
import { ADMgmtCards } from './ADMgmtCards'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'EL Active Directory' }

export default function ELADPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Active Directory"
        subtitle="Join and leave the BLCSE.MIL Active Directory domain using Realmd and SSSD on Enterprise Linux systems."
        badge="Enterprise Linux"
        backHref="/docs/el"
        backColor="green"
        logo={DOCS_PAGE_LOGOS['/docs/el/ad']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <ADMgmtCards />
      </div>
    </div>
  )
}
