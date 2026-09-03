import type { Metadata } from 'next'
import { PageHeader } from '@/components/layout/PageHeader'
import { CERTSRV_PAGE_LOGOS } from '@/lib/data/logos'
import { CertsrvCards } from './CertsrvCards'

export const metadata: Metadata = {
  title: 'Certificate Services',
  description: 'APEN Certificate Services — CA certificate setup and CSR generation wizards.',
}

export default function CertsrvPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Certificate Services"
        subtitle="Download and trust the APEN CA certificate or generate a Certificate Signing Request (CSR) for your servers and workstations."
        badge="Security"
        backHref="/security"
        backColor="cyan"
        logo={CERTSRV_PAGE_LOGOS['/certsrv']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <CertsrvCards />
      </div>
    </div>
  )
}
