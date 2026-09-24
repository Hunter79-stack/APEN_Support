'use client'

import type { ImgHTMLAttributes } from 'react'
import { useRouteImage } from '@/lib/hooks/useRouteImage'

export interface RouteImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  route: string
  fallbackSrc: string
  alt: string
}

/** Native image renderer for bespoke route artwork outside ThemedLogo. */
export function RouteImage({ route, fallbackSrc, alt, ...props }: RouteImageProps) {
  const src = useRouteImage(route, fallbackSrc) ?? fallbackSrc
  return <img {...props} src={src} alt={alt} />
}
