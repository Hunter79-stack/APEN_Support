import { PageHeader, SectionTitle } from '@/components/layout/PageHeader'
import { DOWNLOADS_PAGE_LOGOS } from '@/lib/data/logos'
import { DownloadsProductCards } from './DownloadsProductCards'
import { CategoryCustomPages } from '@/components/common/CategoryCustomPages'

export const metadata = { title: 'Downloads' }

export default function DownloadsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Downloads"
        subtitle="Every downloadable product mirrored on the APEN share — operating-system ISOs, package repositories, VMware, Microsoft, PDQ, and STIG tooling."
        badge="Home"
        backHref="/home"
        backColor="cyan"
        logo={DOWNLOADS_PAGE_LOGOS['/downloads']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        <section>
          <SectionTitle>Download Products</SectionTitle>
          <DownloadsProductCards />
        </section>
        <CategoryCustomPages category="downloads" />
      </div>
    </div>
  )
}
