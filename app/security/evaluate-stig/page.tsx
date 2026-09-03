import { Download } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { GlowCard } from '@/components/ui/spotlight-card'
import { ThemedLogo } from '@/components/common/ThemedLogo'
import { SECURITY_PAGE_LOGOS } from '@/lib/data/logos'
import { evalStigToolDownload } from '@/lib/data/evaluate-stig'

export const metadata = { title: 'Evaluate-STIG' }

export default function EvaluateStigPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Evaluate-STIG"
        subtitle="Download Evaluate-STIG and find step-by-step guides for running STIG scans on Enterprise Linux and Ubuntu systems."
        badge="Security"
        backHref="/security"
        backColor="amber"
        logo={SECURITY_PAGE_LOGOS['/security/evaluate-stig']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">

        {/* Featured download — promoted from the Documents subpage so admins
            can grab the tool archive without drilling in. The Documents page
            still hosts the rest of the supporting PDFs / viewers. */}
        <section>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400/80 mb-3">Tool download</p>
          <GlowCard glowColor="cyan" className="p-6 sm:p-7">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <ThemedLogo
                src={evalStigToolDownload.logo}
                alt={evalStigToolDownload.title}
                size="xl"
                glass
                glow
                variant="square"
                priority
              />
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold text-white">{evalStigToolDownload.title}</h2>
                {/* Version of the staged archive, shown the way the ISO tiles
                    show theirs — visible text, so it also reaches site search
                    and the AI assistant rather than living in an attribute. */}
                {evalStigToolDownload.version && (
                  <p className="mt-1 text-xs text-slate-500">Version {evalStigToolDownload.version}</p>
                )}
                <p className="mt-1 text-sm text-slate-400 leading-relaxed">{evalStigToolDownload.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {evalStigToolDownload.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-md text-xs bg-white/5 text-slate-400 border border-white/5"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <a
                href={evalStigToolDownload.download.href}
                className="btn-download w-full sm:w-auto justify-center text-sm flex items-center gap-2 sm:flex-shrink-0"
              >
                <Download size={14} />
                {evalStigToolDownload.download.label}
              </a>
            </div>
          </GlowCard>
        </section>
      </div>
    </div>
  )
}
