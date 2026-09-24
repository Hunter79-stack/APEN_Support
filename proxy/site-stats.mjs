#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────
//  site-stats.mjs — Final Unified Backend
// ──────────────────────────────────────────────────────────────

import { createServer, request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { lookup as dnsLookup } from 'node:dns/promises'
import { createReadStream, createWriteStream, accessSync, constants as FS_CONSTANTS, statSync, readFileSync, writeFileSync, renameSync, mkdirSync, rmSync, unlinkSync, existsSync, readdirSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { spawn, execFile } from 'node:child_process'
import { resolve, join } from 'node:path'
import { connect as netConnect } from 'node:net'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { getLiveAnnouncementPayload, clearLiveAnnouncementCache, parseConfiguredRoots } from './live-announcements-core.mjs'
import { handleCertRequest } from './cert-request.mjs'
import { getRepoFreshness } from './repo-freshness.mjs'
import { readSelfHealEvents } from './selfheal-log.mjs'
import { describeUnexpectedStatus } from './site-stats-probe.mjs'
import { readRegistry, writeRegistry, writeManagedFragments, validateEntries } from './nginx-managed.mjs'
import { isPlainObject, loadJson, saveJson, stateFileProblems } from './state-files.mjs'
import { readBody } from './http-body.mjs'
import { loadBlockedHosts, normalizeClientIp } from './blocked-hosts.mjs'
import { acceptedLoginForms, bindEndpoints, realmDefaultDomain, resolveLoginIdentity } from './ldap-domain.mjs'
import {
  ASSISTANT_KNOWLEDGE_FILE,
  DEFAULT_ASSISTANT_KNOWLEDGE,
  MAX_ASSISTANT_KNOWLEDGE_CHARS,
} from './assistant-knowledge.mjs'
import {
  FREE_SPACE_RESERVE_BYTES,
  allLibraryDirs,
  deleteCustomLibraryDir,
  describeLibraryDir,
  findLibraryDir,
  libraryDirState,
  libraryPaths,
  libraryUrlPath,
  listLibraryFiles,
  partialOffset,
  safeLibraryName,
  saveCustomLibraryDir,
} from './file-library.mjs'

/* ── 1. CONFIGURATION ── */
try {
  const envPath = resolve(import.meta.dirname ?? '.', '..', '.env.local')
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx < 1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
} catch { /* .env.local optional */ }

const HOST = process.env.STATS_HOST || '127.0.0.1'
const configuredPort = Number.parseInt(process.env.STATS_PORT || '8788', 10)
const PORT = Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : 8788
const LOG_PATH = process.env.NGINX_ACCESS_LOG || '/var/log/nginx/cui_nginx_access.log'
/** Where the JSON state files live. Overridable so a test can import this
 *  module against a scratch directory instead of the live proxy/ state. */
const STATE_DIR = process.env.SITE_STATS_STATE_DIR || (import.meta.dirname ?? '.')
const FEEDBACK_FILE = resolve(STATE_DIR, 'feedback-history.json')
const NOTIFICATION_SETTINGS_FILE = resolve(STATE_DIR, 'notification-settings.json')
const ACKNOWLEDGED_ALERTS_FILE = resolve(STATE_DIR, 'acknowledged-alerts.json')
const DISMISSED_ALERTS_FILE = resolve(STATE_DIR, 'dismissed-alerts.json')
const CONTENT_OVERRIDES_FILE = resolve(STATE_DIR, 'content-overrides.json')
const CUSTOM_PAGES_FILE = resolve(STATE_DIR, 'custom-pages.json')
const CONTENT_AUDIT_FILE = resolve(STATE_DIR, 'content-audit.json')
const NODES_FILE = resolve(STATE_DIR, 'infrastructure-nodes.json')
const CHAT_HISTORY_FILE = resolve(STATE_DIR, 'chat-history.json')
/** Admin-managed live-announcement scan roots. When this file exists it takes
 *  precedence over the LIVE_ANNOUNCEMENT_PATHS env var, so admins can manage
 *  upload locations from the dashboard instead of SSH-editing .env.local. */
const ANNOUNCEMENT_PATHS_FILE = resolve(STATE_DIR, 'announcement-paths.json')
/**
 * Path to the Next.js app/ directory. The New Page Wizard generates a real
 * page.tsx under app/<category>/<slug>/ for every published page so the route
 * exists as a static build artifact after `npm run validate` (in addition to the
 * runtime fallback via /custom-pages/). Disable by setting
 * GENERATE_CUSTOM_PAGE_SOURCES=0 — useful in environments where the proxy
 * shouldn't touch source files.
 */
const APP_DIR = resolve(import.meta.dirname ?? '.', '..', 'app')
const GENERATE_PAGE_SOURCES = process.env.GENERATE_CUSTOM_PAGE_SOURCES !== '0'
/** Project root + the committed snapshot the static build bakes published
 *  overrides from. The Publish button writes this file (from the current draft
 *  overrides) and triggers `npm run validate` (lint, typecheck, test, build) so edits become permanent defaults.
 *  Disable the build trigger with PUBLISH_BUILD=0 (snapshot is still written). */
const PROJECT_ROOT = resolve(import.meta.dirname ?? '.', '..')
const PROJECT_ROOT_DATA_DIR = resolve(PROJECT_ROOT, 'lib', 'data')
const PUBLISHED_CONTENT_FILE = resolve(PROJECT_ROOT_DATA_DIR, 'published-content.json')
const PUBLISH_BUILD_ENABLED = process.env.PUBLISH_BUILD !== '0'
/**
 * Admin-uploaded route images live outside the generated `out/` tree in
 * production so a rebuild or site update cannot erase them. nginx's existing
 * `/logos/` fallback serves the Linux default from `/var/www/html/logos`.
 * Local Windows development writes into `public/` so `next dev` can serve the
 * returned root-relative URL immediately.
 */
const DEFAULT_ADMIN_LOGO_UPLOAD_DIR = process.platform === 'win32'
  ? resolve(PROJECT_ROOT, 'public', 'logos', 'no_backgrounds', 'admin')
  : '/var/www/html/logos/no_backgrounds/admin'
const ADMIN_LOGO_UPLOAD_DIR = resolve(
  (process.env.ADMIN_LOGO_UPLOAD_DIR || DEFAULT_ADMIN_LOGO_UPLOAD_DIR).trim(),
)
const ADMIN_LOGO_PUBLIC_PREFIX = '/logos/no_backgrounds/admin'
const MAX_ADMIN_LOGO_BYTES = 6 * 1024 * 1024
// Admin-managed nginx zones/upstreams (see proxy/nginx-managed.mjs). Registry
// lives in the repo; generated fragments are written into the nginx conf dir
// (dod_admin owns it → no root for the WRITE). The RELOAD needs a NOPASSWD
// sudoers rule (see NGINX_VTS_RUNBOOK.md); without it Publish still writes the
// config and reports "reload pending" (applies on the next $SITEUPDATE).
const NGINX_MANAGED_FILE = resolve(PROJECT_ROOT, 'proxy', 'nginx-managed.json')
// Where the /admin#nginx editor writes managed-http.conf / managed-loc.conf.
// MUST match the directory server.conf includes from — the old apen_support2
// default does not exist on any host, so Publish reported success while
// writing into nowhere. nginx-managed.mjs derives its include path from the
// same value, so the two cannot drift apart again.
const NGINX_MANAGED_CONF_DIR = (process.env.NGINX_MANAGED_CONF_DIR || '/etc/nginx/conf.d/apen_support').trim()
const NGINX_MANAGED_RELOAD_ENABLED = process.env.NGINX_MANAGED_RELOAD !== '0'
const NGINX_BIN = (process.env.NGINX_BIN || '/usr/sbin/nginx').trim()
const SYSTEMCTL_BIN = (process.env.SYSTEMCTL_BIN || '/usr/bin/systemctl').trim()
/** nginx admin allowlist — maps each admin workstation IP to a hostname + AD
 *  user via its inline comments. Parsed so the audit log can attribute changes
 *  to a workstation/user even for legacy IP-allowlisted admins. */
const ADMIN_ACL_FILE = resolve(PROJECT_ROOT, 'nginx', 'admin-acl.inc')
/** Workstations barred from every change path (nginx/blocked-hosts.inc). Same
 *  file nginx includes, so the two layers cannot disagree. */
const BLOCKED_HOSTS_FILE = resolve(PROJECT_ROOT, 'nginx', 'blocked-hosts.inc')

const NOTIFICATION_EMAIL_TO = process.env.NOTIFICATION_EMAIL_TO || ''
const ADMIN_TOKEN = (process.env.ADMIN_API_TOKEN || '').trim()
/**
 * When ADMIN_API_TOKEN is unset, every /api/admin/* endpoint is unauthenticated.
 * That's only safe in local development. In production we fail closed unless
 * the operator explicitly opts out by setting ADMIN_AUTH_DISABLED=1, which
 * documents the choice and makes it grep-able. Default is fail-closed.
 */
const ADMIN_AUTH_DISABLED = process.env.ADMIN_AUTH_DISABLED === '1'
const MAX_CONTENT_BODY_BYTES = 512_000
const ROUTE_IMAGE_OVERRIDE_SCOPE = 'site/route-images'

/* ── NGINX live status source (VTS module / stub_status) ──
 *
 * Open-source nginx exposes only stub_status (7 global counters). The rich
 * per-zone / per-upstream / cache tables in the admin "NGINX status" tab require
 * the nginx-module-vts traffic-status module. readNginxStatus() reads the VTS
 * JSON and normalizes it (normalizeVts), falling back to stub_status for just
 * the connection summary. Every URL is loopback by default and overridable via
 * .env.local. See proxy/NGINX_VTS_RUNBOOK.md for the module build + nginx config
 * that makes these endpoints exist.
 */
const NGINX_VTS_JSON_URL    = (process.env.NGINX_VTS_JSON_URL    || 'http://127.0.0.1/status/format/json').trim()
const NGINX_STUB_STATUS_URL = (process.env.NGINX_STUB_STATUS_URL || 'http://127.0.0.1/nginx_status').trim()
// When the VTS config defines a filter group of per-path buckets (via
// `vhost_traffic_status_filter_by_set_key <key> <group>` — see
// NGINX_VTS_RUNBOOK.md), show those buckets as the HTTP "server zones" instead
// of the default host-based zones, so the admin table matches the /test/ mock's
// per-location rows (main / speedtest / api / winget / mirrors). Set to '' to
// always use host zones. INERT until such a filter group actually exists in the
// VTS JSON (falls back to host zones), so shipping this changes nothing today.
const NGINX_VTS_ZONE_FILTER_GROUP = (process.env.NGINX_VTS_ZONE_FILTER_GROUP ?? 'apen').trim()
const NGINX_STATUS_CACHE_MS   = Number.parseInt(process.env.NGINX_STATUS_CACHE_MS   || '4000', 10) || 4000
const NGINX_STATUS_TIMEOUT_MS = Number.parseInt(process.env.NGINX_STATUS_TIMEOUT_MS || '2500', 10) || 2500

/* ── LDAP/AD session config — multi-realm ──
 *
 * Real per-user login, general site-wide access plus admin. Several enclaves
 * can share the SAME AD domain NAME while pointing at completely different,
 * unrelated Domain Controllers — a single hardcoded endpoint can't
 * disambiguate which enclave a visitor belongs to. LDAP_REALMS is a JSON
 * array of independent realm configs; the login form lets the user pick
 * which realm they're in before binding. Example:
 *   [{ "id": "blcse-primary", "label": "BLCSE (Primary)",
 *      "url": "ldaps://10.0.1.5:636", "bindUserDnTemplate": "{username}@blcse.mil",
 *      "baseDn": "DC=blcse,DC=mil",
 *      "adminGroupDn": "CN=APEN Admins,OU=Groups,DC=blcse,DC=mil",
 *      "caCertPath": "/etc/apen/certs/blcse-ca.pem" }, ...]
 * Pin `url` to an explicit IP (or an unambiguous internal hostname), NOT a
 * bare domain name — DNS resolution from this box could reach the wrong
 * enclave's DC if two realms share a name.
 *
 * A successful bind alone grants an ordinary ('general') session — enough to
 * browse the site. Additionally being a member of that realm's
 * `adminGroupDn` grants an 'admin' session, which the rest of the app treats
 * exactly like today's admin login (still ALSO gated by admin-acl.inc's IP
 * allowlist wherever it already applies — this is an additive check, not a
 * replacement for it). When LDAP_REALMS is empty, /api/auth/* other than
 * /realms all return 503 — the login page then shows a hint and admins can
 * still use the legacy ADMIN_API_TOKEN flow.
 */
function parseLdapRealms(raw) {
  const value = (raw || '').trim()
  if (!value) return []
  let parsed
  try {
    parsed = JSON.parse(value)
  } catch (err) {
    console.error('[site-stats] LDAP_REALMS is not valid JSON:', err.message)
    return []
  }
  if (!Array.isArray(parsed)) {
    console.error('[site-stats] LDAP_REALMS must be a JSON array.')
    return []
  }
  const realms = []
  const seenIds = new Set()
  const realmIdByGroupDn = new Map()
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') continue
    const id = String(entry.id || '').trim()
    // `url` may be a single DC endpoint or several (most AD domains run ≥2 DCs
    // for redundancy). ldapts's Client binds to exactly one URL per instance
    // (no built-in multi-host failover), so multiple DCs are normalized to
    // `urls` here and tried in order by ldapAuthenticate below.
    //
    // Each entry can be a plain URL string, OR {url, servername} when the URL
    // is a bare IP (the recommended form, to avoid DNS ambiguity across
    // enclaves — see the .env.local comment). A DC's TLS certificate is
    // normally issued for its DNS hostname (e.g. dc1.blcse.mil), NOT its IP,
    // so connecting straight to the IP fails TLS hostname verification with
    // "Hostname/IP does not match certificate's altnames" even though the
    // cert chain itself is trusted. `servername` tells Node's TLS layer "dial
    // this IP, but verify the certificate as if connecting to this hostname"
    // — the standard fix for exactly this connect-by-IP/verify-by-name split,
    // and it does NOT require resolving that hostname via DNS at connect time.
    const rawUrls = Array.isArray(entry.url) ? entry.url : [entry.url]
    const urls = rawUrls
      .map((u) => {
        if (typeof u === 'string') return { url: u.trim(), servername: '' }
        if (u && typeof u === 'object') {
          return { url: String(u.url || '').trim(), servername: String(u.servername || '').trim() }
        }
        return { url: '', servername: '' }
      })
      .filter((u) => u.url)
    const bindUserDnTemplate = String(entry.bindUserDnTemplate || '').trim()
    if (!id || urls.length === 0 || !bindUserDnTemplate) {
      console.error('[site-stats] LDAP_REALMS entry missing id/url/bindUserDnTemplate, skipping:', entry)
      continue
    }
    if (seenIds.has(id)) {
      console.error(`[site-stats] LDAP_REALMS has a duplicate realm id "${id}" — skipping the repeat.`)
      continue
    }
    seenIds.add(id)
    const adminGroupDn = String(entry.adminGroupDn || '').trim()
    realms.push({
      id,
      label: String(entry.label || id).trim() || id,
      urls,
      bindUserDnTemplate,
      baseDn: String(entry.baseDn || '').trim(),
      adminGroupDn,
      caCertPath: String(entry.caCertPath || '').trim(),
      // Domain policy, read by proxy/ldap-domain.mjs. This object is a
      // whitelist rebuild of the config entry, not a copy of it, so anything
      // omitted here is invisible downstream — allowedDomains left out means
      // every login outside the realm's own domain is refused as a spoofed
      // domain claim.
      allowedDomains: Array.isArray(entry.allowedDomains)
        ? entry.allowedDomains.map((d) => String(d || '').trim()).filter(Boolean)
        : [],
      netbiosDomains: entry.netbiosDomains && typeof entry.netbiosDomains === 'object' ? entry.netbiosDomains : {},
      gcUrl: entry.gcUrl ?? '',
    })
    if (adminGroupDn) {
      const key = adminGroupDn.toLowerCase()
      const existingRealmId = realmIdByGroupDn.get(key)
      if (existingRealmId) {
        console.warn(`[site-stats] LDAP_REALMS: realms "${existingRealmId}" and "${id}" share the same adminGroupDn. If that's not intentional, a copy-pasted group DN across unrelated realms can unintentionally grant admin access.`)
      } else {
        realmIdByGroupDn.set(key, id)
      }
    }
  }
  return realms
}

const LDAP_REALMS = parseLdapRealms(process.env.LDAP_REALMS)
const LDAP_TIMEOUT_MS = Number.parseInt(process.env.LDAP_TIMEOUT_MS || '5000', 10) || 5000
const ADMIN_SESSION_TTL_HOURS = Number.parseFloat(process.env.ADMIN_SESSION_TTL_HOURS || '8') || 8
// Renamed from ADMIN_SESSION_COOKIE_NAME — this cookie now covers both
// general and admin sessions, not admin-only.
const SESSION_COOKIE_NAME = (process.env.SESSION_COOKIE_NAME || 'apen_session').trim()
const ADMIN_SESSIONS_FILE = resolve(STATE_DIR, 'admin-sessions.json')
const GENERAL_SESSIONS_FILE = resolve(STATE_DIR, 'general-sessions.json')
const LDAP_CONFIGURED = LDAP_REALMS.length > 0

/* ── External-URL redirect map ──
 *
 * Internal/private URLs (Tenable, the internal CA, TrackIt, the AI service)
 * used to be hard-coded in the client bundle, which leaked their addresses
 * to any visitor who downloaded the static JS. Instead, the client links
 * to /api/external/<key>; this server returns a 302 to the real URL. Real
 * URLs come from .env.local so they never appear in source control or the
 * public bundle. Anything sensitive must be set via env; defaults are
 * intentionally absent so a misconfigured deployment fails closed.
 */
const EXTERNAL_URL_MAP = {
  'certificate-services': process.env.EXTERNAL_URL_CERTIFICATE_SERVICES || '',
  'track-it': process.env.EXTERNAL_URL_TRACK_IT || '',
  'tenable': process.env.EXTERNAL_URL_TENABLE || '',
  'voltron': process.env.EXTERNAL_URL_VOLTRON || '',
  // Keys below are linked from lib/data/constants.ts (wanshow) and
  // config/links.ts (qpro/hpc/hub/cui). They were missing here, so every one
  // of those tiles 404'd no matter what .env.local said.
  'wan-show': process.env.EXTERNAL_URL_WAN_SHOW || '',
  'qpro': process.env.EXTERNAL_URL_QPRO || '',
  'hpc': process.env.EXTERNAL_URL_HPC || '',
  'hub': process.env.EXTERNAL_URL_HUB || '',
  'cui-portal': process.env.EXTERNAL_URL_CUI_PORTAL || '',
}

if (!ADMIN_TOKEN && ADMIN_AUTH_DISABLED) {
  console.warn('[site-stats] ADMIN_AUTH_DISABLED=1 — admin API is OPEN. Do not run this in production.')
} else if (!ADMIN_TOKEN) {
  console.warn('[site-stats] ADMIN_API_TOKEN is not set — admin API will reject every request. Set ADMIN_API_TOKEN in .env.local, or set ADMIN_AUTH_DISABLED=1 for local dev.')
}

/* ── 2. PERSISTENCE ── every JSON state file goes through proxy/state-files.mjs:
 * bad files are moved aside instead of overwritten, saves are atomic and 0600. */
const isArrayOrObject = (v) => Array.isArray(v) || isPlainObject(v) // legacy stores were bare arrays

/** Newest-first; every writer trims to this so the store and the file cannot grow without bound. */
const FEEDBACK_MAX_ENTRIES = 500
let feedbackStorage = loadJson(FEEDBACK_FILE, [], Array.isArray)

/* ── Chat transcripts ──
 * One record per (realm, username) — a returning user's transcript keeps
 * growing in place rather than accumulating a new record per login, which
 * is what makes "the same conversation follows you to another device" work:
 * both devices read/write the SAME record once logged in as the same user.
 * Bounded the same way lib/assistant/storage.ts bounds the client-side
 * sessionStorage cache (message count + per-message length), plus a cap on
 * total distinct transcripts so the file can't grow unbounded.
 */
const CHAT_HISTORY_MAX_MESSAGES = 40
const CHAT_HISTORY_MAX_MESSAGE_CHARS = 20_000
const CHAT_HISTORY_MAX_RECORDS = 5000

let chatHistoryStorage = loadJson(CHAT_HISTORY_FILE, [], Array.isArray)

function commitChatHistoryToDisk() { saveJson(CHAT_HISTORY_FILE, chatHistoryStorage, 'Chat history') }

function chatHistoryKey(realm, username) {
  return `${realm}::${username}`.toLowerCase()
}

function sanitizeChatMessages(input) {
  if (!Array.isArray(input)) return []
  return input
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
    .slice(-CHAT_HISTORY_MAX_MESSAGES)
    .map((m) => ({
      role: m.role,
      text: m.text.slice(0, CHAT_HISTORY_MAX_MESSAGE_CHARS),
      ts: typeof m.ts === 'number' ? m.ts : Date.now(),
      ...(typeof m.attachmentName === 'string' ? { attachmentName: m.attachmentName.slice(0, 255) } : {}),
    }))
}

const defaultNotificationSettings = {
  enabled: Boolean(NOTIFICATION_EMAIL_TO),
  emailAddress: NOTIFICATION_EMAIL_TO,
  notifyOnSystemEvents: true,
  notifyOnFeedback: true,
  lastSavedAt: null,
}

const storedNotificationSettings = loadJson(NOTIFICATION_SETTINGS_FILE, null, isPlainObject)
let notificationSettings = storedNotificationSettings
  ? normalizeNotificationSettings(storedNotificationSettings)
  : defaultNotificationSettings

let acknowledgedAlertIds = normalizeAcknowledgedAlertIds(loadJson(ACKNOWLEDGED_ALERTS_FILE, [], isArrayOrObject))

// Shared "remove from view" dismissals, each attributed to the admin who made
// it. Survives refresh, rebuild, and is visible to every admin.
let dismissals = normalizeDismissals(loadJson(DISMISSED_ALERTS_FILE, [], isArrayOrObject))

/* ── 2b. ADMIN CONTENT STORE ── */
let contentOverrides = loadJson(CONTENT_OVERRIDES_FILE, {}, isPlainObject)
let customPages = loadJson(CUSTOM_PAGES_FILE, [], Array.isArray)
let contentAuditLog = loadJson(CONTENT_AUDIT_FILE, [], Array.isArray)

function commitContentOverridesToDisk() { saveJson(CONTENT_OVERRIDES_FILE, contentOverrides, 'Content overrides') }

/* ── Stale-link prevention ──────────────────────────────────
 *
 * Renaming a server file changes its public URL, and anything still pointing at
 * the old name 404s silently. Two layers stop that:
 *
 *  1. On rename, every admin override that mentions the old URL is rewritten to
 *     the new one automatically, and the built site is scanned for leftover
 *     references (links living in source defaults, which only an override or a
 *     source edit can fix) so the admin is told instead of finding out from a
 *     user.
 *  2. After every Publish build, the download-link audit runs and its verdict
 *     lands in the build status, so a broken link never survives a publish
 *     unnoticed.
 */

/** Replace oldUrl with newUrl in every string of every override. Returns the
 *  number of strings changed; persists and logs when anything did. */
function rewriteOverrideUrls(oldUrl, newUrl, actor) {
  let changed = 0
  const walk = (node) => {
    if (Array.isArray(node)) return node.map(walk)
    if (node && typeof node === 'object') {
      const out = {}
      for (const [key, value] of Object.entries(node)) out[key] = walk(value)
      return out
    }
    if (typeof node === 'string' && node.includes(oldUrl)) {
      changed += 1
      return node.split(oldUrl).join(newUrl)
    }
    return node
  }
  const next = walk(contentOverrides)
  if (changed > 0) {
    contentOverrides = next
    commitContentOverridesToDisk()
    appendAuditEntry({ kind: 'override.set', slug: `link-rewrite ${oldUrl} → ${newUrl} (${changed})`, by: actor || 'admin-ui' })
  }
  return changed
}

/** Count admin overrides still pointing at a URL, WITHOUT rewriting them.
 *  Same walk as rewriteOverrideUrls above — a rename repairs these, but a
 *  delete cannot, so the delete endpoint has to count them and refuse. */
function countOverrideReferences(url) {
  let hits = 0
  const walk = (node) => {
    if (Array.isArray(node)) { node.forEach(walk); return }
    if (node && typeof node === 'object') { Object.values(node).forEach(walk); return }
    if (typeof node === 'string' && node.includes(url)) hits += 1
  }
  walk(contentOverrides)
  return hits
}

/** Count built pages/chunks still referencing a URL (raw or %-encoded). Read-
 *  only sweep of out/*.html|js — those references live in SOURCE defaults, so
 *  a rename can't fix them and the admin has to be told. */
function countBuiltReferences(url) {
  const needles = [...new Set([url, encodeURI(url)])]
  let hits = 0
  const walk = (dir) => {
    let names = []
    try { names = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const entry of names) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) { walk(path); continue }
      if (!/\.(html|js|txt|json)$/.test(entry.name)) continue
      try {
        const text = readFileSync(path, 'utf8')
        if (needles.some((needle) => text.includes(needle))) hits += 1
      } catch { /* unreadable build artifact — skip */ }
    }
  }
  walk(join(PROJECT_ROOT, 'out'))
  return hits
}

