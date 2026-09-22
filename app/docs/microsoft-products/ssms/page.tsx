import { PageHeader, SectionTitle } from '@/components/layout/PageHeader'
import { ReleaseNotes } from '@/components/cards/ReleaseNotes'
import { ssmsReleaseNotes } from '@/lib/data/docs-content'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'SSMS Release Notes' }

export default function SsmsDocsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="SQL Server Management Studio"
        subtitle="All-version release notes for SSMS 20.x, 21.x, and 22.x — compiled from the official Microsoft Learn release notes."
        badge="Microsoft Documentation"
        backHref="/docs/microsoft-products"
        backColor="sky"
        logo={DOCS_PAGE_LOGOS['/docs/microsoft-products/ssms']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <section>
          <SectionTitle>All Version Release Notes</SectionTitle>
          <ReleaseNotes groups={ssmsReleaseNotes} />
          <p className="mt-4 text-[11px] text-slate-400">
            Source: Microsoft Learn — learn.microsoft.com/ssms. Compiled for offline reference.
          </p>
        </section>
      </div>
    </div>
  )
}
