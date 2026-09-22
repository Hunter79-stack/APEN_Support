/**
 * Admin content overrides — runtime layer.
 *
 * Static page/card data lives in `lib/data/*.ts` and is built into the export.
 * Admins update images, URLs, descriptions, etc. without editing source files
 * by writing JSON overrides to the site-stats proxy. This module:
 *
 *   1. Defines the override scope/value shape.
 *   2. Exposes a `useCardOverrides` hook for any card array on any page.
 *   3. Provides `adminContentClient` for the AdminDashboard editor & wizard.
 *
 * Cards keep their static defaults if the proxy is down or no override exists,
 * so the site never breaks because someone took the proxy offline.
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { LOGOS } from '@/lib/data/logos'
import { APENSUPPORT_ABSOLUTE } from '@/lib/data/constants'
import { API_ENDPOINTS, ADMIN_TOKEN_STORAGE_KEY, ADMIN_CSRF_STORAGE_KEY, RUNTIME_INTERVALS } from '@/lib/data/runtime'
import { normalizeAcknowledgedAlertIds, normalizeDismissals, type AdminDismissalRecord } from '@/lib/data/admin'
import { deepMerge } from '@/lib/data/deep-patch'
import publishedContentJson from '@/lib/data/published-content.json'
import type { NginxManagedEntry, NginxReloadStatus } from '@/lib/data/nginx-stats'

/* ─── Public types ───────────────────────────────────────── */

export interface ContentOverrideRecord {
  /** Whatever shape the consumer scope expects — we only persist arbitrary JSON. */
  value: unknown
  updatedAt: string
  updatedBy: string
}

export type OverrideMap = Record<string, ContentOverrideRecord>

export interface CustomPageCard {
  id: string
  title: string
  description: string
  glowColor: 'cyan' | 'indigo' | 'orange' | 'green' | 'amber' | 'violet' | 'sky' | 'red'
  tags: string[]
  logo?: string
  downloads?: { label: string; href: string; desc?: string; isDoc?: boolean }[]
  body?: string
}

export interface CustomPage {
  slug: string
  title: string
  subtitle?: string
  badge?: string
  backHref?: string
  backColor?: 'cyan' | 'indigo' | 'orange' | 'green' | 'amber' | 'violet' | 'sky' | 'red'
  logo?: string
  category?: string
  gridCols?: string
  cards: CustomPageCard[]
  createdAt: string
  updatedAt: string
  updatedBy: string
  published?: boolean
}

export interface AuditEntry {
  id: string
  at: string
  kind: 'override.set' | 'override.revert' | 'page.create' | 'page.update' | 'page.delete' | 'content.publish' | 'logo.upload' | 'file.upload' | 'library.save' | 'library.remove'
  scope?: string
  slug?: string
  /** AD username (LDAP session, or derived from the workstation's ACL entry). */
  by?: string
  /** Workstation hostname resolved from the nginx admin ACL by client IP. */
  workstation?: string
  /** Client IP the change came from (admin allowlist address). */
  ip?: string
}

/**
 * Published content baked into the build.
 *
 * `lib/data/published-content.json` is a committed, git-tracked snapshot of the
 * overrides an admin has *published*. It is imported statically so its values
 * are baked into the static export at build time — meaning the prerendered HTML
 * (and no-JS / SEO views) already reflect published edits, not just the runtime
 * overlay. The Publish button in /admin writes this file (via the proxy) and
 * triggers a rebuild. Unpublished saves still appear instantly via the live
 * `/api/content-overrides` overlay layered on top at runtime.
 */
export const publishedContent = publishedContentJson as OverrideMap

const NO_LOCKED_FIELDS: readonly never[] = []

/* ─── Download library (ISO / EXE / installer uploads) ─── */

/** One upload target: a directory under the download webroot + its public URL. */
export interface LibraryDir {
  key: string
  /** Product family used to group the picker's options. */
  family: string
  label: string
  hint: string
  /** Public path prefix a finished file is reachable at (e.g. "/isos"). */
  urlPath: string
  /** Lowercase extensions accepted here — the server enforces this too. */
  extensions: string[]
  path: string
  /** Path relative to the download webroot, e.g. "vmware/9". */
  dir: string
  exists: boolean
  /** False when the proxy user can't write the directory (uploads are blocked). */
  writable: boolean
  freeBytes: number | null
  /** True for admin-added locations — only those can be edited or removed. */
  custom: boolean
}

/** An admin-defined upload location, as submitted from the Admin UI. */
export interface LibraryDirInput {
  key: string
  label: string
  family: string
  hint?: string
  /** Folder under the download webroot, e.g. "cisco" or "vmware/9". */
  dir: string
  /** Extensions to accept, with or without the leading dot. */
  extensions: string[] | string
  /** Create the folder when it doesn't exist yet. */
  createDir?: boolean
}

/** One file in a target directory. `partial` marks an unfinished upload. */
export interface LibraryFile {
  name: string
  bytes: number
  mtime: string
  url: string
  partial: boolean
}

export interface UploadProgress {
  /** Bytes confirmed stored plus bytes sent in the current request. */
  sent: number
  total: number
  /** Bytes the server has confirmed on disk (the resume point). */
  stored: number
}

/** Whether the proxy can write the published snapshot at all — see publish(). */
export interface PublishTarget {
  path: string
  writable: boolean
  error: string | null
}

/** Build status reported by the proxy while a Publish-triggered rebuild runs. */
export interface BuildStatus {
  state: 'idle' | 'running' | 'success' | 'error'
  startedAt?: string
  finishedAt?: string
  exitCode?: number | null
  by?: string
  message?: string
}

/* ─── Hook: layer overrides on top of an array of cards by id ─── */
/**
 * Generic merge helper. Accepts a static array (typed as `T extends { id: string }`)
 * and a scope key like `"vmware/v9/products"`. The override value is expected to be
 * a partial map of `{ [cardId]: Partial<T> }`. Anything missing falls through to
 * the static defaults — meaning admins only persist fields they actually changed.
 */
/**
 * Pure merge: layer one scope's override record onto a static card array.
 * Shared by the build-time baseline and the runtime overlay so both behave
 * identically. Returns the defaults untouched when the record is empty.
 */
