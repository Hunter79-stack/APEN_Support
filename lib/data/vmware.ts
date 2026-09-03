/**
 * VMware product data — all versions, patches, and tools
 *
 * Extracted from app/vmware/*Cards.tsx files.
 */

import { DOWNLOADS_PAGE_LOGOS, LOGOS } from '@/lib/data/logos'
import { URLS } from '@/lib/data/constants'
import type { NavCard, VMwareProductCard, DownloadCard, DocCard } from '@/lib/types/cards'

const BASE = URLS.vmware

/* ─── Category cards (VMware landing page) ───────────────── */
export const vmwareCategoryCards: NavCard[] = [
  {
    id: 'v9',
    title: 'VMware 9 Products',
    description: 'VMware vCenter Server 9 and vSphere Hypervisor (ESXi) 9 installer images.',
    logo: DOWNLOADS_PAGE_LOGOS['/downloads/vmware/v9'],
    glowColor: 'cyan',
    tags: ['vCenter 9', 'ESXi 9', 'ISO'],
    href: '/downloads/vmware/v9',
    hrefLabel: 'View VMware 9 downloads →',
    itemCount: '2 products',
  },
  {
    id: 'v8',
    title: 'VMware 8 Products',
    description: 'VMware vCenter Server 8 and vSphere Hypervisor (ESXi) 8 with full patch history.',
    logo: DOWNLOADS_PAGE_LOGOS['/downloads/vmware/v8'],
    glowColor: 'cyan',
    tags: ['vCenter 8', 'ESXi 8', 'Patches', 'ISO'],
    href: '/downloads/vmware/v8',
    hrefLabel: 'View VMware 8 downloads →',
    itemCount: '2 products · 8 patches',
  },
  {
    id: 'v7',
    title: 'VMware 7 Products',
    description: 'VMware vCenter Server 7 and vSphere Hypervisor (ESXi) 7 with patch history.',
    logo: DOWNLOADS_PAGE_LOGOS['/downloads/vmware/v7'],
    glowColor: 'indigo',
    tags: ['vCenter 7', 'ESXi 7', 'Patches', 'ISO'],
    href: '/downloads/vmware/v7',
    hrefLabel: 'View VMware 7 downloads →',
    itemCount: '2 products · 4 patches',
  },
  {
    id: 'tools',
    title: 'VMware Tools',
    description: 'VMware Tools, VMRC (Remote Console), and Workstation Pro downloads for Windows and Linux.',
    logo: DOWNLOADS_PAGE_LOGOS['/downloads/vmware/tools'],
    glowColor: 'orange',
    tags: ['VMware Tools', 'VMRC', 'Workstation Pro'],
    href: '/downloads/vmware/tools',
    hrefLabel: 'View VMware Tools →',
    itemCount: '3 downloads',
  },
]

/* ─── VMware 9 products ──────────────────────────────────── */
export const vmware9Products: VMwareProductCard[] = [
  {
    id: 'vcenter9',
    title: 'VMware vCenter Server 9',
    version: '9.0',
    logo: LOGOS.vmwareScreenshot,
    glowColor: 'cyan',
    tags: ['vCenter', 'v9.0', 'ISO'],
    description: 'vCenter Server Appliance 9.0 full installer image.',
    installer: {
      label: 'Not yet mirrored — request via APEN support',
      href: '/support',
      desc: 'vCenter Server Appliance 9.0 is not on the APEN mirror yet. Contact the support desk to request the media.',
    },
  },
  {
    id: 'esxi9',
    title: 'VMware vSphere Hypervisor (ESXi) 9',
    version: '9.0',
    logo: LOGOS.vmwareScreenshot,
    glowColor: 'indigo',
    tags: ['ESXi', 'v9.0', 'ISO'],
    description: 'ESXi 9.0 full installer image for x86_64 systems.',
    installer: {
      label: 'Not yet mirrored — request via APEN support',
      href: '/support',
      desc: 'ESXi 9.0 is not on the APEN mirror yet. Contact the support desk to request the media.',
    },
  },
]

