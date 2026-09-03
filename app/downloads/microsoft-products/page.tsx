import { PageHeader } from '@/components/layout/PageHeader'
import { MicrosoftProductCards } from './MicrosoftProductCards'
import { DOWNLOADS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Microsoft Products' }

export default function MicrosoftProductsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Microsoft Products"
        subtitle="Office installers, Store AppX packages, Visual Studio editions, and SQL tools — all mirrored on the APEN file share."
        badge="Downloads"
        backHref="/downloads"
        backColor="sky"
        logo={DOWNLOADS_PAGE_LOGOS['/downloads/microsoft-products']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <MicrosoftProductCards />
      </div>
    </div>
  )
}
