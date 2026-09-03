import { PageHeader } from '@/components/layout/PageHeader'
import { TrellixProductCards } from './TrellixProductCards'
import { TRELLIX_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Trellix for Linux (CUI)' }

export default function TrellixPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Trellix for Linux (CUI)"
        subtitle="Installation guides for the Trellix Agent and ENS on Enterprise Linux and Ubuntu systems, plus a reference for common agent commands."
        badge="Security"
        backHref="/security"
        backColor="orange"
        logo={TRELLIX_PAGE_LOGOS['/trellix']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <TrellixProductCards />
      </div>
    </div>
  )
}
