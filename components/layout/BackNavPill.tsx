import { StaticLink } from '@/components/common/StaticLink'

/**
 * Standalone back-nav pill — matches the breadcrumb pill PageHeader renders
 * for `backHref` pages, exposed for pages that don't render a full PageHeader
 * but still want a consistent back-link affordance
 * (e.g. /support/knowledge-base/* and its category pages).
 *
 * Lives in its own file so consumers can import it without dragging the
 * full PageHeader module into their import graph.
 */

export type BackNavColor =
  | 'cyan'
  | 'indigo'
  | 'orange'
  | 'green'
  | 'amber'
  | 'violet'
  | 'sky'
  | 'red'

/** Full Tailwind class strings — must be complete so the JIT scanner picks them up */
const backColorMap: Record<BackNavColor, string> = {
  cyan:   'bg-cyan-400/10   text-cyan-400/80   border-cyan-400/25   hover:bg-cyan-400/20   hover:text-cyan-400   hover:border-cyan-400/60',
  indigo: 'bg-indigo-400/10 text-indigo-400/80 border-indigo-400/25 hover:bg-indigo-400/20 hover:text-indigo-400 hover:border-indigo-400/60',
  orange: 'bg-orange-400/10 text-orange-400/80 border-orange-400/25 hover:bg-orange-400/20 hover:text-orange-400 hover:border-orange-400/60',
  green:  'bg-green-400/10  text-green-400/80  border-green-400/25  hover:bg-green-400/20  hover:text-green-400  hover:border-green-400/60',
  amber:  'bg-amber-400/10  text-amber-400/80  border-amber-400/25  hover:bg-amber-400/20  hover:text-amber-400  hover:border-amber-400/60',
  violet: 'bg-violet-400/10 text-violet-400/80 border-violet-400/25 hover:bg-violet-400/20 hover:text-violet-400 hover:border-violet-400/60',
  sky:    'bg-sky-400/10    text-sky-400/80    border-sky-400/25    hover:bg-sky-400/20    hover:text-sky-400    hover:border-sky-400/60',
  red:    'bg-red-400/10    text-red-400/80    border-red-400/25    hover:bg-red-400/20    hover:text-red-400    hover:border-red-400/60',
}

export interface BackNavPillProps {
  href: string
  label: string
  color?: BackNavColor
  className?: string
}

export function BackNavPill({
  href,
  label,
  color = 'cyan',
  className = '',
}: BackNavPillProps) {
  return (
    <StaticLink
      href={href}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 ${backColorMap[color]} ${className}`}
    >
      ← {label}
    </StaticLink>
  )
}
