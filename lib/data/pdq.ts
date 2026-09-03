/**
 * PDQ Deploy & Inventory data — download cards
 *
 * Extracted from app/PDQ/PDQDownloadCards.tsx.
 */

import { LOGOS } from '@/lib/data/logos'
import { URLS } from '@/lib/data/constants'
import type { BaseCard } from '@/lib/types/cards'

const BASE = URLS.pdq

/* ─── PDQ card type (download-specific fields) ───────────── */
export interface PDQCard extends BaseCard {
  logo: string
  downloadHref?: string
  downloadLabel?: string
  repoHref?: string
  xmlHref?: string
}

export interface PDQFeature {
  label: string
  available: boolean
  note?: string
}

export const pdqDeployFeatures: PDQFeature[] = [
  { label: 'Deploy software packages', available: true },
  { label: 'Execute custom scripts', available: true },
  { label: 'Configuration changes', available: true },
  { label: 'Core scheduled deployments', available: false, note: 'Restricted in evaluation mode' },
  { label: 'Step-level conditions', available: false, note: 'Restricted in evaluation mode' },
  { label: 'Remote control', available: false, note: 'Restricted in evaluation mode' },
]

export const pdqInventoryFeatures: PDQFeature[] = [
  { label: 'Scan hardware & software assets', available: true },
  { label: 'Monitor disk space & statuses', available: true },
  { label: 'Periodic automated scans', available: true },
  { label: 'Custom reports', available: false, note: 'Restricted in evaluation mode' },
  { label: 'Collection sharing with server', available: false, note: 'Restricted in evaluation mode' },
  { label: 'Automatic software updates', available: false, note: 'Not available in evaluation mode' },
]

/* ─── PDQ cards ──────────────────────────────────────────── */
export const pdqCards: PDQCard[] = [
  {
    id: 'deploy',
    title: 'PDQ Deploy',
    description: 'Deploy third-party software updates, custom scripts, and configuration changes to your on-premises Windows devices in minutes.',
    logo: LOGOS.pdq,
    glowColor: 'cyan',
    tags: ['PDQ Deploy', 'Windows', 'Software Deployment'],
    downloadHref: `${BASE}/PDQDeploy.exe`,
    downloadLabel: 'Download PDQ Deploy',
  },
  {
    id: 'inventory',
    title: 'PDQ Inventory',
    description: 'Scan, collect, and organize information from your on-premises Windows machines. Automate reporting and monitor software status and disk space.',
    logo: LOGOS.pdq,
    glowColor: 'indigo',
    tags: ['PDQ Inventory', 'Windows', 'Asset Management'],
    downloadHref: `${BASE}/PDQInventory.exe`,
    downloadLabel: 'Download PDQ Inventory',
  },
  {
    id: 'repo',
    title: 'CESC Repository',
    description: 'Browse the current PDQ Deploy Repository files, or download the CESC Packages.xml to import our standard deployment packages.',
    logo: LOGOS.pdq,
    glowColor: 'orange',
    tags: ['Repository', 'Packages.xml', 'CESC'],
    repoHref: `${BASE}/Repository`,
    xmlHref: `${BASE}/Packages.xml`,
  },
]
