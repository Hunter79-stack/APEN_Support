/**
 * Central logo registry — APEN Support Site
 *
 * Assets are organised by type under /public/logos/:
 *   /logos/real/         — Official product SVGs + purpose-built professional icons
 *   /logos/brands/       — APEN / CESC / Voltron / partner brand marks
 *   /logos/products/     — Product & service icons (VMware, Trellix, PDQ, …)
 *   /logos/backgrounds/  — Full-bleed page background images
 *   /logos/heroes/       — Wide hero banners for product pages
 *   /logos/icons/        — Generic app/UI icons
 *   /logos/no_backgrounds/ — Transparent converted artwork
 *   /logos/restricted/   — Restricted-enclave app and service marks
 *   /logos/favicon/      — Favicon variants
 *
 * Heavy rasters (backgrounds, brand marks) are stored as .webp for fast,
 * GPU-independent decode; small icons keep their original format. Every logo
 * key used across all pages, components, and the Navbar is listed here — never
 * hard-code a logo path in a page; always import from this file.
 *
 * Editing guide:
 *   1. Change a URL in LOGOS to move or replace that physical image
 *      everywhere. Each public file path is declared exactly once.
 *   2. Find the route-matched page section (for example,
 *      DOWNLOADS_PAGE_LOGOS) and assign a LOGOS key to change one page image.
 *   3. BACKGROUNDS and the route maps below only reference LOGOS; they never
 *      repeat physical file locations.
 *   4. These are source defaults. Saved/live Admin changes use the reserved
 *      `site/route-images` registry: routes store semantic LOGOS keys (or one
 *      uploaded-asset id), so headers, cards, and navigation stay synchronized
 *      without editing this file on the server.
 *
 * Keep public asset URLs root-relative (`/logos/...`) so they resolve from
 * nested routes such as `/docs/`. Run `npm run validate:images` after swaps;
 * it catches duplicate paths, missing files, and filename-case drift before
 * deployment.
 */

const R  = '/logos/real'         // official + crafted professional icons (unchanged)
const B  = '/logos/brands'       // APEN/CESC/Voltron/partner brand marks
const P  = '/logos/products'     // product & service icons
const BG = '/logos/backgrounds'  // page background images
const H  = '/logos/heroes'       // wide hero banners
const I  = '/logos/icons'        // generic app/UI icons
const NB = '/logos/no_backgrounds' // transparent-background product/service logos
const RES = '/logos/restricted'    // restricted-enclave app & service marks (ported from legacy site)
const S = '/logos/store'          // Microsoft Store app icons (harvested from the Store catalog)

export type LocalImagePath = `/logos/${string}`
export type PageRoutePath = `/${string}`
type PageLogoMap = Readonly<Record<PageRoutePath, LocalImagePath>>

/* ─── Canonical image catalog ──────────────────────────────
 * This is the only object that owns physical image strings. Names describe
 * the asset's meaning or visual role, never its file type or source folder,
 * so moving an image into /logos/no_backgrounds only changes one line. */