export function applyScopeOverride<T extends { id: string }>(
  defaults: T[],
  record: ContentOverrideRecord | undefined,
  lockedFields: readonly (keyof T)[] = [],
): T[] {
  if (!record || !record.value || typeof record.value !== 'object') return defaults
  const patchMap = record.value as Record<string, Partial<T>>

  // Patch existing cards by id. A patch is keyed by the card's ORIGINAL (source)
  // id — that key is the stable join, even when the patch itself renames the
  // card's id (e.g. an admin edits `id` from ubuntu25-desktop → ubuntu26-desktop).
  const merged: T[] = defaults.map((card) => {
    const patch = patchMap[card.id]
    if (!patch) return card

    const allowedPatch = { ...patch }
    for (const field of lockedFields) delete allowedPatch[field]
    // Deep merge, not spread: patches are SPARSE. An admin who edited
    // installer.href saved {installer: {href}} — a shallow spread would replace
    // the whole installer object and silently drop its label and description,
    // and a downloads/links row edit would delete every other row on the card.
    return deepMerge(card as Record<string, unknown>, allowedPatch as Record<string, unknown>) as T
  })
  // Append ONLY genuinely admin-added cards — patches whose key is not one of
  // the source ids. We must test against the source ids (defaultIds), NOT the
  // merged ids: a patch that renames an existing card's id would otherwise look
  // "missing" from the merged list (its merged id no longer equals its source
  // key) and get appended a second time, duplicating the card on the live page.
  const defaultIds = new Set(defaults.map((card) => card.id))
  for (const [id, patch] of Object.entries(patchMap)) {
    if (defaultIds.has(id) || !patch || typeof patch !== 'object') continue
    // ORPHAN GUARD. A patch key stops matching a source id for two very
    // different reasons, and only one of them means "the admin added a card":
    //
    //   1. Admin added it    -> createCardForUpload() refuses an empty title and
    //                           always writes {title, description, logo, …}, so
    //                           the patch is a COMPLETE, standalone card.
    //   2. Source id changed -> a page redesign, a data-file rename, or a card
    //                           that was split/removed leaves the old patch
    //                           behind as a SPARSE FRAGMENT — e.g. just
    //                           {downloads: [{href}]}. Appending that renders a
    //                           phantom: a blank, title-less, unclickable card
    //                           that no admin can find in the editor to delete,
    //                           and that breaks the page layout for everyone.
    //
    // Requiring a real title keeps every intentional addition and drops only
    // the orphans. The patch is NOT deleted from the override map — Revert
    // still works — and tests/card-overrides.test.ts fails the build so the
    // mismatch is fixed at the source instead of rotting silently.
    const title = (patch as { title?: unknown }).title
    if (typeof title !== 'string' || !title.trim()) continue
    merged.push({ id, ...(patch as object) } as T)
  }
  // Filter out cards explicitly marked as removed: { __deleted: true }
  return merged.filter((card) => !(card as unknown as { __deleted?: boolean }).__deleted)
}

/**
 * Shared, deduplicated loader for the live override map. Every page renders many
 * card components, each calling useCardOverrides — without this they would each
 * fire their own GET /api/content-overrides, hammering the endpoint (and
 * tripping nginx's rate limit → 429). Instead all callers share ONE in-flight
 * request per page load and reuse the cached result across client navigations.
 */
let _liveOverridesCache: OverrideMap | null = null
let _liveOverridesPromise: Promise<OverrideMap | null> | null = null
let _liveOverridesPollTimer: number | null = null
const _liveOverrideListeners = new Set<(overrides: OverrideMap | null) => void>()

function replaceLiveOverrides(overrides: OverrideMap | null) {
  _liveOverridesCache = overrides
  for (const listener of _liveOverrideListeners) listener(overrides)
}

function subscribeToLiveOverrides(listener: (overrides: OverrideMap | null) => void) {
  _liveOverrideListeners.add(listener)
  if (!_liveOverridesPollTimer && typeof window !== 'undefined') {
    _liveOverridesPollTimer = window.setInterval(
      () => { void loadLiveOverrides(true) },
      RUNTIME_INTERVALS.contentOverridesRefreshMs,
    )
  }
  return () => {
    _liveOverrideListeners.delete(listener)
    if (_liveOverrideListeners.size === 0 && _liveOverridesPollTimer) {
      window.clearInterval(_liveOverridesPollTimer)
      _liveOverridesPollTimer = null
    }
  }
}

/** Shared public revalidation used by route images and ordinary card scopes. */
export function loadLiveOverrides(force = false): Promise<OverrideMap | null> {
  if (!force && _liveOverridesCache !== null) return Promise.resolve(_liveOverridesCache)
  if (_liveOverridesPromise) return _liveOverridesPromise

  _liveOverridesPromise = fetch(API_ENDPOINTS.contentOverrides, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (!data || !data.overrides || typeof data.overrides !== 'object') return _liveOverridesCache
      const overrides = data.overrides as OverrideMap
      replaceLiveOverrides(overrides)
      return overrides
    })
    .catch(() => _liveOverridesCache) // proxy offline / rate-limited -> keep the last good layer
    .finally(() => { _liveOverridesPromise = null })

  return _liveOverridesPromise
}

/**
 * Reactive live map. `null` means no successful runtime request yet, so callers
 * should use the published build snapshot. An empty object is authoritative:
 * all saved overrides were reverted and source defaults should render now.
 */
export function useLiveContentOverrides(): OverrideMap | null {
  const [live, setLive] = useState<OverrideMap | null>(_liveOverridesCache)
  useEffect(() => {
    const unsubscribe = subscribeToLiveOverrides(setLive)
    void loadLiveOverrides().then((overrides) => {
      if (overrides !== null) setLive(overrides)
    })
    return unsubscribe
  }, [])
  return live
}

export function useCardOverrides<T extends { id: string }>(
  scope: string,
  defaults: T[],
  lockedFields: readonly (keyof T)[] = NO_LOCKED_FIELDS,
): T[] {
  // Baseline = published content, applied synchronously. This runs during the
  // static export too, so the prerendered HTML already reflects published edits
  // (durable, no-JS friendly) rather than the raw source defaults.
  const baseline = useMemo(
    () => applyScopeOverride(defaults, publishedContent[scope], lockedFields),
    [scope, defaults, lockedFields],
  )

  // Live draft overlay: the proxy's current content-overrides.json, including
  // saves not yet published. Fetched once per page (shared across all hook
  // instances), null until it lands and if the proxy is unreachable, so we fall
  // back to the baked baseline — the site never breaks if the proxy is down.
  const live = useLiveContentOverrides()

  return live !== null ? applyScopeOverride(defaults, live[scope], lockedFields) : baseline
}

/* ─── Admin client — token-gated mutations ───────────────── */

/**
 * Admin tokens are stored in sessionStorage rather than localStorage so the
 * credential expires when the tab is closed. localStorage would persist on
 * disk indefinitely and remain readable to any code on the same origin —
 * including injected scripts from a compromised vendor or a stale CDN
 * artifact. sessionStorage is per-tab and per-session, which matches the
 * "log in every time I open Admin" model we actually want.
 *
 * On the very first read we ALSO migrate any token that lives in
 * localStorage (left over from earlier builds) into sessionStorage and
 * remove the localStorage copy, so admins don't get logged out unexpectedly
 * after upgrading.
 */

function readAdminToken(): string {
  if (typeof window === 'undefined') return ''
  // One-time migration: hoist a legacy localStorage token into
  // sessionStorage and clear it. Safe to run on every read because the
  // localStorage entry is removed after the first hit.
  try {
    const legacy = window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)
    if (legacy && !window.sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)) {
      window.sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, legacy)
    }
    if (legacy) window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY)
  } catch { /* sessionStorage may be unavailable in private windows; ignore */ }
  return window.sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || ''
}

function readCsrfToken(): string {
  if (typeof window === 'undefined') return ''
  try { return window.sessionStorage.getItem(ADMIN_CSRF_STORAGE_KEY) || '' } catch { return '' }
}

function storeCsrfToken(token: string) {
  if (typeof window === 'undefined') return
  try { window.sessionStorage.setItem(ADMIN_CSRF_STORAGE_KEY, token) } catch { /* ignore */ }
}

