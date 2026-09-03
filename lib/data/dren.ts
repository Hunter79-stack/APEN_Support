/**
 * DREN tools data — tool cards for the DREN landing page
 *
 * Extracted from app/dren/DRENToolCards.tsx.
 */

import { DREN_PAGE_LOGOS } from '@/lib/data/logos'
import type { BaseCard } from '@/lib/types/cards'

/* ─── DREN tool card type ────────────────────────────────── */
export interface DRENToolCard extends BaseCard {
  logo: string
  href: string
  comingSoon: boolean
}

/* ─── DREN tool cards ────────────────────────────────────── */
export const drenToolCards: DRENToolCard[] = [
  {
    id: 'trellix-dren',
    title: 'Trellix for Linux on DREN',
    description: 'Trellix Agent and ENS installation guides specific to the DREN network environment.',
    logo: DREN_PAGE_LOGOS['/dren/trellix'],
    glowColor: 'cyan',
    tags: ['Trellix', 'DREN', 'Linux', 'ENS'],
    href: '/dren/trellix',
    comingSoon: false,
  },
  {
    id: 'cisco-dren',
    title: 'Cisco DREN Repository',
    description: 'Cisco software and configuration repository for DREN-side administration.',
    logo: DREN_PAGE_LOGOS['/dren/cisco'],
    glowColor: 'indigo',
    tags: ['Cisco', 'DREN', 'Network', 'Configuration'],
    href: '/dren/cisco',
    comingSoon: true,
  },
]
