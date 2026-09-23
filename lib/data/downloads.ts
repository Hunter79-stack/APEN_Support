import { DOWNLOADS_PAGE_LOGOS, ROOT_PAGE_LOGOS } from '@/lib/data/logos'
import type { NavCard } from '@/lib/types/cards'

/**
 * Product families on the /downloads aggregator. Each card links to that
 * product's own download page; the product pages link back here via their
 * PageHeader backHref. glowColor is a placeholder — the rainbow is assigned
 * deterministically by index at render time (getCardGlowColor).
 */
export const downloadsCategoryCards: NavCard[] = [
  {
    id: 'isos',
    title: 'ISO',
    description: 'Operating-system ISO images mirrored on the APEN share — Enterprise Linux, Ubuntu, and Windows.',
    logo: DOWNLOADS_PAGE_LOGOS['/downloads/iso'],
    glowColor: 'cyan',
    tags: ['ISO', 'Linux', 'Windows'],
    href: '/downloads/iso',
    hrefLabel: 'Browse ISOs →',
    itemCount: '3 platforms',
  },
  {
    id: 'vmware',
    title: 'VMware',
    description: 'vCenter Server and ESXi installer images, patches, VMware Tools, and VMRC downloads.',
    logo: DOWNLOADS_PAGE_LOGOS['/downloads/vmware'],
    glowColor: 'orange',
    tags: ['vCenter', 'ESXi', 'Tools'],
    href: '/downloads/vmware',
    hrefLabel: 'View VMware downloads →',
    itemCount: '4 categories',
  },
  {
    id: 'microsoft',
    title: 'Microsoft',
    description: 'Microsoft Office, Windows, and Store application packages for offline deployment.',
    logo: DOWNLOADS_PAGE_LOGOS['/downloads/microsoft-products'],
    glowColor: 'sky',
    tags: ['Office', 'Windows', 'Store'],
    href: '/downloads/microsoft-products',
    hrefLabel: 'View Microsoft products →',
    itemCount: 'Office & Store',
  },
  {
    id: 'pdq',
    title: 'PDQ Deploy & Inventory',
    description: 'PDQ Deploy and PDQ Inventory installers and packages for endpoint management.',
    logo: ROOT_PAGE_LOGOS['/PDQ'],
    glowColor: 'emerald',
    tags: ['Deploy', 'Inventory'],
    href: '/PDQ',
    hrefLabel: 'View PDQ downloads →',
    itemCount: 'Deploy & Inventory',
  },
  {
    id: 'evaluate-stig',
    title: 'Evaluate-STIG',
    description: 'Download the Evaluate-STIG PowerShell toolchain for automated STIG scanning on Linux systems.',
    logo: DOWNLOADS_PAGE_LOGOS['/downloads/evaluate-stig'],
    glowColor: 'amber',
    tags: ['STIG', 'PowerShell'],
    href: '/downloads/evaluate-stig',
    hrefLabel: 'Download Evaluate-STIG →',
    itemCount: 'Tool + guides',
  },
]
