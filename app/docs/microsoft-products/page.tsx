import { PageHeader, SectionTitle } from '@/components/layout/PageHeader'
import { DocumentationCards } from '@/components/cards/DocumentationCards'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'
import { microsoftDocCards } from '@/lib/data/microsoft'

export const metadata = { title: 'Microsoft Documentation' }


export default function MicrosoftDocsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Microsoft Documentation"
        subtitle="Release notes for Microsoft developer and database tools mirrored on the APEN share."
        badge="Documentation"
        backHref="/docs"
        backColor="sky"
        logo={DOCS_PAGE_LOGOS['/docs/microsoft-products']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        <section>
          <SectionTitle>Products</SectionTitle>
          <DocumentationCards cards={microsoftDocCards} scope="docs/microsoft-products/cards" />
        </section>
      </div>
    </div>
  )
}