/* ─── VMware 8 products ──────────────────────────────────── */
export const vmware8Products: VMwareProductCard[] = [
  {
    id: 'vcenter8',
    title: 'VMware vCenter Server 8',
    logo: LOGOS.vmwareScreenshot,
    glowColor: 'cyan',
    tags: ['vCenter', 'v8.0', 'ISO', 'Patches'],
    description: 'vCenter Server Appliance 8.0 — latest: Update 3k (Build 25600417, 2026-07-29).',
    installer: {
      label: 'VMware-VCSA-all-8.0.3-25600417 (ISO)',
      href: `${BASE}/8/VMware-VCSA-all-8.0.3-25600417.iso`,
      desc: 'Includes UI and CLI installer for vCenter Server Appliance, vSphere Update Manager, and UMDS.',
    },
    updateBundle: {
      label: 'VMware-vCenter-Server-Appliance-8.0.3.01000-25600417-updaterepo (ZIP)',
      href: `${BASE}/8/VMware-vCenter-Server-Appliance-8.0.3.01000-25600417-updaterepo.zip`,
      desc: 'Use to update from any vCenter Server Appliance 8.0.x to 8.0U3k.',
    },
    patches: [
      { build: 'Update 3k — Build 25600417', release: '2026-07-29', dlHref: `${BASE}/8/VMware-vCenter-Server-Appliance-8.0.3.01000-25600417-patch-FP.iso`, notesHref: `${BASE}/8/vsphere-vcenter-server-80u3k-release-notes.pdf` },
      { build: 'Update 3j — Build 25413364', release: '2026-05-27', dlHref: `${BASE}/8/VMware-vCenter-Server-Appliance-8.0.3.00900-25413364-patch-FP.iso`, notesHref: `${BASE}/8/vsphere-vcenter-server-80u3j-release-notes.pdf` },
      { build: 'Update 3i — Build 25197330', release: '2026-02-23', dlHref: `${BASE}/8/VMware-vCenter-Server-Appliance-8.0.3.00800-25197330-patch-FP.iso`, notesHref: `${BASE}/8/vsphere-vcenter-server-80u3i-release-notes.pdf` },
      { build: 'Update 3h — Build 25092719', release: '2025-12-15', dlHref: `${BASE}/8/VMware-vCenter-Server-Appliance-8.0.3.00700-25092719-patch-FP.iso`, notesHref: `${BASE}/8/vsphere-vcenter-server-80u3h-release-notes.pdf` },
    ],
  },
  {
    id: 'esxi8',
    title: 'VMware vSphere Hypervisor (ESXi) 8',
    logo: LOGOS.vmwareScreenshot,
    glowColor: 'indigo',
    tags: ['ESXi', 'v8.0', 'ISO', 'Patches'],
    description: 'ESXi 8.0 — latest: Update 3k (Build 25595708, 2026-07-29).',
    installer: {
      label: 'VMware-VMvisor-Installer-8.0U3j-25429389.x86_64 (ISO)',
      href: `${BASE}/8/VMware-VMvisor-Installer-8.0U3j-25429389.x86_64.iso`,
      desc: 'ESXi 8.0 Update 3 full installer image.',
    },
    patches: [
      { build: 'ESXi 8.0 Update 3k — Build 25595708', release: '2026-07-29', dlHref: `${BASE}/8/VMware-ESXi-8.0U3k-25595708-depot.zip`, notesHref: `${BASE}/8/vsphere-esxi-80u3k-release-notes.pdf` },
      { build: 'ESXi 8.0 Update 3j — Build 25429389', release: '2026-05-27', dlHref: `${BASE}/8/VMware-ESXi-8.0U3j-25429389-depot.zip`, notesHref: `${BASE}/8/vsphere-esxi-80u3j-release-notes.pdf` },
      { build: 'ESXi 8.0 Update 3i — Build 25205845', release: '2026-02-23', dlHref: `${BASE}/8/VMware-ESXi-8.0U3i-25205845-depot.zip`, notesHref: `${BASE}/8/vsphere-esxi-80u3i-release-notes.pdf` },
      { build: 'ESXi 8.0 Update 3h — Build 25067014', release: '2025-12-15', dlHref: `${BASE}/8/VMware-ESXi-8.0U3h-25067014-depot.zip`, notesHref: `${BASE}/8/vsphere-esxi-80u3h-release-notes.pdf` },
    ],
  },
]