export const LOGOS = {

  // ── APEN / CESC brand ─────────────────────────────────────
  apenRound:   `${B}/APEN_Logo_Modified_Round.webp`,
  apenPrimary: `${B}/apen_logo.svg`,
  apenVector:  `${B}/apen_vector.webp`,
  apenSmall:   `${B}/apen-logo-small.webp`,
  cesc:        `${B}/cesc-logo.webp`,
  // Additional brand marks (footer, landing hero, assistant header).
  apenFooter:  `${B}/logo-apen.webp`,               // horizontal APEN mark — site footer
  apenAi:      `${B}/apen_voltron2_1.webp`,         // "APEN AI" / Voltron landing mark
  apenQuantum: `${B}/apen-quantum-transparent.webp`,// APEN Quantum landing mark
  apenHpc:     `${B}/logo-apen-hpc.webp`,           // APEN HPC landing mark
  apenHub:     `${B}/logo-hub.webp`,                // APEN Hub landing mark
  fcc:         `${B}/logo-fcc.png`,                 // FCC mark — site footer
  fccAssistant:`${B}/FCC_logo.png`,                 // FCC logo — assistant panel header

  // ── OS / Distro ───────────────────────────────────────────
  alma:        `${R}/alma-linux.svg`,
  centos:      `${R}/centos.svg`,
  rocky:       `${R}/rocky-linux.svg`,
  ubuntu:      `${NB}/ubuntu-linux-nb.png`,
  windows:     `${R}/windows-11.svg`,
  enterpriseLinux:    `${NB}/enterprise-linux-nb.png`,
  linuxRepositories:  `${NB}/epel-nb.png`,
  linuxDistributions: `${NB}/linux-nb.png`,
  linuxTux:           `${NB}/linux-bg-removed.png`,

  // ── Virtualisation ────────────────────────────────────────
  vmware:             `${NB}/vmware-nb.png`,   // transparent-bg version
  vmwareWordmark:     `${P}/vmware-long.png`,
  vmwareEsxi:         `${R}/vmware-esxi.svg`,
  vmwareVcenter:      `${R}/vmware-vcenter.svg`,
  vmwareVsphere:      `${R}/vmware-vsphere.svg`,
  vmwareTools:        `${R}/vmware-tools.svg`,
  
  // Screenshots / product icons
  vmwareUiPreview:    `${R}/vmware-ui-preview.jpg`,       // vSphere HTML5 client UI — landing cards
  vmwareScreenshot:   `${R}/vmware-vcenter-screenshot.png`, // vCenter blog screenshot — v7/v8/v9 cards
  vmwareToolsIcon:    `${R}/vmware-tools-icon.png`,       // VMware Tools product icon
  vmwareVmrcIcon:     `${R}/vmware-vmrc-icon.webp`,       // VMRC app icon
  
  // Full-width hero banners for VMware product pages
  vmwareVcenterHero:  `${H}/vmware-vcenter-hero.svg`,
  vmwareEsxiHero:     `${H}/vmware-esxi-hero.svg`,
  vmwareToolsHero:    `${H}/vmware-tools-hero.svg`,

  // ── Security ──────────────────────────────────────────────
  trellix:             `${NB}/trellix-linux-support-nb.png`,  // original site — specific CUI Linux branding
  trellixLight:        `${P}/trellix-logo.png`,
  trellixLinux:        `${P}/trellix-linux-support.webp`,
  trellixX:            `${P}/trellix-x-logo.png`,

  // ── Security Center (Tenable) ─────────────────────────────
  seccenter:   `${P}/seccenter.webp`,    // original Tenable Security Center icon
  secCenter2:  `${P}/seccenter2.webp`,
  secCenter3:  `${P}/tenable.sc.webp`,
  tenableIris: `${P}/tenable-iris.avif`,   // animated Tenable iris mark (Lottie, white stroke for dark cards) — rendered by LottieMark

  // ── Network / DREN ───────────────────────────────────────
  cisco:       `${R}/cisco.svg`,
  dren:        `${R}/dren.svg`,

  // ── Dev tools ─────────────────────────────────────────────
  visualStudio: `${NB}/vs-logo-nb.webp`,

  // ── Microsoft ─────────────────────────────────────────────
  msOffice2019: `${R}/ms-office.svg`,
  msBrand:      `${P}/microsoft-brand-logo.jpg`,
  msStore:      `${R}/microsoft-store.svg`,
  microsoft:    `${NB}/microsoft-nb.png`,
  microsoftOfficial: `${R}/microsoft.svg`, // official Microsoft brand artwork
  mssql:        `${R}/mssql.jpg`,

  // ── Repos ─────────────────────────────────────────────────
  rpm:         `${R}/rpm-logo.svg`,
  deb:         `${NB}/ubuntu-repo-nb.png`,
  pip:         `${NB}/pip-package-nb.webp`,

  // ── FacilitatePro ─────────────────────────────────────────
  facpro:      `${P}/facilitatepro-icon.png`,
  facproWordmark: `${P}/facilitatepro-wordmark.jpg`, // horizontal wordmark (202×33)

  // ── Voltron / AI ──────────────────────────────────────────
  voltron:         `${B}/Voltron-no-back.webp`,    // APEN-specific Voltron branding (1050×1050)
  voltronFull:     `${B}/VOLTRON.webp`,            // full VOLTRON mark (was Voltron.webp — file is uppercase on disk)
  voltronHoriz:    `${B}/Voltron_horiz_1024x364.webp`,

  // ── Site-section icons ────────────────────────────────────
  documents:    `${NB}/documents-nb.webp`,
  isos:         `${NB}/isos-nb.webp`,
  videos:       `${NB}/videos-nb.webp`,
  speedtest:    `${NB}/speedtest-nb.png`,
  colorPicker:  `${NB}/color-picker-nb.webp`,
  helpdesk:     `${NB}/help-desk-service-nb.webp`,
  knowledgeBase:`${NB}/knowledge-base-org-nb.webp`,
  supportTicket:`${NB}/support-ticket-nb.webp`,
  certsrv:      `${P}/certsrv.png`,             // original AD Certificate Services icon (no transparent version)
  pdq:          `${NB}/pdq-nb.png`,
  evaluateStig: `${NB}/evaluate-stig-nb.png`,
  announcements:`${P}/announcements.webp`,

  // ── Windows Store app icons ───────────────────────────────
  paint:           `${R}/paint.svg`,
  viewer3d:        `${I}/3d-viewer.png`,
  snippingTool:    `${R}/snipping-tool.svg`,
  windowsNotepad:  `${R}/windows-notepad.svg`,
  windowsTerminal: `${R}/windows-terminal.svg`,
  hevc:            `${R}/hevc.svg`,
  mpeg2:           `${R}/mpeg2.svg`,
  extensions:      `${I}/extensions.png`,

  // ── Misc ──────────────────────────────────────────────────
  epo:         `${P}/epo.webp`,

  // ── Restricted-enclave apps & services (ported from legacy site) ──
  // Ansible, AtomEngine, Openfire, VASSAL, AFSIM, and RStudio logo entries
  // were dropped 2026-07 along with their pages (services decommissioned);
  // the image files remain in public/logos for the legacy file tree.
  onesaf:      `${RES}/ONESAF.png`,
  jupyterhub:  `${RES}/jupyter-logo.png`,
  gitlab:      `${NB}/gitlab-nb.png`,
  sharepoint:  `${RES}/sharepoint-logo.png`,
  owa:         `${NB}/webmail-nb.png`,
  osticket:    `${RES}/helpdesk.png`,
  qspace:      `${RES}/qpro_logo.png`,
  tenableRes:  `${RES}/tenable-iris.avif`,
  trellixEpo:  `${RES}/epo.png`,
  facproRes:   `${RES}/facpro.png`,
  wanshow:     `${RES}/wanshow.png`,

  // ── Full-bleed page backgrounds ──────────────────────────
  backgroundDocs:               `${BG}/docs_bg.webp`,
  backgroundEnterpriseDocs:     `${BG}/el_docs_bg.webp`,
  backgroundUbuntuDocs:         `${BG}/ub_docs_bg.webp`,
  backgroundFacproDocs:         `${BG}/facpro_docs_bg.webp`,
  backgroundMicrosoftDocs:      `${BG}/ms_docs_bg.webp`,
  backgroundEnterpriseRepos:    `${BG}/elrepos_bg.webp`,
  backgroundUbuntuRepos:        `${BG}/ubrepos_bg.webp`,
  backgroundPipRepos:           `${BG}/piprepos_bg.webp`,
  backgroundLinux:              `${BG}/linux_bg.webp`,
  backgroundTrellix:            `${BG}/trellix_bg.webp`,
  backgroundVmware:             `${BG}/vmware_bg.jpg`,
  backgroundEvaluateStig:       `${BG}/eval-stig_bg.webp`,
  backgroundMicrosoftSoftware:  `${BG}/mssoftware_bg.jpg`,
  backgroundPdq:                `${BG}/pdq_bg.jpg`,
  backgroundIsos:               `${BG}/software_isos_bg.jpg`,
  backgroundVideoGuides:        `${BG}/video_guides_bg.jpg`,
  backgroundFacproVideos:       `${BG}/facpro_videos_bg.jpg`,
  backgroundSupport:            `${BG}/support_bg.webp`,
  backgroundGray:               `${BG}/gray_bg.jpg`,


  // ── Microsoft Store app icons (see lib/data/store-app-meta.ts) ──
  storeIntelGraphicsSoftware:                      `${S}/intel-graphics-software.png`,
  storeMicrosoftClipchamp:                         `${S}/microsoft-clipchamp.png`,
  storeDropbox:                                    `${S}/dropbox.png`,
  storeMicrosoftPowertoys:                         `${S}/microsoft-powertoys.png`,
  storeAv1VideoExtension:                          `${S}/av1-video-extension.png`,
  storeAvcEncoderVideoExtension:                   `${S}/avc-encoder-video-extension.png`,
  storeMicrosoftBing:                              `${S}/microsoft-bing.png`,
  storeMsnWeather:                                 `${S}/msn-weather.png`,
  storeAppInstaller:                               `${S}/app-installer.png`,
  storeGetHelp:                                    `${S}/get-help.png`,
  storeHeifImageExtension:                         `${S}/heif-image-extension.png`,
  storeHevcVideoExtensionsFromDeviceManufacturer:  `${S}/hevc-video-extensions-from-device-manufacturer.png`,
  storeMpeg2VideoExtension:                        `${S}/mpeg-2-video-extension.png`,
  store3dViewer:                                   `${S}/3d-viewer.png`,
  storeMicrosoft365Copilot:                        `${S}/microsoft-365-copilot.png`,
  storeMicrosoftStickyNotes:                       `${S}/microsoft-sticky-notes.png`,
  storeOutlookForWindows:                          `${S}/outlook-for-windows.png`,
  storePaint:                                      `${S}/paint.png`,
  storePowerAutomate:                              `${S}/power-automate.png`,
  storeRawImageExtension:                          `${S}/raw-image-extension.png`,
  storeSnippingTool:                               `${S}/snipping-tool.png`,
  storeStartExperiencesApp:                        `${S}/start-experiences-app.png`,
  storeMicrosoftToDoListsTasksReminders:           `${S}/microsoft-to-do-lists-tasks-reminders.png`,
  storeVp9VideoExtensions:                         `${S}/vp9-video-extensions.png`,
  storeWebMediaExtensions:                         `${S}/web-media-extensions.png`,
  storeWebpImageExtension:                         `${S}/webp-image-extension.png`,
  storeWindowsAdvancedSettings:                    `${S}/windows-advanced-settings.png`,
  storeWindowsClock:                               `${S}/windows-clock.png`,
  storeWindowsCalculator:                          `${S}/windows-calculator.png`,
  storeWindowsCamera:                              `${S}/windows-camera.png`,
  storeFeedbackHub:                                `${S}/feedback-hub.png`,
  storeWindowsNotepad:                             `${S}/windows-notepad.png`,
  storeWindowsSoundRecorder:                       `${S}/windows-sound-recorder.png`,
  storeWindowsTerminal:                            `${S}/windows-terminal.png`,
  storePhoneLink:                                  `${S}/phone-link.png`,
  storeWindowsMediaPlayer:                         `${S}/windows-media-player.png`,
  storeQuickAssist:                                `${S}/quick-assist.png`,
  storeWindowsSubsystemForLinux:                   `${S}/windows-subsystem-for-linux.png`,
  storeWindowsWebExperiencePack:                   `${S}/windows-web-experience-pack.png`,
} as const satisfies Record<string, LocalImagePath>

