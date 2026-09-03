'use client'

import { useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { PAGE_LOGOS, type PageLogoRoute } from '@/lib/data/logos'
import {
  publishedContent,
  useLiveContentOverrides,
} from '@/lib/data/admin-content'
import {
  ROUTE_IMAGE_OVERRIDE_SCOPE,
  resolveRouteImage,
} from '@/lib/data/route-images'

/**
 * Resolve one registered route through the effective Admin registry.
 *
 * Before the public live request finishes, the published snapshot is used so
 * static HTML already contains durable Admin choices. Once live data arrives,
 * that complete map is authoritative—even a missing key means the Admin has
 * reverted that route to its logos.ts source default.
 */
export function useRouteImage(
  route: string | null | undefined,
  fallback?: string,
): string | undefined {
  const live = useLiveContentOverrides()
  const record = live !== null
    ? live[ROUTE_IMAGE_OVERRIDE_SCOPE]
    : publishedContent[ROUTE_IMAGE_OVERRIDE_SCOPE]
  const scopeValue = record?.value
  return useMemo(
    () => resolveRouteImage(route, scopeValue, fallback),
    [route, scopeValue, fallback],
  )
}

/** PageHeader convenience: use the route currently rendered by Next.js. */
export function useCurrentRouteImage(fallback?: string): string | undefined {
  return useRouteImage(usePathname(), fallback)
}

/** Navbar convenience: resolve the registry once, then index inside its loops. */
export function useResolvedPageImages(): Readonly<Record<PageLogoRoute, string>> {
  const live = useLiveContentOverrides()
  const record = live !== null
    ? live[ROUTE_IMAGE_OVERRIDE_SCOPE]
    : publishedContent[ROUTE_IMAGE_OVERRIDE_SCOPE]

  return useMemo(() => {
    const resolved = {} as Record<PageLogoRoute, string>
    for (const [route, fallback] of Object.entries(PAGE_LOGOS) as Array<[PageLogoRoute, string]>) {
      resolved[route] = resolveRouteImage(route, record?.value, fallback) ?? fallback
    }
    return resolved
  }, [record])
}