/** Post-build link audit — folds its verdict into buildStatus so a publish can
 *  never leave broken download links silently. */
function runLinkAuditIntoBuildStatus() {
  try {
    const child = spawn('node --import ./scripts/register-test-loader.mjs scripts/audit-download-links.mjs --json', {
      cwd: PROJECT_ROOT, env: process.env, shell: true,
    })
    let out = ''
    child.stdout.on('data', (buf) => { out += buf.toString() })
    child.on('close', () => {
      try {
        const report = JSON.parse(out.trim().split('\n').pop())
        if (buildStatus.state !== 'success') return
        buildStatus = {
          ...buildStatus,
          brokenLinks: report.broken.length,
          message: report.broken.length === 0
            ? `Build complete — all ${report.checked} download links verified against the server.`
            : `Build complete, BUT ${report.broken.length} of ${report.checked} download links point at files missing from the server`
              + ` (e.g. ${report.broken.slice(0, 2).map((b) => b.path).join(', ')}). Fix the cards or upload the files, then publish again.`,
        }
      } catch { /* audit output unparsable — leave the plain success message */ }
    })
  } catch { /* audit unavailable — the build result stands on its own */ }
}

/* ── Publish: bake draft overrides into the committed build snapshot, rebuild ──
 *
 * Saving a card writes a *draft* override (content-overrides.json) that shows
 * up instantly via the runtime overlay. Publishing snapshots those drafts into
 * lib/data/published-content.json — a git-tracked file the static export bakes
 * in — and runs `npm run validate` so the change becomes a permanent default that
 * survives $SITEUPDATE without anyone editing source. buildStatus is in-memory
 * (resets to idle on proxy restart); the snapshot itself is durable on disk.
 */
let buildStatus = { state: 'idle' }

function readPublishedContent() {
  try {
    const parsed = JSON.parse(readFileSync(PUBLISHED_CONTENT_FILE, 'utf8'))
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch { /* missing or invalid → treat as nothing published yet */ }
  return {}
}

/** Human byte count for admin-facing error strings (2 decimal digits max). */
function formatByteCount(bytes) {
  const value = Number(bytes)
  if (!Number.isFinite(value)) return 'unknown'
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
  let index = 0
  let scaled = Math.abs(value)
  while (scaled >= 1024 && index < units.length - 1) { scaled /= 1024; index += 1 }
  return `${scaled >= 100 || index === 0 ? Math.round(scaled) : scaled.toFixed(1)} ${units[index]}`
}

/**
 * Can this process actually write the published snapshot? Surfaced to /admin so
 * a permissions drift (e.g. the file redeployed root-owned while the proxy runs
 * as dod_admin) shows up as a banner BEFORE someone clicks Publish — instead of
 * as an unpublished flag that silently comes back on the next refresh.
 */
function publishTargetState() {
  const path = PUBLISHED_CONTENT_FILE
  try {
    accessSync(existsSync(path) ? path : PROJECT_ROOT_DATA_DIR, FS_CONSTANTS.W_OK)
    return { path, writable: true, error: null }
  } catch (err) {
    return { path, writable: false, error: err.message }
  }
}

function startPublishBuild(actor) {
  if (buildStatus.state === 'running') return buildStatus

  // 1) Snapshot the current draft overrides into the committed, build-baked
  //    file. This alone makes the edit permanent for the *next* build even if
  //    the rebuild below is disabled or fails. Read it back before claiming
  //    success: a snapshot that didn't land is exactly the failure that used to
  //    show in Admin as an unpublished flag that never cleared.
  const snapshot = JSON.stringify(contentOverrides, null, 2)
  try {
    writeFileSync(PUBLISHED_CONTENT_FILE, snapshot, 'utf8')
    if (readFileSync(PUBLISHED_CONTENT_FILE, 'utf8') !== snapshot) {
      throw new Error('the file on disk does not match what was just written')
    }
  } catch (err) {
    buildStatus = { state: 'error', finishedAt: new Date().toISOString(), message: `Could not write published snapshot (${PUBLISHED_CONTENT_FILE}): ${err.message}` }
    return buildStatus
  }

  if (!PUBLISH_BUILD_ENABLED) {
    buildStatus = { state: 'success', finishedAt: new Date().toISOString(), by: actor || 'admin', exitCode: 0, message: 'Snapshot written (auto-build disabled). Run $SITEUPDATE to rebuild.' }
    return buildStatus
  }

  // 2) Rebuild the static export so the baked HTML reflects the new defaults.
  buildStatus = { state: 'running', startedAt: new Date().toISOString(), by: actor || 'admin', exitCode: null }
  let tail = ''
  const collect = (buf) => { tail = (tail + buf.toString()).slice(-4000) }
  try {
    // shell:true resolves `npm` via PATH (PM2 launches this proxy via npm, so
    // npm is on PATH for its daemon). The command string is static — no user
    // input is interpolated — so shell:true carries no injection risk here.
    // `validate` = lint, typecheck, test, then the same `build`: the artifact
    // is identical, but a change that breaks a gate cannot reach out/.
    const child = spawn('npm run validate', { cwd: PROJECT_ROOT, env: process.env, shell: true })
    child.stdout.on('data', collect)
    child.stderr.on('data', collect)
    child.on('error', (err) => {
      buildStatus = { state: 'error', startedAt: buildStatus.startedAt, finishedAt: new Date().toISOString(), by: buildStatus.by, message: err.message }
    })
    child.on('close', (code) => {
      const lastLines = tail.split('\n').filter(Boolean).slice(-8).join('\n')
      // npm announces each script as it starts ("npm notice run pkg@ver lint" on
      // npm >= 11, "> pkg@ver lint" before); the last one announced is the one
      // that failed, so the admin sees WHICH gate stopped the publish.
      const stages = [...tail.matchAll(/^(?:npm notice run|>) apen-support-site@\S+ ([\w:-]+)$/gm)].map((m) => m[1])
      const failedStage = stages.filter((name) => name !== 'validate').at(-1)
      buildStatus = {
        state: code === 0 ? 'success' : 'error',
        startedAt: buildStatus.startedAt,
        finishedAt: new Date().toISOString(),
        by: buildStatus.by,
        exitCode: code,
        message: code === 0
          ? 'Build complete — changes are now permanent.'
          : `${failedStage ? `Failed at "${failedStage}" (exit ${code}).` : `Build failed (exit ${code}).`}${lastLines ? `\n${lastLines}` : ''}`,
      }
      if (code === 0) runLinkAuditIntoBuildStatus()
    })
  } catch (err) {
    buildStatus = { state: 'error', startedAt: buildStatus.startedAt, finishedAt: new Date().toISOString(), by: buildStatus.by, message: err.message }
  }
  return buildStatus
}

/* ── Admin-managed nginx zones/upstreams: write fragments + reload nginx ──
 * Mirrors the content "Publish & Rebuild" flow but for nginx config. Writing
 * the fragments needs no root (dod_admin owns the conf dir); the reload uses
 * `sudo -n` and degrades to state:'pending' (config written, applies later) when
 * the sudoers rule isn't installed. On a real nginx -t rejection the fragments
 * are reverted so /etc/nginx never ends up in a state that fails the next deploy. */
let nginxReloadStatus = { state: 'idle' }

function backupManagedFragments() {
  const saved = {}
  for (const f of ['managed-http.conf', 'managed-loc.conf']) {
    const p = join(NGINX_MANAGED_CONF_DIR, f)
    saved[f] = existsSync(p) ? readFileSync(p, 'utf8') : null
  }
  return saved
}
function restoreManagedFragments(saved) {
  for (const [f, content] of Object.entries(saved || {})) {
    const p = join(NGINX_MANAGED_CONF_DIR, f)
    try { if (content == null) { if (existsSync(p)) rmSync(p) } else writeFileSync(p, content, 'utf8') } catch { /* best effort */ }
  }
}

function startNginxManagedPublish(entries, actor) {
  if (nginxReloadStatus.state === 'running') return nginxReloadStatus
  nginxReloadStatus = { state: 'running', startedAt: new Date().toISOString(), by: actor || 'admin' }
  // 1) persist the registry (repo copy — survives across restarts / re-render).
  try {
    writeRegistry(NGINX_MANAGED_FILE, entries, actor)
  } catch (err) {
    nginxReloadStatus = { state: 'error', finishedAt: new Date().toISOString(), by: actor, message: `Could not save registry: ${err.message}` }
    return nginxReloadStatus
  }
  // 2) write the nginx fragments, keeping a backup to revert to on rejection.
  const backup = backupManagedFragments()
  try {
    writeManagedFragments(NGINX_MANAGED_CONF_DIR, entries)
  } catch (err) {
    nginxReloadStatus = { state: 'error', finishedAt: new Date().toISOString(), by: actor, message: `Could not write nginx config to ${NGINX_MANAGED_CONF_DIR}: ${err.message}` }
    return nginxReloadStatus
  }
  if (!NGINX_MANAGED_RELOAD_ENABLED) {
    nginxReloadStatus = { state: 'success', finishedAt: new Date().toISOString(), by: actor, message: 'Config written (auto-reload disabled). Applies on the next $SITEUPDATE / nginx reload.' }
    return nginxReloadStatus
  }
  // 3) validate then reload via sudo -n.
  execFile('sudo', ['-n', NGINX_BIN, '-t'], { timeout: 15000 }, (tErr, _o, tStderr) => {
    const s = String(tStderr || (tErr && tErr.message) || '')
    if (tErr) {
      if (/\[emerg\]|test failed/i.test(s)) {
        // nginx actually rejected the config → revert so the next deploy is safe.
        restoreManagedFragments(backup)
        nginxReloadStatus = { state: 'error', finishedAt: new Date().toISOString(), by: actor, message: `nginx -t rejected the config (reverted): ${s.trim().split('\n').slice(-3).join(' ').slice(0, 300)}` }
      } else {
        // sudo not authorized / not configured — config is written, apply later.
        nginxReloadStatus = { state: 'pending', finishedAt: new Date().toISOString(), by: actor, message: 'Config written, but the proxy is not authorized to reload nginx. Add the sudoers rule (see proxy/NGINX_VTS_RUNBOOK.md) then Publish again, or run `sudo systemctl reload nginx`. It also applies on the next $SITEUPDATE.' }
      }
      return
    }
    execFile('sudo', ['-n', SYSTEMCTL_BIN, 'reload', 'nginx'], { timeout: 15000 }, (rErr, _o2, rStderr) => {
      if (rErr) {
        nginxReloadStatus = { state: 'error', finishedAt: new Date().toISOString(), by: actor, message: `nginx -t passed but reload failed: ${String(rStderr || rErr.message || '').trim().slice(0, 200)}` }
        return
      }
      nginxReloadStatus = { state: 'success', finishedAt: new Date().toISOString(), by: actor, message: 'Config written and nginx reloaded — the new zones/upstreams are live.' }
    })
  })
  return nginxReloadStatus
}

/* ── Session stores ──
 * Two independent stores: admin-sessions.json (kind:'admin' only) and
 * general-sessions.json (everyone else — general login now covers the whole
 * site, not just /admin). Split for blast-radius, but also for performance:
 * a shared store means EVERY cookie lookup (now happening on nearly every
 * page request sitewide, potentially ~3,000 users) would contend on the same
 * array and file. lastSeenAt is advisory/informational — it's always bumped
 * in memory, but only flushed to disk periodically (LAST_SEEN_FLUSH_INTERVAL_MS)
 * rather than on every single lookup, which would otherwise be a synchronous
 * full-array disk write on nearly every request. Writes are atomic (temp
 * file + rename) so a process kill mid-write can't corrupt either file.
 */
let adminSessions = loadJson(ADMIN_SESSIONS_FILE, [], Array.isArray)
let generalSessions = loadJson(GENERAL_SESSIONS_FILE, [], Array.isArray)
let adminSessionsDirty = false
let generalSessionsDirty = false
const LAST_SEEN_FLUSH_INTERVAL_MS = 60_000

function commitAdminSessionsToDisk() {
  saveJson(ADMIN_SESSIONS_FILE, adminSessions, 'Admin sessions')
  adminSessionsDirty = false
}

function commitGeneralSessionsToDisk() {
  saveJson(GENERAL_SESSIONS_FILE, generalSessions, 'General sessions')
  generalSessionsDirty = false
}

// Periodic flush for the "someone read a session recently" (lastSeenAt-only)
// case; every OTHER mutation (login/logout/prune) commits immediately itself.
// Pruning runs here too rather than in findSessionByCookie: that lookup is on
// the site-wide auth_request path, and it re-checks expiresAt on the session
// it matches, so an expired entry lingering up to one interval grants nothing.
const sessionFlushTimer = setInterval(() => {
  pruneExpiredSessions()
  if (adminSessionsDirty) commitAdminSessionsToDisk()
  if (generalSessionsDirty) commitGeneralSessionsToDisk()
}, LAST_SEEN_FLUSH_INTERVAL_MS)
sessionFlushTimer.unref()

function pruneExpiredSessions() {
  const now = Date.now()
  const beforeAdmin = adminSessions.length
  adminSessions = adminSessions.filter((s) => s && typeof s.expiresAt === 'number' && s.expiresAt > now)
  if (adminSessions.length !== beforeAdmin) commitAdminSessionsToDisk()

  const beforeGeneral = generalSessions.length
  generalSessions = generalSessions.filter((s) => s && typeof s.expiresAt === 'number' && s.expiresAt > now)
  if (generalSessions.length !== beforeGeneral) commitGeneralSessionsToDisk()
}
// Once at startup: drops expired and malformed entries from the loaded files,
// so the per-request lookup never meets a record without an id.
pruneExpiredSessions()

function commitCustomPagesToDisk() { saveJson(CUSTOM_PAGES_FILE, customPages, 'Custom pages') }

/* ─── Custom-page source-code generation ─────────────────────────────────
 *
 * For every page published via the New Page Wizard we also write a real
 * Next.js route file at app/<category>/<slug>/page.tsx. The file inlines the
 * page data and delegates rendering to <CustomPageView />. This means:
 *   • After `npm run build`, each wizard page becomes a static export
 *     (out/<category>/<slug>/index.html) rather than relying on nginx's
 *     /custom-pages/ fallback.
 *   • The source files are version-controllable and auditable in git.
 *
 * isSafeSegment is the gatekeeper for filesystem writes — it guarantees the
 * category and slug only contain characters that map to a literal directory
 * name with no `..` traversal, no shell metacharacters, no spaces.
 */
function isSafeSegment(value) {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,63}$/.test(value)
}

function customPageSourceDir(category, slug) {
  return join(APP_DIR, category, slug)
}

