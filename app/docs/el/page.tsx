import { PageHeader } from '@/components/layout/PageHeader'
import { EnterpriseCards } from './EnterpriseCards'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Enterprise Linux Docs' }

export default function ELDocsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Enterprise Linux Docs"
        subtitle="Step-by-step guides for Active Directory, certificates, and system configuration on AlmaLinux, Rocky Linux, and CentOS."
        badge="Documentation"
        backHref="/docs"
        backColor="green"
        logo={DOCS_PAGE_LOGOS['/docs/el']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <EnterpriseCards />
      </div>
    </div>
  )
}
