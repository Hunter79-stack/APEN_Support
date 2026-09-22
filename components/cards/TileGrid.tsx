'use client'

/**
 * TileGrid — the compact, sectioned tile layout.
 *
 * One row per item: 48px mark | title, subtitle, version | one action. Built for
 * pages with MANY small, homogeneous items where the site's expanding GlowCard
 * hides the whole payload behind a click that buys nothing (an ISO page whose
 * card expands to reveal exactly one download row, a 46-package store listing).
 *
 * It deliberately owns only presentation: sections, the grid, the tile, and
 * selection state passed in from above. Data fetching, search boxes, toolbars
 * and any "pack" panel stay on the page — so this file never needs to know
 * which page it is rendering.
 *
 * ACCESSIBILITY — why this is not a div with role="checkbox".
 * The first draft of this tile (on the Store page) was a `div role="checkbox"`
 * that CONTAINED the download link and a real checkbox. ARIA treats a widget
 * role's children as presentational, so the link and the checkbox were
 * unreachable and mis-announced, and one item announced two checkboxes. The
 * repo had already ruled on this: tests/ui-behavior.test.ts bans exactly that
 * shape for CustomPageView. So a tile here is plain content with ONE native
 * checkbox associated by htmlFor, and the link/disclosure are siblings — every
 * control focusable, announced once, keyboard-operable with no handlers.
 */

import { useId, useMemo, useState } from 'react'
import { ChevronDown, Copy } from 'lucide-react'
import { DownloadButton, DownloadRow } from '@/components/cards/DownloadRow'
import { LOGOS } from '@/lib/data/logos'

export interface TileDownload {
  label: string
  href: string
  /** Force open-in-new-tab (links leaving the site, directory listings). */
  external?: boolean
}

export interface TileItem {
  /**
   * MUST be the source card's id. Admin overrides join to a card by id
   * (applyScopeOverride), so a tile that invents its own id silently detaches
   * every published sysadmin edit for that card.
   */
  id: string
  title: string
  /** Line 2 — publisher, vendor, distro family, or the file name. */
  subtitle?: string
  /**
   * Line 3, rendered VERBATIM. Callers format it ("v13.1.0 · x64", "22.04 LTS",
   * "VS 2022 (offline layout)"). Verbatim on purpose: prefixing a "v" here is
   * what produced "vVS 2022 (offline layout)" elsewhere in the codebase.
   */
  version?: string
  icon?: string
  /** Section-heading bucket. Omit on every item for one ungrouped grid. */
  category?: string
  description?: string
  /** 0/absent -> static tile · 1 -> download button · 2+ -> disclosure list. */
  downloads?: TileDownload[]
  /**
   * A SECOND tier inside the expander, collapsed on its own. The VMware pages
   * use it for superseded patches: opening a card shows the installer, the
   * update bundle and the newest patch, and the back catalogue stays one more
   * click away instead of burying the current release in sixteen rows.
   */
  moreDownloads?: TileDownload[]
  /** Label for that second tier, e.g. "6 older patches". */
  moreLabel?: string
  /** Renders a copy-to-clipboard button instead of a download (shell commands). */
  copyText?: string
  /**
   * Prose revealed by a disclosure button — an FAQ answer, a note. The payload
   * is a paragraph rather than a file, so the tile stays one line until asked.
   */
  body?: string
}

export interface TileGridProps {
  items: TileItem[]
  /** Heading order; categories not listed follow in first-seen order. */
  categoryOrder?: readonly string[]
  /** Show "12 apps" beside each section heading. */
  showCounts?: boolean
  /** Selection is opt-in: omit both and the grid renders read-only. */
  selectedIds?: ReadonlySet<string>
  onToggle?: (id: string) => void
  gridCols?: string
  fallbackIcon?: string
  emptyMessage?: string
  /** Noun used beside a section count ("app", "image", "document"). */
  unitLabel?: string
  /**
   * Drop the 48px mark entirely. For single-brand pages every tile would show
   * the SAME logo, which is nine copies of one image and no information — and
   * /docs pages cannot carry per-item icons at all, because
   * validate-image-registry.mjs forbids `LOGOS.` under app/docs/** and routes
   * them through DOCS_PAGE_LOGOS, which is keyed per ROUTE, not per item.
   */
  showIcons?: boolean
}

