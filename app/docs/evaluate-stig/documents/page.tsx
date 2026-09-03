import { PageHeader } from '@/components/layout/PageHeader'
import { EvalDocsCards } from './EvalDocsCards'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Evaluate-STIG Documents' }

export default function EvalDocsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Evaluate-STIG Documents"
        subtitle="Download Evaluate-STIG, the User Guide, ChangeLog, STIG Viewer, STIG-Manager integration guide, and the STIG library."
        badge="Evaluate-STIG"
        backHref="/docs/evaluate-stig"
        backColor="amber"
        logo={DOCS_PAGE_LOGOS['/docs/evaluate-stig/documents']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <EvalDocsCards />
      </div>
    </div>
  )
}
