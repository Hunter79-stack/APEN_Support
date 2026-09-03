import { PageHeader } from '@/components/layout/PageHeader'
import { ISOGroupCards } from './ISOGroupCards'
import { DOWNLOADS_PAGE_LOGOS } from '@/lib/data/logos'
import { CategoryCustomPages } from '@/components/common/CategoryCustomPages'

export const metadata = { title: 'Software & ISOs' }

export default function ISOsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Software & ISOs"
        subtitle="Installation ISOs for various Operating Systems. Publicly shared software can also be found on the APEN File Share."
        badge="Downloads"
        backHref="/downloads"
        backColor="sky"
        logo={DOWNLOADS_PAGE_LOGOS['/downloads/iso']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        <ISOGroupCards />
        <CategoryCustomPages category="isos" />
      </div>
    </div>
  )
}