function renderCustomPageSource(page) {
  const dataJson = JSON.stringify(page, null, 2).replace(/[`$\\]/g, (c) => `\\${c}`)
  const titleJson = JSON.stringify(page.title || 'Custom Page')
  return [
    "// AUTOGENERATED by the /admin/ New Page Wizard — do not edit by hand.",
    "// Regenerated on every publish/edit/delete through the admin UI; manual",
    "// edits will be overwritten. Edit the page via the wizard instead.",
    "import type { Metadata } from 'next'",
    "import { CustomPageView } from '@/components/CustomPageView'",
    "import type { CustomPage } from '@/lib/data/admin-content'",
    "",
    `const PAGE_DATA: CustomPage = ${dataJson}`,
    "",
    `export const metadata: Metadata = { title: ${titleJson} }`,
    "",
    "export default function GeneratedCustomPage() {",
    "  return (",
    "    <div className=\"page-enter\">",
    "      <CustomPageView page={PAGE_DATA} />",
    "    </div>",
    "  )",
    "}",
    "",
  ].join('\n')
}

function writeCustomPageSource(page) {
  if (!GENERATE_PAGE_SOURCES) return
  if (!isSafeSegment(page.category) || !isSafeSegment(page.slug)) {
    console.warn('[site-stats] Refusing to write source for unsafe segment:', page.category, page.slug)
    return
  }
  try {
    const dir = customPageSourceDir(page.category, page.slug)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'page.tsx'), renderCustomPageSource(page), 'utf8')
  } catch (err) {
    console.error('[site-stats] Could not write source for', `${page.category}/${page.slug}`, err)
  }
}

function deleteCustomPageSource(category, slug) {
  if (!GENERATE_PAGE_SOURCES) return
  if (!isSafeSegment(category) || !isSafeSegment(slug)) return
  try {
    const dir = customPageSourceDir(category, slug)
    if (!existsSync(dir)) return
    // Only remove the directory if its only contents are files we generated.
    // We want to be aggressive about cleanup, but never blow away a folder
    // that a developer added to (e.g. a `helpers.ts` they want to keep).
    const entries = readdirSync(dir, { withFileTypes: true })
    const onlyGenerated = entries.length === 1 && entries[0].isFile() && entries[0].name === 'page.tsx'
    if (onlyGenerated) {
      rmSync(dir, { recursive: true, force: true })
    } else {
      // Leave any extra files in place, just remove our generated page.tsx.
      rmSync(join(dir, 'page.tsx'), { force: true })
    }
  } catch (err) {
    console.error('[site-stats] Could not delete source for', `${category}/${slug}`, err)
  }
}

function commitContentAuditLogToDisk() { saveJson(CONTENT_AUDIT_FILE, contentAuditLog, 'Content audit') }

/* ── Workstation identification from the nginx admin ACL ──
 * admin-acl.inc allowlists each admin workstation by IP with a comment that
 * records the hostname + AD user, e.g.:
 *     allow 140.32.70.41; # CESCDREN14 (JWebber.ou)
 * We parse that mapping so every audit entry can be attributed to a
 * workstation/user — even for legacy IP-allowlisted admins who never logged in
 * via LDAP. The file is re-read when its mtime changes so ACL edits take effect
 * without a proxy restart. */
let aclWorkstationMap = {}
let aclMtimeMs = -1
function loadWorkstationMap() {
  try {
    const st = statSync(ADMIN_ACL_FILE)
    if (st.mtimeMs === aclMtimeMs) return aclWorkstationMap
    const map = {}
    const re = /^\s*allow\s+([0-9a-fA-F:.]+)\s*;\s*#\s*(\S+)(?:\s*\(([^)]+)\))?/
    for (const line of readFileSync(ADMIN_ACL_FILE, 'utf8').split('\n')) {
      const m = re.exec(line)
      if (m) map[m[1]] = { workstation: m[2], user: m[3] || '' }
    }
    aclWorkstationMap = map
    aclMtimeMs = st.mtimeMs
  } catch { /* ACL unreadable → keep last good map */ }
  return aclWorkstationMap
}

function resolveWorkstation(req) {
  const ip = String(req?.headers?.['x-real-ip'] || req?.socket?.remoteAddress || '')
    .trim().replace(/^::ffff:/, '')
  const info = loadWorkstationMap()[ip]
  return { ip, workstation: info?.workstation || '', user: info?.user || '' }
}

function appendAuditEntry(entry, req) {
  const ws = resolveWorkstation(req)
  // Actor preference: real LDAP session username > AD user from the ACL comment
  // > caller-supplied sentinel. ('admin' is the generic non-LDAP fallback, so
  // we treat it as "no real username" and prefer the ACL-derived user.)
  const sessionUser = (req && typeof req.adminUser === 'string' && req.adminUser !== 'admin') ? req.adminUser : ''
  const actor = sessionUser || ws.user || entry.by || 'admin'
  contentAuditLog.unshift({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    ...entry,
    by: actor,
    ...(ws.workstation ? { workstation: ws.workstation } : {}),
    ...(ws.ip ? { ip: ws.ip } : {}),
  })
  contentAuditLog = contentAuditLog.slice(0, 500)
  commitContentAuditLogToDisk()
}


/* ── 2c. INFRASTRUCTURE NODES (real health monitoring) ──
 *
 * Each node describes one endpoint we want to keep an eye on. They live in
 * `infrastructure-nodes.json` so admins can edit the list through the admin
 * console without touching source code. The node shape is:
 *
 *   {
 *     id: 'web',                              // stable id (admin-editable)
 *     name: 'APEN Nginx Edge',                // display label
 *     kind: 'http' | 'tcp',                   // probe strategy
 *     target: 'https://apensupport.blcse.mil/' or 'host:port',
 *     description: 'Front-line web edge serving the static export.',
 *     timeoutMs: 5000,                        // probe timeout
 *     expectedStatus: [200, 301, 302],        // optional, http only
 *   }
 *
 * Each node also carries live state in `nodeStatusCache` keyed by id:
 *   { status, latencyMs, httpStatus, lastCheckedAt, error, history[] }
 *
 * The periodic poller hits every node every NODE_POLL_INTERVAL_MS so the
 * admin dashboard reads from cache rather than blocking on every request.
 */

const NODE_POLL_INTERVAL_MS = Math.max(
  10_000,
  Number.parseInt(process.env.NODE_POLL_INTERVAL_MS || '30000', 10) || 30_000,
)
const NODE_HISTORY_MAX = 30
const VALID_NODE_KINDS = new Set(['http', 'tcp'])

/**
 * Public origin of THIS site, used to seed node targets. Probe by name, never
 * by IP: a bare-IP target sends `Host: <ip>`, which nginx may match to a
 * different server block entirely — on the live box 172.16.2.19 belongs to the
 * netsupport vhost, so an IP probe silently reports on the wrong site. Override
 * per enclave with SITE_ORIGIN in .env.local if the FQDN differs there.
 */
const SITE_ORIGIN = (process.env.SITE_ORIGIN || 'https://apensupport.blcse.mil').replace(/\/+$/, '')

const DEFAULT_NODES = [
  {
    id: 'web',
    name: 'APEN Nginx Edge',
    kind: 'http',
    target: `${SITE_ORIGIN}/`,
    description: 'Front-line nginx instance serving the Next.js static export.',
    timeoutMs: 5000,
    expectedStatus: [200, 301, 302, 401, 403],
  },
  {
    id: 'voltron',
    name: 'Voltron Chat Proxy (local)',
    kind: 'http',
    target: `${SITE_ORIGIN}/`,
    healthCheckUrl: 'http://127.0.0.1:8787/api/voltron-chat',
    description: 'Local Voltron chat proxy (pm2 voltron-proxy, 127.0.0.1:8787). GET returns 405 by design — that is the healthy signal.',
    timeoutMs: 4000,
    expectedStatus: [200, 204, 405],
  },
  {
    id: 'stats',
    name: 'Site Stats API (through nginx)',
    kind: 'http',
    target: `${SITE_ORIGIN}/api/site-stats`,
    description: 'This very service, probed through nginx so a broken upstream route shows up. 401 is the healthy unauthenticated answer.',
    timeoutMs: 3000,
    expectedStatus: [200, 401],
  },
  {
    id: 'speedtest',
    name: 'Speedtest Backend',
    kind: 'http',
    target: 'http://127.0.0.1:8085/speedtest/',
    healthCheckUrl: 'http://127.0.0.1:8085/speedtest/api/config',
    description: 'Shared FastAPI speedtest container. Health check hits the JSON config endpoint, not the SPA shell.',
    timeoutMs: 3000,
    expectedStatus: [200],
  },
]

// A corrupt nodes file was moved aside by loadJson, never overwritten; the
// seed below therefore only ever fills an absent or empty file.
let infrastructureNodes = loadJson(NODES_FILE, [], Array.isArray)
if (infrastructureNodes.length === 0) {
  infrastructureNodes = DEFAULT_NODES
  saveJson(NODES_FILE, infrastructureNodes, 'Infrastructure nodes seed')
}

/** mtime of infrastructure-nodes.json as last loaded into memory. */
let nodesFileMtimeMs = 0
try { nodesFileMtimeMs = statSync(NODES_FILE).mtimeMs } catch { /* file may not exist yet */ }

/** Re-read infrastructure-nodes.json when it changes on disk, so a direct edit
 *  (e.g. fixing a node's healthCheckUrl) takes effect on the next probe cycle
 *  without restarting the service. Keeps the current nodes on any read/parse
 *  error so a half-written file never blanks the dashboard. */
function reloadNodesIfChanged() {
  let mtime = 0
  try { mtime = statSync(NODES_FILE).mtimeMs } catch { return }
  if (mtime === nodesFileMtimeMs) return
  try {
    const parsed = JSON.parse(readFileSync(NODES_FILE, 'utf8'))
    if (Array.isArray(parsed) && parsed.length) {
      infrastructureNodes = parsed
      nodesFileMtimeMs = mtime
    }
  } catch { /* keep current nodes until the file parses cleanly */ }
}

/** Live state per node id. Built lazily as probes run. */
const nodeStatusCache = new Map()

function commitNodesToDisk() { saveJson(NODES_FILE, infrastructureNodes, 'Infrastructure nodes') }

/**
 * Targets the infrastructure-node monitor will refuse outright. These map
 * to well-known SSRF abuse paths — cloud-instance metadata services that
 * leak IAM credentials when probed from inside the VPC, the IPv6 mapped
 * variants of the same, and a few link-local endpoints. Internal RFC1918
 * addresses are deliberately allowed because the legitimate use case is
 * monitoring on-prem infrastructure.
 */
const SSRF_BLOCKED_HOSTS = new Set([
  '169.254.169.254',         // AWS / Azure / GCP / DigitalOcean metadata
  'metadata.google.internal', // GCP DNS metadata
  'metadata.azure.com',
  'metadata',                 // some bare-bones metadata services
  'fd00:ec2::254',           // AWS metadata IPv6
])
const SSRF_ALLOWED_HTTP_SCHEMES = new Set(['http:', 'https:'])

function isLinkLocalLiteral(host) {
  // 169.254.x.x and IPv6 fe80::/10 are link-local; commonly abused for
  // metadata endpoints. We refuse without a special cloud-metadata flag.
  if (/^169\.254\.\d+\.\d+$/.test(host)) return true
  if (/^fe[89ab][0-9a-f]:/i.test(host)) return true
  return false
}

function validateNodeTarget(kind, rawTarget) {
  const target = rawTarget.trim()
  if (kind === 'http') {
    let parsed
    try { parsed = new URL(target) }
    catch { throw new Error('HTTP target must be a full URL (http:// or https://)') }
    if (!SSRF_ALLOWED_HTTP_SCHEMES.has(parsed.protocol)) {
      throw new Error(`Disallowed scheme "${parsed.protocol}" — only http and https are accepted`)
    }
    const host = parsed.hostname.toLowerCase()
    if (SSRF_BLOCKED_HOSTS.has(host)) throw new Error(`Refusing to probe metadata endpoint "${host}"`)
    if (isLinkLocalLiteral(host)) throw new Error(`Refusing to probe link-local address "${host}"`)
    return parsed.toString()
  }
  if (kind === 'tcp') {
    // Format must be host:port. Reject schemes ([scheme]://) and reject
    // metadata endpoints + link-local literals just like HTTP.
    if (target.includes('://')) throw new Error('TCP target should be host:port, not a URL')
    const lastColon = target.lastIndexOf(':')
    if (lastColon < 1) throw new Error('TCP target must be host:port')
    const host = target.slice(0, lastColon).toLowerCase()
    const portStr = target.slice(lastColon + 1)
    const port = Number.parseInt(portStr, 10)
    if (!Number.isFinite(port) || port < 1 || port > 65_535) {
      throw new Error(`TCP target port "${portStr}" must be 1-65535`)
    }
    if (SSRF_BLOCKED_HOSTS.has(host)) throw new Error(`Refusing to probe metadata endpoint "${host}"`)
    if (isLinkLocalLiteral(host)) throw new Error(`Refusing to probe link-local address "${host}"`)
    return `${host}:${port}`
  }
  throw new Error(`Unknown probe kind "${kind}"`)
}

function sanitizeNode(input) {
  if (!input || typeof input !== 'object') throw new Error('Node must be an object')
  const id = String(input.id || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 64)
  if (!id) throw new Error('Node id is required')
  const name = String(input.name || '').trim().slice(0, 120)
  if (!name) throw new Error('Node name is required')
  const kind = VALID_NODE_KINDS.has(input.kind) ? input.kind : 'http'
  const rawTarget = String(input.target || '').trim().slice(0, 400)
  if (!rawTarget) throw new Error('Node target is required')
  // SSRF guard — refuse cloud-metadata endpoints and unsafe schemes.
  const target = validateNodeTarget(kind, rawTarget)
  // Optional separate probe address (browser-facing target vs server-reachable
  // health-check URL). Validated through the same SSRF guard as target.
  const rawHealthCheck = String(input.healthCheckUrl || '').trim().slice(0, 400)
  const healthCheckUrl = rawHealthCheck ? validateNodeTarget(kind, rawHealthCheck) : ''
  // Optional source IP for multi-homed servers. Light sanity check only — the
  // OS will reject a bind to an address this host doesn't own, and that error
  // is surfaced to the admin via the probe error detail.
  const rawLocalAddress = String(input.localAddress || '').trim().slice(0, 64)
  if (rawLocalAddress && !isPlausibleIpLiteral(rawLocalAddress)) {
    throw new Error(`Source IP "${rawLocalAddress}" is not a valid IPv4/IPv6 literal`)
  }
  const localAddress = rawLocalAddress
  // Loopback-via-nginx probe toggle (http only; ignored for tcp).
  const probeViaProxy = kind === 'http' && (input.probeViaProxy === true || input.probeViaProxy === 'true')
  const description = String(input.description || '').trim().slice(0, 600)
  const rawTimeout = Number.parseInt(String(input.timeoutMs ?? 5000), 10)
  const timeoutMs = Number.isFinite(rawTimeout) ? Math.min(Math.max(rawTimeout, 250), 30_000) : 5000
  const expectedStatus = Array.isArray(input.expectedStatus)
    ? input.expectedStatus
        .map((s) => Number.parseInt(String(s), 10))
        .filter((n) => Number.isFinite(n) && n >= 100 && n <= 599)
    : undefined
  const out = { id, name, kind, target, description, timeoutMs }
  if (healthCheckUrl) out.healthCheckUrl = healthCheckUrl
  if (localAddress) out.localAddress = localAddress
  if (probeViaProxy) out.probeViaProxy = true
  if (expectedStatus && expectedStatus.length) out.expectedStatus = expectedStatus
  return out
}

/** Loose IPv4/IPv6 literal check — just enough to catch typos before the
 *  bind; the OS is the real authority on whether the address is usable. */
function isPlausibleIpLiteral(value) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) {
    return value.split('.').every((octet) => Number(octet) <= 255)
  }
  // Permissive IPv6: hex groups and colons, optional :: and zone id.
  return /^[0-9a-f:]+(%[0-9a-z]+)?$/i.test(value) && value.includes(':')
}

function getProbeErrorDetail(err) {
  const message = err instanceof Error ? err.message : String(err)
  const cause = err && typeof err === 'object' ? err.cause : null
  const causeCode = cause && typeof cause === 'object' && typeof cause.code === 'string'
    ? cause.code
    : ''
  const causeMessage = cause instanceof Error ? cause.message : ''

  if (causeCode === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
    return 'TLS certificate chain is not trusted by Node (UNABLE_TO_VERIFY_LEAF_SIGNATURE). Start the site-stats proxy with NODE_OPTIONS=--use-system-ca, or set NODE_EXTRA_CA_CERTS before Node starts.'
  }
  if (causeCode === 'SELF_SIGNED_CERT_IN_CHAIN' || causeCode === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
    return `TLS certificate chain is not trusted by Node (${causeCode}). Set NODE_EXTRA_CA_CERTS to the issuing CA before Node starts.`
  }
  if (causeCode) return `${message} (${causeCode}: ${causeMessage || 'no cause message'})`
  if (causeMessage && causeMessage !== message) return `${message} (${causeMessage})`
  return message
}

/** Walk the err.cause chain to find the underlying system error code
 *  (fetch wraps the real ECONNREFUSED/EHOSTUNREACH a level or two down). */
function extractErrorCode(err) {
  let cur = err
  for (let depth = 0; cur && typeof cur === 'object' && depth < 5; depth++) {
    if (typeof cur.code === 'string' && cur.code) return cur.code
    cur = cur.cause
  }
  return ''
}

function probeHostFrom(kind, probeTarget) {
  if (kind === 'http') {
    try { return new URL(probeTarget).hostname } catch { return probeTarget }
  }
  const i = probeTarget.lastIndexOf(':')
  return i > 0 ? probeTarget.slice(0, i) : probeTarget
}

/**
 * Turn a raw probe exception into a sentence an admin can act on, with the
 * crucial framing that the check runs FROM THE SERVER (not their browser).
 * Resolves the host to its IP so the message names the actual address, and
 * maps the common network error codes to concrete next steps.
 */
async function describeProbeFailure(err, node, probeTarget) {
  const base = getProbeErrorDetail(err)
  const lower = base.toLowerCase()
  if (lower.includes('abort') || lower.includes('timeout')) return 'Probe timed out'

  const code = extractErrorCode(err)
  const host = probeHostFrom(node.kind, probeTarget)
  let ip = ''
  try { ip = (await dnsLookup(host)).address } catch { /* unresolved — covered by ENOTFOUND branch */ }
  const where = ip && ip !== host ? `${host} (${ip})` : host
  // Nudge toward the node's own remediation options, unless already proxying.
  const hint = node.probeViaProxy
    ? ''
    : ' Tip: if it opens in your browser but not here, set a Source IP (NIC) on the node, or enable "Probe via this site\'s nginx".'

  switch (code) {
    case 'EHOSTUNREACH':
    case 'ENETUNREACH':
      return `No route from this server to ${where}. The target is unreachable from the SERVER even though it may load in your browser — this is a server-side routing/firewall issue, not a bad URL. On the host, check \`ip route get ${ip || host}\`.${hint}`
    case 'ECONNREFUSED':
      return `${where} actively refused the connection — the host is reachable but nothing is listening on that port (or a firewall sent a reset).`
    case 'ETIMEDOUT':
      return `Connection to ${where} timed out — packets leave the server but nothing answers (commonly a firewall dropping silently, or the host is down).${hint}`
    case 'ECONNRESET':
      return `Connection to ${where} was reset mid-exchange — often a TLS/proxy mismatch or an intermediary closing the connection.`
    case 'ENOTFOUND':
    case 'EAI_AGAIN':
      return `DNS lookup for "${host}" failed on the SERVER. The server can't resolve this name (your workstation may use a different resolver). Use an IP address, fix the server's DNS, or set a Health-check URL the server can resolve.`
    default:
      return base
  }
}

/**
 * HTTP probe via node:http/https (instead of global fetch) so we can bind a
 * source interface (localAddress) and/or route through this server's own nginx
 * over loopback (viaProxy). Used only when a node sets localAddress or
 * probeViaProxy — the default path stays on fetch() below.
 *
 * viaProxy connects to 127.0.0.1 but keeps the original Host header + TLS SNI,
 * so nginx routes the request exactly as a browser would. The loopback hop hits
 * our own edge cert (often an internal CA), so TLS verification is relaxed for
 * that case only — we're explicitly trusting our own nginx.
 */
function httpProbeViaNode(probeUrl, { timeoutMs, localAddress, viaProxy }) {
  return new Promise((resolveProbe, rejectProbe) => {
    let original
    try { original = new URL(probeUrl) }
    catch { rejectProbe(new Error('Invalid probe URL')); return }
    const isHttps = original.protocol === 'https:'
    const reqFn = isHttps ? httpsRequest : httpRequest
    const options = {
      host: viaProxy ? '127.0.0.1' : original.hostname,
      port: original.port || (isHttps ? 443 : 80),
      method: 'GET',
      path: `${original.pathname}${original.search}`,
      headers: { Host: original.host },
      timeout: timeoutMs,
    }
    if (localAddress) options.localAddress = localAddress
    if (isHttps) {
      options.servername = original.hostname          // SNI = real host, even when dialing loopback
      if (viaProxy) options.rejectUnauthorized = false // trust our own edge cert
    }
    const req = reqFn(options, (res) => {
      res.resume() // drain the body so the socket can close
      resolveProbe(res.statusCode)
    })
    req.once('timeout', () => req.destroy(new Error('Probe timed out')))
    req.once('error', rejectProbe)
    req.end()
  })
}

/* ── NGINX live status: loopback fetch + normalizers ─────────────────
 *
 * httpGetText does a plain loopback GET and returns the body as text (never
 * throws — resolves to { ok:false } on any error). readNginxStatus() then
 * tries VTS JSON → stub_status and normalizes the first that answers into a
 * single schema (see proxy/NGINX_VTS_RUNBOOK.md for the shape).
 * It NEVER throws and returns { available:false } when no module is present,
 * so a missing VTS module degrades the admin widget to an honest "not detected"
 * state instead of breaking /api/admin/nginx-stats.
 */
function httpGetText(rawUrl, { timeoutMs }) {
  return new Promise((resolveGet) => {
    let u
    try { u = new URL(rawUrl) } catch { resolveGet({ ok: false, status: 0, body: '', error: 'invalid url' }); return }
    const isHttps = u.protocol === 'https:'
    const reqFn = isHttps ? httpsRequest : httpRequest
    const options = {
      host: u.hostname,
      port: u.port || (isHttps ? 443 : 80),
      method: 'GET',
      path: `${u.pathname}${u.search}`,
      headers: { Host: u.host, Accept: 'application/json' },
      timeout: timeoutMs,
    }
    if (isHttps) { options.servername = u.hostname; options.rejectUnauthorized = false }
    const r = reqFn(options, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (c) => { body += c; if (body.length > 4_000_000) res.destroy() })
      res.on('end', () => resolveGet({ ok: (res.statusCode || 0) < 400, status: res.statusCode || 0, body }))
    })
    r.once('timeout', () => r.destroy(new Error('timeout')))
    r.once('error', (err) => resolveGet({ ok: false, status: 0, body: '', error: err.message }))
    r.end()
  })
}

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }

/** Collapse a VTS responses object into { c1..c5, total }. */
function statusResponses(r = {}) {
  const c1 = num(r['1xx']), c2 = num(r['2xx']), c3 = num(r['3xx']), c4 = num(r['4xx']), c5 = num(r['5xx'])
  return { c1, c2, c3, c4, c5, total: num(r.total) || c1 + c2 + c3 + c4 + c5 }
}

/** nginx-module-vts /status/format/json → normalized shape. */
function normalizeVts(j) {
  const conn = j.connections || {}
  // Prefer a configured VTS filter group (per-path buckets) over the default
  // host-based server zones, so HTTP Zones shows the /test/ mock's per-location
  // rows. VTS filter buckets share the serverZones shape (requestCounter /
  // responses / in|outBytes). Falls back to host zones when the group is absent.
  const filterGroup = NGINX_VTS_ZONE_FILTER_GROUP && j.filterZones && j.filterZones[NGINX_VTS_ZONE_FILTER_GROUP]
  const zoneSrc = filterGroup || j.serverZones || {}
  const serverZones = Object.entries(zoneSrc)
    .filter(([name]) => name !== '*')
    .map(([name, z]) => ({
      name,
      requests: num(z.requestCounter),
      responses: statusResponses(z.responses),
      sentBytes: num(z.outBytes),
      rcvdBytes: num(z.inBytes),
      responseMsec: num(z.requestMsec),
    }))
  const upstreams = Object.entries(j.upstreamZones || {}).map(([group, peers]) => ({
    group: group === '::nogroups' ? 'direct proxy_pass' : group,
    servers: (Array.isArray(peers) ? peers : []).map((p) => ({
      server: p.server,
      state: p.down ? 'down' : p.backup ? 'backup' : 'up',
      requests: num(p.requestCounter),
      responses: statusResponses(p.responses),
      responseMsec: num(p.responseMsec),
      weight: num(p.weight) || 1,
      active: null,            // vts doesn't expose per-peer active connections
      checks: null,
      fails: num(p.fails),
      downtime: null,
    })),
  }))
  const streamZones = Object.entries(j.streamServerZones || {})
    .filter(([name]) => name !== '*')
    .map(([name, z]) => ({ name, connections: null, bytesIn: num(z.inBytes), bytesOut: num(z.outBytes), sessions: statusResponses(z.responses).total }))
  const streamUpstreams = Object.entries(j.streamUpstreamZones || {}).map(([group, peers]) => ({
    group: group === '::nogroups' ? 'direct proxy_pass' : group,
    servers: (Array.isArray(peers) ? peers : []).map((p) => ({ server: p.server, state: p.down ? 'down' : 'up', active: null, bytesIn: num(p.inBytes), bytesOut: num(p.outBytes), responseMsec: num(p.responseMsec) })),
  }))
  const caches = Object.entries(j.cacheZones || {}).map(([name, c]) => {
    const r = c.responses || {}
    const hit = num(r.hit), miss = num(r.miss)
    return {
      name, state: 'warm',
      hitRatio: hit + miss ? hit / (hit + miss) : null,
      used: num(c.maxSize) ? num(c.usedSize) / num(c.maxSize) : null,
      max: num(c.maxSize), served: num(c.outBytes), written: num(c.inBytes), bypassed: num(r.bypass),
    }
  })
  const sharedZones = []
  const sz = j.sharedZones
  if (sz && typeof sz === 'object' && sz.name) {
    sharedZones.push({ name: sz.name, used: num(sz.maxSize) ? num(sz.usedSize) / num(sz.maxSize) : null, total: num(sz.maxSize), usedNode: num(sz.usedNode) })
  }
  return {
    available: true, source: 'vts',
    nginxVersion: j.nginxVersion || '',
    uptimeSec: j.loadMsec && j.nowMsec ? Math.max(0, Math.round((j.nowMsec - j.loadMsec) / 1000)) : null,
    connections: {
      active: num(conn.active), reading: num(conn.reading), writing: num(conn.writing), waiting: num(conn.waiting),
      accepted: num(conn.accepted), handled: num(conn.handled), requests: num(conn.requests),
      dropped: Math.max(0, num(conn.accepted) - num(conn.handled)),
    },
    ssl: null,
    serverZones, upstreams, streamZones, streamUpstreams, caches, sharedZones,
    resolvers: [], workers: [],
  }
}

/** Open-source stub_status text → summary-only normalized shape. */
function parseStubStatus(text) {
  const active = /Active connections:\s*(\d+)/.exec(text)
  const counts = /\n\s*(\d+)\s+(\d+)\s+(\d+)/.exec(text)
  const rww = /Reading:\s*(\d+)\s+Writing:\s*(\d+)\s+Waiting:\s*(\d+)/.exec(text)
  if (!active || !rww) return null
  const accepted = counts ? num(counts[1]) : 0, handled = counts ? num(counts[2]) : 0, requests = counts ? num(counts[3]) : 0
  return {
    available: true, source: 'stub', nginxVersion: '', uptimeSec: null,
    connections: { active: num(active[1]), reading: num(rww[1]), writing: num(rww[2]), waiting: num(rww[3]), accepted, handled, requests, dropped: Math.max(0, accepted - handled) },
    ssl: null, serverZones: [], upstreams: [], streamZones: [], streamUpstreams: [], caches: [], sharedZones: [], resolvers: [], workers: [],
  }
}

let _nginxStatusCache = { at: 0, data: null }
/** Read + normalize live nginx status, cached for NGINX_STATUS_CACHE_MS. */
async function readNginxStatus() {
  const now = Date.now()
  if (_nginxStatusCache.data && now - _nginxStatusCache.at < NGINX_STATUS_CACHE_MS) return _nginxStatusCache.data

  /** @type {any} */
  let data = {
    available: false, source: null, error: 'No nginx status source responded (VTS module / stub_status not reachable).',
    nginxVersion: '', uptimeSec: null, connections: null,
    serverZones: [], upstreams: [], streamZones: [], streamUpstreams: [], caches: [], sharedZones: [], resolvers: [], workers: [], selfHeal: [],
  }

  // 1) VTS JSON (recommended path)
  if (NGINX_VTS_JSON_URL) {
    const r = await httpGetText(NGINX_VTS_JSON_URL, { timeoutMs: NGINX_STATUS_TIMEOUT_MS })
    if (r.ok && r.body) {
      try {
        const j = JSON.parse(r.body)
        if (j && j.connections && j.serverZones !== undefined) data = normalizeVts(j)
      } catch { /* not JSON / wrong shape — try next */ }
    }
  }
  // 2) stub_status (summary only)
  if (!data.available && NGINX_STUB_STATUS_URL) {
    const r = await httpGetText(NGINX_STUB_STATUS_URL, { timeoutMs: NGINX_STATUS_TIMEOUT_MS })
    if (r.ok && r.body) { const s = parseStubStatus(r.body); if (s) data = s }
  }

  // Outside the availability branches on purpose: when VTS is unreachable the
  // self-heal log is the ONLY thing that explains why, so it must populate in
  // exactly the case where the rest of this payload is empty.
  data.selfHeal = await readSelfHealEvents()

  data.ts = now
  _nginxStatusCache = { at: now, data }
  return data
}

/** Probe one node and update its cache entry. */
async function probeNode(node) {
  const startedAt = Date.now()
  let status = 'offline'
  let latencyMs = null
  let httpStatus = null
  let error = null
  // What the SERVER actually probes — defaults to the browser-facing target.
  const probeTarget = node.healthCheckUrl || node.target
  // Where a 3xx pointed. The single most useful fact when a probe is "failing"
  // on a redirect that is actually intentional.
  let redirectLocation = null

  try {
    if (node.kind === 'http') {
      if (node.localAddress || node.probeViaProxy) {
        // Bind a source NIC and/or route through loopback nginx.
        httpStatus = await httpProbeViaNode(probeTarget, {
          timeoutMs: node.timeoutMs ?? 5000,
          localAddress: node.localAddress,
          viaProxy: !!node.probeViaProxy,
        })
        latencyMs = Date.now() - startedAt
      } else {
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), node.timeoutMs ?? 5000)
        try {
          const res = await fetch(probeTarget, { method: 'GET', signal: ctrl.signal, redirect: 'manual' })
          latencyMs = Date.now() - startedAt
          httpStatus = res.status
          redirectLocation = res.headers.get('location')
        } finally {
          clearTimeout(timer)
        }
      }
      const allowed = node.expectedStatus && node.expectedStatus.length
        ? node.expectedStatus
        : [200, 201, 202, 204, 301, 302, 304]
      if (allowed.includes(httpStatus)) {
        status = 'online'
      } else {
        // Degraded used to be recorded with error left null, so the card could
        // only show the raw code. Say why, every time.
        status = 'degraded'
        error = describeUnexpectedStatus(httpStatus, allowed, probeTarget, redirectLocation)
      }
    } else if (node.kind === 'tcp') {
      // Split on the LAST colon, matching validateNodeTarget — splitting on the
      // first would break every IPv6 literal the validator accepts (fd00::5:9100
      // would parse as host "fd00", port ""), leaving a saved node permanently
      // erroring with a message the admin cannot act on.
      const colon = probeTarget.lastIndexOf(':')
      const host = colon > 0 ? probeTarget.slice(0, colon).replace(/^\[|\]$/g, '') : ''
      const port = Number.parseInt(probeTarget.slice(colon + 1), 10)
      if (!host || !Number.isFinite(port)) throw new Error('TCP target must be host:port')
      latencyMs = await new Promise((resolveProbe, rejectProbe) => {
        const socket = netConnect({
          host,
          port,
          timeout: node.timeoutMs ?? 5000,
          ...(node.localAddress ? { localAddress: node.localAddress } : {}),
        })
        socket.once('connect', () => {
          socket.end()
          resolveProbe(Date.now() - startedAt)
        })
        socket.once('timeout', () => {
          socket.destroy()
          rejectProbe(new Error('Connect timeout'))
        })
        socket.once('error', (err) => {
          socket.destroy()
          rejectProbe(err)
        })
      })
      status = 'online'
    } else {
      // Hand-edited infrastructure-nodes.json bypasses sanitizeNode, so a typo
      // such as "kind": "HTTP" would otherwise fall through here and render a
      // red card with no reason and no latency. Say what is wrong instead.
      throw new Error(`Unknown probe kind "${node.kind}" — expected "http" or "tcp"`)
    }
  } catch (err) {
    error = await describeProbeFailure(err, node, probeTarget)
    status = 'offline'
  }

  const checkedAt = new Date().toISOString()
  const previous = nodeStatusCache.get(node.id) || {}
  const history = Array.isArray(previous.history) ? previous.history.slice() : []
  history.unshift({ at: checkedAt, status, latencyMs, httpStatus, error })
  while (history.length > NODE_HISTORY_MAX) history.pop()

  nodeStatusCache.set(node.id, {
    status,
    latencyMs,
    httpStatus,
    lastCheckedAt: checkedAt,
    error,
    history,
  })
}