/** 48px mark with a graceful fallback when the file is missing or fails to load. */
export function TileIcon({ src, alt, size = 48, fallback = LOGOS.msStore }: {
  src?: string
  alt: string
  size?: number
  fallback?: string
}) {
  const [failed, setFailed] = useState(false)
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export, no image loader
    <img
      src={failed || !src ? fallback : src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className="rounded-xl bg-white/5 object-contain shrink-0"
      style={{ width: size, height: size }}
    />
  )
}

/** Title / subtitle / version block. Kept as real text nodes, never attributes:
 *  scripts/build-search-index.mjs strips tags AND attributes from the exported
 *  HTML, so anything living only in a title= or aria-label= disappears from
 *  site search and from the AI assistant's knowledge of the page. */
function TileText({ item }: { item: TileItem }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-white truncate" title={item.title}>{item.title}</p>
      {item.subtitle && <p className="text-xs text-slate-400 truncate">{item.subtitle}</p>}
      {item.version && <p className="text-[11px] text-slate-400 truncate">{item.version}</p>}
      {item.description && (
        <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{item.description}</p>
      )}
    </div>
  )
}

function Tile({ item, selected, onToggle, fallbackIcon, showIcon = true }: {
  item: TileItem
  selected: boolean
  onToggle?: (id: string) => void
  fallbackIcon?: string
  showIcon?: boolean
}) {
  const reactId = useId()
  const checkboxId = `tile-${reactId}`
  const panelId = `panel-${reactId}`
  const [open, setOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const downloads = item.downloads ?? []
  const moreDownloads = item.moreDownloads ?? []
  const morePanelId = `more-${reactId}`
  // Nothing to put in a pack unless the item actually has a file behind it.
  const selectable = Boolean(onToggle) && downloads.length > 0
  // A disclosure is warranted by prose OR by more files than one button can
  // carry. Either way it is a NATIVE button with aria-expanded/aria-controls —
  // never a div with a widget role wrapping other controls.
  const hasDisclosure = Boolean(item.body) || downloads.length > 1 || moreDownloads.length > 0

  function copy() {
    if (!item.copyText) return
    navigator.clipboard?.writeText(item.copyText)
      .then(() => setCopied(true))
      .catch(() => setCopied(false))
  }

  return (
    <div>
      <div
        className={`flex items-center gap-3 rounded-2xl border p-3 pr-4 transition-all
          ${selected
            ? 'border-cyan-400/70 bg-cyan-400/10 ring-1 ring-cyan-400/50'
            : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/25'}
          ${downloads.length === 0 && !item.copyText && !item.body ? 'opacity-80' : ''}`}
      >
        {/* With selection on, the whole left area is the checkbox's label, so
            clicking the name toggles it — without nesting anything focusable. */}
        {selectable ? (
          <label htmlFor={checkboxId} className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
            {showIcon && <TileIcon src={item.icon} alt="" fallback={fallbackIcon} />}
            <TileText item={item} />
          </label>
        ) : (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {showIcon && <TileIcon src={item.icon} alt="" fallback={fallbackIcon} />}
            <TileText item={item} />
          </div>
        )}

        {item.copyText && (
          <button
            type="button"
            onClick={copy}
            title={copied ? 'Copied' : `Copy: ${item.copyText}`}
            aria-label={copied ? `Copied ${item.title}` : `Copy ${item.title} to the clipboard`}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <Copy size={15} aria-hidden="true" />
          </button>
        )}

        {downloads.length === 1 && (
          <DownloadButton
            label={downloads[0].label || item.title}
            href={downloads[0].href}
            external={downloads[0].external}
            className="shrink-0"
          />
        )}

        {hasDisclosure && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={item.body
              ? `${open ? 'Hide' : 'Show'} the answer to ${item.title}`
              : `${open ? 'Hide' : 'Show'} the ${downloads.length} files for ${item.title}`}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <ChevronDown
              size={15}
              aria-hidden="true"
              className={`transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>
        )}

        {/* ONE real control, announced once, keyboard-operable natively. */}
        {selectable && (
          <input
            id={checkboxId}
            type="checkbox"
            checked={selected}
            onChange={() => onToggle?.(item.id)}
            className="w-4 h-4 accent-cyan-400 cursor-pointer shrink-0"
          />
        )}
      </div>

      {/* Rendered ALWAYS and hidden with the `hidden` attribute rather than
          unmounted, so the text and the hrefs exist in the exported HTML.
          scripts/build-search-index.mjs reads the static export, so a panel
          that only mounts on click is invisible to site search and to the AI
          assistant — which is why FAQ answers were never findable. `hidden`
          (not a display class) also keeps it out of the accessibility tree
          while collapsed. */}
      {hasDisclosure && (
        <div id={panelId} hidden={!open}>
          <div className="mt-1.5 flex flex-col gap-1.5 pl-3 pr-1">
            {item.body && (
              <p className="text-xs leading-relaxed text-slate-300 whitespace-pre-line px-3 py-2 rounded-lg border border-white/5 bg-black/30">
                {item.body}
              </p>
            )}
            {downloads.length > 1 && downloads.map((d) => (
              <DownloadRow key={d.href} label={d.label} href={d.href} external={d.external} />
            ))}

            {moreDownloads.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  aria-expanded={moreOpen}
                  aria-controls={morePanelId}
                  className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-cyan-300 hover:text-cyan-200 hover:bg-white/5 transition-colors"
                >
                  <ChevronDown
                    size={13}
                    aria-hidden="true"
                    className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`}
                  />
                  {moreOpen ? 'Hide' : 'Show'} {item.moreLabel ?? `${moreDownloads.length} more`}
                </button>
                {/* Same rendered-and-hidden treatment as the outer panel, so the
                    superseded builds stay in the exported HTML and remain
                    reachable by search and by a visitor without JS. */}
                <div id={morePanelId} hidden={!moreOpen}>
                  <div className="flex flex-col gap-1.5">
                    {moreDownloads.map((d) => (
                      <DownloadRow key={d.href} label={d.label} href={d.href} external={d.external} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function TileGrid({
  items,
  categoryOrder = [],
  showCounts = false,
  selectedIds,
  onToggle,
  gridCols = 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  fallbackIcon,
  emptyMessage = 'Nothing matches the current filter.',
  unitLabel = 'item',
  showIcons = true,
}: TileGridProps) {
  // Group into sections: the caller's order first, then any category it did not
  // list (first-seen), with uncategorised items in a leading unheaded grid.
  const sections = useMemo(() => {
    const buckets = new Map<string, TileItem[]>()
    for (const item of items) {
      const key = item.category ?? ''
      const bucket = buckets.get(key)
      if (bucket) bucket.push(item)
      else buckets.set(key, [item])
    }
    const ordered: Array<{ category: string; items: TileItem[] }> = []
    const uncategorised = buckets.get('')
    if (uncategorised) ordered.push({ category: '', items: uncategorised })
    for (const category of categoryOrder) {
      const bucket = buckets.get(category)
      if (bucket) ordered.push({ category, items: bucket })
    }
    for (const [category, bucket] of buckets) {
      if (category && !categoryOrder.includes(category)) ordered.push({ category, items: bucket })
    }
    return ordered
  }, [items, categoryOrder])

  if (items.length === 0) {
    return <div className="text-center text-slate-400 py-16">{emptyMessage}</div>
  }

  return (
    <>
      {sections.map(({ category, items: bucket }) => (
        <section key={category || '_uncategorised'} className="mb-10">
          {category && (
            <div className="flex items-baseline gap-3 mb-4">
              <h2 className="text-xl font-semibold text-white">{category}</h2>
              {showCounts && (
                <span className="text-xs text-slate-400">
                  {bucket.length} {unitLabel}{bucket.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
          )}
          <div className={`grid ${gridCols} gap-3 items-start`}>
            {bucket.map((item) => (
              <Tile
                key={item.id}
                item={item}
                selected={Boolean(selectedIds?.has(item.id))}
                onToggle={onToggle}
                fallbackIcon={fallbackIcon}
                showIcon={showIcons}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  )
}
