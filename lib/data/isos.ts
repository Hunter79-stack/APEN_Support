/**
 * ISO download data — category cards and individual ISO entries
 *
 * Extracted from app/isos/*Cards.tsx files.
 */

import { DOWNLOADS_PAGE_LOGOS, LOGOS, OS_LOGOS } from '@/lib/data/logos'
import { URLS } from '@/lib/data/constants'
import type { NavCard, ISOCard } from '@/lib/types/cards'

const BASE = URLS.isos

/* ─── Category cards (ISOs landing page) ─────────────────── */
export const isoCategoryCards: NavCard[] = [
  {
    id: 'el',
    title: 'Enterprise Linux',
    description: 'AlmaLinux 8 & 9, CentOS 7, and RockyLinux 8 & 9 DVD ISO images.',
    logo: DOWNLOADS_PAGE_LOGOS['/downloads/iso/linux/enterprise'],
    glowColor: 'cyan',
    tags: ['AlmaLinux', 'CentOS 7', 'RockyLinux'],
    href: '/downloads/iso/linux/enterprise',
    hrefLabel: 'Browse ISOs →',
    itemCount: '5 ISOs',
  },
  {
    id: 'ubuntu',
    title: 'Ubuntu Linux',
    description: 'Ubuntu 22, 24, and 25 Desktop and Server images for amd64.',
    logo: DOWNLOADS_PAGE_LOGOS['/downloads/iso/linux/ubuntu'],
    glowColor: 'indigo',
    tags: ['Ubuntu 22', 'Ubuntu 24', 'Ubuntu 25'],
    href: '/downloads/iso/linux/ubuntu',
    hrefLabel: 'Browse ISOs →',
    itemCount: '6 ISOs',
  },
  {
    id: 'windows',
    title: 'MS Windows',
    description: 'Windows 11 Pro, Server 2022, Server 2025, and Windows Admin Center.',
    logo: DOWNLOADS_PAGE_LOGOS['/downloads/iso/windows'],
    glowColor: 'orange',
    tags: ['Win 11 Pro', 'Server 2022', 'Server 2025'],
    href: '/downloads/iso/windows',
    hrefLabel: 'Browse ISOs →',
    itemCount: '4 images',
  },
]

/* ─── Enterprise Linux ISOs ──────────────────────────────── */
export const linuxISOCards: ISOCard[] = [
  {
    id: 'alma8',
    title: 'AlmaLinux 8',
    description: 'A community-driven, enterprise-grade Linux distribution, binary compatible with RHEL 8.',
    logo: OS_LOGOS.alma,
    glowColor: 'cyan',
    tags: ['AlmaLinux', 'v8', 'x86_64', 'DVD ISO'],
    file: 'AlmaLinux-8-latest-x86_64-dvd.iso',
    href: `${BASE}/AlmaLinux-8-latest-x86_64-dvd.iso`,
  },
  {
    id: 'alma9',
    title: 'AlmaLinux 9',
    description: 'The latest stable branch, binary compatible with RHEL 9.',
    logo: OS_LOGOS.alma,
    glowColor: 'cyan',
    tags: ['AlmaLinux', 'v9', 'x86_64', 'DVD ISO'],
    file: 'AlmaLinux-9-latest-x86_64-dvd.iso',
    href: `${BASE}/AlmaLinux-9-latest-x86_64-dvd.iso`,
  },
  {
    id: 'centos7',
    title: 'CentOS 7',
    description: 'Everything ISO (2009 release). Final major release of CentOS 7 before EOL.',
    logo: OS_LOGOS.centos,
    glowColor: 'indigo',
    tags: ['CentOS', 'v7', 'x86_64', 'Everything ISO'],
    file: 'CentOS-7-x86_64-Everything-2009.iso',
    href: `${BASE}/CentOS-7-x86_64-Everything-2009.iso`,
  },
  {
    id: 'rocky8',
    title: 'RockyLinux 8',
    description: 'Community enterprise OS designed to be 100% bug-for-bug compatible with RHEL 8.',
    logo: OS_LOGOS.rocky,
    glowColor: 'indigo',
    tags: ['RockyLinux', 'v8', 'x86_64', 'DVD ISO'],
    file: 'Rocky-8-latest-x86_64-dvd.iso',
    href: `${BASE}/Rocky-8-latest-x86_64-dvd.iso`,
  },
  {
    id: 'rocky9',
    title: 'RockyLinux 9',
    description: 'The latest stable Rocky Linux release, compatible with RHEL 9.',
    logo: OS_LOGOS.rocky,
    glowColor: 'orange',
    tags: ['RockyLinux', 'v9', 'x86_64', 'DVD ISO'],
    file: 'Rocky-9-latest-x86_64-dvd.iso',
    href: `${BASE}/Rocky-9-latest-x86_64-dvd.iso`,
  },
]

