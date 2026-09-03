import { PageHeader } from '@/components/layout/PageHeader'
import { CryptoCards } from './CryptoCards'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Ubuntu Certificates & Cryptography' }

export default function UbuntuCertificatesPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Certificates & Cryptography"
        subtitle="Add CA certificates to the Ubuntu trust store, convert certificate formats with OpenSSL, and configure SSH RSA keypairs."
        badge="Ubuntu"
        backHref="/docs/ub"
        backColor="orange"
        logo={DOCS_PAGE_LOGOS['/docs/ub/certificates']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <CryptoCards />
      </div>
    </div>
  )
}
