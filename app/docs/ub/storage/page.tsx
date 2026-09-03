import { PageHeader } from '@/components/layout/PageHeader'
import { StorageCards } from './StorageCards'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Ubuntu Storage & Filesystem' }

export default function UbuntuStoragePage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Storage & Filesystem"
        subtitle="Mount filesystems persistently with fstab and resize partitions online on Ubuntu systems."
        badge="Ubuntu"
        backHref="/docs/ub"
        backColor="orange"
        logo={DOCS_PAGE_LOGOS['/docs/ub/storage']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <StorageCards />
      </div>
    </div>
  )
}
