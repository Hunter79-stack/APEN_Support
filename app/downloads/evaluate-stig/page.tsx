import { PageHeader } from '@/components/layout/PageHeader'
import { EvalToolCards } from './EvalToolCards'
import { DOWNLOADS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Evaluate-STIG Downloads' }

export default function EvaluateStigDownloadsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Evaluate-STIG Downloads"
        subtitle="STIG Viewer builds for Windows and Linux, the consolidated SRG/STIG library, and the STIG GPO package. Guides and release notes stay under Documentation."
        badge="Downloads"
        backHref="/downloads"
        backColor="cyan"
        logo={DOWNLOADS_PAGE_LOGOS['/downloads/evaluate-stig']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <EvalToolCards />
      </div>
    </div>
  )
}