async function probeAllNodes() {
  reloadNodesIfChanged()
  await Promise.allSettled(infrastructureNodes.map(probeNode))
}

/** Build the services array consumed by the admin dashboard. Pulls live
 *  state from `nodeStatusCache` and falls back to "probing…" for nodes that
 *  haven't been measured yet (first start, freshly added, etc.). */
function buildServicesPayload() {
  return infrastructureNodes.map((node) => {
    const cached = nodeStatusCache.get(node.id)
    return {
      id: node.id,
      name: node.name,
      kind: node.kind,
      target: node.target,
      healthCheckUrl: node.healthCheckUrl || '',
      localAddress: node.localAddress || '',
      probeViaProxy: !!node.probeViaProxy,
      description: node.description || '',
      timeoutMs: node.timeoutMs,
      expectedStatus: node.expectedStatus,
      // Snapshot fields read by the admin dashboard:
      status: cached?.status ?? 'probing',
      latency: typeof cached?.latencyMs === 'number'
        ? `${cached.latencyMs}ms`
        : (cached?.status === 'probing' || !cached) ? '—' : 'n/a',
      latencyMs: cached?.latencyMs ?? null,
      httpStatus: cached?.httpStatus ?? null,
      lastCheckedAt: cached?.lastCheckedAt ?? null,
      error: cached?.error ?? null,
      history: cached?.history ?? [],
    }
  })
}

/** First sweep immediately, then on the configured interval. Started by start(). */
function startNodeProbes() {
  probeAllNodes().catch((err) => console.error('[site-stats] Initial node probe failed:', err))
  setInterval(() => {
    probeAllNodes().catch((err) => console.error('[site-stats] Node probe sweep failed:', err))
  }, NODE_POLL_INTERVAL_MS)
}

/** Slugs must be lowercase, hyphenated, 2-64 chars and free of path separators. */
function isSafeSlug(value) {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(value)
}

/** Scope keys identify what's being overridden, e.g. "vmware/v9" or "vmware/v9/products/vcenter9". */
function isSafeScopeKey(value) {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= 200
    && /^[a-z0-9][a-z0-9_/.-]*$/i.test(value)
    && !value.includes('..')
}

/** Validate and bound the reserved Admin route-image registry before saving. */
function sanitizeRouteImageRegistry(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Route-image registry must be an object.')
  }
  const rawAssets = value.assets
  const rawRoutes = value.routes
  if (!rawAssets || typeof rawAssets !== 'object' || Array.isArray(rawAssets)
    || !rawRoutes || typeof rawRoutes !== 'object' || Array.isArray(rawRoutes)) {
    throw new Error('Route-image registry requires routes and assets maps.')
  }
  if (Object.keys(rawAssets).length > 300 || Object.keys(rawRoutes).length > 300) {
    throw new Error('Route-image registry is too large.')
  }

  const assets = Object.create(null)
  for (const [id, candidate] of Object.entries(rawAssets)) {
    if (!/^[a-z0-9][a-z0-9_-]{0,99}$/i.test(id) || /^(?:constructor|prototype)$/i.test(id)) {
      throw new Error(`Invalid route-image asset id: ${id}`)
    }
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      throw new Error(`Invalid route-image asset: ${id}`)
    }
    const src = typeof candidate.src === 'string' ? candidate.src.trim() : ''
    if (!/^\/logos\/[A-Za-z0-9_./-]+\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(src)
      || src.includes('..') || src.includes('\\') || src.includes('%')) {
      throw new Error(`Invalid route-image source for asset: ${id}`)
    }
    assets[id] = {
      src,
      label: typeof candidate.label === 'string' && candidate.label.trim()
        ? candidate.label.trim().slice(0, 120)
        : id,
      ...(typeof candidate.mime === 'string' ? { mime: candidate.mime.slice(0, 80) } : {}),
      ...(typeof candidate.uploadedAt === 'string' ? { uploadedAt: candidate.uploadedAt.slice(0, 40) } : {}),
    }
  }

  const routes = Object.create(null)
  for (const [route, reference] of Object.entries(rawRoutes)) {
    if (!/^\/[A-Za-z0-9_./-]*$/.test(route) || route.startsWith('//') || route.includes('..') || route.length > 200) {
      throw new Error(`Invalid registered route: ${route}`)
    }
    if (!reference || typeof reference !== 'object' || Array.isArray(reference)) {
      throw new Error(`Invalid route-image reference: ${route}`)
    }
    if (reference.kind === 'catalog' && typeof reference.key === 'string' && /^[A-Za-z][A-Za-z0-9]{0,99}$/.test(reference.key)) {
      routes[route] = { kind: 'catalog', key: reference.key }
      continue
    }
    if (reference.kind === 'asset' && typeof reference.id === 'string' && assets[reference.id]) {
      routes[route] = { kind: 'asset', id: reference.id }
      continue
    }
    throw new Error(`Invalid route-image reference: ${route}`)
  }

  return { schemaVersion: 1, routes, assets }
}

/**
 * Same-origin internal path. Used for the page wizard's `backHref` field.
 * Must start with a single `/` (NOT `//evil.com`, which browsers treat
 * as protocol-relative external URLs) and must not contain a scheme.
 * Falls back to `/` when invalid.
 */
function sanitizeInternalPath(value, fallback = '/') {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (trimmed.length === 0) return fallback
  // Reject protocol-relative URLs (//evil.com) — they are NOT same-origin.
  if (trimmed.startsWith('//')) return fallback
  // Reject schemes outright (http:, https:, javascript:, data:, vbscript:, file:, etc.)
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return fallback
  // Must be a rooted path.
  if (!trimmed.startsWith('/')) return fallback
  return trimmed.slice(0, 200)
}

/**
 * Download/link href. Allows ONLY:
 *  - rooted internal paths (`/foo`, `/repos/rpm/file.zip`) — but NOT `//evil.com`
 *  - mailto: and tel: schemes (useful for Contact-style cards)
 *  - http: / https: absolute URLs (for explicit external downloads)
 * Anything else (javascript:, data:, vbscript:, file:, ftp:, etc.) is rejected.
 * Returns the trimmed href on success, or `null` to signal "drop this entry".
 */
function sanitizeDownloadHref(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  if (trimmed.startsWith('//')) return null
  if (trimmed.startsWith('/')) return trimmed.slice(0, 600)
  // Lowercase the scheme prefix only — preserve the rest of the URL casing.
  const schemeMatch = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed)
  if (!schemeMatch) {
    // Relative paths without a leading `/` aren't supported in this app.
    return null
  }
  const scheme = schemeMatch[1].toLowerCase()
  if (scheme === 'http' || scheme === 'https' || scheme === 'mailto' || scheme === 'tel') {
    return trimmed.slice(0, 600)
  }
  return null
}

/* ── Cookies + sessions ── */

function parseCookies(req) {
  const out = {}
  const raw = req.headers.cookie
  if (!raw) return out
  for (const piece of String(raw).split(';')) {
    const idx = piece.indexOf('=')
    if (idx < 1) continue
    const k = piece.slice(0, idx).trim()
    const v = piece.slice(idx + 1).trim()
    if (k) out[k] = decodeURIComponent(v)
  }
  return out
}

function buildSessionCookie(value, maxAgeSec) {
  // Path=/ (not /api) — nginx's site-wide auth_request subrequest forwards
  // the browser's Cookie header for the ORIGINAL request (e.g. GET /home),
  // so the browser must actually attach this cookie to ordinary page
  // navigations, not just /api/* calls, or every page load would bounce back
  // to the login page even for an already-authenticated visitor. SameSite=Strict
  // means the cookie is never sent on cross-site requests at all, which is
  // belt-and-suspenders alongside the CSRF token.
  const parts = [
    `${SESSION_COOKIE_NAME}=${value}`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    'Path=/',
  ]
  if (typeof maxAgeSec === 'number') parts.push(`Max-Age=${Math.max(0, Math.floor(maxAgeSec))}`)
  return parts.join('; ')
}

function setSessionCookie(res, sessionId, expiresAtMs) {
  const maxAge = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000))
  res.setHeader('Set-Cookie', buildSessionCookie(sessionId, maxAge))
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', buildSessionCookie('', 0))
}

function generateOpaqueId() {
  return randomBytes(32).toString('hex')
}

// Looks in the admin store first (small, checked constantly by
// authorizeAdmin), then the general store. The returned session's own `kind`
// field is the source of truth for admin-vs-general — the array it happened
// to be found in is equivalent but callers should check `session.kind`.
function findSessionByCookie(req) {
  const cookies = parseCookies(req)
  const id = cookies[SESSION_COOKIE_NAME]
  if (!id) return null

  // Constant-time compare, matching how the CSRF token is checked: the session
  // id is the whole bearer credential, so it should not be compared with a
  // short-circuiting `===` any more than a token would be.
  const adminSession = adminSessions.find((s) => constantTimeEqualHex(s.id, id))
  if (adminSession && adminSession.expiresAt > Date.now()) {
    adminSession.lastSeenAt = Date.now()
    adminSessionsDirty = true
    return adminSession
  }

  const generalSession = generalSessions.find((s) => constantTimeEqualHex(s.id, id))
  if (generalSession && generalSession.expiresAt > Date.now()) {
    generalSession.lastSeenAt = Date.now()
    generalSessionsDirty = true
    return generalSession
  }

  return null
}

function constantTimeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length || a.length === 0) return false
  try { return timingSafeEqual(Buffer.from(a), Buffer.from(b)) } catch { return false }
}

/* ── Sign-in security events ──
 *
 * Every login this proxy refuses BEFORE contacting a domain controller is
 * recorded here, and the ones that assert an identity they have no business
 * asserting are marked severity 'spoof': a name carrying two domain claims
 * ("blcse\rshoop.ou@blcse.mil"), a domain this site does not serve, or LDAP
 * filter metacharacters in the account name. Honest mistakes — no domain
 * given, UPN form, unusable characters — are recorded as 'format' so the
 * admin console can show the real attempts without them drowning in typos.
 *
 * These never reached a DC, so they leave no trace in the Windows security
 * log; this file is the only record of them. Kept at 0600 like the session
 * stores: the `typed` field is whatever was in the USERNAME box, and a user
 * who fat-fingers their password into that box would otherwise leave it
 * world-readable on this host. The password field itself is never recorded.
 */
const AUTH_EVENTS_FILE = resolve(STATE_DIR, 'auth-events.json')
/** Ring size. Big enough to survive a scripted probe run without discarding
 *  the start of it, small enough to hand to the admin console in one go. */
const AUTH_EVENTS_MAX = 500

let authEvents = loadJson(AUTH_EVENTS_FILE, [], Array.isArray).slice(-AUTH_EVENTS_MAX)

function commitAuthEventsToDisk() { saveJson(AUTH_EVENTS_FILE, authEvents, 'Auth events') }

/** Strip control characters and bound the length before anything typed by a
 *  stranger is written to a file an admin will later read in a browser. */
function sanitizeEventText(value, max) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max)
}

function recordAuthEvent(req, { severity, reason, detail, typed, realm }) {
  const event = {
    id: generateOpaqueId().slice(0, 16),
    at: new Date().toISOString(),
    severity,
    reason,
    detail: sanitizeEventText(detail, 200),
    typed: sanitizeEventText(typed, 128),
    realm: sanitizeEventText(realm, 64),
    ip: sanitizeEventText(req?.headers?.['x-real-ip'] || req?.socket?.remoteAddress || '', 64),
    userAgent: sanitizeEventText(req?.headers?.['user-agent'] || '', 200),
  }
  authEvents.push(event)
  if (authEvents.length > AUTH_EVENTS_MAX) authEvents = authEvents.slice(-AUTH_EVENTS_MAX)
  commitAuthEventsToDisk()
  // Also to the process log, so the event survives even if this file is lost
  // and so an operator tailing pm2 sees probing as it happens.
  const line = `[site-stats] ${severity === 'spoof' ? 'SPOOF ATTEMPT' : 'Rejected sign-in'}: reason="${reason}" typed="${event.typed}" ip="${event.ip}"`
  if (severity === 'spoof') console.error(line)
  else console.warn(line)
  return event
}

/* ── LDAP authentication ──
 *
 * Dynamic import so the proxy still boots without `ldapts` installed (the
 * login endpoints then return 503). A successful bind alone is enough to
 * succeed (grants a 'general' session) — group membership is NOT a hard
 * gate here. It only decides `inAdminGroup`, which the caller uses to decide
 * whether the resulting session is 'general' or 'admin'. (This is a
 * deliberate behavior change from the old admin-only login: a bind that
 * succeeds but isn't in the admin group used to be rejected outright; now it
 * succeeds as an ordinary session.)
 */
async function ldapAuthenticate(realmId, username, password) {
  const realm = LDAP_REALMS.find((r) => r.id === realmId)
  if (!realm) return { ok: false, reason: 'not-configured' }
  if (typeof username !== 'string' || typeof password !== 'string') return { ok: false, reason: 'bad-input' }
  const normalized = username.trim()
  if (!normalized || normalized.length > 128 || !password) return { ok: false, reason: 'bad-input' }
  let ldapts
  try {
    ldapts = await import('ldapts')
  } catch (err) {
    console.error('[site-stats] ldapts module not available:', err.message)
    return { ok: false, reason: 'not-configured' }
  }
  const tlsOptions = {}
  if (realm.caCertPath) {
    try { tlsOptions.ca = readFileSync(realm.caCertPath) } catch (err) {
      console.error('[site-stats] LDAP CA cert read failed:', err.message)
      return { ok: false, reason: 'ldap-error' }
    }
  }
  // Which domain is this account in? The sign-in form no longer asks (there
  // is no realm dropdown), so the answer comes out of what the user typed:
  // bare "testuser" means the realm's own domain, while "MBL\testuser",
  // "mbl.blcse.mil\testuser" and "testuser@mbl.blcse.mil" name a child domain
  // in the same forest. resolveLoginIdentity() also refuses domains outside
  // the realm's namespace BEFORE any bind, so a typo never reaches a DC as a
  // failed password attempt. See proxy/ldap-domain.mjs.
  const identity = resolveLoginIdentity(normalized, realm)
  if (!identity.ok) {
    // Refused without touching a DC. severity/detail travel back to the route
    // handler, which is where the request (and so the client IP) lives, so the
    // security event can be recorded with an address attached.
    return { ok: false, reason: identity.reason, severity: identity.severity, detail: identity.detail }
  }
  const bindUser = identity.bindName

  // Endpoint order depends on the domain: the realm's own DCs for the realm's
  // own domain (unchanged), Global Catalogs first for any other domain in the
  // forest — a plain DC on 636 only knows its own domain's accounts and would
  // reject a child-domain user as if the password were wrong.
  const endpoints = bindEndpoints(realm, identity)
  if (endpoints.length === 0) return { ok: false, reason: 'not-configured' }

  // Multiple DCs for the same realm are tried in order, but ONLY a
  // connection-level failure (DC unreachable, timed out, DNS/TCP error)
  // advances to the next one. A real LDAP result — wrong password, account
  // locked, etc. (ldapts.ResultCodeError, e.g. InvalidCredentialsError) —
  // stops immediately: the other DC is the same domain and would reject the
  // same credentials for the same reason, so retrying against it would just
  // waste time and blur the real error in the logs.
  // Logs the FULL error detail (name AND message) — a prior version logged
  // `err.name || err.message`, which prints just the generic string "Error"
  // for plain TLS/connection failures (whose `.name` is the unhelpful literal
  // "Error"), silently swallowing the actually-useful `.message` right when
  // it's needed most for diagnosing a bind failure.
  const describeError = (err) => `${err?.name || 'Error'}: ${err?.message || String(err)}`

  let lastFailure = null
  for (const [index, dc] of endpoints.entries()) {
    const dcTlsOptions = dc.servername ? { ...tlsOptions, servername: dc.servername } : tlsOptions
    const client = new ldapts.Client({ url: dc.url, timeout: LDAP_TIMEOUT_MS, connectTimeout: LDAP_TIMEOUT_MS, tlsOptions: dcTlsOptions })
    try {
      await client.bind(bindUser, password)
      let inAdminGroup = false
      if (realm.adminGroupDn) {
        // Search the user's own DN for `memberOf` and check for adminGroupDn.
        // We search from realm.baseDn when present (handles servers where the
        // bind DN isn't searchable directly), filtering on sAMAccountName/UPN
        // to find the actual user. A search failure here is NOT a login
        // failure — it just means the session comes back as 'general' instead
        // of 'admin'; only an actual bind failure rejects the login.
        try {
          // Search base is the account's OWN domain, never the whole forest:
          // "testuser" can exist in both blcse.mil and mbl.blcse.mil, and a
          // forest-wide search could otherwise read the OTHER testuser's
          // memberOf and hand this session admin.
          const searchBase = identity.searchBase || realm.baseDn || bindUser
          const clauses = [`(sAMAccountName=${escapeLdapFilter(identity.sam)})`]
          if (identity.upn) clauses.push(`(userPrincipalName=${escapeLdapFilter(identity.upn)})`)
          const filter = `(|${clauses.join('')})`
          const { searchEntries } = await client.search(searchBase, { scope: 'sub', filter, attributes: ['memberOf', 'sAMAccountName', 'distinguishedName'], sizeLimit: 5 })
          const entry = searchEntries[0]
          const memberOf = entry ? (Array.isArray(entry.memberOf) ? entry.memberOf : [entry.memberOf]).filter(Boolean) : []
          inAdminGroup = memberOf.some((dn) => String(dn).toLowerCase() === realm.adminGroupDn.toLowerCase())

          if (!inAdminGroup && entry?.dn) {
            // Second look, from the group's side. A Global Catalog carries
            // memberOf only for UNIVERSAL groups, so a cross-domain account in
            // a global/domain-local admin group shows an empty memberOf above
            // even though the membership is real. Asking the group object
            // "(member=<user DN>)" is matched server-side — no pulling a whole
            // member list — and costs one search only when the first missed.
            // Neither check follows nested groups; membership must be direct.
            try {
              const { searchEntries: groupHit } = await client.search(realm.adminGroupDn, {
                scope: 'base',
                filter: `(member=${escapeLdapFilter(String(entry.dn))})`,
                attributes: ['cn'],
                sizeLimit: 1,
              })
              inAdminGroup = groupHit.length > 0
            } catch (err) {
              console.warn(`[site-stats] LDAP admin-group member check failed for "${identity.sam}@${identity.domain}" (DC ${dc.url}):`, describeError(err))
            }
          }
        } catch (err) {
          console.warn(`[site-stats] LDAP group-membership search failed for "${normalized}" (realm "${realmId}", DC ${dc.url}) — session will be 'general' only:`, describeError(err))
        }
      }
      return { ok: true, username: identity.sam, domain: identity.domain, inAdminGroup }
    } catch (err) {
      const isRealLdapResult = err instanceof ldapts.ResultCodeError
      lastFailure = err
      const canTryNextDc = !isRealLdapResult && endpoints.length > index + 1
      console.warn(`[site-stats] LDAP auth against ${dc.url} failed for "${normalized}" (realm "${realmId}")${canTryNextDc ? ' — trying next configured DC' : ''}:`, describeError(err))
      if (!canTryNextDc) {
        // Either a real LDAP result (wrong password, etc.) or we've run out
        // of DCs to try — stop here.
        return { ok: false, reason: isRealLdapResult ? 'bind-failed' : 'ldap-error' }
      }
      // else: connection-level failure with another DC left to try — loop.
    } finally {
      try { await client.unbind() } catch { /* ignore */ }
    }
  }
  // Unreachable in practice (the loop above always returns), but keeps the
  // function's contract explicit if realm.urls were ever empty.
  console.error(`[site-stats] LDAP auth exhausted all configured DCs for realm "${realmId}":`, lastFailure ? describeError(lastFailure) : 'no DCs configured')
  return { ok: false, reason: 'bind-failed' }
}

function escapeLdapFilter(value) {
  return String(value).replace(/[\\*() ]/g, (c) => {
    const code = c.charCodeAt(0).toString(16).padStart(2, '0')
    return `\\${code}`
  })
}

/**
 * Admin gate. Order:
 *   1) Session cookie, kind==='admin' → CSRF check on writes. Sets req.adminUser.
 *   2) Legacy x-admin-token → fallback. Sets req.adminUser='admin'.
 *   3) ADMIN_AUTH_DISABLED=1 + no token → allow (dev opt-in).
 *   4) Otherwise reject.
 *
 * A 'general' session (any successful LDAP bind, not in the realm's admin
 * group) is a valid session for site-wide access but must NOT pass here —
 * before general logins existed, any valid session implied admin; that's no
 * longer true, so the kind check is required.
 *
 * Constant-time comparison everywhere on the supplied secret to avoid
 * timing leaks. timingSafeEqual is from node:crypto.
 */
function authorizeAdmin(req) {
  // 1) Session cookie path — admin-kind only
  const session = findSessionByCookie(req)
  if (session && session.kind === 'admin') {
    const method = (req.method || 'GET').toUpperCase()
    if (method === 'POST' || method === 'DELETE' || method === 'PUT' || method === 'PATCH') {
      const supplied = String(req.headers['x-csrf-token'] || '').trim()
      if (!constantTimeEqualHex(supplied, session.csrfToken)) return false
    }
    req.adminUser = session.username
    return true
  }
  // A session exists but is not admin-kind. nginx injects the real
  // x-admin-token into every /api/admin/* request (server.conf: both the
  // `= /api/admin/file-upload` and the `^~ /api/admin/` blocks set it), so
  // falling through to the token path below would hand a general-kind user
  // full admin rights — node CRUD and the unbounded file-upload endpoint
  // included. Deny outright; the token path stays for session-less callers
  // (scripts, curl) that supply the token themselves.
  if (session) return false
  // 2) Legacy token path
  if (ADMIN_AUTH_DISABLED && !ADMIN_TOKEN) {
    req.adminUser = 'admin'
    return true
  }
  if (!ADMIN_TOKEN) return false
  const supplied = (req.headers['x-admin-token'] || '').toString().trim()
  if (supplied.length === 0) return false
  const a = Buffer.from(supplied)
  const b = Buffer.from(ADMIN_TOKEN)
  if (a.length !== b.length) return false
  try {
    if (timingSafeEqual(a, b)) { req.adminUser = 'admin'; return true }
  } catch { /* fall through */ }
  return false
}

