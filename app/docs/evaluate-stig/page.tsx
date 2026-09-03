import { PageHeader, SectionTitle } from '@/components/layout/PageHeader'
import { DocumentationCards } from '@/components/cards/DocumentationCards'
import { EvaluateSTIGCards } from './EvaluateSTIGCards'
import { evalStigDocCards } from '@/lib/data/evaluate-stig'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Evaluate-STIG Documentation' }

export default function EvaluateStigDocsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Evaluate-STIG Documentation"
        subtitle="User guide, release notes (ChangeLog), and all supporting Evaluate-STIG documents."
        badge="Documentation"
        backHref="/docs"
        backColor="amber"
        logo={DOCS_PAGE_LOGOS['/docs/evaluate-stig']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {/* Sub-page navigation cards — moved here from /security/evaluate-stig. */}
        <section>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">Browse by topic</p>
          <EvaluateSTIGCards />
        </section>

        <section>
          <SectionTitle>Documentation &amp; Release Notes</SectionTitle>
          <DocumentationCards cards={evalStigDocCards} scope="docs/evaluate-stig/cards" />
        </section>
      </div>
    </div>
  )
}