function clearCsrfToken() {
  if (typeof window === 'undefined') return
  try { window.sessionStorage.removeItem(ADMIN_CSRF_STORAGE_KEY) } catch { /* ignore */ }
}

/** Build auth headers for an admin request. Both the new CSRF header and the
 *  legacy admin token are sent; the backend prefers the session cookie path
 *  and falls back to the token. On a read (GET) we omit the CSRF header — the
 *  backend only validates CSRF on writes. */
/**
 * Build the auth headers every admin request needs. `write: true` is REQUIRED
 * on POST/PUT/PATCH/DELETE: authorizeAdmin() in proxy/site-stats.mjs checks the
 * session cookie FIRST and, finding an admin session, demands a matching
 * x-csrf-token — returning 401 without ever falling through to the
 * nginx-injected x-admin-token. So a write that omits the CSRF header fails
 * even though its token is valid. Exported so panels outside this module use
 * the same header set instead of hand-rolling one.
 */
export function adminAuthHeaders(opts: { write?: boolean } = {}): Record<string, string> {
  const headers: Record<string, string> = {}
  if (opts.write) {
    const csrf = readCsrfToken()
    if (csrf) headers['x-csrf-token'] = csrf
  }
  const token = readAdminToken()
  if (token) headers['x-admin-token'] = token
  return headers
}

export interface AdminWhoami {
  username: string
  /** true only for an admin-kind session — every logged-in visitor now gets
   *  SOME session, so this must not be inferred from "a session exists". */
  admin: boolean
  /** AD domain the account authenticated against. A forest can hold the same
   *  username in a parent and a child domain (blcse.mil vs mbl.blcse.mil), so
   *  the username alone doesn't identify a person. Empty for sessions issued
   *  before the proxy started recording it. */
  domain?: string
  realm?: string
  expiresAt: number
}

export interface AuthRealm {
  id: string
  label: string
  /** The realm's own domain — the one whose accounts bind through the realm's
   *  configured template. */
  defaultDomain?: string
  /** Exact spellings the server will accept, e.g.
   *  ["BLCSE.MIL\\<UserAccount>", "BLCSE\\<UserAccount>", …]. Rendered in the
   *  login hint so the UI never hardcodes a domain name. */
  acceptedForms?: string[]
}

/**
 * A sign-in the proxy refused BEFORE contacting a domain controller.
 *
 * severity 'spoof' means the name asserted an identity it had no business
 * asserting — two domain claims in one string ("blcse\user@blcse.mil"), a
 * domain this site does not serve, or LDAP filter metacharacters in the
 * account name. 'format' is an honest mistake (no domain given, UPN form,
 * unusable characters). Wrong passwords are NOT here: those reach the DC and
 * belong to the Windows security log.
 */
export interface AuthEvent {
  id: string
  /** ISO-8601 UTC. */
  at: string
  severity: 'spoof' | 'format'
  reason: string
  detail: string
  /** What was typed in the USERNAME box, control characters stripped. */
  typed: string
  realm: string
  ip: string
  userAgent: string
}

export interface ChatTranscriptMessage {
  role: 'user' | 'assistant'
  text: string
  ts: number
  attachmentName?: string
}

export interface ChatTranscript {
  id: string
  realm: string
  username: string
  startedAt: string
  updatedAt: string
  messages: ChatTranscriptMessage[]
}

