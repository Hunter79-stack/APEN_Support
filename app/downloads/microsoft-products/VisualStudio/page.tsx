import { PageHeader } from '@/components/layout/PageHeader'
import { VisualStudioCards } from './VisualStudioCards'
import { DOWNLOADS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Visual Studio Products' }

export default function VisualStudioPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Visual Studio Products"
        subtitle="Visual Studio 2022 Enterprise, Professional, and Community editions — full offline installers and layout packages mirrored on the APEN file share."
        badge="Microsoft Products"
        backHref="/downloads/microsoft-products"
        backColor="indigo"
        logo={DOWNLOADS_PAGE_LOGOS['/downloads/microsoft-products/VisualStudio']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <VisualStudioCards />
      </div>
    </div>
  )
}
