import { PageHeader, Callout, SectionTitle } from '@/components/layout/PageHeader'
import { VSReleaseTable } from '../VSReleaseTable'
import { DOWNLOADS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Visual Studio 2022 Professional' }

export default function VSProfessionalPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Visual Studio 2022 Professional"
        subtitle="Essential developer tools for individual developers and small teams building professional applications."
        badge="Visual Studio"
        backHref="/downloads/microsoft-products/VisualStudio"
        backColor="indigo"
        logo={DOWNLOADS_PAGE_LOGOS['/downloads/microsoft-products/VisualStudio/professional']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <Callout type="info">
          Requires a valid Visual Studio Professional subscription or MSDN license.
        </Callout>
        <section>
          <SectionTitle>Available Releases</SectionTitle>
          <VSReleaseTable
            edition="professional"
            label="VS 2022 Professional"
            logo={DOWNLOADS_PAGE_LOGOS['/downloads/microsoft-products/VisualStudio/professional']}
          />
        </section>
      </div>
    </div>
  )
}
