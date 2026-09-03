import { PageHeader } from '@/components/layout/PageHeader'
import { ReposCategoryCards } from './ReposCategoryCards'
import { MirrorFreshness } from '@/components/common/MirrorFreshness'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Linux Repositories' }

export default function ReposPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Linux Repositories"
        subtitle="Securely mirrored package repositories for Enterprise Linux and Ubuntu distributions. Select a distribution category below."
        badge="Documentation"
        backHref="/docs"
        backColor="violet"
        logo={DOCS_PAGE_LOGOS['/docs/repos']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-6">
        <MirrorFreshness />
        <ReposCategoryCards />
      </div>
    </div>
  )
}