/* ─── OS / Distro aliases ──────────────────────────────────
 * These deliberately point back to LOGOS so an asset is never maintained in
 * two places. Keep the export for the ISO/repository data modules that group
 * operating-system artwork separately. */
export const OS_LOGOS = {
  alma:         LOGOS.alma,
  centos:       LOGOS.centos,
  rocky:        LOGOS.rocky,
  ubuntu:       LOGOS.ubuntu,
  linux:        LOGOS.linuxDistributions,
  windowsWhite: LOGOS.windows,
} as const

/* ═══════════════════════════════════════════════════════════════════════
 *  PAGE IMAGES  —  organised to match the app/ route tree
 * ═══════════════════════════════════════════════════════════════════════
 * Each section below owns the images for the matching page directory. Routes
 * reference the canonical semantic logo above instead of redeclaring paths.
 *
 * Example: to change the image on /downloads/, edit only this line in the
 * DOWNLOADS PAGE section:
 *   '/downloads': LOGOS.documents
 *
 * Each page.tsx imports its matching section. PAGE_LOGOS combines them at the
 * bottom as a compatibility API for shared or older consumers. At runtime the
 * Admin route-image registry may override a registered route; PAGE_LOGOS stays
 * the durable code fallback when no saved/live choice exists.
 */

/* ─── ROOT + STANDALONE PAGES ──────────────────────────────
 * app/page.tsx, app/PDQ/page.tsx, app/mssoftware/page.tsx */