export const adminContentClient = {
  // ─── Auth ──────────────────────────────────────────────
  setToken(token: string) {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token.trim())
      try { window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY) } catch { /* ignore */ }
    }
  },
  clearToken() {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY)
      try { window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY) } catch { /* ignore */ }
    }
  },
  getToken: readAdminToken,

  /** Probe whether the current browser has a valid session cookie (general
   *  OR admin). The cookie itself is HttpOnly so we cannot read it from JS —
   *  the server tells us via this endpoint whether it considers us
   *  authenticated, and separately whether that session is admin-kind. */
  async whoami(): Promise<AdminWhoami | null> {
    try {
      const res = await fetch(API_ENDPOINTS.adminAuthWhoami, {
        cache: 'no-store',
        credentials: 'include',
      })
      // The endpoint always responds 200 to keep "not logged in" off the
      // browser console; the JSON body carries the real state:
      //   - authenticated: ANY valid session exists (general or admin)
      //   - admin: specifically an admin-kind session
      if (!res.ok) return null
      const data = await res.json()
      if (!data?.authenticated) return null
      if (typeof data?.csrfToken === 'string') storeCsrfToken(data.csrfToken)
      return {
        username: String(data.username || ''),
        admin: Boolean(data.admin),
        domain: typeof data.domain === 'string' && data.domain ? data.domain : undefined,
        realm: typeof data.realm === 'string' ? data.realm : undefined,
        expiresAt: Number(data.expiresAt || 0),
      }
    } catch { return null }
  },

  /** Realm list for the login form's dropdown — public, no session
   *  required, no secrets in the response. */
  async fetchRealms(): Promise<AuthRealm[]> {
    try {
      const res = await fetch(API_ENDPOINTS.adminAuthRealms, { cache: 'no-store', credentials: 'include' })
      if (!res.ok) return []
      const data = await res.json()
      if (!Array.isArray(data)) return []
      // acceptedForms drives the login hint. A server that predates it simply
      // sends none, and the form falls back to a generic instruction.
      return data.map((r: AuthRealm) => ({
        ...r,
        acceptedForms: Array.isArray(r?.acceptedForms) ? r.acceptedForms : undefined,
      }))
    } catch { return [] }
  },

  /** Multi-realm LDAP-bound login. On success the proxy sets a HttpOnly
   *  session cookie and returns a CSRF token we keep in sessionStorage for
   *  write requests. A successful bind alone grants site-wide ('general')
   *  access; additionally being a member of that realm's admin group grants
   *  'admin' (reflected in the returned `admin` flag). */
  async login(realm: string, username: string, password: string): Promise<
    | { ok: true; whoami: AdminWhoami }
    | { ok: false; error: string; notConfigured?: boolean }
  > {
    try {
      const res = await fetch(API_ENDPOINTS.adminAuthLogin, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ realm, username, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 503) {
        // 503 covers two different server states: LDAP genuinely not set up,
        // and LDAP set up but unreachable (dead DC, untrusted LDAPS cert). Only
        // the first should swap the form for the "not configured" notice — for
        // the second the user needs the server's actual explanation, not a
        // hardcoded one that sends them looking in the wrong place.
        const message = typeof data.error === 'string' && data.error
          ? data.error
          : 'Login is not configured on the server.'
        return { ok: false, error: message, notConfigured: /not configured/i.test(message) }
      }
      if (!res.ok) {
        return { ok: false, error: data.error || `HTTP ${res.status}` }
      }
      if (typeof data.csrfToken === 'string') storeCsrfToken(data.csrfToken)
      return {
        ok: true,
        whoami: {
          // The server echoes the resolved account name and the domain it
          // actually authenticated against — which may not be the domain the
          // user typed (a bare username resolves to the realm's default).
          username: String(data.username || username),
          admin: Boolean(data.admin),
          domain: typeof data.domain === 'string' && data.domain ? data.domain : undefined,
          realm: typeof data.realm === 'string' ? data.realm : realm,
          expiresAt: Number(data.expiresAt || 0),
        },
      }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
    }
  },

  /** Sign-ins the proxy refused before contacting a domain controller —
   *  spoofed domain claims and malformed names. Admin-gated; returns null
   *  when the caller isn't an admin or the proxy is unreachable. */
  async fetchAuthEvents(): Promise<{ events: AuthEvent[]; spoofCount: number; max: number } | null> {
    try {
      const res = await fetch(API_ENDPOINTS.adminAuthEvents, {
        cache: 'no-store',
        credentials: 'include',
        headers: adminAuthHeaders(),
      })
      if (!res.ok) return null
      const data = await res.json()
      const events = Array.isArray(data?.events) ? (data.events as AuthEvent[]) : []
      return {
        events,
        spoofCount: Number(data?.spoofCount || 0),
        max: Number(data?.max || 0),
      }
    } catch {
      return null
    }
  },

  /** End the current session. Always clears the CSRF token locally even if
   *  the network call fails — better to log the user out optimistically. */
  async logout(): Promise<void> {
    try {
      await fetch(API_ENDPOINTS.adminAuthLogout, { method: 'POST', credentials: 'include' })
    } catch { /* ignore */ }
    clearCsrfToken()
  },

  // ─── Admin content & pages ─────────────────────────────
  async fetchAll(): Promise<{
    overrides: OverrideMap
    /** Last published snapshot (what the current build was baked from). */
    published?: OverrideMap
    /** Status of any in-flight Publish rebuild. */
    buildStatus?: BuildStatus
    /** Whether the proxy can actually write the published snapshot file. */
    publishTarget?: PublishTarget
    customPages: CustomPage[]
    auditLog: AuditEntry[]
    adminTokenRequired: boolean
  } | null> {
    try {
      const res = await fetch(API_ENDPOINTS.adminContentOverrides, {
        cache: 'no-store',
        credentials: 'include',
        headers: adminAuthHeaders(),
      })
      if (!res.ok) return null
      const data = await res.json()
      if (data?.overrides && typeof data.overrides === 'object') {
        replaceLiveOverrides(data.overrides as OverrideMap)
      }
      return data
    } catch {
      return null
    }
  },

  async saveOverride(scope: string, value: unknown, updatedBy: string): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const res = await fetch(API_ENDPOINTS.adminContentOverrides, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders({ write: true }) },
        body: JSON.stringify({ scope, value, updatedBy }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Save failed' }))
        return { ok: false, error: data.error || `HTTP ${res.status}` }
      }
      const data = await res.json().catch(() => ({}))
      const record = data?.override as ContentOverrideRecord | undefined
      replaceLiveOverrides({
        ...(_liveOverridesCache ?? {}),
        [scope]: record ?? { value, updatedAt: new Date().toISOString(), updatedBy },
      })
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
    }
  },

  async revertOverride(scope: string, updatedBy: string): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const res = await fetch(API_ENDPOINTS.adminContentOverrides, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders({ write: true }) },
        body: JSON.stringify({ scope, updatedBy }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Revert failed' }))
        return { ok: false, error: data.error || `HTTP ${res.status}` }
      }
      const next = { ...(_liveOverridesCache ?? {}) }
      delete next[scope]
      replaceLiveOverrides(next)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
    }
  },

  async uploadLogo(file: File): Promise<
    | { ok: true; src: string; filename: string; contentType: string; bytes: number }
    | { ok: false; error: string }
  > {
    try {
      const res = await fetch(API_ENDPOINTS.adminLogoUpload, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'x-file-name': encodeURIComponent(file.name),
          ...adminAuthHeaders({ write: true }),
        },
        body: file,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, error: data.error || `HTTP ${res.status}` }
      return {
        ok: true,
        src: String(data.src || ''),
        filename: String(data.filename || file.name),
        contentType: String(data.contentType || file.type || ''),
        bytes: Number(data.bytes || file.size),
      }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
    }
  },

  // ─── Download library (ISO / EXE / installer uploads) ──
  /** List the upload targets, plus the files inside one of them. */
  async listFileLibrary(dirKey?: string): Promise<{ dirs: LibraryDir[]; dir: LibraryDir | null; files: LibraryFile[] } | null> {
    try {
      const url = dirKey
        ? `${API_ENDPOINTS.adminFileLibrary}?dir=${encodeURIComponent(dirKey)}`
        : API_ENDPOINTS.adminFileLibrary
      const res = await fetch(url, { cache: 'no-store', credentials: 'include', headers: adminAuthHeaders() })
      if (!res.ok) return null
      const data = await res.json()
      return {
        dirs: Array.isArray(data.dirs) ? (data.dirs as LibraryDir[]) : [],
        dir: (data.dir as LibraryDir) ?? null,
        files: Array.isArray(data.files) ? (data.files as LibraryFile[]) : [],
      }
    } catch {
      return null
    }
  },

  /** Add or update an admin-defined upload location. */
  async saveLibraryDir(input: LibraryDirInput): Promise<{ ok: true; dirs: LibraryDir[] } | { ok: false; error: string }> {
    try {
      const res = await fetch(API_ENDPOINTS.adminFileLibrary, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders({ write: true }) },
        body: JSON.stringify(input),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, error: data.error || `HTTP ${res.status}` }
      return { ok: true, dirs: Array.isArray(data.dirs) ? (data.dirs as LibraryDir[]) : [] }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
    }
  },

  /** Remove an admin-defined location. Files on disk are left alone. */
  async deleteLibraryDir(key: string): Promise<{ ok: true; dirs: LibraryDir[] } | { ok: false; error: string }> {
    try {
      const res = await fetch(API_ENDPOINTS.adminFileLibrary, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders({ write: true }) },
        body: JSON.stringify({ key }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, error: data.error || `HTTP ${res.status}` }
      return { ok: true, dirs: Array.isArray(data.dirs) ? (data.dirs as LibraryDir[]) : [] }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
    }
  },

  /** Rename a finished file inside one upload location. */
  async renameLibraryFile(
    dirKey: string,
    from: string,
    to: string,
  ): Promise<{ ok: true; name: string; url: string; updatedOverrides: number; staleBuiltPages: number } | { ok: false; error: string }> {
    try {
      const res = await fetch(API_ENDPOINTS.adminFileRename, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders({ write: true }) },
        body: JSON.stringify({ dir: dirKey, from, to }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, error: data.error || `HTTP ${res.status}` }
      return {
        ok: true,
        name: String(data.name || to),
        url: String(data.url || ''),
        updatedOverrides: Number(data.updatedOverrides) || 0,
        staleBuiltPages: Number(data.staleBuiltPages) || 0,
      }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
    }
  },

  /**
   * Remove a finished file from an upload location.
   *
   * Refused by default while anything still links it — the counts come back so
   * the caller can name what is in the way instead of just failing. Pass
   * `force` only after the admin has been shown those counts and said yes.
   */
  async deleteLibraryFile(
    dirKey: string,
    name: string,
    force = false,
  ): Promise<
    | { ok: true; name: string; url: string; size: number; references: number }
    | { ok: false; error: string; blocked: boolean; referencedByOverrides: number; referencedByBuiltPages: number }
  > {
    try {
      const res = await fetch(API_ENDPOINTS.adminFileDelete, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders({ write: true }) },
        body: JSON.stringify({ dir: dirKey, name, force }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return {
          ok: false,
          error: data.error || `HTTP ${res.status}`,
          // 409 is the reference guard specifically — anything else is a real
          // failure and must NOT offer a "delete anyway" button.
          blocked: res.status === 409,
          referencedByOverrides: Number(data.referencedByOverrides) || 0,
          referencedByBuiltPages: Number(data.referencedByBuiltPages) || 0,
        }
      }
      return {
        ok: true,
        name: String(data.name || name),
        url: String(data.url || ''),
        size: Number(data.size) || 0,
        references: Number(data.references) || 0,
      }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Network error',
        blocked: false,
        referencedByOverrides: 0,
        referencedByBuiltPages: 0,
      }
    }
  },

  /** Bytes the server already holds for an in-progress upload of `name`. */
  async getUploadOffset(dirKey: string, name: string): Promise<{ offset: number; exists: boolean } | null> {
    try {
      const query = `?dir=${encodeURIComponent(dirKey)}&name=${encodeURIComponent(name)}`
      const res = await fetch(`${API_ENDPOINTS.adminFileUpload}${query}`, {
        cache: 'no-store',
        credentials: 'include',
        headers: adminAuthHeaders(),
      })
      if (!res.ok) return null
      const data = await res.json()
      return { offset: Number(data.offset) || 0, exists: Boolean(data.exists) }
    } catch {
      return null
    }
  },

  /** Throw away a partial upload so the next attempt starts from zero. */
  async discardUpload(dirKey: string, name: string): Promise<void> {
    try {
      const query = `?dir=${encodeURIComponent(dirKey)}&name=${encodeURIComponent(name)}`
      await fetch(`${API_ENDPOINTS.adminFileUpload}${query}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: adminAuthHeaders({ write: true }),
      })
    } catch { /* best effort — a stale partial is harmless, just wasted space */ }
  },

  /**
   * Upload a product file (ISO, EXE, MSI…), resuming automatically.
   *
   * The whole remaining tail is sent in ONE request — no chunk bookkeeping — and
   * a failure simply re-reads the server's stored offset and posts
   * `file.slice(offset)` again. That keeps a dropped VPN from costing a 15 GB
   * re-send while the client stays a plain XHR (fetch has no upload progress).
   *
   * `resume: false` discards any partial first, which is what you want when the
   * admin is replacing a file that changed since the interrupted attempt.
   */
  async uploadLibraryFile(
    dirKey: string,
    file: File,
    opts: { onProgress?: (progress: UploadProgress) => void; signal?: AbortSignal; resume?: boolean; name?: string } = {},
  ): Promise<{ ok: true; name: string; url: string } | { ok: false; error: string; canceled?: boolean }> {
    const total = file.size
    if (total <= 0) return { ok: false, error: 'That file is empty.' }
    // Store under this name — admins fix vendor filenames before upload rather
    // than after the bytes land.
    const targetName = opts.name?.trim() || file.name

    if (opts.resume === false) await adminContentClient.discardUpload(dirKey, targetName)
    const head = await adminContentClient.getUploadOffset(dirKey, targetName)
    let stored = head && head.offset > 0 && head.offset < total ? head.offset : 0
    let attempts = 0

    while (stored < total) {
      if (opts.signal?.aborted) return { ok: false, error: 'Upload canceled.', canceled: true }
      opts.onProgress?.({ sent: stored, total, stored })

      const attempt = await new Promise<{
        status: number
        body: Record<string, unknown>
        error?: string
        canceled?: boolean
      }>((settle) => {
        const query = `?dir=${encodeURIComponent(dirKey)}&name=${encodeURIComponent(targetName)}`
          + `&offset=${stored}&total=${total}`
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${API_ENDPOINTS.adminFileUpload}${query}`, true)
        xhr.withCredentials = true
        xhr.setRequestHeader('Content-Type', 'application/octet-stream')
        for (const [header, value] of Object.entries(adminAuthHeaders({ write: true }))) {
          xhr.setRequestHeader(header, value)
        }
        const onAbort = () => xhr.abort()
        opts.signal?.addEventListener('abort', onAbort, { once: true })
        const finish = (result: { status: number; body: Record<string, unknown>; error?: string; canceled?: boolean }) => {
          opts.signal?.removeEventListener('abort', onAbort)
          settle(result)
        }
        const base = stored
        xhr.upload.onprogress = (event) => {
          opts.onProgress?.({ sent: base + event.loaded, total, stored: base })
        }
        xhr.onload = () => {
          let body: Record<string, unknown> = {}
          try { body = JSON.parse(xhr.responseText || '{}') } catch { /* non-JSON error page */ }
          finish({ status: xhr.status, body })
        }
        xhr.onerror = () => finish({ status: 0, body: {}, error: 'Network error during upload.' })
        xhr.ontimeout = () => finish({ status: 0, body: {}, error: 'Upload timed out.' })
        xhr.onabort = () => finish({ status: 0, body: {}, error: 'Upload canceled.', canceled: true })
        xhr.send(file.slice(stored))
      })

      if (attempt.canceled) return { ok: false, error: 'Upload canceled.', canceled: true }

      if (attempt.status === 201) {
        opts.onProgress?.({ sent: total, total, stored: total })
        return { ok: true, name: String(attempt.body.name || targetName), url: String(attempt.body.url || '') }
      }
      if (attempt.status === 200) {
        // Partial write accepted — continue from what the server confirmed.
        stored = Number(attempt.body.offset) || stored
        attempts = 0
        continue
      }
      // 409 means our idea of the offset was stale; the server sent the truth.
      if (attempt.status === 409 && typeof attempt.body.offset === 'number') {
        stored = attempt.body.offset as number
        attempts += 1
        if (attempts >= 4) return { ok: false, error: String(attempt.body.error || 'Upload offset kept drifting.') }
        continue
      }
      // 4xx/5xx that isn't a resync: the server explained why — don't retry a
      // rejected filename, a full disk, or an unwritable directory in a loop.
      if (attempt.status >= 400) {
        return { ok: false, error: String(attempt.body.error || `Upload failed (HTTP ${attempt.status}).`) }
      }

      // Transport-level failure: re-read the offset and retry from there.
      attempts += 1
      if (attempts >= 3) return { ok: false, error: attempt.error || 'Upload failed after three attempts.' }
      await new Promise((wait) => setTimeout(wait, 1500 * attempts))
      const resync = await adminContentClient.getUploadOffset(dirKey, file.name)
      if (resync) stored = Math.min(resync.offset, total)
    }

    // Loop exits only when the server has every byte but never sent us the 201
    // (e.g. the finishing response was lost). Ask once more before giving up.
    const settled = await adminContentClient.getUploadOffset(dirKey, file.name)
    if (settled?.exists) return { ok: true, name: file.name, url: '' }
    return { ok: false, error: 'Upload finished but the server never confirmed the file.' }
  },

  async saveCustomPage(page: Partial<CustomPage> & { slug: string; title: string; cards: CustomPageCard[] }): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
    try {
      const res = await fetch(API_ENDPOINTS.adminCustomPages, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders({ write: true }) },
        body: JSON.stringify(page),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, error: data.error || `HTTP ${res.status}` }
      return { ok: true, url: data.url || `/${page.category || 'general'}/${page.slug}` }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
    }
  },

  async deleteCustomPage(slug: string, updatedBy: string): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const res = await fetch(API_ENDPOINTS.adminCustomPages, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders({ write: true }) },
        body: JSON.stringify({ slug, updatedBy }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Delete failed' }))
        return { ok: false, error: data.error || `HTTP ${res.status}` }
      }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
    }
  },

  // ─── Publish ───────────────────────────────────────────
  /**
   * Promote the current draft overrides into the committed, build-baked
   * `published-content.json` and kick off `npm run build`. Returns the initial
   * build status (state: 'running'); poll getBuildStatus() to follow it.
   */
  async publish(updatedBy: string): Promise<{ ok: true; status: BuildStatus } | { ok: false; error: string }> {
    try {
      const res = await fetch(API_ENDPOINTS.adminPublish, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders({ write: true }) },
        body: JSON.stringify({ updatedBy }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, error: data.error || `HTTP ${res.status}` }
      return { ok: true, status: data.status as BuildStatus }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
    }
  },

  /** Poll the current/last Publish rebuild status. */
  async getBuildStatus(): Promise<BuildStatus | null> {
    try {
      const res = await fetch(API_ENDPOINTS.adminPublish, {
        cache: 'no-store',
        credentials: 'include',
        headers: adminAuthHeaders(),
      })
      if (!res.ok) return null
      const data = await res.json().catch(() => null)
      return (data?.status as BuildStatus) ?? null
    } catch {
      return null
    }
  },

  // ─── Managed nginx zones/upstreams ─────────────────────
  /** Fetch the managed-nginx registry + last reload status. */
  async fetchNginxManaged(): Promise<{ entries: NginxManagedEntry[]; reloadStatus: NginxReloadStatus; reloadEnabled: boolean } | null> {
    try {
      const res = await fetch(API_ENDPOINTS.adminNginxManaged, { cache: 'no-store', credentials: 'include', headers: adminAuthHeaders() })
      if (!res.ok) return null
      const data = await res.json()
      return {
        entries: Array.isArray(data.entries) ? data.entries : [],
        reloadStatus: (data.reloadStatus as NginxReloadStatus) ?? { state: 'idle' },
        reloadEnabled: data.reloadEnabled !== false,
      }
    } catch {
      return null
    }
  },

  /** Save the managed-nginx registry (draft — does not touch nginx yet). */
  async saveNginxManaged(entries: NginxManagedEntry[], updatedBy: string): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const res = await fetch(API_ENDPOINTS.adminNginxManaged, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders({ write: true }) },
        body: JSON.stringify({ entries, updatedBy }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, error: data.error || `HTTP ${res.status}` }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
    }
  },

  /** Publish & Reload: write the nginx fragments and reload nginx. Returns the
   *  initial status; poll getNginxManagedStatus() while state is 'running'. */
  async publishNginxManaged(entries: NginxManagedEntry[], updatedBy: string): Promise<{ ok: true; status: NginxReloadStatus } | { ok: false; error: string }> {
    try {
      const res = await fetch(API_ENDPOINTS.adminNginxManagedPublish, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders({ write: true }) },
        body: JSON.stringify({ entries, updatedBy }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, error: data.error || `HTTP ${res.status}` }
      return { ok: true, status: data.status as NginxReloadStatus }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
    }
  },

  /** Poll the current/last managed-nginx reload status. */
  async getNginxManagedStatus(): Promise<NginxReloadStatus | null> {
    const r = await this.fetchNginxManaged()
    return r ? r.reloadStatus : null
  },

  // ─── Shared acknowledgements ───────────────────────────
  /** Fetch the shared acknowledged-alert id list. Every admin sees the same
   *  set, so an alert acknowledged on one workstation is acknowledged for all.
   *  Returns null if the proxy is unreachable (caller keeps its local mirror). */
  async fetchAcknowledgedAlerts(): Promise<string[] | null> {
    try {
      const res = await fetch(API_ENDPOINTS.acknowledgedAlerts, {
        cache: 'no-store',
        credentials: 'include',
        headers: adminAuthHeaders(),
      })
      if (!res.ok) return null
      return normalizeAcknowledgedAlertIds(await res.json())
    } catch {
      return null
    }
  },

  /** Acknowledge an alert for all admins; returns the updated shared list. */
  async acknowledgeAlert(alertId: string): Promise<string[] | null> {
    try {
      const res = await fetch(API_ENDPOINTS.acknowledgedAlerts, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders({ write: true }) },
        body: JSON.stringify({ alertId }),
      })
      if (!res.ok) return null
      return normalizeAcknowledgedAlertIds(await res.json())
    } catch {
      return null
    }
  },

  // ─── Shared "remove from view" dismissals ──────────────
  /** Fetch all dismissals (every admin sees the same list, each attributed to
   *  the admin who dismissed it). Returns null if the proxy is unreachable. */
  async fetchDismissals(): Promise<AdminDismissalRecord[] | null> {
    try {
      const res = await fetch(API_ENDPOINTS.dismissedAlerts, {
        cache: 'no-store',
        credentials: 'include',
        headers: adminAuthHeaders(),
      })
      if (!res.ok) return null
      return normalizeDismissals(await res.json())
    } catch {
      return null
    }
  },

  /** Remove an item from view for all admins. The server stamps it with the
   *  caller's username + timestamp and returns the updated list. */
  async dismissAlert(alertId: string): Promise<AdminDismissalRecord[] | null> {
    try {
      const res = await fetch(API_ENDPOINTS.dismissedAlerts, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders({ write: true }) },
        body: JSON.stringify({ alertId }),
      })
      if (!res.ok) return null
      return normalizeDismissals(await res.json())
    } catch {
      return null
    }
  },

  /** Restore a dismissed item back into the active views for all admins. */
  async restoreAlert(alertId: string): Promise<AdminDismissalRecord[] | null> {
    try {
      const res = await fetch(API_ENDPOINTS.dismissedAlerts, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders({ write: true }) },
        body: JSON.stringify({ alertId }),
      })
      if (!res.ok) return null
      return normalizeDismissals(await res.json())
    } catch {
      return null
    }
  },

  // ─── Chat transcripts (admin audit) ────────────────────
  /** Every user's chat transcript, across all realms. */
  async fetchChatTranscripts(): Promise<ChatTranscript[] | null> {
    try {
      const res = await fetch(API_ENDPOINTS.adminChatHistory, {
        cache: 'no-store',
        credentials: 'include',
        headers: adminAuthHeaders(),
      })
      if (!res.ok) return null
      const data = await res.json()
      return Array.isArray(data?.transcripts) ? data.transcripts : []
    } catch {
      return null
    }
  },

  async deleteChatTranscript(id: string): Promise<boolean> {
    try {
      const res = await fetch(API_ENDPOINTS.adminChatHistory, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders({ write: true }) },
        body: JSON.stringify({ id }),
      })
      return res.ok
    } catch {
      return false
    }
  },
}

