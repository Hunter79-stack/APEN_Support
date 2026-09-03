import { PageHeader, Callout, SectionTitle } from '@/components/layout/PageHeader'
import { VSReleaseTable } from '../VSReleaseTable'
import { DOWNLOADS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Visual Studio 2022 Community' }

export default function VSCommunityPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Visual Studio 2022 Community"
        subtitle="A free, fully-featured IDE for students, open-source projects, and individual developers."
        badge="Visual Studio"
        backHref="/downloads/microsoft-products/VisualStudio"
        backColor="indigo"
        logo={DOWNLOADS_PAGE_LOGOS['/downloads/microsoft-products/VisualStudio/community']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <Callout type="info">
          Free for individual developers, open-source projects, academic research, education, and small professional teams.
        </Callout>
        <section>
          <SectionTitle>Available Releases</SectionTitle>
          <VSReleaseTable
            edition="community"
            label="VS 2022 Community"
            logo={DOWNLOADS_PAGE_LOGOS['/downloads/microsoft-products/VisualStudio/community']}
          />
        </section>
      </div>
    </div>
  )
}
