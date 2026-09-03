import { PageHeader } from '@/components/layout/PageHeader'
import { FacProCards } from './FacProCards'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'FacilitatePro Documents' }

export default function FacProPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="FacilitatePro Documents"
        subtitle="Documentation and FAQs for the FacilitatePro collaborative strategic planning platform."
        badge="Documentation"
        backHref="/docs"
        backColor="violet"
        logo={DOCS_PAGE_LOGOS['/docs/facpro']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <FacProCards />
      </div>
    </div>
  )
}
