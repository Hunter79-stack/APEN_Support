import { PageHeader } from '@/components/layout/PageHeader'
import { STIGEnterpriseLinuxCard } from './STIGEnterpriseLinuxCard'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Evaluate-STIG Enterprise Linux Guides' }

export default function EvalELPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Enterprise Linux Guides"
        subtitle="Step-by-step guides for running Evaluate-STIG on AlmaLinux, Rocky Linux, and CentOS using the appropriate ForceSTIG flags."
        badge="Evaluate-STIG"
        backHref="/docs/evaluate-stig"
        backColor="amber"
        logo={DOCS_PAGE_LOGOS['/docs/evaluate-stig/linux/enterprise']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <STIGEnterpriseLinuxCard />
      </div>
    </div>
  )
}
