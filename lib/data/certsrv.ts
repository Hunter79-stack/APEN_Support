import { CERTSRV_PAGE_LOGOS } from '@/lib/data/logos'
import type { NavCard } from '@/lib/types/cards'

export const certsrvCards: NavCard[] = [
  {
    id: 'ca',
    title: 'CA Certificate Setup Wizard',
    description: 'Step-by-step guide to download and trust the APEN root CA certificate on Enterprise Linux or Ubuntu - no experience required.',
    glowColor: 'cyan',
    tags: ['Enterprise Linux', 'Ubuntu', 'CA Trust', '3 Steps'],
    href: '/certsrv/ca',
    hrefLabel: 'Open wizard ->',
    logo: CERTSRV_PAGE_LOGOS['/certsrv/ca'],
    itemCount: '3-step wizard',
  },
  {
    id: 'request',
    title: 'Cert Request Wizard',
    description: 'Enroll a new certificate or renew an existing one. Generates a certreq INF (Windows) or OpenSSL config (Linux) and walks through submission to the APEN Certificate Authority portal.',
    glowColor: 'indigo',
    tags: ['Enroll', 'Renew', 'Windows', 'Enterprise Linux', 'Ubuntu', 'certreq', 'OpenSSL'],
    href: '/certsrv/request',
    hrefLabel: 'Open wizard ->',
    logo: CERTSRV_PAGE_LOGOS['/certsrv/request'],
    itemCount: 'Enroll or renew',
  },
]
