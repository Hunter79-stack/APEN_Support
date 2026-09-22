'use client'

/**
 * DownloadRow — THE download line item, extracted from the VMware 8 cards.
 *
 * Every card on the site that offers a file (.exe, .msi, .iso, .pdf, …) renders
 * it through this row: label on the left, one `btn-download` button on the
 * right named after the file's extension. One component instead of the same
 * markup copy-pasted per page, so the look can't drift again.
 */

import { Download, FileText } from 'lucide-react'

/** Lowercase extension of a URL/path, '' when it has none. */
export function downloadExtension(href: string): string {
  let path = href.split(/[?#]/)[0]
  try { path = decodeURIComponent(path) } catch { /* malformed escape — use raw */ }
  return (/\.([A-Za-z0-9]{1,12})$/.exec(path)?.[1] ?? '').toLowerCase()
}

/** Document types open in a tab instead of saving. */
const DOC_EXTENSIONS = new Set(['pdf', 'txt', 'md'])

/**
 * The same link as a single icon-button, for the compact tile layout where the
 * file name is already the tile's title and a full row would repeat it.
 *
 * It lives HERE, beside the full row, on purpose: extension detection,
 * document-vs-download behaviour and the new-tab rule are decided once, so a
 * tile and a row can never disagree about what a link does — which is also why
 * tile pages still satisfy the "renders files through the shared row" sweep.
 */
export function DownloadButton({ label, href, external, className = '' }: {
  label: string
  href: string
  /** Force open-in-new-tab (e.g. links leaving the site). */
  external?: boolean
  className?: string
}) {
  const extension = downloadExtension(href)
  const doc = DOC_EXTENSIONS.has(extension)
  const blank = external || doc || !href.startsWith('/')
  const Icon = doc ? FileText : Download
  // The accessible name carries the file type the visible row would have shown,
  // so a screen-reader user is not left with a bare "download".
  const name = `${label}${extension ? ` (.${extension})` : ''}`
  return (
    <a
      href={href}
      target={blank ? '_blank' : undefined}
      rel={blank ? 'noopener noreferrer' : undefined}
      aria-label={name}
      title={name}
      className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors ${className}`}
    >
      <Icon size={15} aria-hidden="true" />
    </a>
  )
}

export function DownloadRow({ label, href, external }: {
  label: string
  href: string
  /** Force open-in-new-tab (e.g. links leaving the site). */
  external?: boolean
}) {
  const extension = downloadExtension(href)
  const doc = DOC_EXTENSIONS.has(extension)
  const blank = external || doc || !href.startsWith('/')
  const Icon = doc ? FileText : Download
  return (
    <div
      className="flex items-center justify-between py-2 px-3 rounded-lg border border-white/5 hover:border-white/10 transition-all duration-150 group/row"
      style={{ background: 'rgba(6,9,18,0.6)' }}
    >
      <p className="text-xs text-slate-300 group-hover/row:text-white transition-colors flex-1 break-all">
        {label}
      </p>
      <a
        href={href}
        target={blank ? '_blank' : undefined}
        rel={blank ? 'noopener noreferrer' : undefined}
        aria-label={`${label}${extension ? ` (.${extension})` : ''}`}
        className="btn-download flex-shrink-0 ml-2 text-xs px-2 py-1 flex items-center gap-1"
      >
        <Icon size={11} aria-hidden="true" />
        {extension ? `.${extension}` : 'Download'}
      </a>
    </div>
  )
}