/* ─── Page registry — used by the wizard's "where does this go?" step ─── */

export interface PageTemplateField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'url' | 'select' | 'tags'
  required?: boolean
  placeholder?: string
  help?: string
  options?: { value: string; label: string }[]
}

export interface PageTemplate {
  id: string
  label: string
  description: string
  defaultParent: string
  defaultBadge: string
  defaultBackColor: 'cyan' | 'indigo' | 'orange' | 'green' | 'amber' | 'violet' | 'sky' | 'red'
  cardFields: PageTemplateField[]
  /** Reasonable defaults for each card created from this template. */
  cardDefaults: Partial<CustomPageCard>
}

/** Templates the wizard offers. Each template constrains the card schema so admins
 *  can't accidentally produce something the rendering layer doesn't understand. */
export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'product-downloads',
    label: 'Product downloads (ISOs, installers, patches)',
    description: 'Use for software hosted on the APEN file share — VMware-style installer + extra files.',
    defaultParent: '/downloads/vmware',
    defaultBadge: 'Software',
    defaultBackColor: 'cyan',
    cardFields: [
      { key: 'title', label: 'Product name', type: 'text', required: true, placeholder: 'VMware vCenter Server 10' },
      { key: 'description', label: 'Short description', type: 'textarea', required: true, placeholder: 'vCenter Server Appliance 10.0 installer.' },
      { key: 'logo', label: 'Logo URL or path', type: 'url', placeholder: LOGOS.vmwareWordmark },
      { key: 'tags', label: 'Tags (comma-separated)', type: 'tags', placeholder: 'vCenter, v10, ISO' },
    ],
    cardDefaults: { glowColor: 'cyan', tags: [], downloads: [] },
  },
  {
    id: 'documentation',
    label: 'Documentation / how-to cards',
    description: 'Use for guides, runbooks, and reference docs that link to PDFs or external URLs.',
    defaultParent: '/docs',
    defaultBadge: 'Docs',
    defaultBackColor: 'indigo',
    cardFields: [
      { key: 'title', label: 'Document title', type: 'text', required: true },
      { key: 'description', label: 'Summary', type: 'textarea', required: true },
      { key: 'logo', label: 'Logo URL or path', type: 'url', placeholder: LOGOS.apenFooter },
      { key: 'tags', label: 'Tags', type: 'tags', placeholder: 'PDF, Guide' },
    ],
    cardDefaults: { glowColor: 'indigo', tags: [], downloads: [] },
  },
  {
    id: 'tools-links',
    label: 'Tool / external service links',
    description: 'Use for cards that just send users to another internal or external URL.',
    defaultParent: '/applications',
    defaultBadge: 'Tools',
    defaultBackColor: 'orange',
    cardFields: [
      { key: 'title', label: 'Tool name', type: 'text', required: true },
      { key: 'description', label: 'What does it do?', type: 'textarea', required: true },
      { key: 'logo', label: 'Logo URL or path', type: 'url' },
      { key: 'tags', label: 'Tags', type: 'tags' },
    ],
    cardDefaults: { glowColor: 'orange', tags: [], downloads: [] },
  },
]

