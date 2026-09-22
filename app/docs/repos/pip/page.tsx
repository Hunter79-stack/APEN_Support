import { PageHeader } from '@/components/layout/PageHeader'
import { RouteImage } from '@/components/common/RouteImage'
import { GlowCard } from '@/components/ui/spotlight-card'
import { MirrorFreshness } from '@/components/common/MirrorFreshness'
import { RepoGuideViewer } from '../RepoGuideViewer'
import { pipGuideGroups } from '@/lib/data/repo-guides'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'
import { URLS } from '@/lib/data/constants'

export const metadata = { title: 'PIP Package Repository' }

const BASE = URLS.reposPip

/**
 * The page used to be one long scroll of three hand-written sections — two
 * about pip, one about uv — with no way to jump between them. It now uses the
 * same grouped picker the deb and rpm pages use, with the tools as the two
 * groups. The content is unchanged; it lives in pipGuideGroups
 * (lib/data/repo-guides.ts) rather than in repo-guides.json, because that file
 * is regenerated from the legacy static site and would erase it.
 */
export default function PIPRepoPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="PIP Package Repository"
        subtitle="Internal Python package index mirroring PyPI for offline pip and uv installations across the APEN."
        badge="Repositories"
        backHref="/docs/repos"
        backColor="violet"
        logo={DOCS_PAGE_LOGOS['/docs/repos/pip']}
      />

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-6">

        <MirrorFreshness repos={['pip']} />

        {/* pip mirror info card */}
        <GlowCard className="flex items-center gap-4 px-5 py-4" glowColor="violet">
          <div className="w-10 h-10 rounded-lg bg-white/5 p-1 flex-shrink-0 overflow-hidden">
            <RouteImage
              route="/docs/repos/pip"
              fallbackSrc={DOCS_PAGE_LOGOS['/docs/repos/pip']}
              alt="pip"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-white">APEN pip Mirror</p>
            <p className="text-xs text-slate-400">{BASE}/</p>
          </div>
        </GlowCard>

        <RepoGuideViewer groups={pipGuideGroups} kind="pip" />
      </div>
    </div>
  )
}
