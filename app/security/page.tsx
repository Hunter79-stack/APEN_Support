import type { Metadata } from 'next'
import { PageHeader, SectionTitle } from '@/components/layout/PageHeader'
import { SECURITY_PAGE_LOGOS } from '@/lib/data/logos'
import { SecurityProductCards } from './SecurityProductCards'
import { CategoryCustomPages } from '@/components/common/CategoryCustomPages'

export const metadata: Metadata = {
  title: 'Security & Compliance',
  description: 'STIG scanning tools, Trellix endpoint security, certificate services, and compliance resources.',
}

export default function SecurityPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Security & Compliance"
        subtitle="STIG scanning, endpoint security, certificate services, and compliance tooling for APEN-managed systems."
        badge="Home"
        backHref="/home"
        backColor="amber"
        logo={SECURITY_PAGE_LOGOS['/security']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        <section>
          <SectionTitle>Security Products</SectionTitle>
          <SecurityProductCards />
        </section>
        <CategoryCustomPages category="security" title="Additional Security Resources" />
      </div>
    </div>
  )
}
