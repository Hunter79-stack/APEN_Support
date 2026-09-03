import { PageHeader } from '@/components/layout/PageHeader'
import { VMware8Cards } from './VMware8Cards'
import { DOWNLOADS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'VMware 8 Products' }

export default function VMware8Page() {
  return (
    <div className="page-enter">
      <PageHeader
        title="VMware 8 Products"
        subtitle="VMware vCenter Server 8 and vSphere Hypervisor (ESXi) 8 — installer images and full patch history mirrored on the APEN file share."
        badge="VMware"
        backHref="/downloads/vmware"
        backColor="orange"
        logo={DOWNLOADS_PAGE_LOGOS['/downloads/vmware/v8']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <VMware8Cards />
      </div>
    </div>
  )
}