/** Request body as text, capped at MAX_CONTENT_BODY_BYTES unless the route passes its own cap. */
const readTextBody = (req, max = MAX_CONTENT_BODY_BYTES) => readBody(req, max)
/** Cap for the small public/admin JSON posts (feedback, alert acks, notification settings). */
const MAX_SMALL_JSON_BYTES = 64_000

/** Read a raw request body without ever retaining more than `max` bytes. */
function readBinaryBody(req, max = MAX_ADMIN_LOGO_BYTES) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = []
    let total = 0
    let settled = false

    req.on('data', (chunk) => {
      if (settled) return
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      total += bytes.length
      if (total > max) {
        settled = true
        rejectBody(Object.assign(new Error('Image exceeds the 6 MiB upload limit.'), { statusCode: 413 }))
        return
      }
      chunks.push(bytes)
    })
    req.on('end', () => {
      if (!settled) {
        settled = true
        resolveBody(Buffer.concat(chunks, total))
      }
    })
    req.on('error', (err) => {
      if (!settled) {
        settled = true
        rejectBody(err)
      }
    })
  })
}

/** Detect supported image formats from file signatures, never extensions. */
function detectAdminLogoType(buffer) {
  if (
    buffer.length >= 8
    && buffer[0] === 0x89
    && buffer.subarray(1, 4).equals(Buffer.from('PNG'))
    && buffer.subarray(4, 8).equals(Buffer.from([0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { extension: 'png', contentType: 'image/png' }
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: 'jpg', contentType: 'image/jpeg' }
  }
  if (
    buffer.length >= 12
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { extension: 'webp', contentType: 'image/webp' }
  }
  if (buffer.length >= 6) {
    const signature = buffer.subarray(0, 6).toString('ascii')
    if (signature === 'GIF87a' || signature === 'GIF89a') {
      return { extension: 'gif', contentType: 'image/gif' }
    }
  }
  return null
}

/**
 * Preserve a recognizable piece of the source name while removing path
 * separators, Unicode combining marks, punctuation, and shell metacharacters.
 */
function safeAdminLogoStem(originalName) {
  const leaf = String(originalName || 'logo').slice(0, 240).split(/[\\/]/).pop() || 'logo'
  const withoutExtension = leaf.replace(/\.[^.]*$/, '')
  return withoutExtension
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'logo'
}

/** Write a new file exclusively; timestamp + random suffix make it versioned. */
function storeAdminLogo(buffer, originalName, extension) {
  mkdirSync(ADMIN_LOGO_UPLOAD_DIR, { recursive: true })
  const stem = safeAdminLogoStem(originalName)
  const version = new Date().toISOString().replace(/\D/g, '').slice(0, 14)

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const nonce = randomBytes(6).toString('hex')
    const filename = `${stem}-v${version}-${nonce}.${extension}`
    const filePath = join(ADMIN_LOGO_UPLOAD_DIR, filename)
    try {
      writeFileSync(filePath, buffer, { flag: 'wx', mode: 0o644 })
      return { filename, src: `${ADMIN_LOGO_PUBLIC_PREFIX}/${filename}` }
    } catch (err) {
      if (err?.code !== 'EEXIST' || attempt === 2) throw err
    }
  }
  throw new Error('Could not allocate a unique image filename.')
}

function normalizeNotificationSettings(settings = {}) {
  const emailAddress = typeof settings.emailAddress === 'string' ? settings.emailAddress.trim() : NOTIFICATION_EMAIL_TO

  return {
    enabled: Boolean(settings.enabled),
    emailAddress,
    notifyOnSystemEvents: settings.notifyOnSystemEvents !== false,
    notifyOnFeedback: settings.notifyOnFeedback !== false,
    lastSavedAt: typeof settings.lastSavedAt === 'string' ? settings.lastSavedAt : null,
  }
}

/** @param {any} input a bare id array or `{ alertIds }` */
function normalizeAcknowledgedAlertIds(input = []) {
  const values = Array.isArray(input)
    ? input
    : input && Array.isArray(input.alertIds)
      ? input.alertIds
      : []

  return Array.from(new Set(values.filter((value) => typeof value === 'string').map((value) => value.trim()).filter(Boolean)))
}

// Mirror of normalizeDismissals in lib/data/admin.ts (kept in sync by hand —
// this .mjs runtime can't import the TS module). De-dupes by id, last wins.
/** @param {any} input a bare array or `{ dismissals }` */
function normalizeDismissals(input = []) {
  const values = Array.isArray(input)
    ? input
    : input && Array.isArray(input.dismissals)
      ? input.dismissals
      : []

  const byId = new Map()
  for (const value of values) {
    if (!value || typeof value !== 'object') continue
    const id = typeof value.id === 'string' ? value.id.trim() : ''
    if (!id) continue
    const by = typeof value.by === 'string' && value.by.trim() ? value.by.trim() : 'admin'
    const at = typeof value.at === 'string' && value.at.trim() ? value.at.trim() : ''
    byId.set(id, { id, by, at })
  }
  return Array.from(byId.values())
}

function commitFeedbackToDisk() { saveJson(FEEDBACK_FILE, feedbackStorage, 'Feedback') }
function commitNotificationSettingsToDisk() { saveJson(NOTIFICATION_SETTINGS_FILE, notificationSettings, 'Notification settings') }
function commitAcknowledgedAlertIdsToDisk() { saveJson(ACKNOWLEDGED_ALERTS_FILE, { alertIds: acknowledgedAlertIds }, 'Acknowledged alerts') }
function commitDismissalsToDisk() { saveJson(DISMISSED_ALERTS_FILE, { dismissals }, 'Dismissed alerts') }

/* ── Admin-managed live-announcement scan roots ──
 * Stored as [{ label, category, fsPath, urlPrefix }]. When the file exists
 * (and parses to a non-empty array) it overrides LIVE_ANNOUNCEMENT_PATHS.
 */
function loadAnnouncementPaths() {
  const data = loadJson(ANNOUNCEMENT_PATHS_FILE, null, isPlainObject)
  return Array.isArray(data?.paths) && data.paths.length > 0 ? data.paths : null
}

function sanitizeAnnouncementPath(raw) {
  const label = String(raw?.label ?? '').trim().slice(0, 80)
  const category = String(raw?.category ?? '').trim().slice(0, 40)
  const fsPath = String(raw?.fsPath ?? '').trim()
  const urlPrefix = String(raw?.urlPrefix ?? '').trim()
  if (!label || !category || !fsPath || !urlPrefix) {
    throw new Error('Each path needs label, category, fsPath, and urlPrefix.')
  }
  // The pipe and semicolon are the env-format separators — they can't appear
  // in any field, and the path must be absolute (scanning relative to the
  // proxy cwd would be surprising and a path-traversal foothold).
  if (/[|;]/.test(label + category + fsPath + urlPrefix)) {
    throw new Error('Fields may not contain "|" or ";".')
  }
  if (!fsPath.startsWith('/') || fsPath.includes('..')) {
    throw new Error('fsPath must be an absolute path without "..".')
  }
  if (!urlPrefix.startsWith('/')) throw new Error('urlPrefix must start with "/".')
  return { label, category, fsPath, urlPrefix }
}

let announcementPaths = loadAnnouncementPaths()

function commitAnnouncementPathsToDisk() { saveJson(ANNOUNCEMENT_PATHS_FILE, { paths: announcementPaths }, 'Announcement paths') }

/* ── Admin-managed APEN-chat-assistant suggested-prompt chips ──
 * Live-editable from the dashboard. When no override file exists, the chat
 * shows DEFAULT_ASSISTANT_PROMPTS (mirrors ASSISTANT_SUGGESTED_PROMPTS in
 * lib/data/assistant.ts). The effective list is exposed on the public
 * /api/content-overrides response so the chat picks it up with no rebuild. */
/* ── Admin-managed assistant knowledge block (system prompt) ──
 * The half of the Voltron system prompt that goes stale — persona and what the
 * APEN offers — is editable from the console so a new service or a corrected
 * capability reaches the assistant without a deploy. voltron-proxy.mjs reads
 * the override file on its next request (mtime check), so a save takes effect
 * on the very next question with no restart of either process.
 *
 * The behavior rules (response format, anti-hallucination, scope) are NOT
 * exposed here — see assistant-knowledge.mjs for why. */
function loadAssistantKnowledge() {
  const data = loadJson(ASSISTANT_KNOWLEDGE_FILE, null, isPlainObject)
  return typeof data?.knowledge === 'string' && data.knowledge.trim() ? data.knowledge : null
}

let assistantKnowledge = loadAssistantKnowledge()

function commitAssistantKnowledgeToDisk() {
  saveJson(ASSISTANT_KNOWLEDGE_FILE, { knowledge: assistantKnowledge, updatedAt: new Date().toISOString() }, 'Assistant knowledge')
}

const ASSISTANT_PROMPTS_FILE = resolve(STATE_DIR, 'assistant-prompts.json')
const DEFAULT_ASSISTANT_PROMPTS = [
  'How do I add an RPM repo?',
  'Download Evaluate-STIG',
  'Install Trellix on Ubuntu',
  'VMware patch list',
]

function loadAssistantPrompts() {
  const data = loadJson(ASSISTANT_PROMPTS_FILE, null, isPlainObject)
  return Array.isArray(data?.prompts) ? data.prompts.map((p) => String(p)) : null
}

function sanitizeAssistantPrompt(raw) {
  return String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 120)
}

let assistantPrompts = loadAssistantPrompts()

function effectiveAssistantPrompts() {
  return Array.isArray(assistantPrompts) ? assistantPrompts : DEFAULT_ASSISTANT_PROMPTS
}

function commitAssistantPromptsToDisk() { saveJson(ASSISTANT_PROMPTS_FILE, { prompts: assistantPrompts }, 'Assistant prompts') }

/** Env view for the announcements scanner with the admin-managed roots applied. */
function liveAnnouncementEnv() {
  if (!announcementPaths) return process.env
  const serialized = announcementPaths
    .map((p) => `${p.label}|${p.category}|${p.fsPath}|${p.urlPrefix}`)
    .join(';')
  return { ...process.env, LIVE_ANNOUNCEMENT_PATHS: serialized }
}

// No mail transport exists on the host, so alerts are not sent anywhere: the
// notification settings are a recorded preference for when one is wired in.
// The former outbox queued messages nothing ever drained; it was removed rather
// than left implying delivery.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Admin endpoints must NOT advertise wildcard CORS — only same-origin requests
// (the actual customer-facing site, served on the same Host) should be able
// to hit them in a browser. We achieve that by echoing the Origin back ONLY
// when it matches the request's Host. Cross-origin requests get no
// Allow-Origin header at all, which causes the browser to reject the
// response. Server-to-server clients (curl, scripts) ignore CORS entirely
// and still work as long as they include a valid x-admin-token.
const ADMIN_PATH_RE = /^\/api\/admin\//
// Admin-only routes outside /api/admin/ (nginx gates them with admin-acl.inc).
const ADMIN_ONLY_ROUTES = new Set(['/api/admin', '/api/site-stats', '/api/notification-settings', '/api/acknowledged-alerts'])

/**
 * The one same-origin check. Origin is authoritative when present; Referer is
 * only consulted when there is no Origin.
 *
 * Non-browser callers (curl, internal scripts) send neither header. Admin
 * routes accept that, because the token / session check still applies. The
 * unauthenticated public POST routes pass `requireHeader: true` so a scripted
 * post with no headers is refused instead of waved through.
 */
function isSameOriginRequest(req, { requireHeader = false } = {}) {
  const host = (req.headers.host || '').toString().toLowerCase()
  const origin = (req.headers.origin || '').toString()
  const referer = (req.headers.referer || '').toString()
  if (!origin && !referer) return !requireHeader
  try {
    if (origin) {
      const u = new URL(origin)
      return u.host.toLowerCase() === host
    }
    if (referer) {
      const u = new URL(referer)
      return u.host.toLowerCase() === host
    }
  } catch { /* ignore parse errors → treat as cross-origin */ }
  return false
}

