import { PageHeader, SectionTitle, Callout } from '@/components/layout/PageHeader'
import { GlowCard } from '@/components/ui/spotlight-card'
import { PDQDownloadCards } from './PDQDownloadCards'
import { ROOT_PAGE_LOGOS } from '@/lib/data/logos'
import { pdqDeployFeatures, pdqInventoryFeatures, type PDQFeature } from '@/lib/data/pdq'

export const metadata = { title: 'PDQ Deploy & Inventory' }

function FeatureRow({ label, available, note }: PDQFeature) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold
        ${available ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
        {available ? '✓' : '✗'}
      </span>
      <div>
        <p className="text-sm text-slate-300">{label}</p>
        {note && <p className="text-xs text-slate-600 mt-0.5">{note}</p>}
      </div>
    </div>
  )
}

export default function PDQPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="PDQ Deploy & Inventory"
        subtitle="Windows software deployment and hardware/software inventory tools for on-premises device management."
        badge="Downloads"
        backHref="/downloads"
        backColor="orange"
        logo={ROOT_PAGE_LOGOS['/PDQ']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">

        <Callout type="warning">
          <div>
            <strong>Evaluation Mode Notice:</strong> The full versions of PDQ Deploy and Inventory require an annual license.
            Both tools include a free evaluation mode with some feature restrictions. There is no time limit —
            it&apos;s a great way to assess the tools before committing to a license.
          </div>
        </Callout>

        <section>
          <SectionTitle>Downloads</SectionTitle>
          <PDQDownloadCards />
        </section>

        <section>
          <SectionTitle>Evaluation Mode — Feature Breakdown</SectionTitle>
          <div className="grid md:grid-cols-2 gap-6">
            <GlowCard className="p-5" glowColor="cyan">
              <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-3">PDQ Deploy</h3>
              <div className="divide-y divide-white/5">
                {pdqDeployFeatures.map((f) => <FeatureRow key={f.label} {...f} />)}
              </div>
            </GlowCard>
            <GlowCard className="p-5" glowColor="indigo">
              <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">PDQ Inventory</h3>
              <div className="divide-y divide-white/5">
                {pdqInventoryFeatures.map((f) => <FeatureRow key={f.label} {...f} />)}
              </div>
            </GlowCard>
          </div>
        </section>

      </div>
    </div>
  )
}
