/**
 * Shared constants — APEN Support Site
 *
 * Base URLs, colour maps, and configuration values used across
 * multiple pages and data files. Never hard-code these inline.
 */

/* ─── Base URLs ──────────────────────────────────────────────
 * Download/file host. The legacy site (apensupport.blcse.mil) is being
 * retired; this site is served at apensupport.blcse.mil, whose nginx
 * serves the existing file tree under /var/www/html as a fallback (see
 * nginx/server.conf @legacy_files), so every download link below keeps
 * resolving after the old host goes away. The cert-download base stays http://
 * on purpose — it's fetched to bootstrap CA trust before HTTPS is trusted. */
/**
 * Base for links a BROWSER follows — deliberately empty, which makes every
 * derived URL root-relative ("/isos/foo.iso"). Those resolve against whatever
 * hostname the visitor is already on, so renaming the site (apensupport2 →
 * apensupport, or anything after it) cannot leave a dead link behind. Never put
 * a hostname back here; use APENSUPPORT_ABSOLUTE for URLs that need one.
 */
export const APENSUPPORT_BASE = ''

/**
 * Absolute base for URLs consumed OUTSIDE the browser, where a root-relative
 * path is meaningless: pip's --index-url, apt sources.list lines, winget source
 * registration, PDQ's repository pull, and the proxy's server-side probes.
 * These must name a real host — this is the one constant to update if the site
 * is ever renamed again.
 */
export const APENSUPPORT_ABSOLUTE = 'https://apensupport.blcse.mil'

/** Absolute AND http:// on purpose — it bootstraps CA trust, so it has to work
 *  before the CA that signs this site's certificate is trusted. */
export const APENSUPPORT_CERT_DOWNLOAD_BASE = 'http://apensupport.blcse.mil/certs'

/* ─── Restricted-enclave service portals ─────────────────────
 * Known .blcse.mil service hostnames surfaced on the /home service
 * grid (ported from the legacy restricted index.html). These are
 * already-published internal hostnames, so they are linked directly
 * rather than through the /api/external redirector. Destinations that
 * resolve to raw RFC-1918 IPs (e.g. the WAN Show board) stay behind the
 * redirector so the IP never lands in the static bundle. */
export const RESTRICTED_SERVICE_URLS = {
  sharepoint:    'https://blcseportal.blcse.mil',
  owa:           'https://mail.blcse.mil/owa',
  osticket:      'https://apenosticket.blcse.mil/',
  voltron:       'https://voltron.apen.mil/',
  qspace:        'https://qspace.blcse.mil/',
  tenable:       'https://acas.blcse.mil/',
  jupyterhub:    'https://jupyterhub.blcse.mil/',
  certServices:  'https://cescca.blcse.mil/certsrv/',
  gitlab:        'https://gitlab.blcse.mil/',
  trellixEpo:    'https://security.blcse.mil:8007/core/orionSplashScreen.do',
  facpro:        'http://facpro.blcse.mil/',
  wanshow:       '/api/external/wan-show',   // raw-IP host → keep behind redirector
} as const

export const URLS = {
  vmware:       `${APENSUPPORT_BASE}/vmware`,
  trellix:      `${APENSUPPORT_BASE}/trellix`,
  trellixAgent: `${APENSUPPORT_BASE}/trellix/agent`,
  isos:         `${APENSUPPORT_BASE}/isos`,
  repos:        `${APENSUPPORT_BASE}/repos`,
  // ─── ABSOLUTE on purpose ─────────────────────────────────────────────
  // These land in apt sources.list lines, .repo baseurl entries, and pip
  // --index-url arguments. A package manager reading "/repos/deb" has no
  // origin to resolve it against, so these must keep a real hostname.
  reposDeb:     `${APENSUPPORT_ABSOLUTE}/repos/deb`,
  reposRpm:     `${APENSUPPORT_ABSOLUTE}/repos/rpm`,
  reposPip:     `${APENSUPPORT_ABSOLUTE}/repos/pip`,
  evaluateStig: `${APENSUPPORT_BASE}/evaluate-stig`,
  // ABSOLUTE: PDQ clients store this as a repository URL and pull from it
  // outside any browser context.
  pdq:          `${APENSUPPORT_ABSOLUTE}/PDQ`,
  mssoftware:   `${APENSUPPORT_BASE}/mssoftware`,
  msstore:      `${APENSUPPORT_BASE}/msstore/apps`,
  winget:        `${APENSUPPORT_BASE}/winget`,
  wingetCatalog: '/winget/api/catalog',
  // ABSOLUTE: registered into winget via `winget source add`, which stores it
  // client-side and resolves it with no page origin.
  wingetSource:  `${APENSUPPORT_ABSOLUTE}/winget/api`,
  visualStudio: `${APENSUPPORT_BASE}/VisualStudio`,
  videos:       `${APENSUPPORT_BASE}/videos`,
  videosFacpro: `${APENSUPPORT_BASE}/videos/facpro`,
  dren:         `${APENSUPPORT_BASE}/dren`,
  drenTrellixAgent: `${APENSUPPORT_BASE}/dren/trellix/agent`,
  drenTrellixEns: `${APENSUPPORT_BASE}/dren/trellix/ens_tp`,
  drenTrellixPolicyAuditor: `${APENSUPPORT_BASE}/dren/trellix/policy_auditor`,
} as const

/*
 * External integrations are *not* linked directly. The real URLs are
 * internal hostnames or RFC1918 IPs that should never appear in the public
 * static bundle. The backend at /api/external/<key> returns a 302 to the
 * real URL (configured server-side via EXTERNAL_URL_* env vars). The
 * `*Label` strings are user-facing display labels — choose short names
 * that identify the destination without disclosing the underlying host.
 */
export const EXTERNAL_URLS = {
  certificateServices: '/api/external/certificate-services',
  trackItSelfService: '/api/external/track-it',
  tenableSecurityCenter: '/api/external/tenable',
  apenVoltron: '/api/external/voltron',
} as const

export const EXTERNAL_URL_LABELS = {
  certificateServices: 'APEN Certificate Authority',
  trackItSelfService: 'TrackIt Self-Service',
  tenableSecurityCenter: 'Tenable Security Center',
  apenVoltron: 'APEN Voltron',
} as const

/* ─── Announcement category badge colours ────────────────── */
export const CATEGORY_COLORS: Record<string, string> = {
  VMware:   'bg-blue-500/25   text-blue-200   border-blue-400/50',
  Security: 'bg-red-500/25    text-red-200    border-red-400/50',
  Docs:     'bg-cyan-500/25   text-cyan-200   border-cyan-400/50',
  Software: 'bg-violet-500/25 text-violet-200 border-violet-400/50',
  'Site Update': 'bg-emerald-500/25 text-emerald-200 border-emerald-400/50',
}

