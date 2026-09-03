import { PageHeader, SectionTitle } from '@/components/layout/PageHeader'
import { DocumentationCards } from '@/components/cards/DocumentationCards'
import { vmwareDocCards } from '@/lib/data/vmware'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'VMware Documentation' }

export default function VmwareDocsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="VMware Documentation"
        subtitle="vCenter upgrade guide and vSphere / ESXi release notes for VMware 9, 8, and 7."
        badge="Documentation"
        backHref="/docs"
        backColor="orange"
        logo={DOCS_PAGE_LOGOS['/docs/vmware']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        <section>
          <SectionTitle>Documentation &amp; Release Notes</SectionTitle>
          <DocumentationCards cards={vmwareDocCards} scope="docs/vmware/cards" />
        </section>
      </div>
    </div>
  )
}