/** Top-level sections the wizard places a custom page under. The published
 *  URL is /<category>/<slug> — nginx forwards unmatched two-segment paths to
 *  the /custom-pages/ renderer, which reads window.location.pathname to find
 *  the right page. Picking a section is mandatory in the wizard so admins
 *  who didn't author the page can find it later under the expected prefix.
 *
 *  - `parentHref` — the "back arrow" target on the published page. Set
 *    automatically when the admin picks a section in the wizard.
 *  - `reservedSubSlugs` — real Next.js sub-routes under this section that
 *    would otherwise be shadowed by a custom page with a colliding slug.
 *    Keep in sync with the corresponding `app/<category>/<sub>/page.tsx`
 *    files. The wizard and the proxy both reject these. */
export const CUSTOM_PAGE_PARENTS = [
  { value: 'general',  label: 'General / Misc',       parentHref: '/home',          reservedSubSlugs: [] as readonly string[] },
  { value: 'vmware',   label: 'VMware',               parentHref: '/downloads/vmware',        reservedSubSlugs: ['tools', 'v7', 'v8', 'v9'] as readonly string[] },
  { value: 'docs',     label: 'Documentation',        parentHref: '/docs',          reservedSubSlugs: ['el', 'facpro', 'ub'] as readonly string[] },
  { value: 'isos',     label: 'ISOs / Installers',    parentHref: '/downloads/iso',          reservedSubSlugs: ['enterprise-linux', 'ubuntu', 'windows'] as readonly string[] },
  { value: 'tools',    label: 'Tools',                parentHref: '/applications',  reservedSubSlugs: ['color-picker', 'speedtest'] as readonly string[] },
  { value: 'security', label: 'Security / STIG',      parentHref: '/security',      reservedSubSlugs: [] as readonly string[] },
  { value: 'support',  label: 'Support',              parentHref: '/support',       reservedSubSlugs: ['knowledge-base', 'password-reset', 'status', 'ticket'] as readonly string[] },
] as const

