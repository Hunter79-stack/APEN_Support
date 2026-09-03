import { PageHeader, SectionTitle } from '@/components/layout/PageHeader'
import { ReleaseNotes } from '@/components/cards/ReleaseNotes'
import { visualStudioReleaseNotes } from '@/lib/data/docs-content'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Visual Studio Release Notes' }

export default function VisualStudioDocsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Visual Studio 2022"
        subtitle="All-version release notes for Visual Studio 2022 (17.x). Enterprise, Professional, and Community editions share the same release notes."
        badge="Microsoft Documentation"
        backHref="/docs/microsoft-products"
        backColor="violet"
        logo={DOCS_PAGE_LOGOS['/docs/microsoft-products/visualstudio']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <section>
          <SectionTitle>All Version Release Notes</SectionTitle>
          <ReleaseNotes groups={visualStudioReleaseNotes} />
          <p className="mt-4 text-[11px] text-slate-500">
            Source: Microsoft Learn — learn.microsoft.com/visualstudio/releases/2022. Compiled for offline reference.
          </p>
        </section>
      </div>
    </div>
  )
}
