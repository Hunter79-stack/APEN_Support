'use client'

import { useState } from 'react'
import { Download, FileText, ExternalLink, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { GlowCard } from '@/components/ui/spotlight-card'
import { ThemedLogo } from '@/components/common/ThemedLogo'
import { getCardGlowColor, type GlowColorName } from '@/lib/data/card-colors'
import type { CustomPage, CustomPageCard } from '@/lib/data/admin-content'

function pickDownloadIcon(download: { href: string; isDoc?: boolean }) {
  if (download.isDoc) return FileText
  if (/^https?:\/\//i.test(download.href) && !download.href.includes('apensupport')) return ExternalLink
  return Download
}

function fileTypeFromHref(href: string): string {
  const match = href.match(/\.([a-z0-9]{1,6})(?:[?#].*)?$/i)
  if (!match) return 'Open'
  const extension = match[1].toLowerCase()
  if (extension === 'pdf') return 'PDF'
  return `.${extension}`
}

export function CustomPageView({ page }: { page: CustomPage }) {
  return (
    <>
      <PageHeader
        title={page.title}
        subtitle={page.subtitle}
        badge={page.badge || 'Custom'}
        backHref={page.backHref || '/home'}
        backColor={(page.backColor as 'cyan' | 'indigo' | 'orange') || 'cyan'}
        logo={page.logo}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <CustomPageCardsGrid page={page} />
        {page.updatedAt && (
          <p className="mt-8 text-[10px] font-mono text-slate-700 text-center uppercase tracking-widest">
            Last updated {new Date(page.updatedAt).toLocaleString()}
            {page.updatedBy ? ` · published by ${page.updatedBy}` : ''}
          </p>
        )}
      </div>
    </>
  )
}

function CustomPageCardsGrid({ page }: { page: CustomPage }) {
  const [openCard, setOpenCard] = useState<string | null>(null)
  const gridCols = page.gridCols || 'sm:grid-cols-2 lg:grid-cols-3'

  return (
    <div className="relative">
      <div className={`grid ${gridCols} gap-6 items-start`}>
        {page.cards.map((card, index) => {
          const isOpen = openCard === card.id
          const glowColor: GlowColorName = (card.glowColor as GlowColorName) || getCardGlowColor(index)
          const hasDownloads = (card.downloads || []).length > 0
          const hasBody = Boolean(card.body?.trim())
          const isExpandable = hasDownloads || hasBody
          const panelId = `custom-card-panel-${card.id}`

          return (
            <article key={card.id} className="relative">
              <GlowCard
                className={`relative p-0 overflow-hidden w-full transition-all duration-300 ${
                  isOpen
                    ? 'ring-2 ring-cyan-400 shadow-[0_0_90px_rgba(0,212,255,0.8)]'
                    : isExpandable
                      ? 'hover:ring-2 hover:ring-sky-300/70'
                      : ''
                }`}
                glowColor={glowColor}
              >
                {isExpandable ? (
                  <button
                    type="button"
                    className="flex w-full select-none flex-col gap-6 p-8 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenCard((current) => current === card.id ? null : card.id)}
                  >
                    <CardSummary
                      card={card}
                      isOpen={isOpen}
                      hasDownloads={hasDownloads}
                      showAction
                    />
                  </button>
                ) : (
                  <div className="flex w-full flex-col gap-6 p-8">
                    <CardSummary card={card} isOpen={false} hasDownloads={false} />
                  </div>
                )}

                {isOpen && isExpandable && (
                  <div id={panelId} className="relative space-y-4 border-t border-white/10 px-8 pb-8 pt-4">
                    <button
                      type="button"
                      onClick={() => setOpenCard(null)}
                      className="absolute right-5 top-3 rounded p-1 text-slate-500 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                      aria-label={`Close details for ${card.title}`}
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                    {hasBody && <p className="pr-8 text-xs text-slate-400 whitespace-pre-line">{card.body}</p>}
                    {hasDownloads && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Downloads</p>
                        <div className="space-y-2">
                          {card.downloads!.map((download, downloadIndex) => (
                            <DownloadRow key={`${download.href}-${downloadIndex}`} download={download} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </GlowCard>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function CardSummary({
  card,
  isOpen,
  hasDownloads,
  showAction = false,
}: {
  card: CustomPageCard
  isOpen: boolean
  hasDownloads: boolean
  showAction?: boolean
}) {
  return (
    <>
      <div className="flex items-start justify-between">
        {card.logo ? <ThemedLogo src={card.logo} alt={card.title} size="xl" glass glow variant="square" /> : <div />}
      </div>
      <div className="flex-1">
        <h2 className="text-lg font-semibold text-white">{card.title}</h2>
        <p className={`text-sm leading-relaxed mt-1.5 ${isOpen ? 'text-slate-300' : 'text-slate-400'}`}>
          {card.description}
        </p>
      </div>
      {card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Tags">
          {card.tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 rounded-md text-xs bg-white/5 text-slate-400 border border-white/5">
              {tag}
            </span>
          ))}
        </div>
      )}
      {showAction && !isOpen && (
        <span className="text-xs text-cyan-400 mt-auto">
          {hasDownloads ? 'Open downloads →' : 'Open details →'}
        </span>
      )}
    </>
  )
}

function DownloadRow({ download }: { download: NonNullable<CustomPageCard['downloads']>[number] }) {
  const Icon = pickDownloadIcon(download)
  const isExternal = /^https?:\/\//i.test(download.href) && !download.href.includes('apensupport')
  return (
    <div
      className="flex items-center justify-between py-2 px-3 rounded-lg border border-white/5 hover:border-white/10 transition-all duration-150 group/row"
      style={{ background: 'rgba(6,9,18,0.6)' }}
    >
      <p className="text-xs text-slate-300 group-hover/row:text-white transition-colors flex-1 truncate">
        {download.label}
      </p>
      <a
        href={download.href}
        target={isExternal || download.isDoc ? '_blank' : undefined}
        rel={isExternal || download.isDoc ? 'noopener noreferrer' : undefined}
        className="btn-download flex-shrink-0 ml-2 text-xs px-2 py-1 flex items-center gap-1"
      >
        <Icon size={11} aria-hidden="true" />
        {download.isDoc ? 'PDF' : fileTypeFromHref(download.href)}
      </a>
    </div>
  )
}
