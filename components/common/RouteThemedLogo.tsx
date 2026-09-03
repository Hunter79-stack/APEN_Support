'use client'

import { usePathname } from 'next/navigation'
import { ThemedLogo, type ThemedLogoProps } from '@/components/common/ThemedLogo'
import { useRouteImage } from '@/lib/hooks/useRouteImage'

export interface RouteThemedLogoProps extends Omit<ThemedLogoProps, 'src'> {
  /** Explicit destination route; PageHeader may omit it to use the current URL. */
  route?: string
  fallbackSrc: string
}

export function RouteThemedLogo({ route, fallbackSrc, ...props }: RouteThemedLogoProps) {
  const pathname = usePathname()
  const src = useRouteImage(route ?? pathname, fallbackSrc) ?? fallbackSrc
  return <ThemedLogo {...props} src={src} />
}

