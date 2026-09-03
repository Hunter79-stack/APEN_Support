import { PageHeader } from '@/components/layout/PageHeader'
import { WindowsOSCards } from './WindowsOSCards'
import { DOWNLOADS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'MS Windows ISOs' }

export default function WindowsISOsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="MS Windows ISOs"
        subtitle="Windows 11 Pro, Windows Server 2022/2025, and Windows Admin Center installer images — hosted on the APEN file share for offline installation."
        badge="ISOs"
        backHref="/downloads/iso"
        backColor="sky"
        logo={DOWNLOADS_PAGE_LOGOS['/downloads/iso/windows']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <WindowsOSCards />
      </div>
    </div>
  )
}
