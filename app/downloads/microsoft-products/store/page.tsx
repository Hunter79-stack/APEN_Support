import { PageHeader } from '@/components/layout/PageHeader'
import { MSStoreAppxCards } from './MSStoreAppxCards'
import { DOWNLOADS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Microsoft Store Apps' }

export default function MicrosoftStoreAppsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Microsoft Store Apps"
        subtitle="Live Microsoft Store apps published by the APEN WinGet repository — install with winget, download installers directly, or check several apps to build an app pack and install them all at once."
        badge="Microsoft Products"
        backHref="/downloads/microsoft-products"
        backColor="sky"
        logo={DOWNLOADS_PAGE_LOGOS['/downloads/microsoft-products/store']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <MSStoreAppxCards />
      </div>
    </div>
  )
}
