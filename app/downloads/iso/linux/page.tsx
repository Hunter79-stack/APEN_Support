import { PageHeader } from '@/components/layout/PageHeader'
import { LinuxGroupCards } from './LinuxGroupCards'
import { DOWNLOADS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Linux ISOs' }

export default function LinuxISOsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Linux ISOs"
        subtitle="DVD ISO images for Enterprise Linux (AlmaLinux, CentOS, RockyLinux) and Ubuntu — hosted on the APEN file share for offline installation. Choose a distribution family below."
        badge="Downloads"
        backHref="/downloads/iso"
        backColor="sky"
        logo={DOWNLOADS_PAGE_LOGOS['/downloads/iso/linux']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <LinuxGroupCards />
      </div>
    </div>
  )
}
