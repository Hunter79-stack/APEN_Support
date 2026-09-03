import Image from 'next/image'
import { cn } from '@/lib/data/utils'
import { isWordmark } from '@/lib/data/logos'

type Size    = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
type Variant = 'auto' | 'square' | 'wide'

export interface ThemedLogoProps {
  src: string
  alt: string
  size?: Size
  /**
   * 'auto'   → detects wordmark logos and applies wide container automatically (default)
   * 'square' → always square — use for icon/badge logos
   * 'wide'   → always wide pill — use for horizontal wordmarks
   */
  variant?: Variant
  /** Show dark-glass background + border ring — default true */
  glass?: boolean
  /** Cyan glow on hover */
  glow?: boolean
  className?: string
  priority?: boolean
}

/* Square containers */
const squareMap: Record<Size, { px: number; cls: string }> = {
  xs:   { px: 24,  cls: 'w-6  h-6'   },
  sm:   { px: 32,  cls: 'w-8  h-8'   },
  md:   { px: 40,  cls: 'w-10 h-10'  },
  lg:   { px: 56,  cls: 'w-14 h-14'  },
  xl:   { px: 72,  cls: 'w-18 h-18'  },
  full: { px: 0,   cls: 'w-full h-full' },
}

/* Wide pill containers — fixed height, generous width for horizontal wordmarks */
const wideMap: Record<Size, { cls: string }> = {
  xs:   { cls: 'h-5  w-20'  },
  sm:   { cls: 'h-7  w-28'  },
  md:   { cls: 'h-8  w-36'  },
  lg:   { cls: 'h-10 w-44'  },
  xl:   { cls: 'h-12 w-56'  },
  full: { cls: 'w-full h-full' },
}

/**
 * ThemedLogo — unified logo renderer for the APEN Support site.
 *
 * • SVG → native <img> (crisp-edges, no rasterisation)
 * • PNG/JPG → Next.js <Image> (optimised)
 * • Wordmark logos (Trellix, VMware, Cisco) auto-get wide pill containers
 * • Icon logos (Ubuntu, Rocky, etc.) get square containers
 */
export function ThemedLogo({
  src,
  alt,
  size     = 'md',
  variant  = 'auto',
  glass    = true,
  glow     = false,
  className = '',
  priority  = false,
}: ThemedLogoProps) {
  const isSvg     = src.endsWith('.svg')
  const useWide   = variant === 'wide' || (variant === 'auto' && isWordmark(src))
  const { px, cls: sqCls } = squareMap[size]
  const { cls: wCls }      = wideMap[size]

  const sizeCls = size === 'full' ? 'w-full h-full' : useWide ? wCls : sqCls

  const wrapperCls = cn(
    'relative flex-shrink-0 flex items-center justify-center overflow-hidden',
    glass && 'rounded-xl border bg-[rgba(10,15,35,0.75)] backdrop-blur-sm border-white/10 p-1.5',
    !glass && 'rounded-lg',
    glow && 'hover:border-cyan-400/30 hover:shadow-cyan-glow-sm transition-all duration-300',
    sizeCls,
    className,
  )

  return (
    <div className={wrapperCls}>
      {isSvg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-contain"
          loading={priority ? 'eager' : 'lazy'}
          style={{ imageRendering: 'crisp-edges' }}
          width={px > 0 ? px : undefined}
          height={px > 0 ? px : undefined}
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          width={px > 0 ? px : 40}
          height={px > 0 ? px : 40}
          className="w-full h-full object-contain"
          priority={priority}
          sizes={`${px || 40}px`}
        />
      )}
    </div>
  )
}
