import { PageHeader, SectionTitle } from '@/components/layout/PageHeader'
import { DocumentationCards } from '@/components/cards/DocumentationCards'
import { trellixDocCards } from '@/lib/data/trellix'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Trellix Documentation' }

export default function TrellixDocsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Trellix Documentation"
        subtitle="Trellix Agent command reference for checking status, enforcing policies, and forwarding events to ePO."
        badge="Documentation"
        backHref="/docs"
        backColor="orange"
        logo={DOCS_PAGE_LOGOS['/docs/trellix']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        <section>
          <SectionTitle>Documentation</SectionTitle>
          <DocumentationCards cards={trellixDocCards} scope="docs/trellix/cards" />
        </section>
      </div>
    </div>
  )
}
