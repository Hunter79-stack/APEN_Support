/**
 * Microsoft product data — category cards for the Microsoft Products landing page,
 * Office download cards, and AppX/Store package cards.
 *
 * Extracted from app/microsoft-products/* card files so the admin editor can
 * apply runtime overrides via useCardOverrides().
 */

import { APP_ICONS, DOWNLOADS_PAGE_LOGOS, LOGOS } from '@/lib/data/logos'
import type { BaseCard, NavCard, DocCard } from '@/lib/types/cards'

/* URLS.mssoftware is no longer referenced here: the last thing pointing into
 * /mssoftware was the retired Office 2019 card. The folder itself stays — it is
 * still a File Library upload target. */

/* ─── Office download card type ──────────────────────────── */
export interface MicrosoftOfficeDownload {
  label: string
  href: string
  ext: string
}

export interface MicrosoftOfficeCard extends BaseCard {
  logo: string
  items: MicrosoftOfficeDownload[]
}

/* There were briefly `command` and `note` fields here, carrying the ODT
 * /configure line and the deployment write-up. Both are gone: this data is
 * prerendered, so anything they held shipped to every domain user. Deployment
 * instructions live with the packages in the PDQ repository, not on the site.
 * If a per-card note is ever needed again, note that `description` is clamped
 * to two lines by TileText — long prose belongs in TileItem.body, not there. */

/* ─── Microsoft Office download cards (/microsoft-products/office) ─── */
/**
 * Office / Project / Visio 2021 and 2024 Professional.
 *
 * Office 2019 is retired — APEN Support no longer carries it, and its three
 * "installers" under /mssoftware/office2019/ were 25,600-byte .NET console
 * stubs rather than real media, so nothing of value is lost with the card.
 *
 * WHAT THIS DATA MAY CONTAIN — the site is a STATIC EXPORT. Every string here
 * is baked into out/**\/index.html and is readable by anyone who can load the
 * page, which includes ordinary domain users. Hiding a field with CSS or a
 * client-side role check does NOT protect it; the text is still in the page
 * source. So deployment internals must not be put on these cards at all:
 * no configuration-file names, no volume SKU ids, no share paths, no licence
 * or activation detail. Those belong on an admin-gated surface that fetches
 * them at runtime, never in the prerendered card data.
 *
 * These titles are installed by central deployment, not by a file a user
 * fetches, so `items` is empty and no card links anything. The packages and
 * their configurations stay in the PDQ repository.
 */

/** Same generic ms-office.svg for all six — there is no Project or Visio mark
 *  in /logos/real. The LOGOS key still reads msOffice2019 for historical
 *  reasons; the asset itself is not version-specific. */
const OFFICE_LOGO = LOGOS.msOffice2019

/** Builds one public product card: what the title is, and nothing about how it
 *  is deployed. No configuration file, no share path, no SKU id — naming any of
 *  those would put them back into the static export. `items` is empty on
 *  purpose; these are not user-fetchable downloads. */
function officeCard(
  id: string,
  title: string,
  year: '2021' | '2024',
  summary: string,
  extraTags: string[] = [],
): MicrosoftOfficeCard {
  return {
    id,
    title,
    description: summary,
    logo: OFFICE_LOGO,
    glowColor: year === '2024' ? 'cyan' : 'indigo',
    tags: [`Office ${year}`, ...extraTags],
    items: [],
  }
}

export const microsoftOfficeCards: MicrosoftOfficeCard[] = [
  officeCard('office2024', 'Office 2024 Professional', '2024',
    'Word, Excel, PowerPoint, Outlook and Access — 64-bit, English.',
    ['Word', 'Excel', 'PowerPoint']),
  officeCard('project2024', 'Project 2024 Professional', '2024',
    'Microsoft Project Professional — 64-bit, English.',
    ['Project']),
  officeCard('visio2024', 'Visio 2024 Professional', '2024',
    'Microsoft Visio Professional — 64-bit, English.',
    ['Visio']),
  officeCard('office2021', 'Office 2021 Professional', '2021',
    'Word, Excel, PowerPoint, Outlook and Access — 64-bit, English.',
    ['Word', 'Excel', 'PowerPoint']),
  officeCard('project2021', 'Project 2021 Professional', '2021',
    'Microsoft Project Professional — 64-bit, English.',
    ['Project']),
  officeCard('visio2021', 'Visio 2021 Professional', '2021',
    'Microsoft Visio Professional — 64-bit, English.',
    ['Visio']),
  // OneDrive-inclusive variants of Office 2021 and 2024 also exist. They are
  // not separate cards: same product, one deployment flag different, which is a
  // choice made at deployment time rather than something a user picks here.
]

