import { PageHeader } from '@/components/layout/PageHeader'
import { CryptoCards } from './CryptoCards'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'EL Certificates & Cryptography' }

export default function ELCertificatesPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Certificates & Cryptography"
        subtitle="Add CA certificates to the trust store, convert certificate formats with OpenSSL, and configure SSH RSA keypairs on Enterprise Linux."
        badge="Enterprise Linux"
        backHref="/docs/el"
        backColor="green"
        logo={DOCS_PAGE_LOGOS['/docs/el/certificates']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <CryptoCards />
      </div>
    </div>
  )
}
