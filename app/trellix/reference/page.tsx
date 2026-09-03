import { PageHeader } from '@/components/layout/PageHeader'
import { TrellixRefCards } from './TrellixRefCards'
import { TRELLIX_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Trellix Agent Reference' }

export default function TrellixReferencePage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Reference"
        subtitle="Useful Trellix Agent commands for communicating with ePO, checking agent status, and performing maintenance."
        badge="Trellix"
        backHref="/trellix"
        backColor="orange"
        logo={TRELLIX_PAGE_LOGOS['/trellix/reference']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <TrellixRefCards />
      </div>
    </div>
  )
}
