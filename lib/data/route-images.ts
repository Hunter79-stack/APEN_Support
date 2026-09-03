/**
 * Runtime route-image choices.
 *
 * `PAGE_LOGOS` remains the code/default registry. Admins may layer one saved
 * choice per registered route on top of it through the `site/route-images`
 * content-override scope. Catalog choices store a semantic `LOGOS` key so a
 * later physical file move still happens in exactly one place: logos.ts.
 */

import {
  LOGOS,
  PAGE_LOGOS,
  type LogoKey,
  type PageLogoRoute,
} from '@/lib/data/logos'

export const ROUTE_IMAGE_OVERRIDE_SCOPE = 'site/route-images'

export type RouteImageReference =
  | { kind: 'catalog'; key: LogoKey }
  | { kind: 'asset'; id: string }

export interface RouteImageAsset {
  src: string
  label: string
  mime?: string
  uploadedAt?: string
}

export interface RouteImageRegistryValue {
  schemaVersion: 1
  routes: Partial<Record<PageLogoRoute, RouteImageReference>>
  /** Dynamic physical paths live here once; routes point to the asset id. */
  assets: Record<string, RouteImageAsset>
}

export const EMPTY_ROUTE_IMAGE_REGISTRY: RouteImageRegistryValue = {
  schemaVersion: 1,
  routes: {},
  assets: {},
}

const LOGO_ROOT_SEGMENT = 'logos'
const SUPPORTED_IMAGE_EXTENSION = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i

function hasOwn<T extends object>(value: T, key: PropertyKey): key is keyof T {
  return Object.prototype.hasOwnProperty.call(value, key)
}

/** Strip URL-only decoration while preserving route case (VisualStudio uses it). */
export function normalizeRegisteredRoute(value: string | null | undefined): PageLogoRoute | null {
  if (typeof value !== 'string') return null
  let route = value.trim().split(/[?#]/, 1)[0]
  if (route.length > 1) route = route.replace(/\/+$/, '')
  return hasOwn(PAGE_LOGOS, route) ? route as PageLogoRoute : null
}

/**
 * Dynamic paths stay same-origin and inside the public logo tree. Catalog
 * entries are preferred; this path form exists for Admin-uploaded files and
 * already-served assets that have not been added to the source catalog yet.
 */
export function isSafeCustomRouteImageSource(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const src = value.trim()
  const logoRoot = `/${LOGO_ROOT_SEGMENT}/`
  return src.startsWith(logoRoot)
    && !src.startsWith('//')
    && !src.includes('..')
    && !src.includes('\\')
    && !src.includes('%')
    && /^[A-Za-z0-9_./-]+$/.test(src)
    && SUPPORTED_IMAGE_EXTENSION.test(src)
}

export function isRouteImageReference(value: unknown): value is RouteImageReference {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const reference = value as { kind?: unknown; key?: unknown; id?: unknown }
  if (reference.kind === 'catalog') {
    return typeof reference.key === 'string'
      && hasOwn(LOGOS, reference.key)
      && SUPPORTED_IMAGE_EXTENSION.test(LOGOS[reference.key])
  }
  return reference.kind === 'asset'
    && typeof reference.id === 'string'
    && /^[a-z0-9][a-z0-9_-]{0,99}$/i.test(reference.id)
}

/** Read only valid routes/references/assets from arbitrary persisted JSON. */
export function normalizeRouteImageRegistry(value: unknown): RouteImageRegistryValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return EMPTY_ROUTE_IMAGE_REGISTRY
  const raw = value as { routes?: unknown; assets?: unknown }
  const assets: Record<string, RouteImageAsset> = {}
  if (raw.assets && typeof raw.assets === 'object' && !Array.isArray(raw.assets)) {
    for (const [id, candidate] of Object.entries(raw.assets)) {
      if (!/^[a-z0-9][a-z0-9_-]{0,99}$/i.test(id) || !candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue
      const asset = candidate as { src?: unknown; label?: unknown; mime?: unknown; uploadedAt?: unknown }
      if (!isSafeCustomRouteImageSource(asset.src)) continue
      assets[id] = {
        src: asset.src.trim(),
        label: typeof asset.label === 'string' && asset.label.trim() ? asset.label.trim().slice(0, 120) : id,
        ...(typeof asset.mime === 'string' ? { mime: asset.mime.slice(0, 80) } : {}),
        ...(typeof asset.uploadedAt === 'string' ? { uploadedAt: asset.uploadedAt.slice(0, 40) } : {}),
      }
    }
  }

  const routes: RouteImageRegistryValue['routes'] = {}
  if (!raw.routes || typeof raw.routes !== 'object' || Array.isArray(raw.routes)) {
    return { schemaVersion: 1, routes, assets }
  }
  for (const [rawRoute, rawReference] of Object.entries(raw.routes)) {
    const route = normalizeRegisteredRoute(rawRoute)
    if (!route || !isRouteImageReference(rawReference)) continue
    if (rawReference.kind === 'asset' && !assets[rawReference.id]) continue
    routes[route] = rawReference
  }
  return { schemaVersion: 1, routes, assets }
}

export function resolveRouteImageReference(
  reference: unknown,
  assets: Record<string, RouteImageAsset>,
): string | undefined {
  if (!isRouteImageReference(reference)) return undefined
  return reference.kind === 'catalog' ? LOGOS[reference.key] : assets[reference.id]?.src
}

/** Resolve one route from a scope value, falling back to its source default. */
export function resolveRouteImage(
  rawRoute: string | null | undefined,
  scopeValue: unknown,
  fallback?: string,
): string | undefined {
  const route = normalizeRegisteredRoute(rawRoute)
  if (!route) return fallback
  const registry = normalizeRouteImageRegistry(scopeValue)
  return resolveRouteImageReference(registry.routes[route], registry.assets) ?? PAGE_LOGOS[route] ?? fallback
}

/** Reverse lookup used by Admin to preselect a route's source catalog entry. */
export function findLogoKeyBySource(src: string | undefined): LogoKey | null {
  if (!src) return null
  const match = (Object.entries(LOGOS) as Array<[LogoKey, string]>).find(([, value]) => value === src)
  return match?.[0] ?? null
}

/** Lottie JSON is rendered only by specialized cards, not general route art. */
export const ROUTE_IMAGE_CATALOG = (Object.entries(LOGOS) as Array<[LogoKey, string]>)
  .filter(([, src]) => SUPPORTED_IMAGE_EXTENSION.test(src))
  .map(([key, src]) => ({ key, src }))
