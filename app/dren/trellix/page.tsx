import { PageHeader, SectionTitle } from '@/components/layout/PageHeader'
import { DRENTrellixELCards } from './DRENTrellixELCards'
import { DRENTrellixUbuntuCards } from './DRENTrellixUbuntuCards'
import { DREN_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Trellix for Linux — DREN' }

export default function DRENTrellixPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Trellix for Linux on DREN"
        subtitle="DREN-specific Trellix Agent and ENS installation guides for Enterprise Linux and Ubuntu systems — one bundle, one installer."
        badge="DREN"
        backHref="/dren"
        backColor="cyan"
        logo={DREN_PAGE_LOGOS['/dren/trellix']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-12">

        <section>
          <SectionTitle>Enterprise Linux</SectionTitle>
          <p className="text-sm text-slate-400 mb-6">Tested on AlmaLinux 8, AlmaLinux 9, RockyLinux 8, and CentOS 7.</p>
          <DRENTrellixELCards />
        </section>

        <section>
          <SectionTitle>Ubuntu</SectionTitle>
          <p className="text-sm text-slate-400 mb-6">Tested on Ubuntu 22 and Ubuntu 24.</p>
          <DRENTrellixUbuntuCards />
        </section>

      </div>
    </div>
  )
}
