import { PageHeader, Callout, SectionTitle } from '@/components/layout/PageHeader'
import { VSReleaseTable } from '../VSReleaseTable'
import { DOWNLOADS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Visual Studio 2022 Enterprise' }

export default function VSEnterprisePage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Visual Studio 2022 Enterprise"
        subtitle="The most feature-rich IDE edition, designed for teams building high-quality applications across all platforms."
        badge="Visual Studio"
        backHref="/downloads/microsoft-products/VisualStudio"
        backColor="indigo"
        logo={DOWNLOADS_PAGE_LOGOS['/downloads/microsoft-products/VisualStudio/enterprise']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <Callout type="info">
          Requires a valid Visual Studio Enterprise subscription or MSDN license.
        </Callout>
        <section>
          <SectionTitle>Available Releases</SectionTitle>
          <VSReleaseTable
            edition="enterprise"
            label="VS 2022 Enterprise"
            logo={DOWNLOADS_PAGE_LOGOS['/downloads/microsoft-products/VisualStudio/enterprise']}
          />
        </section>
      </div>
    </div>
  )
}
