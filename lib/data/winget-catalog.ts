/**
 * Live WinGet store catalog — hybrid data source for the Microsoft Store Apps
 * page.
 *
 * The authoritative list (what's actually published), versions, and download
 * routes come live from the online WinGet repo via /winget/api/catalog. Curated
 * metadata (description, logo, tags) from microsoftAppxCards is merged in by
 * name where available so the cards keep their polished look; otherwise the
 * catalog's own fields are used. Downloads use the friendly /winget/get/<id>
 * route (the online repo streams the installer), so the UI never exposes the
 * full /winget/packages/<folder>/<file> path.
 */
import { URLS } from '@/lib/data/constants'
import { LOGOS, APP_ICONS } from '@/lib/data/logos'
import { microsoftAppxCards } from '@/lib/data/microsoft'
import { STORE_APP_META, type StoreCategory } from '@/lib/data/store-app-meta'
import type { GlowColor } from '@/lib/types/cards'
import type { WingetCatalog, WingetCatalogPackage } from '@/lib/types/winget'

export const WINGET_SOURCE_NAME = 'AirGapRepo'
const WINGET_GET_BASE = '/winget/get'

export interface WingetAppCard {
  id: string
  title: string
  description: string
  glowColor: GlowColor
  tags: string[]
  logo: string
  packageIdentifier: string
  version: string
  architecture: string
  /** Clean, friendly download route: /winget/get/<PackageIdentifier>. */
  downloadUrl: string
  /** Store publisher name, e.g. "Microsoft Corporation". */
  publisher: string
  /** App-pack category bucket, mirroring apps.microsoft.com/apppack. */
  storeCategory: StoreCategory
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[®™]/g, '').replace(/[^a-z0-9]+/g, '')
}

// Curated metadata indexed by normalized title, plus a few explicit aliases for
// catalog names that differ from the curated names.
const curatedByNorm = new Map(microsoftAppxCards.map((c) => [norm(c.title), c]))
const ALIAS: Record<string, string> = {
  microsofttodoliststasksreminders: 'microsofttodo',
  microsoftstickynotes: 'stickynotes',
  microsoftclipchamp: 'clipchamp',
}

function curatedFor(name: string) {
  for (const v of [name, name.replace(/^microsoft\s+/i, '')]) {
    const hit = curatedByNorm.get(norm(v))
    if (hit) return hit
  }
  const alias = ALIAS[norm(name)]
  return alias ? curatedByNorm.get(alias) : undefined
}

const GLOWS: GlowColor[] = ['cyan', 'indigo', 'orange']

export function mapCatalogToCards(pkgs: WingetCatalogPackage[]): WingetAppCard[] {
  return pkgs
    .map((p, i): WingetAppCard => {
      const name = (p.PackageName || p.PackageIdentifier || '').trim()
      const installer = (p.Installers && p.Installers[0]) || {}
      const curated = curatedFor(name)
      const id = p.PackageIdentifier || ''
      const storeMeta = id ? STORE_APP_META[id] : undefined
      return {
        id: id || norm(name) || `pkg-${i}`,
        title: name,
        description: curated?.description || p.ShortDescription || `${name} — offline Store package.`,
        glowColor: (curated?.glowColor as GlowColor) || GLOWS[i % GLOWS.length],
        tags: curated?.tags || ['Store'],
        logo: storeMeta?.icon || curated?.logo || APP_ICONS[name] || LOGOS.msStore,
        packageIdentifier: id,
        version: p.PackageVersion || '',
        architecture: installer.Architecture || '',
        downloadUrl: id ? `${WINGET_GET_BASE}/${encodeURIComponent(id)}` : '',
        publisher: storeMeta?.publisher || p.Publisher || 'Microsoft',
        storeCategory: storeMeta?.category || 'Tools & Utilities',
      }
    })
    .filter((c) => c.title)
    .sort((a, b) => a.title.localeCompare(b.title))
}

export interface WingetCatalogResult {
  cards: WingetAppCard[]
  /** ISO date the catalog was last synced/regenerated upstream, or null if the
   *  online repo doesn't expose one yet (neither a JSON field nor a
   *  Last-Modified header). The store page shows the freshness line only when
   *  this is present. */
  lastUpdated: string | null
}

/** Pull a real "last synced" date from the catalog response, preferring an
 *  explicit JSON field, then the HTTP Last-Modified header. Returns an ISO
 *  string or null. Kept permissive so it lights up automatically if/when the
 *  upstream WinGet repo starts emitting one. */
