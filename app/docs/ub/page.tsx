import { PageHeader } from '@/components/layout/PageHeader'
import { UbuntuProductCards } from './UbuntuProductCards'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Ubuntu Docs' }

export default function UbuntuDocsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Ubuntu Docs"
        subtitle="Step-by-step guides for Active Directory, certificates, storage, and system configuration on Ubuntu 22 and Ubuntu 24."
        badge="Documentation"
        backHref="/docs"
        backColor="orange"
        logo={DOCS_PAGE_LOGOS['/docs/ub']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <UbuntuProductCards />
      </div>
    </div>
  )
}