export const ROOT_PAGE_LOGOS = {
  '/': LOGOS.apenRound,
  '/PDQ': LOGOS.pdq,
  '/mssoftware': LOGOS.microsoft,
} as const satisfies PageLogoMap

/* ─── APPLICATION PAGES ────────────────────────────────────
 * app/applications plus the standalone restricted-app routes.
 * The decommissioned app routes (/ansible, /atomengine, /openfire,
 * /vassal, /afsim) were removed 2026-07. */
export const APPLICATION_PAGE_LOGOS = {
  '/applications': LOGOS.speedtest,
  '/network-analysis': LOGOS.speedtest,
} as const satisfies PageLogoMap

/* ─── /certsrv/ PAGES ────────────────────────────────────── */
export const CERTSRV_PAGE_LOGOS = {
  '/certsrv': LOGOS.certsrv,
  '/certsrv/ca': LOGOS.certsrv,
  '/certsrv/request': LOGOS.certsrv,
} as const satisfies PageLogoMap

/* ─── /docs/ PAGES ───────────────────────────────────────── */
export const DOCS_PAGE_LOGOS = {
  '/docs': LOGOS.documents,

  '/docs/el': LOGOS.enterpriseLinux,
  '/docs/el/ad': LOGOS.enterpriseLinux,
  '/docs/el/certificates': LOGOS.enterpriseLinux,
  '/docs/el/system-settings': LOGOS.enterpriseLinux,

  '/docs/evaluate-stig': LOGOS.evaluateStig,
  '/docs/evaluate-stig/documents': LOGOS.evaluateStig,
  '/docs/evaluate-stig/linux/enterprise': LOGOS.evaluateStig,
  '/docs/evaluate-stig/linux/ubuntu': LOGOS.evaluateStig,

  '/docs/facpro': LOGOS.facpro,
  '/docs/facpro/faq': LOGOS.facpro,

  '/docs/microsoft-products': LOGOS.microsoft,
  '/docs/microsoft-products/ssms': LOGOS.mssql,
  '/docs/microsoft-products/visualstudio': LOGOS.visualStudio,

  '/docs/repos': LOGOS.linuxRepositories,
  '/docs/repos/deb': LOGOS.deb,
  '/docs/repos/pip': LOGOS.pip,
  '/docs/repos/rpm': LOGOS.rpm,

  '/docs/trellix': LOGOS.trellix,

  '/docs/ub': LOGOS.ubuntu,
  '/docs/ub/ad': LOGOS.ubuntu,
  '/docs/ub/certificates': LOGOS.ubuntu,
  '/docs/ub/storage': LOGOS.ubuntu,
  '/docs/ub/system-settings': LOGOS.ubuntu,

  '/docs/vmware': LOGOS.vmware,
} as const satisfies PageLogoMap