/** Lookup helper — returns the CUSTOM_PAGE_PARENTS entry for a category value,
 *  or undefined if the value isn't one of the known sections. */
export function getCustomPageParent(value: string) {
  return CUSTOM_PAGE_PARENTS.find((p) => p.value === value)
}

/* ─── Friendly dropdown options for the New Page Wizard ────
 *  The wizard targets non-technical admins, so it surfaces these curated
 *  option lists rather than asking people to type slugs, paths, or color
 *  class names by hand. Each dropdown also offers a "Custom…" escape hatch
 *  for the rare case where none of the presets fit.
 */

/** Where the "back arrow" pill on the page header takes the user. */
export const BACK_LINK_PRESETS: { label: string; value: string }[] = [
  { label: 'Home page', value: '/home' },
  { label: 'VMware Products', value: '/downloads/vmware' },
  { label: 'Trellix Security', value: '/trellix' },
  { label: 'ISO Downloads', value: '/downloads/iso' },
  { label: 'Microsoft Products', value: '/downloads/microsoft-products' },
  { label: 'Visual Studio', value: '/downloads/microsoft-products/VisualStudio' },
  { label: 'SQL Tools', value: '/downloads/microsoft-products/sqltools' },
  { label: 'PDQ Deploy & Inventory', value: '/PDQ' },
  { label: 'DREN Admin Tools', value: '/dren' },
  { label: 'Evaluate-STIG', value: '/security/evaluate-stig' },
  { label: 'Documentation', value: '/docs' },
  { label: 'Applications Tools', value: '/applications' },
  { label: 'Support', value: '/support' },
  { label: 'Custom Pages directory', value: '/custom-pages/' },
]

/** Common labels that appear in the small "header pill" above the page title. */
export const BADGE_PRESETS: string[] = [
  'Home',
  'Software',
  'Documentation',
  'Security',
  'VMware',
  'Microsoft',
  'Linux',
  'Tools',
  'Custom',
]

/** Curated logo set for the Page Logo / Card Logo pickers. Keeping this small
 *  and labelled keeps the dropdown manageable for non-technical admins.
 *  Admins who need a logo not in this list can paste a custom path. */
