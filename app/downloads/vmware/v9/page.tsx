import { PageHeader } from '@/components/layout/PageHeader'
import { VMware9Cards } from './VMware9Cards'
import { DOWNLOADS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'VMware 9 Products' }

export default function VMware9Page() {
  return (
    <div className="page-enter">
      <PageHeader
        title="VMware 9 Products"
        subtitle="VMware vCenter Server 9 and vSphere Hypervisor (ESXi) 9 installer images mirrored on the APEN file share."
        badge="VMware"
        backHref="/downloads/vmware"
        backColor="orange"
        logo={DOWNLOADS_PAGE_LOGOS['/downloads/vmware/v9']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <VMware9Cards />
      </div>
    </div>
  )
}
