import { ThemedLogo } from '@/components/common/ThemedLogo'
import { RouteThemedLogo } from '@/components/common/RouteThemedLogo'
import { isWordmark } from '@/lib/data/logos'

interface SidebarBrandProps {
  logo: string
  title: string
  /** Registered route whose live Admin image should replace `logo`. */
  route?: string
  /** @deprecated no longer rendered */
  backLabel?: string
  /** @deprecated no longer rendered */
  backHref?: string
}

/**
 * SidebarBrand — top-of-sidebar identity block.
 *
 * For icon logos (Ubuntu circle, AlmaLinux flame, etc.):
 *   [icon]  SECTION TITLE
 *
 * For wordmark logos (Trellix, VMware, Cisco — text already in logo):
 *   [────── wordmark ──────]
 *   SECTION TITLE (smaller, underneath)
 */
export function SidebarBrand({
  logo,
  title,
  route,
}: SidebarBrandProps) {
  const wide = isWordmark(logo)
  const brandLogo = route ? (
    <RouteThemedLogo
      route={route}
      fallbackSrc={logo}
      alt={title}
      size="sm"
      variant={wide ? 'wide' : 'square'}
      glass
      glow
    />
  ) : (
    <ThemedLogo
      src={logo}
      alt={title}
      size="sm"
      variant={wide ? 'wide' : 'square'}
      glass
      glow
    />
  )

  return (
    <div className="px-3 mb-5">
      {wide ? (
        /* Wordmark layout: full-width pill, title below */
        <div className="flex flex-col gap-2">
          {brandLogo}
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 pl-0.5">
            {title}
          </p>
        </div>
      ) : (
        /* Icon layout: icon + title side by side */
        <div className="flex items-center gap-3">
          {brandLogo}
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 leading-snug">
            {title}
          </h2>
        </div>
      )}
    </div>
  )
}

/**
 * ContentLogo — logo chip shown in the content-area page header beside the title.
 *
 * Wordmarks get a wide pill; icon logos get a square container.
 */
export function ContentLogo({ logo, alt, route }: { logo: string; alt: string; route?: string }) {
  const wide = isWordmark(logo)
  return route ? (
    <RouteThemedLogo
      route={route}
      fallbackSrc={logo}
      alt={alt}
      size="md"
      variant={wide ? 'wide' : 'square'}
      glass
      glow
    />
  ) : (
    <ThemedLogo
      src={logo}
      alt={alt}
      size="md"
      variant={wide ? 'wide' : 'square'}
      glass
      glow
    />
  )
}
