import { PageHeader } from '@/components/layout/PageHeader'
import { DOWNLOADS_PAGE_LOGOS } from '@/lib/data/logos'
import { VMwareProductCards } from './VMwareProductCards'
import { CategoryCustomPages } from '@/components/common/CategoryCustomPages'

export const metadata = { title: 'VMware Products' }

export default function VMwarePage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="VMware Products"
        subtitle="vCenter Server and vSphere Hypervisor (ESXi) installer images, patches, VMware Tools, and VMRC - all mirrored on the APEN file share."
        badge="Downloads"
        backHref="/downloads"
        backColor="orange"
        logo={DOWNLOADS_PAGE_LOGOS['/downloads/vmware']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        <VMwareProductCards />
        <CategoryCustomPages category="vmware" />
        <p className="text-xs text-slate-400">
          VMware software © Broadcom Inc.; mirrored under the APEN VMware entitlement —{' '}
          <a href="/attribution" className="underline hover:text-cyan-400">attribution</a>.
        </p>
      </div>
    </div>
  )
}