/* ─── Microsoft Store package cards (/microsoft-products/store) ─── */
export interface MicrosoftAppxCard extends BaseCard {
  logo: string
  /** Path relative to /msstore/apps — "<Name>/<Name>.msi". */
  filename: string
}

/** The real offline Store-app catalog: every package is an .msi staged at
 *  /msstore/apps/<Name>/<Name>.msi. Listed alphabetically as on the old site.
 *  [name, description, tags] — id, logo, glow, and filename are derived. */
const STORE_APPS: ReadonlyArray<readonly [string, string, string[]]> = [
  ['AMD Radeon Software', 'AMD Radeon graphics driver and control software.', ['Drivers', 'Graphics']],
  ['App Installer', 'Microsoft App Installer for sideloading MSIX/AppX packages.', ['System', 'Installer']],
  ['Application Compatibility Enhancements', 'Windows application-compatibility enhancement package.', ['System']],
  ['AV1 Video Extension', 'AV1 codec support for royalty-free video playback.', ['Codec', 'Video']],
  ['AVC Encoder Video Extension', 'AVC / H.264 hardware video encoding support.', ['Codec', 'Video']],
  ['Bing Search', 'Bing search integration for Windows.', ['Productivity']],
  ['Clipchamp', 'Microsoft Clipchamp video editor.', ['Media', 'Video']],
  ['Dropbox', 'Dropbox cloud-storage client.', ['Storage']],
  ['Feedback Hub', 'Windows Feedback Hub app.', ['System']],
  ['HEIF Image Extension', 'Support for HEIF / HEIC image formats.', ['Codec', 'Images']],
  ['HEVC Video Extensions', 'H.265 / HEVC video decoding support.', ['Codec', 'Video']],
  ['Intel Graphics Software', 'Intel graphics driver and control software.', ['Drivers', 'Graphics']],
  ['Microsoft 365 Copilot', 'Microsoft 365 Copilot app.', ['Productivity', 'AI']],
  ['Microsoft ToDo', 'Microsoft To Do task-management app.', ['Productivity']],
  ['MPEG-2 Video Extension', 'MPEG-2 / DVD video decoding support.', ['Codec', 'Video']],
  ['Outlook for Windows', 'The new Outlook for Windows client.', ['Productivity', 'Email']],
  ['Paint', 'Microsoft Paint image editor.', ['Productivity', 'Images']],
  ['Phone Link', 'Link an Android or iPhone to Windows.', ['Productivity']],
  ['Power Automate', 'Microsoft Power Automate desktop automation.', ['Productivity', 'Automation']],
  ['Quick Assist', 'Remote-assistance tool for Windows.', ['System', 'Support']],
  ['Raw Image Extension', 'RAW camera image-format support.', ['Codec', 'Images']],
  ['Snipping Tool', 'Screenshot and screen-recording tool.', ['Productivity', 'Screenshot']],
  ['Sticky Notes', 'Microsoft Sticky Notes app.', ['Productivity']],
  ['VP9 Video Extensions', 'VP9 codec support for web video.', ['Codec', 'Video']],
  ['Web Media Extensions', 'Open-source web media format support (OGG / Vorbis / Theora).', ['Codec', 'Media']],
  ['Webp Image Extension', 'WebP image-format support.', ['Codec', 'Images']],
  ['Windows Calculator', 'Windows Calculator app.', ['Productivity']],
  ['Windows Camera', 'Windows Camera app.', ['Media']],
  ['Windows Clock', 'Windows Clock — alarms, timers, and focus sessions.', ['Productivity']],
  ['Windows Media Player', 'Windows Media Player app.', ['Media']],
  ['Windows Notepad', 'Windows Notepad text editor.', ['Productivity', 'Text Editor']],
  ['Windows Sound Recorder', 'Windows Sound Recorder app.', ['Media', 'Audio']],
  ['Windows Terminal', 'Modern terminal for PowerShell, CMD, and WSL.', ['Developer', 'Terminal']],
]

