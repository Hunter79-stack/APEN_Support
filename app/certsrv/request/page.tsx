import type { Metadata } from 'next'
import { CertRequestWizard } from './CertRequestWizard'

export const metadata: Metadata = {
  title: 'Cert Request Wizard',
  description:
    'Guided wizard to enroll a new certificate or renew an existing one with the APEN Certificate Authority. Generates a certreq INF (Windows) or OpenSSL config (Linux) and walks through portal submission.',
}

export default function CertRequestWizardPage() {
  return <CertRequestWizard />
}
