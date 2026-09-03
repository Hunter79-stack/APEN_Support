import { PageHeader } from '@/components/layout/PageHeader'
import { StaticLink } from '@/components/common/StaticLink'
import { GlowCard } from '@/components/ui/spotlight-card'
import { MicrosoftOfficeCards } from './MicrosoftOfficeCards'
import { DOWNLOADS_PAGE_LOGOS } from '@/lib/data/logos'
import { Info } from 'lucide-react'

export const metadata = { title: 'Microsoft Office Suites' }

/**
 * A catalogue page, not a download page.
 *
 * These suites are installed by APEN Support through central deployment, so
 * there is no file here for a user to run — and deliberately no deployment
 * detail either. The page is a static export: anything written into a card
 * ships to every domain user who can load it.
 */
export default function MicrosoftOfficeProductsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Microsoft Office Suites"
        subtitle="Office, Project, and Visio Professional 2021 and 2024, licensed for use on the APEN."
        badge="Microsoft Products"
        backHref="/downloads/microsoft-products"
        backColor="sky"
        logo={DOWNLOADS_PAGE_LOGOS['/downloads/microsoft-products/office']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-6">
        <GlowCard className="flex items-start gap-3 px-5 py-4" glowColor="sky">
          <Info size={16} className="mt-0.5 shrink-0 text-sky-300" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">How to get these installed</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Office, Project, and Visio are installed by APEN Support — there is nothing to
              download here. Submit a{' '}
              <StaticLink href="/support/ticket" className="text-cyan-400 underline hover:text-cyan-300">
                support request
              </StaticLink>{' '}
              naming the product and the workstation, and the install is pushed to that machine.
            </p>
          </div>
        </GlowCard>

        <MicrosoftOfficeCards />
      </div>
    </div>
  )
}