export const LOGO_PRESETS: { label: string; group: string; value: string }[] = [
  { label: 'APEN logo (round)',         group: 'Brand',        value: LOGOS.apenRound },
  { label: 'APEN logo (small)',         group: 'Brand',        value: LOGOS.apenSmall },
  { label: 'CESC logo',                 group: 'Brand',        value: LOGOS.cesc },

  { label: 'VMware (square)',           group: 'Virtualization', value: LOGOS.vmware },
  { label: 'VMware (wordmark)',         group: 'Virtualization', value: LOGOS.vmwareWordmark },
  { label: 'VMware ESXi',               group: 'Virtualization', value: LOGOS.vmwareEsxi },
  { label: 'VMware vCenter',            group: 'Virtualization', value: LOGOS.vmwareVcenter },
  { label: 'VMware vSphere',            group: 'Virtualization', value: LOGOS.vmwareVsphere },
  { label: 'VMware Tools',              group: 'Virtualization', value: LOGOS.vmwareTools },
  { label: 'VMware Tools (icon)',       group: 'Virtualization', value: LOGOS.vmwareToolsIcon },
  { label: 'VMware VMRC (icon)',        group: 'Virtualization', value: LOGOS.vmwareVmrcIcon },

  { label: 'Trellix (Linux support)',   group: 'Security',     value: LOGOS.trellixLinux },
  { label: 'Trellix (light)',           group: 'Security',     value: LOGOS.trellixLight },
  { label: 'Evaluate-STIG',             group: 'Security',     value: LOGOS.evaluateStig },

  { label: 'AlmaLinux',                 group: 'Linux / OS',   value: LOGOS.alma },
  { label: 'CentOS',                    group: 'Linux / OS',   value: LOGOS.centos },
  { label: 'Rocky Linux',               group: 'Linux / OS',   value: LOGOS.rocky },
  { label: 'Ubuntu',                    group: 'Linux / OS',   value: LOGOS.ubuntu },
  { label: 'Linux (Tux)',               group: 'Linux / OS',   value: LOGOS.linuxTux },
  { label: 'Windows',                   group: 'Linux / OS',   value: LOGOS.windows },

  { label: 'Microsoft Office',          group: 'Microsoft',    value: LOGOS.msOffice2019 },
  { label: 'Microsoft Store',           group: 'Microsoft',    value: LOGOS.msStore },
  { label: 'Microsoft (logo)',          group: 'Microsoft',    value: LOGOS.microsoftOfficial },
  { label: 'SQL Server (SSMS)',         group: 'Microsoft',    value: LOGOS.mssql },
  { label: 'Visual Studio',             group: 'Microsoft',    value: LOGOS.visualStudio },

  { label: 'Cisco',                     group: 'Network',      value: LOGOS.cisco },
  { label: 'DREN',                      group: 'Network',      value: LOGOS.dren },

  { label: 'PDQ',                       group: 'Tools',        value: LOGOS.pdq },
  { label: 'FacilitatePro',             group: 'Tools',        value: LOGOS.facpro },
  { label: 'Color Picker',              group: 'Tools',        value: LOGOS.colorPicker },

  { label: 'Documents (generic)',       group: 'Generic',      value: LOGOS.documents },
  { label: 'ISOs (generic)',            group: 'Generic',      value: LOGOS.isos },
  { label: 'Videos (generic)',          group: 'Generic',      value: LOGOS.videos },
  { label: 'Help Desk',                 group: 'Generic',      value: LOGOS.helpdesk },
]

/** Grid layouts the wizard offers. The dropdown values are real Tailwind
 *  classes — but admins see plain English. */
export const GRID_LAYOUT_PRESETS = [
  { label: '2 columns', value: 'sm:grid-cols-2 lg:grid-cols-2' },
  { label: '3 columns (recommended)', value: 'sm:grid-cols-2 lg:grid-cols-3' },
  { label: '4 columns', value: 'sm:grid-cols-2 lg:grid-cols-4' },
  { label: 'Stacked (single column)', value: 'grid-cols-1' },
] as const

/** Glow colour choices with descriptive labels and CSS swatches the picker
 *  shows next to each option. Keys match the GlowColor type expected by
 *  GlowCard / CustomPageCard.glowColor. */
export const GLOW_COLOR_PRESETS: { value: 'cyan' | 'indigo' | 'orange' | 'green' | 'amber' | 'violet' | 'sky' | 'red'; label: string; swatch: string }[] = [
  { value: 'cyan',   label: 'Cyan (default)',  swatch: '#22d3ee' },
  { value: 'indigo', label: 'Indigo',          swatch: '#818cf8' },
  { value: 'sky',    label: 'Sky blue',        swatch: '#38bdf8' },
  { value: 'green',  label: 'Green',           swatch: '#34d399' },
  { value: 'amber',  label: 'Amber',           swatch: '#fbbf24' },
  { value: 'orange', label: 'Orange (warm)',   swatch: '#fb923c' },
  { value: 'violet', label: 'Violet',          swatch: '#a78bfa' },
  { value: 'red',    label: 'Red',             swatch: '#f87171' },
]

/** Predefined tags available in the page wizard. Admins select from this list only. */
export const PREDEFINED_TAGS: string[] = [
  'vCenter',
  'ESXi',
  'vSphere',
  'ISO',
  'VMware',
  'v7',
  'v8',
  'v9',
  'v10',
  'PDF',
  'Guide',
  'Installer',
  'Patch',
  'Tool',
  'Security',
  'Linux',
  'Windows',
  'Microsoft',
  'SQL',
  'Documentation',
  'Video',
  'Setup',
  'Enterprise',
  'Eval',
  'STIG',
  'Trellix',
  'PDQ',
  'Evaluate',
  'Deployment',
  'Migration',
]

/** Download URL "starts with" presets for the per-card download composer. */
export const DOWNLOAD_BASE_PRESETS: { label: string; value: string }[] = [
  { label: 'APEN file share — VMware',         value: `${APENSUPPORT_ABSOLUTE}/vmware/` },
  { label: 'APEN file share — ISOs',           value: `${APENSUPPORT_ABSOLUTE}/isos/` },
  { label: 'APEN file share — Microsoft',      value: `${APENSUPPORT_ABSOLUTE}/mssoftware/` },
  { label: 'APEN file share — Visual Studio',  value: `${APENSUPPORT_ABSOLUTE}/VisualStudio/` },
  { label: 'APEN file share — Trellix',        value: `${APENSUPPORT_ABSOLUTE}/trellix/` },
  { label: 'APEN file share — PDQ',            value: `${APENSUPPORT_ABSOLUTE}/PDQ/` },
  { label: 'APEN file share — Evaluate-STIG',  value: `${APENSUPPORT_ABSOLUTE}/evaluate-stig/` },
  { label: 'APEN file share — Videos',         value: `${APENSUPPORT_ABSOLUTE}/videos/` },
  { label: 'APEN file share — root',           value: `${APENSUPPORT_ABSOLUTE}/` },
  { label: 'Documentation page (PDF)',         value: `${APENSUPPORT_ABSOLUTE}/docs/` },
]

/**
 * Split a download href into the longest preset base that prefixes it plus the
 * remainder. No match (base '') means the href is a full external URL.
 */
export function splitDownloadHref(href: string, presets: { value: string }[]): { base: string; filename: string } {
  const base = presets
    .map((p) => p.value)
    .filter((v) => href !== '' && href.startsWith(v))
    .sort((x, y) => y.length - x.length)[0] ?? ''
  return { base, filename: href.slice(base.length) }
}
