import { PageHeader } from '@/components/layout/PageHeader'
import { STIGUbuntuCards } from './STIGUbuntuCards'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Evaluate-STIG Ubuntu Guides' }

export default function EvalUbuntuPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Ubuntu Guides"
        subtitle="Step-by-step guides for running Evaluate-STIG on Ubuntu 22, Ubuntu 24, and Ubuntu 25."
        badge="Evaluate-STIG"
        backHref="/docs/evaluate-stig"
        backColor="amber"
        logo={DOCS_PAGE_LOGOS['/docs/evaluate-stig/linux/ubuntu']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <STIGUbuntuCards />
      </div>
    </div>
  )
}