/* ─── Ubuntu ISOs ────────────────────────────────────────── */
export const ubuntuISOCards: ISOCard[] = [
  {
    id: 'ubuntu22-desktop',
    title: 'Ubuntu 22.04 LTS Desktop',
    description: 'Ubuntu 22.04 LTS Desktop (Jammy Jellyfish) — amd64. Long-term support release with full GUI environment.',
    logo: OS_LOGOS.ubuntu,
    glowColor: 'orange',
    tags: ['Ubuntu 22.04', 'LTS', 'Desktop', 'amd64'],
    file: 'ubuntu-22.04-desktop-latest-amd64.iso',
    href: `${BASE}/ubuntu-22.04-desktop-latest-amd64.iso`,
  },
  {
    id: 'ubuntu22-server',
    title: 'Ubuntu 22.04 LTS Server',
    description: 'Ubuntu 22.04 LTS Server (Jammy Jellyfish) — amd64. Minimal server image for headless deployment.',
    logo: OS_LOGOS.ubuntu,
    glowColor: 'orange',
    tags: ['Ubuntu 22.04', 'LTS', 'Server', 'amd64'],
    file: 'ubuntu-22.04-live-server-latest-amd64.iso',
    href: `${BASE}/ubuntu-22.04-live-server-latest-amd64.iso`,
  },
  {
    id: 'ubuntu24-desktop',
    title: 'Ubuntu 24.04 LTS Desktop',
    description: 'Ubuntu 24.04 LTS Desktop (Noble Numbat) — amd64. The latest long-term support release with GUI.',
    logo: OS_LOGOS.ubuntu,
    glowColor: 'indigo',
    tags: ['Ubuntu 24.04', 'LTS', 'Desktop', 'amd64'],
    file: 'ubuntu-24.04-desktop-latest-amd64.iso',
    href: `${BASE}/ubuntu-24.04-desktop-latest-amd64.iso`,
  },
  {
    id: 'ubuntu24-server',
    title: 'Ubuntu 24.04 LTS Server',
    description: 'Ubuntu 24.04 LTS Server (Noble Numbat) — amd64. Streamlined server image for production workloads.',
    logo: OS_LOGOS.ubuntu,
    glowColor: 'indigo',
    tags: ['Ubuntu 24.04', 'LTS', 'Server', 'amd64'],
    file: 'ubuntu-24.04-live-server-latest-amd64.iso',
    href: `${BASE}/ubuntu-24.04-live-server-latest-amd64.iso`,
  },
  {
    id: 'ubuntu25-desktop',
    title: 'Ubuntu 26.04 Desktop',
    description: 'Ubuntu 26.04 Desktop — amd64. The current release mirrored on the APEN; the file is kept at the latest build by the mirror sync.',
    logo: OS_LOGOS.ubuntu,
    glowColor: 'cyan',
    tags: ['Ubuntu 26.04', 'Desktop', 'amd64'],
    file: 'ubuntu-26.04-desktop-latest-amd64.iso',
    href: `${BASE}/ubuntu-26.04-desktop-latest-amd64.iso`,
  },
  {
    id: 'ubuntu25-server',
    title: 'Ubuntu 26.04 Server',
    description: 'Ubuntu 26.04 Server — amd64. The current release mirrored on the APEN; the file is kept at the latest build by the mirror sync.',
    logo: OS_LOGOS.ubuntu,
    glowColor: 'cyan',
    tags: ['Ubuntu 26.04', 'Server', 'amd64'],
    file: 'ubuntu-26.04-live-server-latest-amd64.iso',
    href: `${BASE}/ubuntu-26.04-live-server-latest-amd64.iso`,
  },
]

/* ─── Windows ISOs ───────────────────────────────────────── */
export const windowsISOCards: ISOCard[] = [
  {
    id: 'win11pro',
    title: 'Windows 11 Pro 25H2',
    description: 'Windows 11 Pro 25H2 — Non-SHB (non-Security Hardware Baseline) ISO for standard deployment on approved hardware.',
    logo: LOGOS.windows,
    glowColor: 'cyan',
    tags: ['Windows 11', 'Pro', '25H2', 'Non-SHB', 'ISO'],
    file: 'Win11Pro_25H2_Non-SHB.iso',
    href: `${BASE}/Win11Pro_25H2_Non-SHB.iso`,
  },
  {
    id: 'server2022',
    title: 'Windows Server 2022',
    description: 'Windows Server 2022 Standard/Datacenter — 64-bit ISO (21H2). Long-term servicing channel release for enterprise server workloads.',
    logo: LOGOS.windows,
    glowColor: 'indigo',
    tags: ['Server 2022', '64-bit', '21H2', 'LTSC', 'ISO'],
    file: 'Win_Server_2022_64Bit_21H2.iso',
    href: `${BASE}/Win_Server_2022_64Bit_21H2.iso`,
  },
  {
    id: 'server2025',
    title: 'Windows Server 2025',
    description: 'Windows Server 2025 Standard/Datacenter — 64-bit ISO (24H2). The latest Windows Server release with improved security and cloud features.',
    logo: LOGOS.windows,
    glowColor: 'indigo',
    tags: ['Server 2025', '64-bit', '24H2', 'LTSC', 'ISO'],
    file: 'Win_Server_2025_64Bit_24H2.iso',
    href: `${BASE}/Win_Server_2025_64Bit_24H2.iso`,
  },
]
