import { PageHeader } from '@/components/layout/PageHeader'
import { LINUXOSCards } from './LINUXOSCards'
import { DOWNLOADS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Enterprise Linux ISOs' }

export default function EnterpriseLinuxISOsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Enterprise Linux ISOs"
        subtitle="DVD ISO images for AlmaLinux, CentOS, and RockyLinux — hosted on the APEN file share for offline installation."
        badge="ISOs"
        backHref="/downloads/iso"
        backColor="sky"
        logo={DOWNLOADS_PAGE_LOGOS['/downloads/iso/linux/enterprise']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <LINUXOSCards />
      </div>
    </div>
  )
}