/* ─── /downloads/ PAGES ────────────────────────────────────
 * Change the first value below to replace the /downloads/ page image. */
export const DOWNLOADS_PAGE_LOGOS = {
  '/downloads': LOGOS.documents,

  '/downloads/iso': LOGOS.isos,
  '/downloads/iso/linux': LOGOS.linuxDistributions,
  '/downloads/iso/linux/enterprise': LOGOS.enterpriseLinux,
  '/downloads/iso/linux/ubuntu': LOGOS.ubuntu,
  '/downloads/iso/windows': LOGOS.windows,

  '/downloads/evaluate-stig': LOGOS.evaluateStig,

  '/downloads/microsoft-products': LOGOS.microsoft,
  '/downloads/microsoft-products/office': LOGOS.msOffice2019,
  // SSMS ships inside a Visual Studio installer layout, but this route is NOT
  // Visual Studio: pointing it at the VS wordmark made the SQL Tools card on
  // /downloads/microsoft-products literally read "Visual Studio", because the
  // hover-reveal card's face is the image alone. Use the same SQL Server mark
  // the SSMS release card on the page itself uses.
  '/downloads/microsoft-products/sqltools': LOGOS.mssql,
  '/downloads/microsoft-products/store': LOGOS.msStore,
  '/downloads/microsoft-products/VisualStudio': LOGOS.visualStudio,
  '/downloads/microsoft-products/VisualStudio/community': LOGOS.visualStudio,
  '/downloads/microsoft-products/VisualStudio/enterprise': LOGOS.visualStudio,
  '/downloads/microsoft-products/VisualStudio/professional': LOGOS.visualStudio,

  '/downloads/vmware': LOGOS.vmware,
  '/downloads/vmware/tools': LOGOS.vmwareTools,
  '/downloads/vmware/v7': LOGOS.vmware,
  '/downloads/vmware/v8': LOGOS.vmware,
  '/downloads/vmware/v9': LOGOS.vmware,
} as const satisfies PageLogoMap

