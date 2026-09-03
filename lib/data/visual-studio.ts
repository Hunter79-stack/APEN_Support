/**
 * Visual Studio data — edition cards for the Visual Studio landing page
 *
 * Extracted from app/VisualStudio/VisualStudioCards.tsx.
 */

import { DOWNLOADS_PAGE_LOGOS } from '@/lib/data/logos'
import { URLS } from '@/lib/data/constants'
import type { BaseCard, DocCard } from '@/lib/types/cards'

const BASE = URLS.visualStudio

/* ─── Visual Studio card type ────────────────────────────── */
export interface VisualStudioCard extends BaseCard {
  logo: string
  href: string
  license: string
  latestVersion: string
  latestDate: string
}

export type VisualStudioEdition = 'enterprise' | 'professional' | 'community'

export interface VisualStudioRelease {
  /** Stable card id — the join key for admin overrides. */
  id: string
  /** Which edition page this row belongs to. */
  edition: VisualStudioEdition
  title: string
  version: string
  date: string
  installerHref: string
  layoutHref?: string
  notesHref?: string
}

/* ─── Visual Studio edition cards ────────────────────────── */
export const visualStudioCards: VisualStudioCard[] = [
  {
    id: 'enterprise',
    title: 'Visual Studio 2022 Enterprise',
    description: 'The most feature-rich IDE edition, designed for teams building high-quality applications across all platforms.',
    logo: DOWNLOADS_PAGE_LOGOS['/downloads/microsoft-products/VisualStudio/enterprise'],
    glowColor: 'cyan',
    tags: ['Enterprise', 'VS 2022', 'Full IDE', 'Offline Layout'],
    href: '/downloads/microsoft-products/VisualStudio/enterprise',
    license: 'Requires a valid Visual Studio Enterprise subscription or MSDN license.',
    latestVersion: '17.13',
    latestDate: '2025-02-11',
  },
  {
    id: 'professional',
    title: 'Visual Studio 2022 Professional',
    description: 'Essential developer tools for individual developers and small teams building professional applications.',
    logo: DOWNLOADS_PAGE_LOGOS['/downloads/microsoft-products/VisualStudio/professional'],
    glowColor: 'indigo',
    tags: ['Professional', 'VS 2022', 'Full IDE', 'Offline Layout'],
    href: '/downloads/microsoft-products/VisualStudio/professional',
    license: 'Requires a valid Visual Studio Professional subscription or MSDN license.',
    latestVersion: '17.13',
    latestDate: '2025-02-11',
  },
  {
    id: 'community',
    title: 'Visual Studio 2022 Community',
    description: 'A free, fully-featured IDE for students, open-source projects, and individual developers.',
    logo: DOWNLOADS_PAGE_LOGOS['/downloads/microsoft-products/VisualStudio/community'],
    glowColor: 'cyan',
    tags: ['Community', 'VS 2022', 'Free', 'Full IDE'],
    href: '/downloads/microsoft-products/VisualStudio/community',
    license: 'Free for individual developers, open-source projects, academic research, and small teams.',
    latestVersion: '17.13',
    latestDate: '2025-02-11',
  },
]

/**
 * One row per edition, in ONE array.
 *
 * Per-version bootstrapper EXEs and release-note PDFs were never mirrored — the
 * APEN carries ONE offline layout per edition (synced July 2025), and the
 * install guide page is the real entry point, so each edition has a single row.
 *
 * They were three separate single-entry arrays passed straight into a component
 * as a prop, which is why these three pages were the only content pages on the
 * site with NO admin wiring at all. Collapsing them into one id'd array gives
 * them a single editable scope ('visual-studio/releases') without inventing
 * three near-identical dropdown entries.
 */
export const visualStudioReleases: VisualStudioRelease[] = [
  {
    id: 'vs2022-enterprise',
    edition: 'enterprise',
    title: 'Visual Studio 2022 Enterprise',
    version: 'VS 2022 (offline layout)',
    date: '2025-07',
    installerHref: `${BASE}/vs2022enterprise.html`,
  },
  {
    id: 'vs2022-professional',
    edition: 'professional',
    title: 'Visual Studio 2022 Professional',
    version: 'VS 2022 (offline layout)',
    date: '2025-07',
    installerHref: `${BASE}/vs2022professional.html`,
  },
  {
    id: 'vs2022-community',
    edition: 'community',
    title: 'Visual Studio 2022 Community',
    version: 'VS 2022 (offline layout)',
    date: '2025-07',
    installerHref: `${BASE}/vs2022community.html`,
  },
]

/** Per-edition views, kept so existing imports keep resolving. */
export const visualStudioEnterpriseReleases: VisualStudioRelease[] =
  visualStudioReleases.filter((r) => r.edition === 'enterprise')
export const visualStudioProfessionalReleases: VisualStudioRelease[] =
  visualStudioReleases.filter((r) => r.edition === 'professional')
export const visualStudioCommunityReleases: VisualStudioRelease[] =
  visualStudioReleases.filter((r) => r.edition === 'community')

/* ─── Documentation & release notes (Visual Studio landing) ── */
export const visualStudioDocCards: DocCard[] = [
  {
    id: 'vs-docs',
    title: 'Visual Studio Documentation',
    description: 'Offline install guides for the Visual Studio 2022 layouts mirrored on the APEN — one per edition.',
    glowColor: 'cyan',
    tags: ['Release Notes', 'VS 2022', 'PDF'],
    links: [
      { label: 'Enterprise 2022 offline install guide', href: `${BASE}/vs2022enterprise.html`, kind: 'doc' },
      { label: 'Professional 2022 offline install guide', href: `${BASE}/vs2022professional.html`, kind: 'doc' },
      { label: 'Community 2022 offline install guide', href: `${BASE}/vs2022community.html`, kind: 'doc' },
    ],
  },
]