const STORE_GLOWS = ['cyan', 'indigo', 'orange'] as const

export const microsoftAppxCards: MicrosoftAppxCard[] = STORE_APPS.map(([name, description, tags], i) => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
  title: name,
  description,
  logo: APP_ICONS[name] ?? LOGOS.msStore,
  glowColor: STORE_GLOWS[i % STORE_GLOWS.length],
  tags: ['Store', ...tags],
  filename: `${name}/${name}.msi`,
}))


/* ─── Category cards (microsoft-products landing page) ──── */
export const microsoftCategoryCards: NavCard[] = [
  {
    id: 'office',
    title: 'Microsoft Office Products',
    description: 'Office, Project, and Visio Professional 2021 and 2024 — installed on request by APEN Support.',
    logo: DOWNLOADS_PAGE_LOGOS['/downloads/microsoft-products/office'],
    glowColor: 'cyan',
    tags: ['Office 2024', 'Office 2021', 'Project', 'Visio'],
    href: '/downloads/microsoft-products/office',
    hrefLabel: 'View Office products →',
    itemCount: '6 products',
  },
  {
    id: 'store',
    title: 'Microsoft Store Apps',
    description: 'Live Microsoft Store apps from the APEN WinGet repository — productivity, media codecs, drivers, and Windows tools, via winget or direct download.',
    logo: DOWNLOADS_PAGE_LOGOS['/downloads/microsoft-products/store'],
    glowColor: 'indigo',
    tags: ['Store', 'WinGet', 'Live', 'Apps'],
    href: '/downloads/microsoft-products/store',
    hrefLabel: 'Store App Downloads →',
    itemCount: 'Live catalog',
  },
  {
    id: 'visualstudio',
    title: 'Visual Studio',
    description: 'Visual Studio 2022 Enterprise, Professional, and Community editions with full offline layout and release history.',
    logo: DOWNLOADS_PAGE_LOGOS['/downloads/microsoft-products/VisualStudio'],
    glowColor: 'orange',
    tags: ['Enterprise', 'Professional', 'Community', 'VS 2022'],
    href: '/downloads/microsoft-products/VisualStudio',
    hrefLabel: 'Visual Studio Downloads →',
    itemCount: '3 editions',
  },
  {
    id: 'sqltools',
    title: 'SQL Tools',
    description: 'SQL Server Management Studio (SSMS) 21 — offline installer layout for managing SQL Server and Azure SQL databases.',
    logo: DOWNLOADS_PAGE_LOGOS['/downloads/microsoft-products/sqltools'],
    glowColor: 'orange',
    tags: ['SSMS', 'SQL Server', 'Azure SQL'],
    href: '/downloads/microsoft-products/sqltools',
    hrefLabel: 'SQL Tools Downloads →',
    itemCount: 'SSMS 21',
  },
]

/* ─── Documentation cards (/docs/microsoft-products) ─────── */
// Lives here rather than inline in the page so /admin#content can offer these
// cards as an editable scope — the editor needs the defaults importable.
export const microsoftDocCards: DocCard[] = [
  {
    id: 'ssms',
    title: 'SQL Server Management Studio',
    description: 'Release notes for SSMS 20.x, 21.x, and 22.x — compiled from Microsoft Learn.',
    glowColor: 'sky',
    tags: ['SSMS', 'Release Notes'],
    links: [{ label: 'SSMS 20 / 21 / 22 release notes', href: '/docs/microsoft-products/ssms', kind: 'release-notes' }],
  },
  {
    id: 'visualstudio',
    title: 'Visual Studio 2022',
    description: 'Release notes for Enterprise, Professional, and Community (17.x).',
    glowColor: 'violet',
    tags: ['Visual Studio', 'Release Notes'],
    links: [{ label: 'Visual Studio 2022 release notes', href: '/docs/microsoft-products/visualstudio', kind: 'release-notes' }],
  },
]
