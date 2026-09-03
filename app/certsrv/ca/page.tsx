import type { Metadata } from 'next'
import { CertsrvWizard } from './CaWizard'

export const metadata: Metadata = {
  title: 'CA Certificate Wizard',
  description: 'Guided wizard to download and trust the APEN CA certificate on Enterprise Linux or Ubuntu.',
}

export default function CertsrvCaPage() {
  return <CertsrvWizard />
}
