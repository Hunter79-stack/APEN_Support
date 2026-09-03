import {
  CERTSRV_PAGE_LOGOS,
  SECURITY_PAGE_LOGOS,
  TRELLIX_PAGE_LOGOS,
} from '@/lib/data/logos'
import type { NavCard } from '@/lib/types/cards'

/**
 * Security product families on the /security aggregator. Each card links to
 * that product; the product pages link back here via their PageHeader
 * backHref. glowColor is a placeholder — assigned by index at render time.
 */
export const securityCategoryCards: NavCard[] = [
  {
    id: 'evaluate-stig',
    title: 'Evaluate-STIG',
    description: 'PowerShell toolchain and step-by-step guides for running automated STIG scans on Enterprise Linux and Ubuntu systems.',
    logo: SECURITY_PAGE_LOGOS['/security/evaluate-stig'],
    glowColor: 'amber',
    tags: ['STIG', 'PowerShell', 'Compliance'],
    href: '/security/evaluate-stig',
    hrefLabel: 'Open Evaluate-STIG →',
    itemCount: 'Tool + guides',
  },
  {
    id: 'trellix',
    title: 'Trellix (CUI)',
    description: 'Install and manage the Trellix Agent and Endpoint Security (ENS) on Enterprise Linux and Ubuntu, plus ePO command reference.',
    logo: TRELLIX_PAGE_LOGOS['/trellix'],
    glowColor: 'rose',
    tags: ['Agent', 'ENS', 'ePO'],
    href: '/trellix',
    hrefLabel: 'View Trellix guides →',
    itemCount: '3 categories',
  },
  {
    id: 'certsrv',
    title: 'Certificate Services',
    description: 'Download and trust the APEN root CA and request certificates with the step-by-step wizards.',
    logo: CERTSRV_PAGE_LOGOS['/certsrv'],
    glowColor: 'sky',
    tags: ['CA Trust', 'CSR', 'PKI'],
    href: '/certsrv',
    hrefLabel: 'Open Certificate Services →',
    itemCount: '2 wizards',
  },
]
