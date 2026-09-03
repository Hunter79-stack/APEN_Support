/**
 * Trellix product data — category cards for the Trellix landing page
 *
 * Extracted from app/trellix/TrellixProductCards.tsx.
 */

import { TRELLIX_PAGE_LOGOS } from '@/lib/data/logos'
import type { NavCard, DocCard } from '@/lib/types/cards'

/* ─── Category cards (trellix landing page) ──────────────── */
export const trellixCategoryCards: NavCard[] = [
  {
    id: 'el',
    title: 'Enterprise Linux',
    description: 'Install the Trellix Agent and ENS on AlmaLinux 8, AlmaLinux 9, Rocky Linux 8, and CentOS 7.',
    logo: TRELLIX_PAGE_LOGOS['/trellix/enterprise-linux'],
    glowColor: 'cyan',
    tags: ['AlmaLinux', 'Rocky Linux', 'CentOS', 'RPM'],
    href: '/trellix/enterprise-linux',
    hrefLabel: 'View Enterprise Linux guides →',
    itemCount: '2 guides',
  },
  {
    id: 'ubuntu',
    title: 'Ubuntu',
    description: 'Install the Trellix Agent and ENS on Ubuntu 22 and Ubuntu 24 systems.',
    logo: TRELLIX_PAGE_LOGOS['/trellix/ubuntu'],
    glowColor: 'indigo',
    tags: ['Ubuntu 22', 'Ubuntu 24', 'DEB'],
    href: '/trellix/ubuntu',
    hrefLabel: 'View Ubuntu guides →',
    itemCount: '2 guides',
  },
]

/* ─── Documentation (trellix landing page) ───────────────── */
export const trellixDocCards: DocCard[] = [
  {
    id: 'reference',
    title: 'Command Reference',
    description: 'Useful Trellix Agent commands for checking status, enforcing policies, and forwarding events to ePO.',
    glowColor: 'orange',
    tags: ['cmdagent', 'ePO', 'Commands'],
    links: [
      { label: 'View Trellix Agent command reference', href: '/trellix/reference', kind: 'reference' },
    ],
  },
]
