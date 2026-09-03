import { PageHeader } from '@/components/layout/PageHeader'
import { VMware7Cards } from './VMware7Cards'
import { DOWNLOADS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'VMware 7 Products' }

export default function VMware7Page() {
  return (
    <div className="page-enter">
      <PageHeader
        title="VMware 7 Products"
        subtitle="VMware vCenter Server 7 and vSphere Hypervisor (ESXi) 7 — installer images and patch history mirrored on the APEN file share."
        badge="VMware"
        backHref="/downloads/vmware"
        backColor="orange"
        logo={DOWNLOADS_PAGE_LOGOS['/downloads/vmware/v7']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <VMware7Cards />
      </div>
    </div>
  )
}