function pickCatalogDate(data: WingetCatalog, headerLastModified: string | null): string | null {
  const candidates = [
    data.GeneratedAt,
    data.UpdatedAt,
    data.LastUpdated,
    data.LastModified,
    data.SourceLastUpdated,
    headerLastModified,
  ]
  for (const c of candidates) {
    if (!c) continue
    const t = Date.parse(c)
    if (!Number.isNaN(t)) return new Date(t).toISOString()
  }
  return null
}

export async function fetchWingetCatalog(): Promise<WingetCatalogResult> {
  const res = await fetch(URLS.wingetCatalog, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Catalog request failed (HTTP ${res.status})`)
  const data = (await res.json()) as WingetCatalog
  return {
    cards: mapCatalogToCards(Array.isArray(data.Data) ? data.Data : []),
    lastUpdated: pickCatalogDate(data, res.headers.get('last-modified')),
  }
}

/**
 * The package list shown before the live catalog answers, and instead of it if
 * the WinGet repo is unreachable.
 *
 * Built from STORE_APP_META, so it is keyed by PackageIdentifier — the SAME id
 * the live catalog uses. That matters twice over:
 *
 *   1. Admin overrides join to a card BY ID. Keying the fallback on curated
 *      slugs (the old behaviour) meant a sysadmin's edit to a store card only
 *      ever applied while the catalog was DOWN, which is exactly backwards.
 *   2. It renders synchronously, so the static export contains all 46 app names
 *      as real text. build-search-index.mjs reads the exported HTML, so before
 *      this the page indexed 345 characters and zero app names — none of the
 *      catalog was findable from site search or the AI assistant.
 *
 * Curated descriptions from microsoftAppxCards are merged in by name where one
 * exists; everything else falls back to the package name.
 */
export function curatedFallbackCards(): WingetAppCard[] {
  return Object.entries(STORE_APP_META)
    .map(([packageIdentifier, meta], i): WingetAppCard => {
      const curated = curatedFor(meta.name)
      return {
        id: packageIdentifier,
        title: meta.name,
        description: curated?.description || `${meta.name} — offline Store package.`,
        glowColor: (curated?.glowColor as GlowColor) || GLOWS[i % GLOWS.length],
        tags: curated?.tags || ['Store'],
        logo: meta.icon,
        packageIdentifier,
        version: '',
        architecture: '',
        // No download offered until the live catalog confirms the package is
        // actually published and gives us its real route.
        downloadUrl: '',
        publisher: meta.publisher,
        storeCategory: meta.category,
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title))
}

// Generic tags that aren't useful as a category filter.
const GENERIC_TAGS = new Set(['store', 'winget', 'live', 'apps', 'offline'])

/** Distinct, sorted category names derived from card tags (minus generic ones). */
export function deriveCategories(cards: WingetAppCard[]): string[] {
  const set = new Set<string>()
  for (const c of cards) {
    for (const t of c.tags) {
      if (!GENERIC_TAGS.has(t.toLowerCase())) set.add(t)
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
}

/** PowerShell to register this server as a winget REST source on a workstation. */
export function sourceSetupScript(): string {
  return (
    [
      '# Run in an elevated PowerShell (Windows PowerShell or PowerShell 7).',
      "$ErrorActionPreference = 'Stop'",
      `$SourceName = '${WINGET_SOURCE_NAME}'`,
      `$SourceUrl  = '${URLS.wingetSource}'`,
      'winget source remove --name $SourceName 2>$null   # ignore if not added yet',
      'winget source add --name $SourceName --arg $SourceUrl --type Microsoft.Rest --accept-source-agreements',
      'winget source list --name $SourceName',
      'winget search --source $SourceName --query Microsoft',
    ].join('\r\n') + '\r\n'
  )
}

/** One-line winget install command for a package via this source. */
export function installCommand(pkg: WingetAppCard): string {
  return `winget install --source ${WINGET_SOURCE_NAME} --id ${pkg.packageIdentifier} --exact --accept-source-agreements --accept-package-agreements`
}

/** PowerShell that installs every selected app in one run (the "app pack"). */
export function packInstallScript(pkgs: WingetAppCard[]): string {
  return (
    [
      `# APEN app pack — installs ${pkgs.length} Microsoft Store app(s) from the`,
      `# ${WINGET_SOURCE_NAME} winget source. Register the source first (see the`,
      '# "Winget Source" button on the Store page), then run this in PowerShell.',
      "$ErrorActionPreference = 'Continue'",
      ...pkgs.map((p) => installCommand(p)),
    ].join('\r\n') + '\r\n'
  )
}
