import { PageHeader, SectionTitle } from '@/components/layout/PageHeader'
import { GlowCard } from '@/components/ui/spotlight-card'
import { APPLICATION_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'APEN Network Analysis' }

export default function NetworkAnalysisPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="APEN Network Analysis"
        subtitle="A single console combining the APEN Speed Test and NetDiag tools — WAN throughput and latency measured on-network (no CDN), plus agent-based endpoint-to-endpoint diagnostics with live status and HTML / PDF reports."
        badge="Applications"
        backHref="/applications"
        backColor="cyan"
        logo={APPLICATION_PAGE_LOGOS['/network-analysis']}
      />

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        <section>
          <SectionTitle>Open a tool</SectionTitle>
          <div className="grid sm:grid-cols-2 gap-6">
            <GlowCard as="a" href="/speedtest/" glowColor="cyan" className="p-6 block">
              <h3 className="text-lg font-semibold text-white">Speed Test</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                WAN latency, jitter, download, and upload — measured directly by the APEN, with no third-party CDN.
              </p>
              <span className="mt-4 inline-block text-xs font-semibold uppercase tracking-wider text-cyan-400">Launch Speed Test →</span>
            </GlowCard>

            <GlowCard as="a" href="/netdiag/" glowColor="violet" className="p-6 block">
              <h3 className="text-lg font-semibold text-white">Network Diagnostics</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                Agent-based, endpoint-to-endpoint battery (RTT, MTU, TCP, marked UDP) with live status, a run-log
                browser, schedules, and downloadable HTML / PDF reports.
              </p>
              <span className="mt-4 inline-block text-xs font-semibold uppercase tracking-wider text-violet-400">Launch NetDiag →</span>
            </GlowCard>
          </div>
        </section>
      </div>
    </div>
  )
}
