'use client'

import Link from 'next/link'
import { forwardRef, type AnchorHTMLAttributes } from 'react'
import { isClientRoutableHref, normalizeStaticHref } from '@/lib/utils/static-link'

type StaticLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string
}

export const StaticLink = forwardRef<HTMLAnchorElement, StaticLinkProps>(
  ({ href, target, download, ...props }, ref) => {
    const normalizedHref = normalizeStaticHref(href)
    const hasDownload = download !== undefined && download !== null && download !== false
    const useClientRouter = isClientRoutableHref(normalizedHref) && !target && !hasDownload

    if (useClientRouter) {
      return <Link ref={ref} href={normalizedHref} {...props} />
    }

    return <a ref={ref} href={normalizedHref} target={target} download={download} {...props} />
  },
)

StaticLink.displayName = 'StaticLink'
