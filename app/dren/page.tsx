import { PageHeader, SectionTitle } from '@/components/layout/PageHeader'
import { DRENToolCards } from './DRENToolCards'
import { DREN_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'DREN Admin Tools' }

export default function DRENPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="DREN Knowledge Base"
        subtitle="Public resources and installation guides for the Defense Research and Engineering Network."
        badge="Documentation"
        backHref="/home"
        backColor="cyan"
        logo={DREN_PAGE_LOGOS['/dren']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        <section>
          <SectionTitle>Available Resources</SectionTitle>
          <DRENToolCards />
        </section>
      </div>
    </div>
  )
}
