import { PageHeader } from '@/components/layout/PageHeader'
import { FAQCards } from './FAQCards'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'FacilitatePro FAQs' }

export default function FacProFAQPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Frequently Asked Questions"
        subtitle="Common questions about logging in, accessing sessions, exporting results, mobile support, and getting help with FacilitatePro."
        badge="FacilitatePro"
        backHref="/docs/facpro"
        backColor="violet"
        logo={DOCS_PAGE_LOGOS['/docs/facpro/faq']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <FAQCards />
        <p className="mt-8 text-xs text-slate-400">
          Product FAQ adapted from facilitate.pro, © Facilitate.com, Inc. —{' '}
          <a href="/attribution" className="underline hover:text-cyan-400">attribution</a>.
        </p>
      </div>
    </div>
  )
}
