import { ReactNode } from 'react'
import { StaticLink } from '@/components/common/StaticLink'
import { RouteThemedLogo } from '@/components/common/RouteThemedLogo'

type BackColor = 'cyan' | 'indigo' | 'orange' | 'green' | 'amber' | 'violet' | 'sky' | 'red'

/** Full Tailwind class strings — must be complete so the JIT scanner picks them up */
const backColorMap: Record<BackColor, string> = {
  cyan:   'bg-cyan-400/10   text-cyan-400/80   border-cyan-400/25   hover:bg-cyan-400/20   hover:text-cyan-400   hover:border-cyan-400/60',
  indigo: 'bg-indigo-400/10 text-indigo-400/80 border-indigo-400/25 hover:bg-indigo-400/20 hover:text-indigo-400 hover:border-indigo-400/60',
  orange: 'bg-orange-400/10 text-orange-400/80 border-orange-400/25 hover:bg-orange-400/20 hover:text-orange-400 hover:border-orange-400/60',
  green:  'bg-green-400/10  text-green-400/80  border-green-400/25  hover:bg-green-400/20  hover:text-green-400  hover:border-green-400/60',
  amber:  'bg-amber-400/10  text-amber-400/80  border-amber-400/25  hover:bg-amber-400/20  hover:text-amber-400  hover:border-amber-400/60',
  violet: 'bg-violet-400/10 text-violet-400/80 border-violet-400/25 hover:bg-violet-400/20 hover:text-violet-400 hover:border-violet-400/60',
  sky:    'bg-sky-400/10    text-sky-400/80    border-sky-400/25    hover:bg-sky-400/20    hover:text-sky-400    hover:border-sky-400/60',
  red:    'bg-red-400/10    text-red-400/80    border-red-400/25    hover:bg-red-400/20    hover:text-red-400    hover:border-red-400/60',
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  badge?: string
  /** When provided, renders the badge as a clickable breadcrumb back-link */
  backHref?: string
  /** Color identity for the back-link pill. Defaults to 'cyan'. */
  backColor?: BackColor
  /** Optional logo path — renders via ThemedLogo */
  logo?: string
  /** Route whose Admin-managed image should be used; defaults to current URL. */
  logoRoute?: string
  children?: ReactNode
}

export function PageHeader({ title, subtitle, badge, backHref, backColor = 'cyan', logo, logoRoute, children }: PageHeaderProps) {
  return (
    <div className="relative px-6 py-6 overflow-hidden bg-transparent">
      {/*
        Chrome stripped: previously this strip used `glass-header` (blurred
        panel, cyan ambient glow, drop shadow). It now renders fully
        transparent so the page title sits directly on the StarfallBackground
        atmospherics — matching the HomeHero treatment on /home/. If you
        want the panel back, re-add `glass-header` and the two ambient-glow
        divs that used to live here (see git history).
      */}
      <div className="relative max-w-7xl mx-auto">
        {/*
          Back-nav / breadcrumb pill — rendered on its own row above the
          [logo, title] block so it sits at the same left edge as the
          page logo and the cards that follow. Previously this pill lived
          inside the title's flex-1 column, which indented it past the
          logo and broke alignment with the rest of the page content.
        */}
        {badge && (
          <div className="mb-4">
            {backHref ? (
              <StaticLink
                href={backHref}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 ${backColorMap[backColor]}`}
              >
                ← {badge}
              </StaticLink>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                               bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                {badge}
              </span>
            )}
          </div>
        )}

        {/* Main header row: logo + title/subtitle */}
        <div className="flex items-center gap-5">
          {/* Section logo via ThemedLogo */}
          {logo && <RouteThemedLogo route={logoRoute} fallbackSrc={logo} alt={title} size="lg" glass glow priority />}

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-white tracking-tight">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-slate-400 text-sm max-w-2xl leading-relaxed">{subtitle}</p>
            )}
            {children && <div className="mt-4">{children}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Standalone back-nav pill ───
   The implementation lives in components/BackNavPill.tsx; re-exported here
   so older imports `import { BackNavPill } from '@/components/layout/PageHeader'`
   continue to work alongside the canonical
   `import { BackNavPill } from '@/components/layout/BackNavPill'`.
*/
export { BackNavPill } from '@/components/layout/BackNavPill'
export type { BackNavColor, BackNavPillProps } from '@/components/layout/BackNavPill'

/* ─── Section divider ─── */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <h2 className="min-w-0 text-lg font-semibold text-white break-words">{children}</h2>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  )
}

/* ─── Callout boxes ─── */
export function Callout({
  type = 'info',
  children,
}: {
  type?: 'info' | 'warning' | 'important'
  children: ReactNode
}) {
  const styles = {
    info:      { cls: 'callout-info',      icon: 'ℹ' },
    warning:   { cls: 'callout-warning',   icon: '⚠' },
    important: { cls: 'callout-important', icon: '!' },
  }
  const { cls, icon } = styles[type]
  return (
    <div className={cls}>
      <span className="font-bold mt-0.5 flex-shrink-0">{icon}</span>
      <div>{children}</div>
    </div>
  )
}

/* ─── Numbered step ─── */
export function Step({ number, children }: { number: number; children: ReactNode }) {
  return (
    <div className="flex gap-3 mb-4">
      <span className="step-badge">{number}</span>
      <div className="flex-1 pt-0.5 text-sm text-slate-300 leading-relaxed">{children}</div>
    </div>
  )
}

/* ─── Download row ─── */
export function DownloadRow({ label, href, meta }: { label: string; href: string; meta?: string }) {
  return (
    <div
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-3 px-4 rounded-lg
                 border border-white/6 hover:border-cyan-400/20
                 transition-all duration-200 group"
      style={{
        background: 'rgba(6,12,28,0.45)',
        backdropFilter: 'blur(16px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
      }}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{label}</p>
        {meta && <p className="text-xs text-slate-600 mt-0.5">{meta}</p>}
      </div>
      <a
        href={href}
        className="btn-download w-full justify-center sm:w-auto"
        target="_blank"
        rel="noopener noreferrer"
      >
        Download
      </a>
    </div>
  )
}
