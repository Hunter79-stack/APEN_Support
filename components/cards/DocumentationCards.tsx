'use client'

import { GlowCard } from '@/components/ui/spotlight-card'
import { DownloadRow, downloadExtension } from '@/components/cards/DownloadRow'
import { useCardOverrides } from '@/lib/data/admin-content'
import { StaticLink } from '@/components/common/StaticLink'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { FileText, ArrowUpCircle, BookOpen, Terminal, ExternalLink, ArrowRight } from 'lucide-react'
import type { DocCard, DocLink } from '@/lib/types/cards'

const KIND_ICON = {
  'release-notes': FileText,
  upgrade: ArrowUpCircle,
  guide: BookOpen,
  reference: Terminal,
  doc: FileText,
} as const

function DocLinkRow({ link }: { link: DocLink }) {
  const Icon = KIND_ICON[link.kind ?? 'doc'] ?? FileText
  const internal = link.href.startsWith('/')
  // A link to an actual FILE renders as the site-wide download row (the VMware 8
  // look); only links to other site pages keep the lightweight arrow style.
  if (downloadExtension(link.href)) {
    return <DownloadRow label={link.label} href={link.href} external={!internal} />
  }
  const className =
    'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-cyan-300 transition-colors hover:bg-white/5 hover:text-cyan-200'

  const body = (
    <>
      <Icon size={13} className="shrink-0 text-cyan-400/70" aria-hidden="true" />
      <span className="flex-1 truncate">{link.label}</span>
      {internal ? (
        <ArrowRight size={12} className="shrink-0 opacity-50" aria-hidden="true" />
      ) : (
        <ExternalLink size={11} className="shrink-0 opacity-50" aria-hidden="true" />
      )}
    </>
  )

  return internal ? (
    <StaticLink href={link.href} className={className}>{body}</StaticLink>
  ) : (
    <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>{body}</a>
  )
}

/**
 * Renders a grid of documentation cards (release notes, upgrade guides, user
 * guides, command references). Shared across product pages so every product
 * surfaces its docs/release notes in one consistent place.
 */
export function DocumentationCards({ cards, scope }: { cards: DocCard[]; scope: string }) {
  // Admin-editable like every other card grid. Before this, the four docs pages
  // rendered their source arrays directly — the only cards on the site an admin
  // could not touch from /admin#content.
  const merged = useCardOverrides<DocCard>(scope, cards)
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {merged.map((card, i) => (
        <GlowCard key={card.id} glowColor={getCardGlowColor(i)} className="p-5">
          <p className="text-sm font-semibold text-white">{card.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{card.description}</p>
          {card.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {card.tags.map((t) => (
                <span key={t} className="rounded-md border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">{t}</span>
              ))}
            </div>
          )}
          <div className="mt-3 space-y-0.5">
            {card.links.map((link) => (
              <DocLinkRow key={link.href} link={link} />
            ))}
          </div>
        </GlowCard>
      ))}
    </div>
  )
}