/* ─── /dren/ PAGES ───────────────────────────────────────── */
export const DREN_PAGE_LOGOS = {
  '/dren': LOGOS.dren,
  '/dren/cisco': LOGOS.cisco,
  '/dren/trellix': LOGOS.trellixLinux,
  '/dren/trellix/enterprise-linux': LOGOS.trellixLinux,
  '/dren/trellix/ubuntu': LOGOS.trellixLinux,
} as const satisfies PageLogoMap

/* ─── /security/ PAGES ───────────────────────────────────── */
export const SECURITY_PAGE_LOGOS = {
  '/security': LOGOS.evaluateStig,
  '/security/evaluate-stig': LOGOS.evaluateStig,
} as const satisfies PageLogoMap

/* ─── /applications tool PAGES ───────────────────────────────
 * Tools moved directly under /applications 2026-07 (no /tools segment);
 * the old /tools/* routes remain as RedirectStub pages and need no logo
 * entries. */
export const TOOLS_PAGE_LOGOS = {
  '/applications/color-picker': LOGOS.colorPicker,
  '/applications/speedtest': LOGOS.speedtest,
} as const satisfies PageLogoMap

/* ─── /trellix/ PAGES ────────────────────────────────────── */
export const TRELLIX_PAGE_LOGOS = {
  '/trellix': LOGOS.trellix,
  '/trellix/enterprise-linux': LOGOS.trellix,
  '/trellix/reference': LOGOS.trellix,
  '/trellix/ubuntu': LOGOS.trellix,
} as const satisfies PageLogoMap

/* ─── /videos/ PAGES ─────────────────────────────────────── */
export const VIDEOS_PAGE_LOGOS = {
  '/videos': LOGOS.videos,
  '/videos/facpro': LOGOS.facpro,
} as const satisfies PageLogoMap

/** Named sections for browsing or tooling; mirrors the groups above. */
export const PAGE_LOGO_SECTIONS = {
  root: ROOT_PAGE_LOGOS,
  applications: APPLICATION_PAGE_LOGOS,
  certsrv: CERTSRV_PAGE_LOGOS,
  docs: DOCS_PAGE_LOGOS,
  downloads: DOWNLOADS_PAGE_LOGOS,
  dren: DREN_PAGE_LOGOS,
  security: SECURITY_PAGE_LOGOS,
  tools: TOOLS_PAGE_LOGOS,
  trellix: TRELLIX_PAGE_LOGOS,
  videos: VIDEOS_PAGE_LOGOS,
} as const

/** Flat compatibility map for shared or older consumers. */
export const PAGE_LOGOS = {
  ...ROOT_PAGE_LOGOS,
  ...APPLICATION_PAGE_LOGOS,
  ...CERTSRV_PAGE_LOGOS,
  ...DOCS_PAGE_LOGOS,
  ...DOWNLOADS_PAGE_LOGOS,
  ...DREN_PAGE_LOGOS,
  ...SECURITY_PAGE_LOGOS,
  ...TOOLS_PAGE_LOGOS,
  ...TRELLIX_PAGE_LOGOS,
  ...VIDEOS_PAGE_LOGOS,
} as const

export type PageLogoRoute = keyof typeof PAGE_LOGOS