/* ─── VMware 7 products ──────────────────────────────────── */
export const vmware7Products: VMwareProductCard[] = [
  {
    id: 'vcenter7',
    title: 'VMware vCenter Server 7',
    logo: LOGOS.vmwareScreenshot,
    glowColor: 'cyan',
    tags: ['vCenter', 'v7.0', 'ISO', 'Patches'],
    description: 'vCenter Server Appliance 7.0 — latest: Update 3s (2025-06-10).',
    installer: {
      label: 'VMware-VCSA-all-7.0.3-24730281 (ISO)',
      href: `${BASE}/7/VMware-VCSA-all-7.0.3-24730281.iso`,
      desc: 'vCenter Server Appliance 7.0.3 installer (build 24730281 — the image mirrored on the APEN).',
    },
    patches: [
      { build: 'Update 3s', release: '2025-06-10', dlHref: `${BASE}/7/VMware-vCenter-Server-Appliance-7.0.3.01800-22837322-patch-FP.iso`, notesHref: `${BASE}/7/vsphere-vcenter-server-70u3s-release-notes.pdf` },
      { build: 'Update 3r', release: '2025-02-20', dlHref: `${BASE}/7/VMware-vCenter-Server-Appliance-7.0.3.01700-22357613-patch-FP.iso`, notesHref: `${BASE}/7/vsphere-vcenter-server-70u3r-release-notes.pdf` },
    ],
  },
  {
    id: 'esxi7',
    title: 'VMware vSphere Hypervisor (ESXi) 7',
    logo: LOGOS.vmwareScreenshot,
    glowColor: 'indigo',
    tags: ['ESXi', 'v7.0', 'ISO', 'Patches'],
    description: 'ESXi 7.0 — latest: Update 3s (2025-06-10).',
    installer: {
      label: 'VMware-VMvisor-Installer-7.0U3n.x86_64 (ISO)',
      href: `${BASE}/7/VMware-VMvisor-Installer-7.0U3n-21930508.x86_64.iso`,
      desc: 'ESXi 7.0 Update 3n full installer image (the ISO mirrored on the APEN; later updates ship as depot patches above).',
    },
    patches: [
      { build: 'ESXi 7.0 Update 3s', release: '2025-06-10', dlHref: `${BASE}/7/VMware-ESXi-7.0U3s-24585291-depot.zip`, notesHref: `${BASE}/7/vsphere-esxi-70u3s-release-notes.pdf` },
      { build: 'ESXi 7.0 Update 3r', release: '2025-02-20', dlHref: `${BASE}/7/VMware-ESXi-7.0U3r-24411414-depot.zip`, notesHref: `${BASE}/7/vsphere-esxi-70u3r-release-notes.pdf` },
    ],
  },
]

/* ─── VMware Tools & Guides ──────────────────────────────── */
export const vmwareToolCards: DownloadCard[] = [
  {
    id: 'vmtools',
    title: 'VMware Tools',
    description: 'Guest OS utilities that improve performance and interaction between the VM and host. Available for Windows and Linux.',
    logo: LOGOS.vmwareToolsIcon,
    glowColor: 'cyan',
    tags: ['VMware Tools', 'Windows', 'Linux'],
    downloads: [
      // Real filenames from /vmware/vmware-tools. These used to read
      // "…-latest.exe" / "…-latest.tar.gz" under a /vmware/tools folder that has
      // never existed upstream, so every link 404'd. There is no Linux tarball
      // on the mirror — Linux guests take open-vm-tools from the distro repos —
      // so the ESXi offline depot fills that slot rather than a dead link.
      { label: 'VMware Tools 13.1.0 for Windows (.exe)', href: `${BASE}/vmware-tools/VMware-tools-windows-13.1.0-25218885-x64.exe` },
      { label: 'VMware Tools 13.1.0 for Windows (.iso)', href: `${BASE}/vmware-tools/VMware-tools-windows-13.1.0-25218885.iso` },
      { label: 'VMware Tools 13.1.0 ESXi offline depot (.zip)', href: `${BASE}/vmware-tools/VMware-Tools-13.1.0-core-offline-depot-ESXi-all-25294452.zip` },
    ],
  },
  {
    id: 'vmrc',
    title: 'VMware Remote Console (VMRC)',
    description: 'Remote console client for managing VMs directly from your desktop. Available for Windows and Linux.',
    logo: LOGOS.vmwareVmrcIcon,
    glowColor: 'indigo',
    tags: ['VMRC', 'Remote Console', 'Windows', 'Linux'],
    downloads: [
      { label: 'VMRC 13.1.0 for Windows (.zip)', href: `${BASE}/vmrc/VMware-VMRC-13.1.0.25236164_x64.zip` },
      { label: 'VMRC 13.1.0 for Linux (.bundle)', href: `${BASE}/vmrc/VMware-Remote-Console-13.1.0.25236164.x86_64.bundle` },
    ],
  },
  {
    id: 'workstation',
    title: 'VMware Workstation Pro',
    description: 'Desktop hypervisor for Windows. Workstation Pro has no patch bundles — each release is a full installer, so updating means running the newer .exe over the existing install. The release notes list what changed between builds.',
    logo: LOGOS.vmware,
    glowColor: 'violet',
    tags: ['Workstation Pro', 'Windows', 'Hypervisor'],
    // The mirrored builds under /vmware/vmware-workstation. Newest first — the
    // top row is what an admin should hand out unless a specific build is
    // required. Release notes carry spaces in the vendor filename, so %20.
    downloads: [
      { label: 'Workstation Pro 26H1 (Build 25388281) for Windows (.exe)', href: `${BASE}/vmware-workstation/VMware-Workstation-Full-26H1-25388281.exe` },
      { label: 'Workstation Pro 25H2u1 (Build 25219725) for Windows (.exe)', href: `${BASE}/vmware-workstation/VMware-Workstation-Full-25H2u1-25219725.exe` },
      { label: 'Workstation Pro 25H2u1 release notes (PDF)', href: `${BASE}/vmware-workstation/VMware%20Workstation%20Pro%2025H2u1%20Release%20Notes.pdf` },
    ],
  },
]