function adminCors(req) {
  if (!isSameOriginRequest(req)) return {}
  const origin = (req.headers.origin || '').toString()
  return {
    // Echo the requesting Origin back rather than '*' so the browser
    // accepts the response as same-origin. If Origin is missing (curl),
    // skip the header entirely.
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-token, x-csrf-token, x-file-name',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  }
}

/** Admin gate for a route: answers 401 and returns false unless the caller is an
 *  admin. Every admin route starts with `if (!requireAdmin(req, res)) return`. */
function requireAdmin(req, res) {
  if (authorizeAdmin(req)) return true
  res.writeHead(401, { ...adminCors(req), 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Unauthorized' }))
  return false
}

/* ── 3. LOG ANALYTICS ──
 *
 * This server is BOTH the customer-facing Next.js site AND a Linux package
 * mirror / Windows PDQ repo / static asset host. The raw nginx log is
 * dominated by package downloads (apt, dnf, PDQ pull-down) and static asset
 * requests (logos, _next chunks, etc.). A single Ubuntu workstation running
 * `apt update` can rack up hundreds of log lines without anyone ever
 * loading a page in a browser.
 *
 * To keep the admin "site activity" panel honest we filter the log down to
 * just the requests that plausibly represent a human visiting a site page:
 *   - drop any path that starts with a known noise prefix (/repos/, /PDQ/,
 *     /_next/, /api/, /logos/, …)
 *   - drop any path whose suffix is a download or static-asset extension
 *     (.deb, .rpm, .iso, .png, .css, .js, .pdf, …)
 *
 * Everything else — `/`, `/admin/`, `/vmware/v9/`, `/support/ticket/`, etc.
 * — counts as a page hit.
 */
const LOG_RE = /^(\S+)\s+\S+\s+\S+\s+\[([^\]]+)\]\s+"\S+\s+(\S+)\s+\S+"/
const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 }

const PAGE_EXCLUDE_PREFIXES = [
  '/repos/',
  '/PDQ/',
  '/logos/',
  '/uploads/',
  '/_next/',
  '/css/',
  '/js/',
  '/api/',
  '/chat-proxy/',
  '/widget/',
  '/widget-test/',
  '/speedtest/backend/',
  '/favicon.',
]

const PAGE_EXCLUDE_SUFFIX_RE = /\.(?:deb|rpm|iso|zip|tar|tgz|tbz|tbz2|gz|bz2|xz|7z|exe|msi|cab|appx|appxbundle|msu|nupkg|whl|png|jpe?g|gif|svg|webp|ico|bmp|css|js|mjs|map|woff2?|ttf|eot|otf|pdf|docx?|xlsx?|pptx?|txt|xml|json|vmdk|ova|ovf|vhdx?|qcow2|img|raw)$/i

export function isSitePagePath(rawPath) {
  if (typeof rawPath !== 'string' || rawPath.length === 0) return false
  const cleaned = rawPath.split('?')[0]
  if (PAGE_EXCLUDE_SUFFIX_RE.test(cleaned)) return false
  for (const prefix of PAGE_EXCLUDE_PREFIXES) {
    if (cleaned.startsWith(prefix)) return false
  }
  return true
}

function parseLogDate(str) {
  const [datePart] = str.split(' ')
  const [day, mon, rest] = datePart.split('/')
  const [year, hh, mm, ss] = rest.split(':')
  return new Date(+year, MONTHS[mon] ?? 0, +day, +hh, +mm, +ss)
}

async function parseLogs() {
  const entries = []
  try { statSync(LOG_PATH) } catch { return entries }
  const rl = createInterface({ input: createReadStream(LOG_PATH), crlfDelay: Infinity })
  for await (const line of rl) {
    const m = LOG_RE.exec(line)
    if (!m) continue
    if (!isSitePagePath(m[3])) continue
    entries.push({ ip: m[1], ts: parseLogDate(m[2]), path: m[3].split('?')[0] })
  }
  return entries
}

/* ── 3b. PERIOD AGGREGATION HELPERS ──
 *
 * Each period — Daily / Weekly / Monthly / Yearly — produces:
 *   • chart:   array of { day: label, value: hits-in-bucket }
 *   • total:   number of UNIQUE IP addresses across the whole window,
 *              formatted with a thousands separator
 *   • topIPs:  the most-frequent IPs in that window, descending
 *
 * All aggregations are derived from the same parsed nginx log entries, so
 * the totals shown above the chart always match what the chart renders.
 */
const HOUR_MS = 3_600_000
const DAY_MS  = 86_400_000

const MONTH_NAMES   = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatNumberWithCommas(n) {
  return Number(n).toLocaleString('en-US')
}

/** Format a 0-23 hour as a friendly clock label like "6a", "12p", "11p". */
function hourLabel(hour) {
  if (hour === 0) return '12a'
  if (hour === 12) return '12p'
  return hour < 12 ? `${hour}a` : `${hour - 12}p`
}

/* Build the per-period connection list. Each entry is a unique connection
 * (client IP) with its total hits AND a breakdown of which site locations it
 * viewed, so the dashboard can expand any connection to see where it went.
 * The limit is generous so the list reflects ALL unique connections in the
 * window (matching the "unique connections" headline), not just a top-10. */
function buildConnectionList(ipHitMap, ipLocMap, limit = 200, locationLimit = 100) {
  return Array.from(ipHitMap.entries())
    .map(([ip, count]) => ({
      ip,
      count,
      locations: Array.from((ipLocMap.get(ip) ?? new Map()).entries())
        .map(([path, c]) => ({ path, count: c }))
        .sort((a, b) => b.count - a.count)
        .slice(0, locationLimit),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/** Generic period aggregator. Caller supplies the window start, the bucket
 *  count, and how to map an entry timestamp to a bucket index + label. */
function aggregatePeriod(entries, { windowStart, windowEnd, buckets, bucketIndex, labelFor }) {
  const counts = new Array(buckets).fill(0)
  const uniqueIps = new Set()
  const ipHitMap = new Map()
  const ipLocMap = new Map() // ip -> Map<path, hits> for per-connection drill-down
  // Same two maps again, but PER BUCKET, so clicking a bar on the timeline can
  // show the connections and locations for that hour/day alone. Without these
  // the dashboard could only ever show whole-window totals under a single
  // bucket's heading, which reads as "4p had these 300 hits" when the numbers
  // are actually the entire period's.
  const bucketIpHit = Array.from({ length: buckets }, () => new Map())
  const bucketIpLoc = Array.from({ length: buckets }, () => new Map())

  for (const entry of entries) {
    const t = entry.ts.getTime()
    if (t < windowStart || t >= windowEnd) continue
    const idx = bucketIndex(entry.ts, t)
    if (idx < 0 || idx >= buckets) continue
    counts[idx]++
    uniqueIps.add(entry.ip)
    ipHitMap.set(entry.ip, (ipHitMap.get(entry.ip) ?? 0) + 1)
    if (entry.path) {
      let lm = ipLocMap.get(entry.ip)
      if (!lm) { lm = new Map(); ipLocMap.set(entry.ip, lm) }
      lm.set(entry.path, (lm.get(entry.path) ?? 0) + 1)
    }

    const bHit = bucketIpHit[idx]
    bHit.set(entry.ip, (bHit.get(entry.ip) ?? 0) + 1)
    if (entry.path) {
      const bLoc = bucketIpLoc[idx]
      let blm = bLoc.get(entry.ip)
      if (!blm) { blm = new Map(); bLoc.set(entry.ip, blm) }
      blm.set(entry.path, (blm.get(entry.path) ?? 0) + 1)
    }
  }

  return {
    chart: counts.map((value, i) => ({
      day: labelFor(i),
      value,
      // Unique connections in THIS bucket. The bar height is hit count, which
      // is a different (larger) number — labelling one as the other is what
      // made the timeline look inconsistent with the headline.
      connections: bucketIpHit[i].size,
    })),
    total: formatNumberWithCommas(uniqueIps.size),
    totalRaw: uniqueIps.size,
    topIPs: buildConnectionList(ipHitMap, ipLocMap),
    // Per-bucket drill-down. Tighter caps than the window-wide list: this is
    // twelve-plus lists in one response, so it is bounded to keep the payload
    // sane on a busy day.
    bucketIPs: bucketIpHit.map((hits, i) => buildConnectionList(hits, bucketIpLoc[i], 50, 25)),
  }
}

/** Daily — last 12 hours of activity, hourly buckets. Matches the visual
 *  density of the static fallback (12 bars). */
function computeDaily(entries, now) {
  const endOfHour = (() => {
    const d = new Date(now); d.setMinutes(0, 0, 0)
    return d.getTime() + HOUR_MS
  })()
  const startOfWindow = endOfHour - 12 * HOUR_MS

  return aggregatePeriod(entries, {
    windowStart: startOfWindow,
    windowEnd: endOfHour,
    buckets: 12,
    bucketIndex: (_ts, t) => Math.floor((t - startOfWindow) / HOUR_MS),
    labelFor: (i) => {
      const d = new Date(startOfWindow + i * HOUR_MS)
      return hourLabel(d.getHours())
    },
  })
}

/** Weekly — last 7 days, daily buckets, weekday labels rotated so the most
 *  recent day appears at the right edge. */
function computeWeekly(entries, now) {
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const startOfWindow = today.getTime() - 6 * DAY_MS
  const windowEnd = today.getTime() + DAY_MS

  return aggregatePeriod(entries, {
    windowStart: startOfWindow,
    windowEnd,
    buckets: 7,
    bucketIndex: (_ts, t) => Math.floor((t - startOfWindow) / DAY_MS),
    labelFor: (i) => {
      const d = new Date(startOfWindow + i * DAY_MS)
      return WEEKDAY_NAMES[d.getDay()]
    },
  })
}

/** Monthly — last 4 weeks (28 days), one bucket per week. */
function computeMonthly(entries, now) {
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const startOfWindow = today.getTime() + DAY_MS - 28 * DAY_MS
  const windowEnd = today.getTime() + DAY_MS
  const WEEK_MS = 7 * DAY_MS

  return aggregatePeriod(entries, {
    windowStart: startOfWindow,
    windowEnd,
    buckets: 4,
    bucketIndex: (_ts, t) => Math.floor((t - startOfWindow) / WEEK_MS),
    labelFor: (i) => `W${i + 1}`,
  })
}

/** Yearly — last 12 calendar months. Bucket boundaries respect month length
 *  so the totals match real calendar months even though the chart is rolling. */
function computeYearly(entries, now) {
  const nowDate = new Date(now)
  // Build 12 month buckets ending at the current month (oldest first).
  const buckets = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1)
    buckets.push({ year: d.getFullYear(), month: d.getMonth() })
  }
  const windowStart = new Date(buckets[0].year, buckets[0].month, 1).getTime()
  const windowEnd = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 1).getTime()

  return aggregatePeriod(entries, {
    windowStart,
    windowEnd,
    buckets: 12,
    bucketIndex: (ts) => {
      // Find the bucket whose (year, month) matches this entry.
      const y = ts.getFullYear(), m = ts.getMonth()
      return buckets.findIndex((b) => b.year === y && b.month === m)
    },
    labelFor: (i) => MONTH_NAMES[buckets[i].month],
  })
}

async function getUnifiedData() {
  const entries = await parseLogs()
  const now = Date.now()

  // Real period aggregates — every panel below shows numbers derived from
  // the nginx access log.
  const daily   = computeDaily(entries, now)
  const weekly  = computeWeekly(entries, now)
  const monthly = computeMonthly(entries, now)
  const yearly  = computeYearly(entries, now)

  // Backwards-compatible 24-bucket array for any old consumer that hasn't
  // moved to the chart/totals shape.
  const hourlyHits = new Array(24).fill(0)
  const dayWindow = now - DAY_MS
  for (const entry of entries) {
    if (entry.ts.getTime() >= dayWindow) hourlyHits[entry.ts.getHours()]++
  }

  return {
    // Legacy shape — kept so older code paths keep working.
    hourlyData: hourlyHits,

    // New shape consumed by ActivityChartCard.
    chart: {
      Daily:   daily.chart,
      Weekly:  weekly.chart,
      Monthly: monthly.chart,
      Yearly:  yearly.chart,
    },
    totals: {
      Daily:   daily.total,
      Weekly:  weekly.total,
      Monthly: monthly.total,
      Yearly:  yearly.total,
    },
    topIPs: {
      Daily:   daily.topIPs,
      Weekly:  weekly.topIPs,
      Monthly: monthly.topIPs,
      Yearly:  yearly.topIPs,
    },
    // One connection list per chart bucket, aligned by index with chart[period].
    bucketIPs: {
      Daily:   daily.bucketIPs,
      Weekly:  weekly.bucketIPs,
      Monthly: monthly.bucketIPs,
      Yearly:  yearly.bucketIPs,
    },
    totalToday: daily.totalRaw,

    // Existing fields (alerts + services) — services now reflect real
    // probe results from `nodeStatusCache` instead of hardcoded values.
    alerts: feedbackStorage,
    services: buildServicesPayload(),

    // Package-mirror "last updated" stamps (cached scan, see repo-freshness.mjs).
    repoFreshness: getRepoFreshness(),
  }
}

/* ── 4. SERVER ── */
const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    // Preflight for /api/admin/* must enforce same-origin; everything else
    // remains permissive so customer-facing public endpoints work from any
    // origin (e.g. mirrored static exports on a CDN).
    const optUrl = (req.url || '').split('?')[0]
    if (ADMIN_PATH_RE.test(optUrl)) {
      res.writeHead(204, adminCors(req))
    } else {
      res.writeHead(204, CORS)
    }
    return res.end()
  }
  // Normalize the URL: drop the query string AND any trailing slash. Next.js's
  // `trailingSlash: true` setting causes the dev server to redirect every
  // request to a trailing-slash form, so /api/site-stats becomes
  // /api/site-stats/ before it ever reaches us. Strip it so the existing
  // exact-match handlers below keep working.
  let url = req.url?.split('?')[0]
  if (url && url.length > 1 && url.endsWith('/')) url = url.slice(0, -1)

  // Barred workstations never reach an admin route, whatever nginx's allowlist
  // says today. nginx sets x-real-ip from $remote_addr; this proxy binds loopback.
  if (url && (ADMIN_PATH_RE.test(url) || ADMIN_ONLY_ROUTES.has(url))) {
    const ip = normalizeClientIp(req)
    const hit = loadBlockedHosts(BLOCKED_HOSTS_FILE).get(ip)
    if (hit) {
      console.warn(`[site-stats] blocked host ${ip} (${hit.workstation || '?'} ${hit.user || ''}) -> ${req.method} ${url}`)
      res.writeHead(403, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' })
      return res.end('forbidden')
    }
  }

  /* ── nginx auth_request target ──
   *
   * GET /internal/authcheck — called by nginx's `auth_request` directive on
   * (almost) every request site-wide, so it must stay as cheap as possible:
   * no body parsing, no LDAP call, just a cookie/session-array lookup. nginx
   * only cares about the status code (2xx = allow, 401 = deny + redirect to
   * /login/); the X-User header is forwarded into the access log via
   * auth_request_set for a per-request "who did this" audit trail. This
   * location is marked `internal;` in nginx (unreachable directly by a
   * client) and itself carries `auth_request off;` to avoid infinite
   * recursion — both are set in nginx/server.conf, not here.
   */
  if (req.method === 'GET' && url === '/internal/authcheck') {
    const session = findSessionByCookie(req)
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' })
      return res.end('unauthenticated')
    }
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store', 'X-User': session.username })
    return res.end('ok')
  }

  /* ── External-URL redirector ──
   *
   * The client links to /api/external/<key> instead of internal hostnames
   * or RFC1918 IPs. We resolve <key> against EXTERNAL_URL_MAP and 302 to
   * the real URL. Unknown or unconfigured keys return 404 so the route
   * does not enumerate which integrations exist.
   */
  if (req.method === 'GET' && url && url.startsWith('/api/external/')) {
    const key = url.slice('/api/external/'.length)
    const target = Object.prototype.hasOwnProperty.call(EXTERNAL_URL_MAP, key)
      ? EXTERNAL_URL_MAP[key]
      : ''
    if (!target) {
      res.writeHead(404, { 'Content-Type': 'text/plain', ...CORS })
      return res.end('Not found')
    }
    res.writeHead(302, { Location: target, 'Cache-Control': 'no-store', ...CORS })
    return res.end()
  }

  /* ── Auth (multi-realm LDAP-bound session login) ──
   *
   * /api/auth/realms   — GET: public, no session required. [{id, label}] only
   *                      (no secrets) for the login form's realm dropdown.
   * /api/auth/login    — POST {realm, username, password}: LDAP bind against
   *                      the chosen realm; a successful bind alone grants a
   *                      'general' session (site-wide access), additionally
   *                      being in that realm's admin group grants 'admin'.
   * /api/auth/logout   — POST: invalidate the current session (either kind).
   * /api/auth/whoami   — GET: {authenticated, admin, username, realm,
   *                      expiresAt, csrfToken} for the current session, or
   *                      {authenticated:false, admin:false}.
   *
   * All four require same-origin (no cross-origin login attempts). Cookie is
   * HttpOnly so JS can't read it; the CSRF token returned in the JSON body is
   * what the client uses on subsequent write requests. Unlike the old
   * admin-only login, these are NOT gated by admin-acl.inc at the nginx layer
   * — every visitor must be able to reach them to log in at all. Admin
   * capability itself still requires BOTH `kind==='admin'` (checked by
   * authorizeAdmin) AND (for admin UI/API routes) the separate IP allowlist.
   */
  if (url && url.startsWith('/api/auth/')) {
    if (!isSameOriginRequest(req)) {
      res.writeHead(403, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Cross-origin auth requests are not accepted.' }))
    }
    const corsHeaders = adminCors(req)

    if (req.method === 'GET' && url === '/api/auth/realms') {
      res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      // defaultDomain and acceptedForms let the login form state exactly what
      // it will take ("BLCSE\\<UserAccount>", …) instead of hardcoding domain
      // names in the UI, where they would rot the moment a domain is added.
      return res.end(JSON.stringify(LDAP_REALMS.map((r) => ({
        id: r.id,
        label: r.label,
        defaultDomain: realmDefaultDomain(r),
        acceptedForms: acceptedLoginForms(r),
      }))))
    }

    if (req.method === 'POST' && url === '/api/auth/login') {
      if (!LDAP_CONFIGURED) {
        res.writeHead(503, { ...corsHeaders, 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({ error: 'LDAP not configured. Set LDAP_REALMS in .env.local.' }))
      }
      let body
      try { body = await readTextBody(req) } catch {
        res.writeHead(413, { ...corsHeaders, 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({ error: 'Payload too large.' }))
      }
      let parsed = {}
      try { parsed = JSON.parse(body || '{}') } catch { /* parsed stays {} */ }
      // `realm` is optional now. The login form only shows a realm picker when
      // more than one realm is configured; with a single realm the enclave is
      // never ambiguous, and WHICH DOMAIN inside that realm the account lives
      // in is worked out from the username itself (see ldapAuthenticate).
      const requestedRealm = typeof parsed.realm === 'string' ? parsed.realm.trim() : ''
      const realmId = requestedRealm || (LDAP_REALMS.length === 1 ? LDAP_REALMS[0].id : '')
      const username = typeof parsed.username === 'string' ? parsed.username.trim() : ''
      const password = typeof parsed.password === 'string' ? parsed.password : ''
      if (!realmId || !username || !password) {
        res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({ error: 'Username and password are required.' }))
      }
      const result = await ldapAuthenticate(realmId, username, password)
      if (!result.ok) {
        // A REJECTED credential stays deliberately generic — the reply must not
        // reveal whether the account exists. An infrastructure failure is a
        // different thing and gets its own 503: saying "the directory is
        // unreachable" discloses nothing about any account, while calling it
        // "Invalid credentials." sends people off resetting a perfectly good
        // password while the real fault (an untrusted LDAPS certificate, a dead
        // DC) goes unreported. The proxy log carries the specific reason either
        // way.
        // Anything the parser refused before a bind carries a severity, and is
        // recorded for the admin console — 'spoof' for a name asserting an
        // identity it has no business asserting (two domain claims in one
        // string, a domain we don't serve, LDAP metacharacters), 'format' for
        // an honest mistake. A wrong PASSWORD is not recorded here: it reached
        // the DC and lives in the Windows security log, and logging it would
        // fill this store with ordinary typos.
        if (result.severity) {
          recordAuthEvent(req, {
            severity: result.severity,
            reason: result.reason,
            detail: result.detail,
            typed: username,
            realm: realmId,
          })
        }
        const infrastructureFailure = result.reason === 'ldap-error' || result.reason === 'not-configured'
        // A malformed or foreign-domain name is worth answering precisely: it
        // says nothing about whether any account exists, and left generic the
        // user just retypes the same wrong thing and blames their password.
        // A REJECTED CREDENTIAL stays deliberately vague, as before.
        const badName = Boolean(result.severity)
        const forms = acceptedLoginForms(LDAP_REALMS.find((r) => r.id === realmId) || {})
        res.writeHead(infrastructureFailure ? 503 : 401, { ...corsHeaders, 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({
          error: infrastructureFailure
            ? "The sign-in service can't reach the directory server right now. This is a server problem, not your password — please tell a CESC administrator."
            : badName
              ? `Sign in with your domain and account name. Accepted forms: ${forms.join(', ')}`
              : 'Invalid credentials.',
        }))
      }
      pruneExpiredSessions()
      const sessionId = generateOpaqueId()
      const csrfToken = generateOpaqueId()
      const now = Date.now()
      const expiresAt = now + Math.floor(ADMIN_SESSION_TTL_HOURS * 3600 * 1000)
      const remoteIp = String(req.headers['x-real-ip'] || req.socket?.remoteAddress || '').trim()
      const kind = result.inAdminGroup ? 'admin' : 'general'
      // `domain` records WHICH domain of the forest the account came from —
      // two people can hold the same sAMAccountName in a parent and a child
      // domain, so the username alone no longer identifies a session in logs.
      const session = { id: sessionId, kind, realm: realmId, domain: result.domain || '', username: result.username, csrfToken, createdAt: now, expiresAt, lastSeenAt: now, remoteIp }
      if (kind === 'admin') {
        adminSessions.push(session)
        commitAdminSessionsToDisk()
        console.warn(`[site-stats] Admin session granted: user="${result.username}" domain="${result.domain || ''}" realm="${realmId}" ip="${remoteIp}"`)
      } else {
        generalSessions.push(session)
        commitGeneralSessionsToDisk()
      }
      setSessionCookie(res, sessionId, expiresAt)
      res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      return res.end(JSON.stringify({ username: result.username, domain: result.domain || '', realm: realmId, admin: kind === 'admin', expiresAt, csrfToken }))
    }

    if (req.method === 'POST' && url === '/api/auth/logout') {
      const cookies = parseCookies(req)
      const id = cookies[SESSION_COOKIE_NAME]
      if (id) {
        const beforeAdmin = adminSessions.length
        adminSessions = adminSessions.filter((s) => s.id !== id)
        if (adminSessions.length !== beforeAdmin) commitAdminSessionsToDisk()

        const beforeGeneral = generalSessions.length
        generalSessions = generalSessions.filter((s) => s.id !== id)
        if (generalSessions.length !== beforeGeneral) commitGeneralSessionsToDisk()
      }
      clearSessionCookie(res)
      res.writeHead(204, corsHeaders)
      return res.end()
    }

    if (req.method === 'GET' && url === '/api/auth/whoami') {
      // Always 200: the client probes this from every page mount (Navbar
      // admin-detection, and now the site-wide login gate too). A 401 would
      // clutter the console on the normal "not logged in yet" case.
      const session = findSessionByCookie(req)
      res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      if (!session) {
        return res.end(JSON.stringify({ authenticated: false, admin: false }))
      }
      return res.end(JSON.stringify({
        authenticated: true,
        admin: session.kind === 'admin',
        username: session.username,
        // Empty for sessions issued before domains were tracked.
        domain: session.domain || '',
        realm: session.realm,
        expiresAt: session.expiresAt,
        csrfToken: session.csrfToken,
      }))
    }

    res.writeHead(405, { ...corsHeaders, 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed.' }))
  }

  /* ── Chat transcript sync (own transcript only — admin-wide read/delete
   * lives at /api/admin/chat-history below) ──
   *
   * GET /api/chat-history — the calling session's own transcript, keyed by
   *                         its realm+username. Any valid session (general
   *                         or admin), not admin-gated.
   * PUT /api/chat-history — upsert the calling session's transcript.
   */
  if (url === '/api/chat-history') {
    if (!isSameOriginRequest(req)) {
      res.writeHead(403, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Cross-origin requests are not accepted.' }))
    }
    const session = findSessionByCookie(req)
    if (!session) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Sign in required.' }))
    }
    const key = chatHistoryKey(session.realm, session.username)

    if (req.method === 'GET') {
      const record = chatHistoryStorage.find((r) => chatHistoryKey(r.realm, r.username) === key)
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      return res.end(JSON.stringify({ messages: record?.messages ?? [] }))
    }

    if (req.method === 'PUT') {
      let body
      try { body = await readTextBody(req) } catch {
        res.writeHead(413, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({ error: 'Payload too large.' }))
      }
      let parsed = {}
      try { parsed = JSON.parse(body || '{}') } catch { /* parsed stays {} */ }
      const messages = sanitizeChatMessages(parsed.messages)
      const now = new Date().toISOString()
      const existing = chatHistoryStorage.find((r) => chatHistoryKey(r.realm, r.username) === key)
      if (existing) {
        existing.messages = messages
        existing.updatedAt = now
      } else {
        chatHistoryStorage.push({
          id: generateOpaqueId(),
          realm: session.realm,
          username: session.username,
          startedAt: now,
          updatedAt: now,
          messages,
        })
        // Bound total distinct transcripts, evicting the longest-untouched
        // ones first, so the file can't grow unbounded as new users chat.
        if (chatHistoryStorage.length > CHAT_HISTORY_MAX_RECORDS) {
          chatHistoryStorage.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
          chatHistoryStorage.length = CHAT_HISTORY_MAX_RECORDS
        }
      }
      commitChatHistoryToDisk()
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      return res.end(JSON.stringify({ ok: true }))
    }

    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed.' }))
  }

  /* ── System-event reporter ──
   *
   * Customer-facing pages POST here when they detect that a service is
   * misbehaving (speedtest backend down, PHP serving raw source, etc.).
   * The event lands in the same `feedbackStorage` array the existing
   * AlertsPanel renders, so admins see it under "System Events & Feedback"
   * with no UI changes required.
   *
   * Request body:
   *   { key, severity, title, message, page?, source? }
   *
   * Dedup: events with the same `key` within SYSTEM_EVENT_DEDUP_WINDOW_MS
   * just bump the existing entry's `count` + lastSeenAt instead of creating
   * a new one — prevents 100 page-loads producing 100 identical alerts.
   * Email notifications fire only on first occurrence of a given key in
   * the dedup window.
   */
  if (req.method === 'POST' && url === '/api/system-event') {
    // Same-origin guard. Customer-facing pages on this site issue these
    // events automatically — but unauthenticated POSTs from a foreign
    // origin should be refused so external pages can't spam admin
    // alerts (the dedup window helps but doesn't stop a single event
    // per key per source). Compare the Origin/Referer header to the
    // Host the proxy was reached on.
    if (!isSameOriginRequest(req, { requireHeader: true })) {
      res.writeHead(403, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Cross-origin system-event posts are not accepted.' }))
      return
    }

    try {
      const data = JSON.parse((await readTextBody(req, 8000)) || '{}')
      const key = typeof data.key === 'string' ? data.key.trim().slice(0, 120) : ''
      const title = typeof data.title === 'string' ? data.title.trim().slice(0, 200) : ''
      const message = typeof data.message === 'string' ? data.message.trim().slice(0, 1500) : ''
      if (!key || !title || !message) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'key, title, and message are required' }))
        return
      }
      const severity = ['info', 'warning', 'critical'].includes(data.severity) ? data.severity : 'warning'
      const page = typeof data.page === 'string' ? data.page.slice(0, 200) : ''
      const sourceLabel = typeof data.source === 'string' && data.source.trim()
        ? data.source.trim().slice(0, 80)
        : 'Page diagnostic'
      const now = Date.now()
      const nowIso = new Date(now).toISOString()
      const SYSTEM_EVENT_DEDUP_WINDOW_MS = 30 * 60_000 // 30 min

      // Look for an existing entry with the same key inside the window.
      const existing = feedbackStorage.find((entry) =>
        entry.systemEventKey === key
        && entry.firstSeenAt
        && (now - new Date(entry.firstSeenAt).getTime()) < SYSTEM_EVENT_DEDUP_WINDOW_MS,
      )

      if (existing) {
        existing.count = (existing.count || 1) + 1
        existing.lastSeenAt = nowIso
        existing.timestamp = new Date().toLocaleString()
        existing.message = message // refresh in case it carries new detail
        commitFeedbackToDisk()
        res.writeHead(200, { ...CORS, 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, deduped: true, count: existing.count }))
        return
      }

      const alert = {
        id: `sys-${now}-${Math.random().toString(36).slice(2, 8)}`,
        type: severity === 'critical' ? 'critical' : severity === 'info' ? 'info' : 'warning',
        category: 'alert',
        title,
        message,
        timestamp: new Date().toLocaleString(),
        source: page ? `${sourceLabel} · ${page}` : sourceLabel,
        systemEventKey: key,
        firstSeenAt: nowIso,
        lastSeenAt: nowIso,
        count: 1,
      }
      feedbackStorage.unshift(alert)
      feedbackStorage = feedbackStorage.slice(0, FEEDBACK_MAX_ENTRIES)
      commitFeedbackToDisk()
      res.writeHead(200, { ...CORS, 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, deduped: false }))
    } catch (err) {
      console.error('[site-stats] System event save failed:', err)
      res.writeHead(400, { ...CORS, 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Could not record event' }))
    }
    return
  }

  if (req.method === 'POST' && url === '/api/site-feedback') {
    // Same-origin guard. Only the site's own pages should POST feedback —
    // cross-origin posts would let a third party spam the admin inbox.
    if (!isSameOriginRequest(req, { requireHeader: true })) {
      res.writeHead(403, { 'Content-Type': 'application/json', ...CORS })
      res.end(JSON.stringify({ error: 'Cross-origin feedback posts are not accepted.' }))
      return
    }
    try {
      const data = JSON.parse(await readTextBody(req, MAX_SMALL_JSON_BYTES))
      const moderation = data.moderation && typeof data.moderation === 'object' ? data.moderation : null
      const flaggedByLocalAi = moderation?.flagged === true
      const alert = {
        id: `fb-${Date.now()}`,
        type: flaggedByLocalAi ? 'warning' : data.category === 'Bug Report' ? 'critical' : 'info',
        category: 'feedback',
        title: `${flaggedByLocalAi ? 'Flagged by Local AI - ' : ''}${data.category}: ${data.name || 'Anonymous'}`,
        message: data.message,
        timestamp: new Date().toLocaleString(),
        source: flaggedByLocalAi ? 'AI Assistant - Flagged by Local AI' : 'AI Assistant',
        moderation,
      }
      feedbackStorage.unshift(alert)
      feedbackStorage = feedbackStorage.slice(0, FEEDBACK_MAX_ENTRIES)
      commitFeedbackToDisk()
      res.writeHead(200, { ...CORS, 'Content-Type': 'application/json' }).end(JSON.stringify({ success: true }))
    } catch { res.writeHead(400, CORS).end() }
    return
  }

  if (req.method === 'GET' && url === '/api/notification-settings') {
    res.writeHead(200, { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify({
      ...notificationSettings,
      // Honest until a transport exists — nothing on this host sends mail.
      deliveryConfigured: false,
    }))
    return
  }

  if (req.method === 'GET' && url === '/api/acknowledged-alerts') {
    res.writeHead(200, { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify({ alertIds: acknowledgedAlertIds }))
    return
  }

  if (req.method === 'POST' && url === '/api/acknowledged-alerts') {
    try {
      const data = JSON.parse(await readTextBody(req, MAX_SMALL_JSON_BYTES))
      const nextIds = normalizeAcknowledgedAlertIds([
        ...acknowledgedAlertIds,
        ...(typeof data.alertId === 'string' ? [data.alertId] : []),
        ...normalizeAcknowledgedAlertIds(data),
      ])
      acknowledgedAlertIds = nextIds
      commitAcknowledgedAlertIdsToDisk()
      res.writeHead(200, { ...CORS, 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, alertIds: acknowledgedAlertIds }))
    } catch {
      res.writeHead(400, CORS).end()
    }
    return
  }

  /* ── Admin-managed live-announcement scan roots ──
   *   GET    — current roots (file-managed if present, else env/defaults)
   *   POST   — replace the full list; persists + clears the scanner cache
   *   DELETE — remove the file override and fall back to env/defaults
   */
  if (req.method === 'GET' && url === '/api/admin/announcement-paths') {
    if (!requireAdmin(req, res)) return
    // When no file override exists, seed the editor with the effective
    // env/default roots so admins start from the real current config.
    const effective = announcementPaths
      ?? parseConfiguredRoots(process.env.LIVE_ANNOUNCEMENT_PATHS)
        .map((r) => ({ label: r.label, category: r.category, fsPath: r.fsPath, urlPrefix: r.urlPrefix }))
    res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify({
      paths: effective,
      source: announcementPaths ? 'admin' : 'env',
      exists: effective.map((p) => existsSync(p.fsPath)),
    }))
    return
  }

  if (req.method === 'POST' && url === '/api/admin/announcement-paths') {
    if (!requireAdmin(req, res)) return
    try {
      const data = JSON.parse(await readTextBody(req))
      if (!Array.isArray(data?.paths) || data.paths.length === 0 || data.paths.length > 50) {
        throw new Error('paths must be a non-empty array (max 50 entries).')
      }
      announcementPaths = data.paths.map(sanitizeAnnouncementPath)
      commitAnnouncementPathsToDisk()
      clearLiveAnnouncementCache()
      appendAuditEntry({ kind: 'announcement-paths.update', slug: `${announcementPaths.length} roots`, by: 'admin-ui' }, req)
      res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, paths: announcementPaths }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save announcement paths'
      res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: message }))
    }
    return
  }

  if (req.method === 'DELETE' && url === '/api/admin/announcement-paths') {
    if (!requireAdmin(req, res)) return
    announcementPaths = null
    try { rmSync(ANNOUNCEMENT_PATHS_FILE, { force: true }) } catch { /* ignore */ }
    clearLiveAnnouncementCache()
    appendAuditEntry({ kind: 'announcement-paths.reset', slug: 'env/defaults', by: 'admin-ui' }, req)
    res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: true }))
    return
  }

  /* ── Admin-managed APEN-chat-assistant suggested-prompt chips ──
   *   GET    — current chips (admin-managed if a file override exists, else defaults)
   *   POST   — replace the full list; persists to assistant-prompts.json
   *   DELETE — drop the override file and fall back to built-in defaults
   * The public /api/content-overrides response carries the effective list, so
   * the chat updates on its next page load — no rebuild required. */
  if (req.method === 'GET' && url === '/api/admin/assistant-prompts') {
    if (!requireAdmin(req, res)) return
    res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify({ prompts: effectiveAssistantPrompts(), source: assistantPrompts ? 'admin' : 'default' }))
    return
  }

  if (req.method === 'POST' && url === '/api/admin/assistant-prompts') {
    if (!requireAdmin(req, res)) return
    try {
      const data = JSON.parse(await readTextBody(req))
      if (!Array.isArray(data?.prompts) || data.prompts.length > 12) {
        throw new Error('prompts must be an array (max 12 chips).')
      }
      assistantPrompts = data.prompts.map(sanitizeAssistantPrompt).filter(Boolean)
      commitAssistantPromptsToDisk()
      appendAuditEntry({ kind: 'assistant-prompts.update', slug: `${assistantPrompts.length} chips`, by: 'admin-ui' }, req)
      res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, prompts: assistantPrompts }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save assistant chips'
      res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: message }))
    }
    return
  }

  if (req.method === 'DELETE' && url === '/api/admin/assistant-prompts') {
    if (!requireAdmin(req, res)) return
    assistantPrompts = null
    try { rmSync(ASSISTANT_PROMPTS_FILE, { force: true }) } catch { /* ignore */ }
    appendAuditEntry({ kind: 'assistant-prompts.reset', slug: 'defaults', by: 'admin-ui' }, req)
    res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: true }))
    return
  }

  /* ── Admin-managed assistant knowledge block (the editable half of the
   *    Voltron system prompt) ──
   *   GET    — the block in force, the built-in default, and which is live
   *   POST   — replace it; persists to assistant-system-prompt.json
   *   DELETE — drop the override and fall back to the built-in default
   * voltron-proxy.mjs re-reads the file on its next request, so a save is live
   * on the next question asked — no rebuild, no restart. */
  if (req.method === 'GET' && url === '/api/admin/assistant-system-prompt') {
    if (!requireAdmin(req, res)) return
    res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify({
      knowledge: assistantKnowledge ?? DEFAULT_ASSISTANT_KNOWLEDGE,
      default: DEFAULT_ASSISTANT_KNOWLEDGE,
      source: assistantKnowledge ? 'admin' : 'default',
      maxChars: MAX_ASSISTANT_KNOWLEDGE_CHARS,
    }))
    return
  }

  if (req.method === 'POST' && url === '/api/admin/assistant-system-prompt') {
    if (!requireAdmin(req, res)) return
    try {
      const data = JSON.parse(await readTextBody(req))
      const knowledge = typeof data?.knowledge === 'string' ? data.knowledge.trim() : ''
      if (!knowledge) {
        throw new Error('The knowledge block cannot be empty. Use Reset to default instead.')
      }
      if (knowledge.length > MAX_ASSISTANT_KNOWLEDGE_CHARS) {
        throw new Error(`The knowledge block is limited to ${MAX_ASSISTANT_KNOWLEDGE_CHARS.toLocaleString()} characters.`)
      }
      assistantKnowledge = knowledge
      commitAssistantKnowledgeToDisk()
      appendAuditEntry({ kind: 'assistant-prompt.update', slug: `${knowledge.length} chars`, by: 'admin-ui' }, req)
      res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, source: 'admin' }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save the assistant knowledge block'
      res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: message }))
    }
    return
  }

  if (req.method === 'DELETE' && url === '/api/admin/assistant-system-prompt') {
    if (!requireAdmin(req, res)) return
    assistantKnowledge = null
    try { rmSync(ASSISTANT_KNOWLEDGE_FILE, { force: true }) } catch { /* ignore */ }
    appendAuditEntry({ kind: 'assistant-prompt.reset', slug: 'default', by: 'admin-ui' }, req)
    res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: true }))
    return
  }

  /* ── Sign-in security events (admin only) ──
   *
   * Refused sign-ins that never reached a domain controller: spoofed domain
   * claims and malformed names. Read-only on purpose — there is no endpoint
   * to clear it, because the value of a security log is that the person who
   * tripped it cannot tidy it away. It self-trims to the newest
   * AUTH_EVENTS_MAX records.
   */
  if (req.method === 'GET' && url === '/api/admin/auth-events') {
    if (!requireAdmin(req, res)) return
    res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    // Newest first — an admin opening this panel wants what just happened.
    res.end(JSON.stringify({
      events: [...authEvents].reverse(),
      spoofCount: authEvents.filter((e) => e.severity === 'spoof').length,
      max: AUTH_EVENTS_MAX,
    }))
    return
  }

  /* ── Shared "remove from view" dismissals (admin-attributed) ── */
  if (req.method === 'GET' && url === '/api/admin/dismissed-alerts') {
    if (!requireAdmin(req, res)) return
    res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify({ dismissals }))
    return
  }

  if (req.method === 'POST' && url === '/api/admin/dismissed-alerts') {
    if (!requireAdmin(req, res)) return
    try {
      const data = JSON.parse(await readTextBody(req))
      const id = String(data?.alertId ?? data?.id ?? '').trim()
      if (!id) throw new Error('alertId is required')
      // Attribute to the admin, same precedence as the content audit log:
      // real LDAP session username > AD user from the admin-acl.inc comment
      // (resolved by source IP, for legacy IP-allowlisted admins who never
      // logged in via LDAP) > generic 'admin' fallback.
      const ws = resolveWorkstation(req)
      const sessionUser = (typeof req.adminUser === 'string' && req.adminUser !== 'admin') ? req.adminUser : ''
      const by = sessionUser || ws.user || 'admin'
      dismissals = dismissals.filter((d) => d.id !== id)
      dismissals.push({ id, by, at: new Date().toISOString() })
      commitDismissalsToDisk()
      res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, dismissals }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not record dismissal'
      res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: message }))
    }
    return
  }

  if (req.method === 'DELETE' && url === '/api/admin/dismissed-alerts') {
    if (!requireAdmin(req, res)) return
    try {
      const data = JSON.parse(await readTextBody(req))
      const id = String(data?.alertId ?? data?.id ?? '').trim()
      if (!id) throw new Error('alertId is required')
      dismissals = dismissals.filter((d) => d.id !== id)
      commitDismissalsToDisk()
      res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, dismissals }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not restore item'
      res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: message }))
    }
    return
  }

  /* ── Admin-wide chat transcript audit ── */
  if (req.method === 'GET' && url === '/api/admin/chat-history') {
    if (!requireAdmin(req, res)) return
    res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify({ transcripts: chatHistoryStorage }))
    return
  }

  if (req.method === 'DELETE' && url === '/api/admin/chat-history') {
    if (!requireAdmin(req, res)) return
    try {
      const data = JSON.parse(await readTextBody(req))
      const id = String(data?.id ?? '').trim()
      if (!id) throw new Error('id is required')
      chatHistoryStorage = chatHistoryStorage.filter((r) => r.id !== id)
      commitChatHistoryToDisk()
      res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not delete transcript'
      res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: message }))
    }
    return
  }

  if (req.method === 'POST' && url === '/api/notification-settings') {
    try {
      const data = JSON.parse(await readTextBody(req, MAX_SMALL_JSON_BYTES))
      notificationSettings = normalizeNotificationSettings({
        ...data,
        lastSavedAt: new Date().toISOString(),
      })
      commitNotificationSettingsToDisk()
      res.writeHead(200, { ...CORS, 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, settings: notificationSettings }))
    } catch {
      res.writeHead(400, CORS).end()
    }
    return
  }

  if (req.method === 'GET' && url === '/api/site-stats') {
    try {
      const data = await getUnifiedData()
      res.writeHead(200, { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify(data))
    } catch { res.writeHead(500, CORS).end() }
    return
  }

  /* ── Package-mirror freshness (public, cached) ── */
  if (req.method === 'GET' && url === '/api/repo-freshness') {
    try {
      const payload = getRepoFreshness()
      res.writeHead(200, { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify(payload))
    } catch { res.writeHead(500, CORS).end() }
    return
  }

  /* ── ADMIN: infrastructure nodes (CRUD + probe-now) ──
   *   GET  /api/admin/infrastructure-nodes      — list nodes + live status
   *   POST /api/admin/infrastructure-nodes      — add or update one node (full record)
   *   DELETE /api/admin/infrastructure-nodes    — remove a node by id
   *   POST /api/admin/infrastructure-nodes/probe — force-refresh probes now
   */
  if (req.method === 'GET' && url === '/api/admin/infrastructure-nodes') {
    if (!requireAdmin(req, res)) return
    res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify({
      nodes: infrastructureNodes,
      services: buildServicesPayload(),
      pollIntervalMs: NODE_POLL_INTERVAL_MS,
      adminTokenRequired: Boolean(ADMIN_TOKEN),
    }))
    return
  }

  /* ── ADMIN: live NGINX status (VTS module / stub_status) ──
   *   GET /api/admin/nginx-stats — normalized live nginx metrics for the
   *   admin "NGINX status" tab and the Real-Time Traffic summary widget.
   *   Returns { available:false } with HTTP 200 when no status module is
   *   present, so the UI shows an honest "not detected" state rather than
   *   an error. Gated by authorizeAdmin (nginx also IP-allowlists /api/admin/).
   */
  if (req.method === 'GET' && url === '/api/admin/nginx-stats') {
    if (!requireAdmin(req, res)) return
    try {
      const data = await readNginxStatus()
      res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify(data))
    } catch (err) {
      console.error('[site-stats] nginx-stats failed:', err)
      res.writeHead(500, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'nginx status read failed' }))
    }
    return
  }

  if (req.method === 'POST' && url === '/api/admin/infrastructure-nodes/probe') {
    if (!requireAdmin(req, res)) return
    try {
      await probeAllNodes()
      res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, services: buildServicesPayload() }))
    } catch (err) {
      console.error('[site-stats] Probe-now failed:', err)
      res.writeHead(500, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Probe failed' }))
    }
    return
  }

  if (req.method === 'POST' && url === '/api/admin/infrastructure-nodes') {
    if (!requireAdmin(req, res)) return
    try {
      const body = await readTextBody(req)
      const data = JSON.parse(body)
      const sanitized = sanitizeNode(data)
      const idx = infrastructureNodes.findIndex((n) => n.id === sanitized.id)
      if (idx >= 0) {
        infrastructureNodes[idx] = sanitized
        appendAuditEntry({ kind: 'node.update', slug: sanitized.id, by: 'admin-ui' }, req)
      } else {
        infrastructureNodes.push(sanitized)
        appendAuditEntry({ kind: 'node.create', slug: sanitized.id, by: 'admin-ui' }, req)
      }
      commitNodesToDisk()
      // Probe the freshly saved node so the dashboard updates right away.
      probeNode(sanitized).catch(() => { /* error captured in cache */ })
      res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, node: sanitized }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save node'
      res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: message }))
    }
    return
  }

  if (req.method === 'DELETE' && url === '/api/admin/infrastructure-nodes') {
    if (!requireAdmin(req, res)) return
    try {
      const body = await readTextBody(req)
      const data = JSON.parse(body)
      const id = String(data?.id || '').trim()
      if (!id) throw new Error('id is required')
      const before = infrastructureNodes.length
      infrastructureNodes = infrastructureNodes.filter((n) => n.id !== id)
      if (infrastructureNodes.length !== before) {
        nodeStatusCache.delete(id)
        commitNodesToDisk()
        appendAuditEntry({ kind: 'node.delete', slug: id, by: 'admin-ui' }, req)
      }
      res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not delete node'
      res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: message }))
    }
    return
  }

  /* ── ADMIN: upload a route/logo image ────────────────────────────────
   * The request body is the raw file (not multipart). x-file-name is used
   * only to create a readable stem; the saved extension and response MIME are
   * derived from magic bytes. authorizeAdmin enforces the LDAP-session CSRF
   * token on this POST, or the existing legacy admin-token fallback.
   */
  if (req.method === 'POST' && url === '/api/admin/logo-upload') {
    if (!requireAdmin(req, res)) return

    const declaredLength = Number.parseInt(String(req.headers['content-length'] || ''), 10)
    if (Number.isFinite(declaredLength) && declaredLength > MAX_ADMIN_LOGO_BYTES) {
      req.resume()
      res.writeHead(413, { ...adminCors(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify({ error: 'Image exceeds the 6 MiB upload limit.' }))
      return
    }

    try {
      const buffer = await readBinaryBody(req)
      if (buffer.length === 0) {
        res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
        res.end(JSON.stringify({ error: 'Image body is empty.' }))
        return
      }

      const imageType = detectAdminLogoType(buffer)
      if (!imageType) {
        res.writeHead(415, { ...adminCors(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
        res.end(JSON.stringify({ error: 'Unsupported image. Upload a PNG, JPEG, WebP, or GIF file.' }))
        return
      }

      const originalName = String(req.headers['x-file-name'] || 'logo')
      const stored = storeAdminLogo(buffer, originalName, imageType.extension)
      appendAuditEntry({ kind: 'logo.upload', slug: stored.filename, by: 'admin-ui' }, req)
      res.writeHead(201, { ...adminCors(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify({
        success: true,
        src: stored.src,
        filename: stored.filename,
        contentType: imageType.contentType,
        bytes: buffer.length,
      }))
    } catch (err) {
      const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500
      if (statusCode >= 500) console.error('[site-stats] Admin logo upload failed:', err)
      res.writeHead(statusCode, { ...adminCors(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify({
        error: statusCode === 413 ? err.message : 'Could not store the uploaded image.',
      }))
    }
    return
  }

  /* ── ADMIN: download library (ISO / EXE / installer uploads) ─────────
   *
   * The logo endpoint above buffers a whole 6 MiB image in memory — fine for an
   * icon, impossible for a 15 GB ISO. These endpoints stream the request body
   * straight onto disk instead, and are resumable:
   *
   *   GET    /api/admin/file-library?dir=isos     — targets + what's in one
   *   GET    /api/admin/file-upload?dir&name      — bytes already stored
   *   POST   /api/admin/file-upload?dir&name&offset&total  — append from offset
   *   DELETE /api/admin/file-upload?dir&name      — discard a partial upload
   *
   * A dropped VPN therefore costs the admin a retry, not a 15 GB re-send: the
   * client re-reads the offset and posts file.slice(offset). nginx must have
   * `proxy_request_buffering off` + `client_max_body_size 0` on the POST path
   * (see the `location = /api/admin/file-upload` block in nginx/server.conf) or
   * it buffers the whole body to its own temp dir before we ever see it.
   */
  if (req.method === 'GET' && url === '/api/admin/file-library') {
    if (!requireAdmin(req, res)) return
    const requestedDir = new URL(req.url, 'http://localhost').searchParams.get('dir')
    const selected = findLibraryDir(requestedDir)
    res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify({
      dirs: allLibraryDirs().map(describeLibraryDir),
      dir: selected ? describeLibraryDir(selected) : null,
      files: selected ? listLibraryFiles(selected) : [],
    }))
    return
  }

  /* Add or update an admin-defined upload location (built-ins are fixed). */
  if (req.method === 'POST' && url === '/api/admin/file-library') {
    if (!requireAdmin(req, res)) return
    try {
      const data = JSON.parse(await readTextBody(req))
      const result = saveCustomLibraryDir(data, {
        actor: req.adminUser || 'admin-ui',
        createDir: data.createDir === true,
      })
      if (!result.ok) {
        res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: result.error }))
        return
      }
      appendAuditEntry({ kind: 'library.save', slug: result.entry.key, by: req.adminUser || 'admin-ui' }, req)
      res.writeHead(result.replaced ? 200 : 201, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, dirs: allLibraryDirs().map(describeLibraryDir) }))
    } catch (err) {
      console.error('[site-stats] Upload location save failed:', err)
      res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Could not save the upload location.' }))
    }
    return
  }

  /* Remove an admin-defined location. The folder and its files are untouched. */
  if (req.method === 'DELETE' && url === '/api/admin/file-library') {
    if (!requireAdmin(req, res)) return
    try {
      const data = JSON.parse(await readTextBody(req))
      const result = deleteCustomLibraryDir(String(data.key || ''), { actor: req.adminUser || 'admin-ui' })
      if (!result.ok) {
        res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: result.error }))
        return
      }
      appendAuditEntry({ kind: 'library.remove', slug: String(data.key || ''), by: req.adminUser || 'admin-ui' }, req)
      res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, dirs: allLibraryDirs().map(describeLibraryDir) }))
    } catch {
      res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Could not remove the upload location.' }))
    }
    return
  }

  if (url === '/api/admin/file-upload') {
    if (!requireAdmin(req, res)) { req.resume(); return }
    const query = new URL(req.url, 'http://localhost').searchParams
    const entry = findLibraryDir(query.get('dir'))
    if (!entry) {
      req.resume()
      res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Unknown upload directory.' }))
      return
    }
    const named = safeLibraryName(entry, query.get('name'))
    if (!named.ok) {
      req.resume()
      res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: named.error }))
      return
    }
    const { finalPath, partPath } = libraryPaths(entry, named.name)

    if (req.method === 'GET') {
      res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify({
        offset: partialOffset(entry, named.name),
        exists: existsSync(finalPath),
        url: `${libraryUrlPath(entry)}/${named.name}`,
      }))
      return
    }

    if (req.method === 'DELETE') {
      try { if (existsSync(partPath)) rmSync(partPath) } catch { /* already gone */ }
      res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true }))
      return
    }

    if (req.method !== 'POST') {
      req.resume()
      res.writeHead(405, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Method not allowed' }))
      return
    }

    const dirState = libraryDirState(entry)
    if (!dirState.exists || !dirState.writable) {
      req.resume()
      res.writeHead(503, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        error: dirState.exists
          ? `${dirState.path} is not writable by the site-stats proxy user.`
          : `${dirState.path} does not exist on this server.`,
      }))
      return
    }

    const offset = Number(query.get('offset') || '0')
    const total = Number(query.get('total') || '0')
    if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(total) || total <= 0) {
      req.resume()
      res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'offset and total must be whole, positive byte counts.' }))
      return
    }
    // The client must resume from exactly what we hold, or the file would be
    // silently spliced with a gap/overlap. Hand back the real offset so it can.
    const stored = partialOffset(entry, named.name)
    if (offset !== stored) {
      req.resume()
      res.writeHead(409, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Upload offset is out of sync — resume from the reported offset.', offset: stored }))
      return
    }
    if (offset > total) {
      req.resume()
      res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Stored bytes already exceed the declared total.' }))
      return
    }
    // Don't start a transfer that would fill the volume out from under nginx.
    if (dirState.freeBytes !== null && (total - offset) > (dirState.freeBytes - FREE_SPACE_RESERVE_BYTES)) {
      req.resume()
      res.writeHead(507, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        error: `Not enough free space on ${dirState.path}: ${formatByteCount(dirState.freeBytes)} available, `
          + `${formatByteCount(total - offset)} needed (2 GiB is kept in reserve).`,
      }))
      return
    }

    let overflow = false
    let aborted = false
    const sink = createWriteStream(partPath, { flags: offset === 0 ? 'w' : 'a', mode: 0o644 })
    try {
      await new Promise((settle, fail) => {
        let received = offset
        req.on('data', (chunk) => {
          received += chunk.length
          if (received > total) {
            overflow = true
            req.destroy()
          }
        })
        req.on('aborted', () => { aborted = true })
        req.on('error', fail)
        sink.on('error', fail)
        sink.on('finish', settle)
        req.pipe(sink)
      })
    } catch (err) {
      sink.destroy()
      console.error('[site-stats] File upload failed:', err)
      if (!res.headersSent) {
        res.writeHead(500, { ...adminCors(req), 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Upload stream failed. Retry — the transfer resumes where it stopped.' }))
      }
      return
    }

    if (overflow) {
      // The client sent more than it declared: the partial can no longer be
      // trusted as a resume point, so drop it and make it start over.
      try { if (existsSync(partPath)) rmSync(partPath) } catch { /* best effort */ }
      res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Upload sent more bytes than it declared. The partial file was discarded.' }))
      return
    }

    const storedNow = partialOffset(entry, named.name)
    if (aborted) return // connection is gone; the partial stays for the resume

    if (storedNow < total) {
      res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, complete: false, offset: storedNow }))
      return
    }

    try {
      // rename() is atomic on the same filesystem: anyone mid-download keeps
      // reading the old inode, and no one ever sees a half-written ISO.
      renameSync(partPath, finalPath)
    } catch (err) {
      console.error('[site-stats] Could not finalize upload:', err)
      res.writeHead(500, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: `Could not move the finished upload into place: ${err.message}` }))
      return
    }
    appendAuditEntry({ kind: 'file.upload', slug: `${entry.key}/${named.name}`, by: req.adminUser || 'admin-ui' }, req)
    res.writeHead(201, { ...adminCors(req), 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      success: true,
      complete: true,
      name: named.name,
      bytes: storedNow,
      url: `${libraryUrlPath(entry)}/${named.name}`,
    }))
    return
  }

  /* Rename a finished file inside one upload location. Both names pass the
   * same validation as uploads (safeLibraryName), so a rename can never move a
   * file out of its directory or give it a disallowed extension. Partial
   * uploads are excluded on purpose — their name IS the resume key. */
  if (req.method === 'POST' && url === '/api/admin/file-rename') {
    if (!requireAdmin(req, res)) return
    try {
      const data = JSON.parse(await readTextBody(req))
      const entry = findLibraryDir(String(data.dir || ''))
      if (!entry) throw Object.assign(new Error('Unknown upload directory.'), { statusCode: 400 })
      const from = safeLibraryName(entry, String(data.from || ''))
      if (!from.ok) throw Object.assign(new Error(from.error), { statusCode: 400 })
      const to = safeLibraryName(entry, String(data.to || ''))
      if (!to.ok) throw Object.assign(new Error(to.error), { statusCode: 400 })
      const fromPaths = libraryPaths(entry, from.name)
      const toPaths = libraryPaths(entry, to.name)
      if (!existsSync(fromPaths.finalPath)) {
        throw Object.assign(new Error(`No file named ${from.name} in ${entry.label}.`), { statusCode: 404 })
      }
      if (to.name !== from.name && existsSync(toPaths.finalPath)) {
        throw Object.assign(new Error(`${to.name} already exists in ${entry.label}.`), { statusCode: 409 })
      }
      if (to.name !== from.name) renameSync(fromPaths.finalPath, toPaths.finalPath)
      appendAuditEntry({ kind: 'file.rename', slug: `${entry.key}/${from.name} → ${to.name}`, by: req.adminUser || 'admin-ui' }, req)
      const oldUrl = `${libraryUrlPath(entry)}/${from.name}`
      const newUrl = `${libraryUrlPath(entry)}/${to.name}`
      // Layer 1: every admin override pointing at the old name follows it.
      const updatedOverrides = to.name === from.name ? 0 : rewriteOverrideUrls(oldUrl, newUrl, req.adminUser)
      // Layer 2: links baked into the build from SOURCE defaults can't be
      // rewritten from here — count them so the UI can say so out loud.
      const staleBuiltPages = to.name === from.name ? 0 : countBuiltReferences(oldUrl)
      res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, name: to.name, url: newUrl, updatedOverrides, staleBuiltPages }))
    } catch (err) {
      const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500
      if (statusCode >= 500) console.error('[site-stats] File rename failed:', err)
      res.writeHead(statusCode, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: statusCode >= 500 ? 'Could not rename the file.' : err.message }))
    }
    return
  }

  /* Delete a finished file from one upload location.
   *
   * There was no way to do this from Admin, so cleaning up superseded ISOs
   * meant an SSH session and `rm` — which is how /vmware/8 ended up with
   * thirteen product-card links pointing at files that no longer existed.
   *
   * Deleting is not symmetric with renaming. A rename REPAIRS the links that
   * follow it (rewriteOverrideUrls); a delete can only break them. So this
   * counts every reference first and refuses by default, returning the counts
   * so the UI can name them. `force: true` is the admin saying "yes, I know" —
   * it still audits, and the post-build link audit will still flag whatever is
   * left dangling. Partial uploads are excluded: their name is the resume key,
   * and DELETE /api/admin/file-upload already discards those. */
  if (req.method === 'DELETE' && url === '/api/admin/file-delete') {
    if (!requireAdmin(req, res)) return
    try {
      const data = JSON.parse(await readTextBody(req))
      const entry = findLibraryDir(String(data.dir || ''))
      if (!entry) throw Object.assign(new Error('Unknown upload directory.'), { statusCode: 400 })
      // safeLibraryName is the containment guard: it rejects traversal, absolute
      // paths and disallowed extensions, so `name` can never escape entry.dir.
      const target = safeLibraryName(entry, String(data.name || ''))
      if (!target.ok) throw Object.assign(new Error(target.error), { statusCode: 400 })
      const paths = libraryPaths(entry, target.name)
      if (!existsSync(paths.finalPath)) {
        throw Object.assign(new Error(`No file named ${target.name} in ${entry.label}.`), { statusCode: 404 })
      }
      const fileUrl = `${libraryUrlPath(entry)}/${target.name}`
      const referencedByOverrides = countOverrideReferences(fileUrl)
      const referencedByBuiltPages = countBuiltReferences(fileUrl)
      const references = referencedByOverrides + referencedByBuiltPages
      if (references > 0 && data.force !== true) {
        res.writeHead(409, { ...adminCors(req), 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          error: `${target.name} is still linked in ${references} place${references === 1 ? '' : 's'}. Remove the card row first, or delete anyway.`,
          referencedByOverrides,
          referencedByBuiltPages,
          url: fileUrl,
        }))
        return
      }
      const { size } = statSync(paths.finalPath)
      unlinkSync(paths.finalPath)
      appendAuditEntry({
        kind: 'file.delete',
        slug: `${entry.key}/${target.name}${references > 0 ? ` (forced, ${references} refs)` : ''}`,
        by: req.adminUser || 'admin-ui',
      }, req)
      res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, name: target.name, url: fileUrl, size, references }))
    } catch (err) {
      const statusCode = Number.isInteger(err?.statusCode) ? err.statusCode : 500
      if (statusCode >= 500) console.error('[site-stats] File delete failed:', err)
      res.writeHead(statusCode, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: statusCode >= 500 ? 'Could not delete the file.' : err.message }))
    }
    return
  }

  /* ── ADMIN: content overrides for cards/pages ── */
  if (req.method === 'GET' && url === '/api/admin/content-overrides') {
    if (!requireAdmin(req, res)) return
    res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify({
      overrides: contentOverrides,
      published: readPublishedContent(),
      publishTarget: publishTargetState(),
      buildStatus,
      customPages,
      auditLog: contentAuditLog.slice(0, 50),
      adminTokenRequired: Boolean(ADMIN_TOKEN),
    }))
    return
  }

  // Public read endpoint (used by Card components on every page).
  //
  // The internal `contentOverrides` object stores audit metadata
  // (`updatedAt`, `updatedBy`) on every entry — useful in the admin UI but
  // shouldn't leak to anonymous visitors. We project to a public shape
  // that exposes only the override `value`. customPages already only
  // contains presentation fields, but we still strip its audit fields
  // (`updatedBy`, `updatedAt`, `createdAt`, `published`) for consistency.
  if (req.method === 'GET' && url === '/api/content-overrides') {
    const publicOverrides = {}
    for (const [key, entry] of Object.entries(contentOverrides)) {
      if (entry && Object.prototype.hasOwnProperty.call(entry, 'value')) {
        publicOverrides[key] = { value: entry.value }
      }
    }
    const publicPages = customPages
      .filter((p) => p && p.published !== false)
      .map(({ updatedBy, updatedAt, createdAt, published, ...rest }) => rest)
    res.writeHead(200, { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify({ overrides: publicOverrides, customPages: publicPages, assistantPrompts: effectiveAssistantPrompts() }))
    return
  }

  if (req.method === 'POST' && url === '/api/admin/content-overrides') {
    if (!requireAdmin(req, res)) return
    try {
      const body = await readTextBody(req)
      const data = JSON.parse(body)
      const scope = data.scope
      if (!isSafeScopeKey(scope)) {
        res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid scope key' }))
        return
      }
      if (!Object.prototype.hasOwnProperty.call(data, 'value')) {
        res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Missing value' }))
        return
      }
      const value = scope === ROUTE_IMAGE_OVERRIDE_SCOPE
        ? sanitizeRouteImageRegistry(data.value)
        : data.value
      contentOverrides[scope] = {
        value,
        updatedAt: new Date().toISOString(),
        updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy.slice(0, 80) : 'admin',
      }
      commitContentOverridesToDisk()
      appendAuditEntry({ kind: 'override.set', scope, by: contentOverrides[scope].updatedBy }, req)
      res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, scope, override: contentOverrides[scope] }))
    } catch (err) {
      console.error('[site-stats] Override save failed:', err)
      res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Could not save override' }))
    }
    return
  }

  if (req.method === 'DELETE' && url === '/api/admin/content-overrides') {
    if (!requireAdmin(req, res)) return
    try {
      const body = await readTextBody(req)
      const data = JSON.parse(body)
      const scope = data.scope
      if (!isSafeScopeKey(scope)) {
        res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid scope key' }))
        return
      }
      if (Object.prototype.hasOwnProperty.call(contentOverrides, scope)) {
        delete contentOverrides[scope]
        commitContentOverridesToDisk()
        appendAuditEntry({ kind: 'override.revert', scope, by: typeof data.updatedBy === 'string' ? data.updatedBy.slice(0, 80) : 'admin' }, req)
      }
      res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true }))
    } catch {
      res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Could not revert override' }))
    }
    return
  }

  /* ── ADMIN: publish — bake drafts into the build snapshot + rebuild ── */
  if (req.method === 'GET' && url === '/api/admin/publish') {
    if (!requireAdmin(req, res)) return
    res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify({ status: buildStatus }))
    return
  }

  if (req.method === 'POST' && url === '/api/admin/publish') {
    if (!requireAdmin(req, res)) return
    if (buildStatus.state === 'running') {
      res.writeHead(409, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'A publish/build is already in progress.', status: buildStatus }))
      return
    }
    try {
      // updatedBy is optional; the authenticated session name (req.adminUser)
      // is the real actor recorded in the audit log.
      let actor = req.adminUser || 'admin'
      try {
        const body = await readTextBody(req)
        if (body) {
          const data = JSON.parse(body)
          if (typeof data.updatedBy === 'string' && data.updatedBy.trim()) actor = data.updatedBy.slice(0, 80)
        }
      } catch { /* empty/invalid body is fine — actor falls back to session */ }
      const status = startPublishBuild(actor)
      // A snapshot that failed to write is NOT a publish. Reporting 202 here is
      // what let Admin clear its unpublished flags optimistically and then have
      // them reappear on the next refresh.
      if (status.state === 'error') {
        res.writeHead(500, { ...adminCors(req), 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: status.message || 'Publish failed.', status }))
        return
      }
      appendAuditEntry({ kind: 'content.publish', by: actor }, req)
      res.writeHead(202, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, status }))
    } catch (err) {
      console.error('[site-stats] Publish failed:', err)
      res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Could not start publish' }))
    }
    return
  }

  /* ── ADMIN: managed nginx zones/upstreams — registry read + save ── */
  if (req.method === 'GET' && url === '/api/admin/nginx-managed') {
    if (!requireAdmin(req, res)) return
    const reg = readRegistry(NGINX_MANAGED_FILE)
    res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify({ entries: reg.entries, updatedAt: reg.updatedAt, updatedBy: reg.updatedBy, reloadStatus: nginxReloadStatus, reloadEnabled: NGINX_MANAGED_RELOAD_ENABLED }))
    return
  }

  if (req.method === 'POST' && url === '/api/admin/nginx-managed') {
    if (!requireAdmin(req, res)) return
    try {
      const data = JSON.parse((await readTextBody(req)) || '{}')
      const v = validateEntries(data.entries || [])
      if (!v.ok) {
        res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: v.error }))
        return
      }
      const actor = req.adminUser || (typeof data.updatedBy === 'string' ? data.updatedBy.slice(0, 80) : 'admin')
      const saved = writeRegistry(NGINX_MANAGED_FILE, v.entries, actor)
      appendAuditEntry({ kind: 'nginx-managed.save', by: actor }, req)
      res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, entries: v.entries, updatedAt: saved.updatedAt }))
    } catch (err) {
      res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Could not save' }))
    }
    return
  }

  /* ── ADMIN: managed nginx — Publish & Reload (write fragments + reload nginx) ── */
  if (req.method === 'POST' && url === '/api/admin/nginx-managed/publish') {
    if (!requireAdmin(req, res)) return
    if (nginxReloadStatus.state === 'running') {
      res.writeHead(409, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'An nginx publish is already in progress.', status: nginxReloadStatus }))
      return
    }
    try {
      const data = JSON.parse((await readTextBody(req)) || '{}')
      // Accept the entries in the publish body (save + publish in one click), or
      // fall back to whatever is already saved in the registry.
      const source = data.entries != null ? data.entries : readRegistry(NGINX_MANAGED_FILE).entries
      const v = validateEntries(source)
      if (!v.ok) {
        res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: v.error }))
        return
      }
      const actor = req.adminUser || (typeof data.updatedBy === 'string' ? data.updatedBy.slice(0, 80) : 'admin')
      const status = startNginxManagedPublish(v.entries, actor)
      appendAuditEntry({ kind: 'nginx-managed.publish', by: actor }, req)
      res.writeHead(202, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, status }))
    } catch (err) {
      res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Could not publish' }))
    }
    return
  }


  /* ── ADMIN: custom pages registry (wizard output) ── */
  if (req.method === 'POST' && url === '/api/admin/custom-pages') {
    if (!requireAdmin(req, res)) return
    try {
      const body = await readTextBody(req)
      const page = JSON.parse(body)
      if (!isSafeSlug(page.slug)) {
        res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Slug must be 2-64 lowercase characters: a-z, 0-9, hyphen.' }))
        return
      }
      if (!page.title || typeof page.title !== 'string' || page.title.length < 2 || page.title.length > 120) {
        res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Title must be 2-120 characters.' }))
        return
      }
      if (!Array.isArray(page.cards) || page.cards.length === 0) {
        res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'A page must define at least one card.' }))
        return
      }
      // Category is required and must be one of the known top-level sections.
      // The page URL is /<category>/<slug>, so a blank or unknown value would
      // publish to an unreachable URL. The reservedSubSlugs map mirrors
      // CUSTOM_PAGE_PARENTS in lib/data/admin-content.ts — keep both in sync
      // when adding/removing real Next.js sub-routes.
      const knownCategories = ['general', 'vmware', 'docs', 'isos', 'tools', 'security', 'support']
      const reservedSubSlugsByCategory = {
        general: [],
        vmware: ['tools', 'v7', 'v8', 'v9'],
        docs: ['el', 'facpro', 'ub'],
        isos: ['enterprise-linux', 'ubuntu', 'windows'],
        tools: [],
        security: [],
        support: ['knowledge-base', 'password-reset', 'status', 'ticket'],
      }
      if (!page.category || typeof page.category !== 'string' || !knownCategories.includes(page.category)) {
        res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Section/category is required and must be one of: ' + knownCategories.join(', ') }))
        return
      }
      const subReserved = reservedSubSlugsByCategory[page.category] || []
      if (subReserved.includes(page.slug)) {
        res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: `"/${page.category}/${page.slug}" is already a real page on the site. Reserved under ${page.category}: ${subReserved.join(', ')}.` }))
        return
      }
      const reservedSlugs = ['admin', 'api', 'custom-pages', 'isos', 'vmware', 'docs', 'support', 'trellix', 'dren']
      if (reservedSlugs.includes(page.slug)) {
        res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: `"${page.slug}" is reserved. Pick a different slug.` }))
        return
      }
      const now = new Date().toISOString()
      // Card downloads: each entry's `href` is run through sanitizeDownloadHref
      // which only permits internal paths (rooted at `/`, NOT `//evil.com`),
      // mailto:, tel:, http:, and https:. Anything else (javascript:, data:,
      // vbscript:, file:, ftp:) is rejected, so an admin pasting a malicious
      // payload from a phishing email can't turn it into a clickable button
      // for the next visitor.
      const sanitizedCards = page.cards.slice(0, 50).map((card, idx) => ({
        id: typeof card.id === 'string' && card.id.trim() ? card.id.trim().slice(0, 64) : `card-${idx + 1}`,
        title: String(card.title || `Card ${idx + 1}`).slice(0, 200),
        description: String(card.description || '').slice(0, 1200),
        glowColor: ['cyan', 'indigo', 'orange', 'green', 'amber', 'violet', 'sky', 'red'].includes(card.glowColor) ? card.glowColor : 'cyan',
        tags: Array.isArray(card.tags) ? card.tags.slice(0, 8).map((t) => String(t).slice(0, 40)) : [],
        logo: typeof card.logo === 'string' ? card.logo.slice(0, 400) : '',
        downloads: Array.isArray(card.downloads)
          ? card.downloads
              .slice(0, 12)
              .map((d) => {
                const safeHref = sanitizeDownloadHref(d?.href)
                if (!safeHref) return null
                return {
                  label: String(d.label || '').slice(0, 200),
                  href: safeHref,
                  desc: typeof d.desc === 'string' ? d.desc.slice(0, 400) : undefined,
                  isDoc: Boolean(d.isDoc),
                }
              })
              .filter(Boolean)
          : [],
        body: typeof card.body === 'string' ? card.body.slice(0, 4000) : '',
      }))
      const sanitized = {
        slug: page.slug,
        title: page.title.trim(),
        subtitle: typeof page.subtitle === 'string' ? page.subtitle.slice(0, 400) : '',
        badge: typeof page.badge === 'string' ? page.badge.slice(0, 60) : 'Custom',
        // backHref is rendered as the page's "back to ___" link. Force it
        // to a same-origin internal path — sanitizeInternalPath rejects
        // schemes (`javascript:`, `data:`) and protocol-relative URLs
        // (`//evil.com`) that would otherwise parse as off-site links.
        backHref: sanitizeInternalPath(page.backHref, '/'),
        backColor: ['cyan', 'indigo', 'orange', 'green', 'amber', 'violet', 'sky', 'red'].includes(page.backColor) ? page.backColor : 'cyan',
        logo: typeof page.logo === 'string' ? page.logo.slice(0, 400) : '',
        category: typeof page.category === 'string' ? page.category.slice(0, 60) : 'general',
        gridCols: typeof page.gridCols === 'string' ? page.gridCols.slice(0, 200) : 'sm:grid-cols-2 lg:grid-cols-3',
        cards: sanitizedCards,
        createdAt: now,
        updatedAt: now,
        updatedBy: typeof page.updatedBy === 'string' ? page.updatedBy.slice(0, 80) : 'admin',
        published: page.published !== false,
      }
      const existingIdx = customPages.findIndex((p) => p.slug === sanitized.slug)
      if (existingIdx >= 0) {
        sanitized.createdAt = customPages[existingIdx].createdAt || now
        customPages[existingIdx] = sanitized
        appendAuditEntry({ kind: 'page.update', slug: sanitized.slug, by: sanitized.updatedBy }, req)
      } else {
        customPages.unshift(sanitized)
        appendAuditEntry({ kind: 'page.create', slug: sanitized.slug, by: sanitized.updatedBy }, req)
      }
      commitCustomPagesToDisk()
      // Generate the real Next.js route file so the page is a static build
      // artifact (out/<category>/<slug>/index.html) after the next
      // `npm run build`. Runtime fallback via /custom-pages/ still works
      // immediately for admins who haven't rebuilt yet.
      writeCustomPageSource(sanitized)
      res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json' })
      // The page is reachable at /<category>/<slug>; nginx forwards unmatched
      // two-segment URLs to /custom-pages/index.html where the renderer reads
      // window.location.pathname to find the right slug. The legacy
      // /custom-pages/?slug=… URL still works as a fallback.
      res.end(JSON.stringify({ success: true, page: sanitized, url: `/${sanitized.category}/${sanitized.slug}` }))
    } catch (err) {
      console.error('[site-stats] Custom page save failed:', err)
      res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Could not save page' }))
    }
    return
  }

  if (req.method === 'DELETE' && url === '/api/admin/custom-pages') {
    if (!requireAdmin(req, res)) return
    try {
      const body = await readTextBody(req)
      const data = JSON.parse(body)
      if (!isSafeSlug(data.slug)) {
        res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid slug' }))
        return
      }
      // Capture the category before we remove the page from memory so we
      // know which app/<category>/<slug>/ directory the generated source
      // lives under.
      const doomed = customPages.find((p) => p.slug === data.slug)
      const before = customPages.length
      customPages = customPages.filter((p) => p.slug !== data.slug)
      if (customPages.length !== before) {
        commitCustomPagesToDisk()
        if (doomed?.category) deleteCustomPageSource(doomed.category, doomed.slug)
        appendAuditEntry({ kind: 'page.delete', slug: data.slug, by: typeof data.updatedBy === 'string' ? data.updatedBy.slice(0, 80) : 'admin' }, req)
      }
      res.writeHead(200, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true }))
    } catch {
      res.writeHead(400, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Could not delete page' }))
    }
    return
  }

  /* ── LibreSpeed-equivalent backend (Node, no PHP required) ──
   *
   * These four endpoints replicate the behavior of the LibreSpeed PHP
   * scripts in public/speedtest/backend/ so the speed test runs against
   * the proxy in environments where PHP-FPM isn't configured (typical
   * dev box). In production where nginx forwards *.php to PHP-FPM, the
   * page can keep using the real CESC Primary backend — these are only
   * reached when an admin explicitly picks "Local Node fallback" from
   * the server dropdown on /speedtest.
   *
   *   GET  /api/speedtest/empty      — empty 200; used for ping + upload-target
   *   POST /api/speedtest/empty      — drains the body, then empty 200
   *   GET  /api/speedtest/garbage    — streams N MB of random bytes for download
   *   GET  /api/speedtest/getip      — returns IP (or {processedString,rawIspInfo})
   *   POST /api/speedtest/telemetry  — accepts results, returns "id <token>"
   *
   * URL paths intentionally do NOT include `.php` — they're a clean Node
   * surface that never gets misinterpreted as static text.
   */
  const SPEEDTEST_NO_CACHE = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0',
    Pragma: 'no-cache',
  }

  if ((req.method === 'GET' || req.method === 'POST') && url === '/api/speedtest/empty') {
    if (req.method === 'POST') {
      // Drain the upload body so the client's measured upload speed is real.
      req.resume()
      req.on('end', () => {
        res.writeHead(200, { ...CORS, ...SPEEDTEST_NO_CACHE, 'Content-Length': '0' })
        res.end()
      })
      req.on('error', () => {
        try { res.writeHead(400, { ...CORS, ...SPEEDTEST_NO_CACHE }); res.end() } catch { /* ignore */ }
      })
    } else {
      res.writeHead(200, { ...CORS, ...SPEEDTEST_NO_CACHE, 'Content-Length': '0' })
      res.end()
    }
    return
  }

  if (req.method === 'GET' && url === '/api/speedtest/garbage') {
    // Stream `ckSize` × 1 MB of random data. Default 100 MB, capped at 1024 MB.
    const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    const requested = Number.parseInt(reqUrl.searchParams.get('ckSize') || '100', 10)
    const ckSize = Math.min(1024, Math.max(1, Number.isFinite(requested) ? requested : 100))
    const CHUNK_BYTES = 1_048_576 // 1 MB

    // Pre-generate one chunk of pseudo-random data and reuse it. LibreSpeed
    // only cares about throughput, not entropy; reusing a buffer avoids the
    // 100 MB-of-Math.random() CPU spike on each request.
    const chunk = Buffer.allocUnsafe(CHUNK_BYTES)
    for (let i = 0; i < CHUNK_BYTES; i++) chunk[i] = (Math.random() * 256) & 0xff

    res.writeHead(200, {
      ...CORS,
      ...SPEEDTEST_NO_CACHE,
      'Content-Type': 'application/octet-stream',
      'Content-Description': 'File Transfer',
      'Content-Disposition': `attachment; filename=random.dat`,
      'Content-Transfer-Encoding': 'binary',
    })

    let sent = 0
    let aborted = false
    req.on('close', () => { aborted = true })

    function sendNext() {
      if (aborted || res.writableEnded) return
      if (sent >= ckSize) { try { res.end() } catch { /* ignore */ } return }
      sent++
      const ok = res.write(chunk)
      if (ok) setImmediate(sendNext)
      else res.once('drain', sendNext)
    }
    sendNext()
    return
  }

  if (req.method === 'GET' && url === '/api/speedtest/getip') {
    const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    const wantIsp = reqUrl.searchParams.has('isp')
    const wantDistance = reqUrl.searchParams.get('distance')
    // Best-effort client-IP: prefer X-Forwarded-For (nginx sets this), fall
    // back to the socket. Strip IPv6 prefix from IPv4-mapped addresses.
    const fwd = (req.headers['x-forwarded-for'] || '').toString().split(',')[0]?.trim()
    let ip = fwd || (req.socket?.remoteAddress || 'unknown')
    if (typeof ip === 'string' && ip.startsWith('::ffff:')) ip = ip.slice('::ffff:'.length)

    if (wantIsp) {
      // LibreSpeed expects { processedString, rawIspInfo } when isp=true.
      const ispLabel = 'Local Node fallback'
      let processed = `${ip} - ${ispLabel}`
      if (wantDistance === 'mi' || wantDistance === 'km') {
        // We don't actually know the distance — emit a 0 placeholder so the
        // page renders the field consistently with the PHP backend.
        const unit = wantDistance
        processed += ` (<${unit === 'mi' ? '15 mi' : '20 km'})`
      }
      res.writeHead(200, { ...CORS, ...SPEEDTEST_NO_CACHE, 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ processedString: processed, rawIspInfo: '' }))
    } else {
      res.writeHead(200, { ...CORS, ...SPEEDTEST_NO_CACHE, 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(ip)
    }
    return
  }

  if (req.method === 'POST' && url === '/api/speedtest/telemetry') {
    // Drain the body, then return a faux telemetry id. Doesn't actually
    // store anything — the result lives in the browser's localStorage
    // history. Server-side telemetry storage requires a database; this
    // stub is purely so the engine doesn't think telemetry failed.
    let total = 0
    req.on('data', (chunk) => { total += chunk.length; if (total > 200_000) req.destroy() })
    req.on('end', () => {
      const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
      res.writeHead(200, { ...CORS, ...SPEEDTEST_NO_CACHE, 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(`id ${id}`)
    })
    req.on('error', () => {
      try { res.writeHead(400, { ...CORS, ...SPEEDTEST_NO_CACHE }); res.end() } catch { /* ignore */ }
    })
    return
  }

  /* ── Cert Request API (CES/CEP scaffolding) ──
   *
   * Backend stub for the wizard's API submission path. Routes always
   * answer /api/cert-request/status; the rest return 503 until
   * CERT_REQUEST_* env vars are set. See proxy/cert-request.mjs for
   * the integration notes when CES/CEP are installed on the CA.
   */
  if (url && url.startsWith('/api/cert-request')) {
    const handled = await handleCertRequest(req, res, url)
    if (handled) return
  }

  if (req.method === 'GET' && url === '/api/live-announcements') {
    try {
      const data = getLiveAnnouncementPayload(liveAnnouncementEnv())
      res.writeHead(200, { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify(data))
    } catch (err) {
      console.error('[site-stats] Live announcements failed:', err)
      res.writeHead(500, CORS).end()
    }
    return
  }

  res.writeHead(404, CORS).end()
})

/** Raise one critical /admin alert per state file that failed to load. Runs
 *  after every loader, so a quarantined feedback store is already fresh. */
function reportStateFileProblems() {
  if (stateFileProblems.length === 0) return
  const nowIso = new Date().toISOString()
  for (const { path, reason, movedTo } of stateFileProblems) {
    feedbackStorage.unshift({
      id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'critical',
      category: 'alert',
      title: 'State file failed to load',
      message: movedTo
        ? `${path} could not be read (${reason}). It was moved to ${movedTo} and the store restarted from defaults. Restore it by hand if the data matters.`
        : `${path} could not be read (${reason}) and could not be moved aside. Saves to it are refused until it is fixed and the proxy restarted.`,
      timestamp: new Date().toLocaleString(),
      source: 'site-stats startup',
      systemEventKey: `state-file:${path}`,
      firstSeenAt: nowIso,
      lastSeenAt: nowIso,
      count: 1,
    })
  }
  feedbackStorage = feedbackStorage.slice(0, FEEDBACK_MAX_ENTRIES)
  commitFeedbackToDisk()
}
reportStateFileProblems()

/**
 * Bind the port and begin the node-probe sweeps. Importing this module loads
 * state and builds the server but starts nothing, so tests can import it
 * (with SITE_STATS_STATE_DIR pointing at a scratch directory) and call
 * start({ port: 0, probes: false }) against an ephemeral port.
 */
export function start({ port = PORT, host = HOST, probes = true } = {}) {
  if (probes) startNodeProbes()
  server.listen(port, host, () => {
    const addr = server.address()
    const shown = typeof addr === 'object' && addr ? addr.port : port
    console.log(`[site-stats] API Online at http://${host}:${shown}`)
  })
  return server
}
export { server }

if (!process.env.SITE_STATS_NO_AUTOSTART) start()