/* ═══════════════════════════════════════════════════════════════════════
 *  NAV BAR LOGOS  —  derived from the page-route source of truth
 * ═══════════════════════════════════════════════════════════════════════
 * Internal routes inherit PAGE_LOGOS, so navigation can never disagree with
 * the destination page or its cards. Only external services and redirect-only
 * legacy URLs need explicit entries here. */
export const navItemLogos: Record<string, string> = {
  ...PAGE_LOGOS,

  '/isos': LOGOS.isos,
  '/evaluate-stig': LOGOS.evaluateStig,
  '/color-picker': LOGOS.colorPicker,
  '/speedtest': LOGOS.speedtest,
  '/repos': LOGOS.linuxRepositories,
  '/repos/rpm': LOGOS.rpm,
  '/repos/deb': LOGOS.deb,
  '/repos/pip': LOGOS.pip,
  '/vmware': LOGOS.vmware,
  '/vmware/tools': LOGOS.vmwareTools,
  '/microsoft-products': LOGOS.microsoft,
  '/VisualStudio': LOGOS.visualStudio,
  '/sqltools': LOGOS.mssql,
}

/* ─── Windows Store AppX icon map ───────────────────────── */
export const APP_ICONS: Record<string, string> = {
  'Paint':                  LOGOS.paint,
  'Paint 3D':               LOGOS.paint,
  '3D Viewer':              LOGOS.viewer3d,
  'Snipping Tool':          LOGOS.snippingTool,
  'Windows Notepad':        LOGOS.windowsNotepad,
  'Windows Terminal':       LOGOS.windowsTerminal,
  'HEVC Video Extensions':  LOGOS.hevc,
  'HEIF Image Extensions':  LOGOS.msStore,
  'AV1 Video Extension':    LOGOS.extensions,
  'MPEG-2 Video Extension': LOGOS.mpeg2,
  'VP9 Video Extensions':   LOGOS.extensions,
}

/**
 * Wordmark logos — horizontal aspect ratio (~4:1 or wider).
 * ThemedLogo auto-detects these and uses a wide pill container
 * instead of a square so the text isn't crushed.
 */
export const WORDMARK_LOGOS = new Set<string>([
  LOGOS.cisco,
  // msOffice2019 is NOT here: ms-office.svg has a 278050x333334 viewBox, so it
  // is taller than it is wide. Listing it as a wordmark put it in the wide pill
  // container, which rendered the Office page header mark visibly smaller than
  // the square one on the Visual Studio page beside it.
])

/** Returns true if this logo path is a horizontal wordmark */
export function isWordmark(src: string): boolean {
  return WORDMARK_LOGOS.has(src)
}

/* ─── Page backgrounds (full-bleed) ──────────────────────── */
export const BACKGROUNDS = {
  docs:        LOGOS.backgroundDocs,
  elDocs:      LOGOS.backgroundEnterpriseDocs,
  ubDocs:      LOGOS.backgroundUbuntuDocs,
  facproDocs:  LOGOS.backgroundFacproDocs,
  msDocs:      LOGOS.backgroundMicrosoftDocs,
  elRepos:     LOGOS.backgroundEnterpriseRepos,
  ubRepos:     LOGOS.backgroundUbuntuRepos,
  pipRepos:    LOGOS.backgroundPipRepos,
  linux:       LOGOS.backgroundLinux,
  trellix:     LOGOS.backgroundTrellix,
  vmware:      LOGOS.backgroundVmware,
  evalStig:    LOGOS.backgroundEvaluateStig,
  msSoftware:  LOGOS.backgroundMicrosoftSoftware,
  pdq:         LOGOS.backgroundPdq,
  isos:        LOGOS.backgroundIsos,
  videoGuides: LOGOS.backgroundVideoGuides,
  facproVideo: LOGOS.backgroundFacproVideos,
  support:     LOGOS.backgroundSupport,
  gray:        LOGOS.backgroundGray,
} as const

/** One import for consumers that prefer browsing the complete image catalog. */
export const IMAGES = {
  logos: LOGOS,
  operatingSystems: OS_LOGOS,
  pages: PAGE_LOGOS,
  pageSections: PAGE_LOGO_SECTIONS,
  navigation: navItemLogos,
  storeApps: APP_ICONS,
  backgrounds: BACKGROUNDS,
} as const

export type LogoKey = keyof typeof LOGOS
