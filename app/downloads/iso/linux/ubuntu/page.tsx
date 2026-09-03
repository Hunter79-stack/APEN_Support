import { PageHeader } from '@/components/layout/PageHeader'
import { UbuntuOSCards } from './UbuntuOSCards'
import { DOWNLOADS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Ubuntu Linux ISOs' }

export default function UbuntuISOsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Ubuntu Linux ISOs"
        subtitle="Desktop and Server ISO images for Ubuntu 22, 24, and 25 (amd64) — hosted on the APEN file share for offline installation."
        badge="ISOs"
        backHref="/downloads/iso"
        backColor="sky"
        logo={DOWNLOADS_PAGE_LOGOS['/downloads/iso/linux/ubuntu']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <UbuntuOSCards />
      </div>
    </div>
  )
}
