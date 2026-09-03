import { PageHeader } from '@/components/layout/PageHeader'
import { RepoGuideViewer } from '../RepoGuideViewer'
import { MirrorFreshness } from '@/components/common/MirrorFreshness'
import { AlreadyConfiguredNotice } from '@/components/common/AlreadyConfiguredNotice'
import { rpmGuideGroups } from '@/lib/data/repo-guides'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Enterprise Linux Repositories' }

export default function RPMRepoPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Enterprise Linux Repositories"
        subtitle="Mirrored RPM repositories for AlmaLinux 8/9/10, Rocky 8/9/10, CentOS 7, EPEL, Microsoft RHEL, RPM Fusion, VSCode, and more. Pick a guide and follow the steps to add it without internet access."
        badge="Repositories"
        backHref="/docs/repos"
        backColor="violet"
        logo={DOCS_PAGE_LOGOS['/docs/repos/rpm']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-6">
        <MirrorFreshness repos={['rpm']} />

        <AlreadyConfiguredNotice fileKind=".repo">
          <li>
            <span className="font-semibold text-slate-100">Rocky Linux 10 is now mirrored</span> —
            9 repositories, supported upstream to 2035. Rocky 9 clients previously had no upgrade
            path published here.
          </li>
          <li>
            Download commands now use <code className="text-cyan-300">wget -N</code> and{' '}
            <code className="text-cyan-300">curl -fL</code>. The old forms could silently save an
            error page as your <code className="text-cyan-300">.repo</code> file instead of failing.
          </li>
          <li>
            CentOS 7 is End of Life and frozen — see the notice below before planning any work
            that depends on it.
          </li>
        </AlreadyConfiguredNotice>

        {/*
          CentOS 7 is retained deliberately: legacy products that run on nothing
          else are covered by a POA&M. It is NOT abandoned content — but it will
          never receive another update from anyone, so the page has to say so
          rather than let a frozen date imply the mirror is broken.
        */}
        <section
          aria-labelledby="centos7-eol"
          className="rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-5"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
            End of Support Notice
          </p>
          <h2 id="centos7-eol" className="mt-1 text-lg font-bold text-amber-100">
            CentOS 7 reached End of Life on 30 June 2024
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Red Hat ended all maintenance for CentOS 7 on{' '}
            <span className="font-semibold text-amber-200">30 June 2024</span>, and upstream removed it
            from <code className="text-cyan-300">mirror.centos.org</code>. No further security errata,
            bug fixes, or package updates will ever be published for it by anyone.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            These repositories are still mirrored here{' '}
            <span className="font-semibold text-amber-200">on purpose</span>, to support legacy
            products that cannot run on a newer Enterprise Linux release and are covered under an
            approved POA&amp;M. Their content is frozen at the last upstream state (mirrored
            2024&#8209;07&#8209;01) and will not change — a stale date on these repos is expected,
            not a mirror failure.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Do not build anything new on CentOS 7. For new systems use{' '}
            <span className="font-semibold text-slate-100">AlmaLinux 10</span> or{' '}
            <span className="font-semibold text-slate-100">Rocky 10</span> (supported to 2035), or
            AlmaLinux 9 / Rocky 9 (2032). Migration from 7 is covered by the ELevate guides below.
          </p>
        </section>

        <RepoGuideViewer groups={rpmGuideGroups} kind="rpm" />
      </div>
    </div>
  )
}
