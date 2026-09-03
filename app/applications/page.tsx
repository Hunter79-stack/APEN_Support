import { PageHeader } from '@/components/layout/PageHeader'
import { ApplicationCards } from './ApplicationCards'
import { CategoryCustomPages } from '@/components/common/CategoryCustomPages'
import { APPLICATION_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'APEN Applications' }

export default function ApplicationsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="APEN Applications"
        subtitle="On-network applications and utilities hosted on the APEN — network measurement and diagnostics."
        badge="Home"
        backHref="/home"
        backColor="violet"
        logo={APPLICATION_PAGE_LOGOS['/applications']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        <ApplicationCards />
        {/* Wizard-published custom tool pages (category "tools") surface here
            now that the /applications/tools catalog page is gone. */}
        <CategoryCustomPages category="tools" />
      </div>
    </div>
  )
}
