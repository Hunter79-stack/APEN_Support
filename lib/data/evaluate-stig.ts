/**
 * Evaluate-STIG data — category cards for the landing page plus the
 * download cards used on /evaluate-stig/documents.
 *
 * The component files import these directly via useCardOverrides so admins
 * can patch any field through the AdminContentEditor.
 */

import { DOCS_PAGE_LOGOS, LOGOS } from '@/lib/data/logos'
import { URLS } from '@/lib/data/constants'
import type { BaseCard, DownloadLink, NavCard, DocCard } from '@/lib/types/cards'

const STIG_BASE = URLS.evaluateStig

/* ─── Download-card type for /evaluate-stig/documents ────── */
export interface EvalDocCard extends BaseCard {
  downloads: DownloadLink[]
}

/**
 * Featured "download the tool" card, surfaced at the top of the
 * /evaluate-stig/ landing page so admins don't have to drill into the
 * Documents subpage to grab the actual archive. Also linked from the
 * global Downloads navbar group via /evaluate-stig.
 *
 * Kept as its own export rather than living inside evalDocCards so the
 * Documents page renders only the document-style cards (User Guide,
 * ChangeLog, etc.) and the landing page can render the download as a
 * single hero card without coupling the two layouts together.
 */
export interface EvalStigToolDownload {
  title: string
  description: string
  /**
   * Version of the archive actually staged on the APEN, shown on the card the
   * way the ISO tiles show theirs — an admin should not have to download the
   * tarball to find out whether it is newer than what they are running.
   *
   * Read from the shipped payload, not guessed: Evaluate-STIG.tar.gz contains
   * `$EvaluateStigVersion = "1.2604.2"`, matching the
   * evaluate-stig-1.2604.2-master.zip beside it on the webroot. Re-check this
   * whenever the tarball is replaced.
   */
  version?: string
  tags: string[]
  logo: string
  download: DownloadLink
}

export const evalStigToolDownload: EvalStigToolDownload = {
  title: 'Download Evaluate-STIG',
  description:
    'Evaluate-STIG is a PowerShell tool for automating STIG scans. Outputs results to CKL and CKLB formats.',
  version: '1.2604.2',
  tags: ['TAR.GZ', 'PowerShell', 'STIG'],
  logo: LOGOS.evaluateStig,
  download: { label: 'Evaluate-STIG (TAR.GZ)', href: `${STIG_BASE}/Evaluate-STIG.tar.gz` },
}

export const evalDocCards: EvalDocCard[] = [
  {
    id: 'userguide',
    title: 'User Guide',
    description: 'The official Evaluate-STIG User Guide PDF covering installation, configuration, and usage.',
    glowColor: 'indigo',
    tags: ['PDF', 'User Guide', 'Documentation'],
    downloads: [
      { label: 'Evaluate-STIG_UserGuide.pdf', href: `${STIG_BASE}/Evaluate-STIG/Doc/Evaluate-STIG_UserGuide.pdf` },
    ],
  },
  {
    id: 'changelog',
    title: 'ChangeLog',
    description: 'Version history and release notes documenting changes across Evaluate-STIG versions.',
    glowColor: 'indigo',
    tags: ['PDF', 'ChangeLog', 'Versions'],
    downloads: [
      { label: 'CHANGELOG.pdf', href: `${STIG_BASE}/Evaluate-STIG/Doc/CHANGELOG.pdf` },
    ],
  },
  {
    id: 'stigmgr',
    title: 'Output to STIG-Manager',
    description: 'Guide for configuring Evaluate-STIG to send output directly to STIG-Manager.',
    glowColor: 'orange',
    tags: ['STIG-Manager', 'PDF', 'Integration'],
    downloads: [
      { label: 'Evaluate-STIG_to_STIG_Manager_Guide.pdf', href: `${STIG_BASE}/Evaluate-STIG/Doc/Evaluate-STIG_to_STIG_Manager_Guide.pdf` },
    ],
  },
]

/**
 * Tool downloads, moved off /docs/evaluate-stig/documents to
 * /downloads/evaluate-stig.
 *
 * The documents page is for reading material — the User Guide, the ChangeLog,
 * the STIG-Manager integration guide. These two are payloads you install or
 * unpack (four STIG Viewer builds, the STIG library and GPO package ZIPs), so
 * they belong under /downloads with the rest of the software.
 *
 * Card ids are unchanged (`stigviewer`, `library`) and downloads[] keeps its
 * shape, so any admin edit saved against them still applies after the move —
 * only the scope they are edited under changes.
 */