/* ─── Documentation & release notes (VMware landing page) ── */
export const vmwareDocCards: DocCard[] = [
  {
    id: 'upgrade',
    title: 'vCenter Upgrade Guide',
    description: 'Step-by-step instructions for upgrading vCenter Server using the Appliance Management Interface (AMI).',
    glowColor: 'orange',
    tags: ['Upgrade', 'vCenter', 'PDF'],
    links: [
      { label: 'Upgrade vCenter using the Appliance Management Interface (PDF)', href: `${BASE}/updating_vcenter_server_using_appliance_management.pdf`, kind: 'upgrade' },
    ],
  },
  {
    id: 'release-notes-8',
    title: 'VMware 8 Release Notes',
    description: 'Latest vCenter Server 8 and ESXi 8 release notes.',
    glowColor: 'cyan',
    tags: ['Release Notes', 'v8', 'PDF'],
    links: [
      { label: 'vCenter Server 8.0 U3k', href: `${BASE}/8/vsphere-vcenter-server-80u3k-release-notes.pdf`, kind: 'release-notes' },
      { label: 'ESXi 8.0 U3k', href: `${BASE}/8/vsphere-esxi-80u3k-release-notes.pdf`, kind: 'release-notes' },
    ],
  },
  {
    id: 'release-notes-7',
    title: 'VMware 7 Release Notes',
    description: 'Latest vCenter Server 7 and ESXi 7 release notes.',
    glowColor: 'indigo',
    tags: ['Release Notes', 'v7', 'PDF'],
    links: [
      { label: 'vCenter Server 7.0 U3s', href: `${BASE}/7/vsphere-vcenter-server-70u3s-release-notes.pdf`, kind: 'release-notes' },
      { label: 'ESXi 7.0 U3s', href: `${BASE}/7/vsphere-esxi-70u3s-release-notes.pdf`, kind: 'release-notes' },
    ],
  },
  // The 13.0.x PDFs below carry spaces in their on-disk names (vendor naming);
  // %20 keeps the hrefs valid without renaming mirrored files.
  {
    id: 'release-notes-tools',
    title: 'VMware Tools Release Notes',
    description: 'Release notes for the VMware Tools guest packages mirrored on /vmware/vmware-tools.',
    glowColor: 'cyan',
    tags: ['Release Notes', 'VMware Tools', 'PDF'],
    links: [
      { label: 'VMware Tools 13.1.0', href: '/docs/vmware/vmware-tools-13-1-0.pdf', kind: 'release-notes' },
      { label: 'VMware Tools 13.0.10', href: `${BASE}/vmware-tools/VMware%20Tools%2013.0.10.0%20Release%20Notes.pdf`, kind: 'release-notes' },
      { label: 'VMware Tools 13.0.5', href: `${BASE}/vmware-tools/VMware%20Tools%2013.0.5.0%20Release%20Notes.pdf`, kind: 'release-notes' },
    ],
  },
  {
    id: 'release-notes-vmrc',
    title: 'VMware Remote Console (VMRC) Release Notes',
    description: 'Release notes for the VMware Remote Console client mirrored on /vmware/vmrc.',
    glowColor: 'violet',
    tags: ['Release Notes', 'VMRC', 'PDF'],
    links: [
      { label: 'VMRC 13.0.2', href: `${BASE}/vmrc/vmware%20remote%20console%2013.0.2.pdf`, kind: 'release-notes' },
      { label: 'VMRC 13.0', href: `${BASE}/vmrc/vmware%20remote%20console%2013.0.pdf`, kind: 'release-notes' },
      { label: 'VMRC 12.0', href: `${BASE}/vmrc/vmware%20remote%20console%2012.0.pdf`, kind: 'release-notes' },
    ],
  },
]
