import { PageHeader } from '@/components/layout/PageHeader'
import { RepoGuideViewer } from '../RepoGuideViewer'
import { MirrorFreshness } from '@/components/common/MirrorFreshness'
import { AlreadyConfiguredNotice } from '@/components/common/AlreadyConfiguredNotice'
import { debGuideGroups } from '@/lib/data/repo-guides'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Ubuntu Repositories' }

export default function DEBRepoPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Ubuntu Repositories"
        subtitle="Mirrored APT repositories for Ubuntu 22 (Jammy), 24 (Noble), and 26 (Resolute) — plus client guides for Docker, NVIDIA, Nginx, Kubernetes, and more. Pick a guide and follow the steps to add it without internet access."
        badge="Repositories"
        backHref="/docs/repos"
        backColor="violet"
        logo={DOCS_PAGE_LOGOS['/docs/repos/deb']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-6">
        <MirrorFreshness repos={['deb']} />

        <AlreadyConfiguredNotice fileKind=".list">
          <li>
            <span className="font-semibold text-slate-100">
              <code className="text-cyan-300">-proposed</code> was removed
            </span>{' '}
            from the Ubuntu 22, 24 and 26 lists. Clients configured earlier are still pulling
            pre-release test packages — refresh to stop.
          </li>
          <li>
            Download commands now use <code className="text-cyan-300">wget -N</code> and{' '}
            <code className="text-cyan-300">curl -fL</code>. The old forms could silently save an
            error page as your sources file, or write numbered duplicates (
            <code className="text-cyan-300">.list.1</code>) that apt ignores entirely.
          </li>
          <li>
            The Ubuntu 26 (Resolute) list now points at a keyring that ships with every Ubuntu
            install, so no separate key download is needed.
          </li>
        </AlreadyConfiguredNotice>

        <RepoGuideViewer groups={debGuideGroups} kind="deb" />
      </div>
    </div>
  )
}
