import { PageHeader } from '@/components/layout/PageHeader'
import { ExternalLink } from 'lucide-react'
import { NetworkAnalysisTabs } from './NetworkAnalysisTabs'
import { TOOLS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'APEN Speed Test' }

/**
 * APEN Speed Test — thin wrapper around the self-hosted Python speedtest.
 *
 * The previous LibreSpeed engine (public/speedtest bundle + PHP/Node
 * backends) was replaced by the standalone Python service that lives in
 * ./speedtest at the repo root, runs under PM2 as "apen-speedtest"
 * (127.0.0.1:8090), and is reverse-proxied by nginx at /speedtest/.
 * SpeedtestFrame loads the app in embed mode (transparent, no backdrop)
 * and auto-sizes to its content, so it sits directly on the site's aurora
 * background with no visible frame or scrollbar. Measurement endpoints are
 * gated to authorized networks by the backend itself
 * (see speedtest/backend/config.py).
 */
export default function SpeedTestPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="APEN Speed Test"
        subtitle="Measure latency, jitter, download, and upload between your workstation and this server. Self-hosted — no traffic leaves the APEN. Switch to the Network Diagnostics tab for agent-based endpoint-to-endpoint tests."
        badge="Applications"
        backHref="/applications"
        backColor="cyan"
        logo={TOOLS_PAGE_LOGOS['/applications/speedtest']}
      />
      <div className="max-w-6xl mx-auto px-6 pb-10 pt-4 space-y-3">
        <NetworkAnalysisTabs />
        <p className="text-center text-xs text-slate-500">
          Test not loading or stuck?{' '}
          <a
            href="/speedtest/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-cyan-400 underline hover:text-cyan-300"
          >
            Open the speed test in its own tab <ExternalLink size={11} aria-hidden="true" />
          </a>
          . Measurements only run from authorized APEN networks.
        </p>
      </div>
    </div>
  )
}
