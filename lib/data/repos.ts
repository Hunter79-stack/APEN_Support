/**
 * Repository data — category cards, DEB repo cards, and RPM repo cards
 *
 * Extracted from app/repos/*Cards.tsx files.
 */

import { DOCS_PAGE_LOGOS, LOGOS, OS_LOGOS } from '@/lib/data/logos'
import { URLS } from '@/lib/data/constants'
import type { NavCard, RepoCard, RPMRepoCard } from '@/lib/types/cards'

const RPM_BASE = URLS.reposRpm
const DEB_BASE = URLS.reposDeb

/* ─── Category cards (repos landing page) ────────────────── */
export const reposCategoryCards: NavCard[] = [
  {
    id: 'rpm',
    title: 'Enterprise Linux Repositories',
    description: 'Mirrored RPM-based repositories for AlmaLinux, RockyLinux, and CentOS. Includes OS packages, Microsoft, and PowerShell repos.',
    logo: DOCS_PAGE_LOGOS['/docs/repos/rpm'],
    glowColor: 'cyan',
    tags: ['AlmaLinux', 'RockyLinux', 'CentOS', 'RPM', 'DNF/YUM'],
    href: '/docs/repos/rpm',
    hrefLabel: 'View repository guides →',
  },
  {
    id: 'deb',
    title: 'Ubuntu Repositories',
    description: 'Mirrored DEB-based repositories for Ubuntu 22, 24, and 26 providing secure package updates over the APEN.',
    logo: DOCS_PAGE_LOGOS['/docs/repos/deb'],
    glowColor: 'indigo',
    tags: ['Ubuntu 22', 'Ubuntu 24','Ubuntu 26', 'DEB', 'APT'],
    href: '/docs/repos/deb',
    hrefLabel: 'View repository guides →',
  },
  {
    id: 'pip',
    title: 'PIP Package Repository',
    description: 'Internal Python package index mirroring PyPI packages for offline pip installs across the APEN.',
    logo: DOCS_PAGE_LOGOS['/docs/repos/pip'],
    glowColor: 'cyan',
    tags: ['Python', 'pip', 'PyPI mirror'],
    href: '/docs/repos/pip',
    hrefLabel: 'View repository guides →',
  },
]

/* ─── DEB repo cards (repos/deb) ─────────────────────────── */
export const debRepoCards: RepoCard[] = [
  {
    id: 'ubuntu22',
    title: 'Ubuntu 22 Repository',
    description: 'Mirrored APT repository for Ubuntu 22.04 LTS (Jammy Jellyfish). Use to install packages without internet access.',
    codename: 'Jammy Jellyfish',
    logo: LOGOS.ubuntu,
    glowColor: 'cyan',
    tags: ['Ubuntu 22.04', 'Jammy', 'APT', 'DEB'],
    repoLine: `deb [trusted=yes] ${DEB_BASE}/ubuntu22 jammy main`,
    sourceFile: '/etc/apt/sources.list.d/apen.list',
  },
  {
    id: 'ubuntu24',
    title: 'Ubuntu 24 Repository',
    description: 'Mirrored APT repository for Ubuntu 24.04 LTS (Noble Numbat). Use to install packages without internet access.',
    codename: 'Noble Numbat',
    logo: LOGOS.ubuntu,
    glowColor: 'indigo',
    tags: ['Ubuntu 24.04', 'Noble', 'APT', 'DEB'],
    repoLine: `deb [trusted=yes] ${DEB_BASE}/ubuntu24 noble main`,
    sourceFile: '/etc/apt/sources.list.d/apen.list',
  },
]

/* ─── RPM repo cards (repos/rpm) ─────────────────────────── */
export const rpmRepoCards: RPMRepoCard[] = [
  {
    id: 'alma8',
    title: 'AlmaLinux 8',
    description: 'Mirrored BaseOS and AppStream repositories for AlmaLinux 8 x86_64.',
    logo: OS_LOGOS.alma,
    glowColor: 'cyan',
    tags: ['AlmaLinux 8', 'BaseOS', 'AppStream', 'RPM'],
    accent: 'text-cyan-400',
    repos: [
      { label: 'AlmaLinux 8 BaseOS',    file: 'apen-alma8-baseos.repo',    href: `${RPM_BASE}/apen-alma8-baseos.repo` },
      { label: 'AlmaLinux 8 AppStream', file: 'apen-alma8-appstream.repo', href: `${RPM_BASE}/apen-alma8-appstream.repo` },
    ],
  },
  {
    id: 'alma9',
    title: 'AlmaLinux 9',
    description: 'Mirrored BaseOS and AppStream repositories for AlmaLinux 9 x86_64.',
    logo: OS_LOGOS.alma,
    glowColor: 'cyan',
    tags: ['AlmaLinux 9', 'BaseOS', 'AppStream', 'RPM'],
    accent: 'text-cyan-400',
    repos: [
      { label: 'AlmaLinux 9 BaseOS',    file: 'apen-alma9-baseos.repo',    href: `${RPM_BASE}/apen-alma9-baseos.repo` },
      { label: 'AlmaLinux 9 AppStream', file: 'apen-alma9-appstream.repo', href: `${RPM_BASE}/apen-alma9-appstream.repo` },
    ],
  },
  {
    id: 'rocky',
    title: 'RockyLinux 8 & 9',
    description: 'Mirrored BaseOS repositories for RockyLinux 8 and RockyLinux 9.',
    logo: OS_LOGOS.rocky,
    glowColor: 'indigo',
    tags: ['RockyLinux 8', 'RockyLinux 9', 'BaseOS', 'RPM'],
    accent: 'text-indigo-400',
    repos: [
      { label: 'RockyLinux 8 BaseOS', file: 'apen-rocky8-baseos.repo', href: `${RPM_BASE}/apen-rocky8-baseos.repo` },
      { label: 'RockyLinux 9 BaseOS', file: 'apen-rocky9-baseos.repo', href: `${RPM_BASE}/apen-rocky9-baseos.repo` },
    ],
  },
  {
    id: 'microsoft',
    title: 'Microsoft RHEL9',
    description: 'Microsoft production client repository configuration for RHEL 9 systems.',
    logo: LOGOS.windows,
    glowColor: 'orange',
    tags: ['Microsoft', 'RHEL 9', 'Repository', 'Guide'],
    accent: 'text-amber-400',
    repos: [
      { label: 'Microsoft RHEL9 Prod Repo', file: 'ms-rhel9-prod-client-repository-configuration.html', href: `${RPM_BASE}/guides/ms-rhel9-prod-client-repository-configuration.html` },
    ],
  },
]