export const evalToolCards: EvalDocCard[] = [
  {
    id: 'stigviewer',
    title: 'STIG Viewer Downloads',
    description: 'STIG Viewer 3.6.0 and 2.18 for Windows and Linux — required for viewing STIG checklists.',
    glowColor: 'cyan',
    tags: ['STIG Viewer', 'Windows', 'Linux'],
    downloads: [
      { label: 'STIG Viewer 3-6-0 Win32 x64 (MSI)',   href: `${STIG_BASE}/U_STIGViewer_3-6-0_win32_x64.msi` },
      { label: 'STIG Viewer 2-18 Win64 (MSI)',        href: `${STIG_BASE}/U_STIGViewer_2-18_Win64.msi` },
      { label: 'STIG Viewer 3-6-0 Linux x64 (TAR.GZ)', href: `${STIG_BASE}/stig-viewer-linux_x64-3-6-0.tar.gz` },
      { label: 'STIG Viewer 2-18 Linux (TAR.GZ)',     href: `${STIG_BASE}/stig-viewer_2-18_linux.tar.gz` },
    ],
  },
  {
    id: 'library',
    title: 'STIG Library & GPO Package',
    description: 'U_SRG-STIG_Library_April_2026 — the latest consolidated STIG library ZIP, plus the STIG GPO package.',
    glowColor: 'orange',
    tags: ['Library', 'GPO', 'ZIP', 'April 2026'],
    downloads: [
      { label: 'U_SRG-STIG_Library_April_2026 (ZIP)', href: `${STIG_BASE}/U_SRG-STIG_Library_April_2026.zip` },
      { label: 'U_STIG_GPO_Package_April_2026 (ZIP)', href: `${STIG_BASE}/U_STIG_GPO_Package_April_2026.zip` },
    ],
  },
]

/* ─── Documentation & release notes (evaluate-stig landing) ── */
export const evalStigDocCards: DocCard[] = [
  {
    id: 'userguide',
    title: 'User Guide',
    description: 'The official Evaluate-STIG User Guide covering installation, configuration, and usage.',
    glowColor: 'indigo',
    tags: ['PDF', 'User Guide'],
    links: [
      { label: 'Evaluate-STIG_UserGuide.pdf', href: `${STIG_BASE}/Evaluate-STIG/Doc/Evaluate-STIG_UserGuide.pdf`, kind: 'guide' },
    ],
  },
  {
    id: 'changelog',
    title: 'Release Notes (ChangeLog)',
    description: 'Version history and release notes documenting changes across Evaluate-STIG versions.',
    glowColor: 'cyan',
    tags: ['PDF', 'Release Notes'],
    links: [
      { label: 'CHANGELOG.pdf', href: `${STIG_BASE}/Evaluate-STIG/Doc/CHANGELOG.pdf`, kind: 'release-notes' },
    ],
  },
  {
    id: 'all-docs',
    title: 'All Documents',
    description: 'The STIG-Manager integration guide and the rest of the Evaluate-STIG documentation.',
    glowColor: 'orange',
    tags: ['Guides', 'Documentation'],
    links: [
      { label: 'Browse all Evaluate-STIG documents', href: '/docs/evaluate-stig/documents', kind: 'doc' },
    ],
  },
]

/* ─── Category cards (evaluate-stig landing page) ────────── */
export const evaluateSTIGCategoryCards: NavCard[] = [
  {
    id: 'documents',
    title: 'Evaluate-STIG Documents',
    description: 'User Guide, ChangeLog, and the STIG-Manager integration guide.',
    logo: DOCS_PAGE_LOGOS['/docs/evaluate-stig/documents'],
    glowColor: 'cyan',
    tags: ['Docs', 'Guides', 'PDF'],
    href: '/docs/evaluate-stig/documents',
    hrefLabel: 'View documents →',
    itemCount: '3 documents',
  },
  {
    id: 'enterprise-linux',
    title: 'Enterprise Linux Guides',
    description: 'Run Evaluate-STIG on AlmaLinux 8 & 9, CentOS 7, and Rocky Linux 8 & 9.',
    logo: DOCS_PAGE_LOGOS['/docs/evaluate-stig/linux/enterprise'],
    glowColor: 'indigo',
    tags: ['AlmaLinux', 'Rocky Linux', 'CentOS', 'RHEL'],
    href: '/docs/evaluate-stig/linux/enterprise',
    hrefLabel: 'View Enterprise Linux guides →',
    itemCount: '5 distros',
  },
  {
    id: 'ubuntu',
    title: 'Ubuntu Guides',
    description: 'Run Evaluate-STIG on Ubuntu 22 and Ubuntu 24.',
    logo: DOCS_PAGE_LOGOS['/docs/evaluate-stig/linux/ubuntu'],
    glowColor: 'orange',
    tags: ['Ubuntu 22', 'Ubuntu 24'],
    href: '/docs/evaluate-stig/linux/ubuntu',
    hrefLabel: 'View Ubuntu guides →',
    itemCount: '2 versions',
  },
]
