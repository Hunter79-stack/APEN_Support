import { PageHeader } from '@/components/layout/PageHeader'
import { VMwareToolsCards } from './VMwareToolsCards'
import { DOWNLOADS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'VMware Tools' }

export default function VMwareToolsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="VMware Tools"
        subtitle="VMware Tools and VMRC (Remote Console) downloads for Windows and Linux."
        badge="VMware"
        backHref="/downloads/vmware"
        backColor="orange"
        logo={DOWNLOADS_PAGE_LOGOS['/downloads/vmware/tools']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <VMwareToolsCards />
      </div>
    </div>
  )
}
