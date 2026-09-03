'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

const SITE_SECTIONS = new Set([
  'home', 'search', 'docs', 'downloads', 'tools', 'support', 'security',
  'repos', 'isos', 'vmware', 'mssoftware', 'microsoft-products', 'VisualStudio',
  'sqltools', 'PDQ', 'evaluate-stig', 'trellix', 'dren', 'certsrv', 'videos',
  'speedtest', 'color-picker', 'api',
])

/* The "\s*" between ] and ( is deliberate. The model intermittently emits
   "[ACAS] (https://acas.blcse.mil/)" with a space, which strict markdown does
   not treat as a link at all — the reader got literal brackets next to a bare
   URL. Prompt rules did not stop it; tolerating the space here does, and no
   legitimate text loses meaning by having "[label] (url)" linkified. */
const INLINE_LINK_RE =
  /\[([^\]]+)\]\s*\((\/[^)\s]+|https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s<>"')\]]+)|(^|[\s(])(\/[A-Za-z][\w-]*(?:\/[\w\-./%]*)?)/g

export function normalizeAssistantRoute(href: string): string {
  const path = href.split(/[?#]/)[0]
  return path.length > 1 ? path.replace(/\/+$/, '') : path
}

function ChatLink({ href, children, validRoutes }: { href: string; children: ReactNode; validRoutes: Set<string> | null }) {
  const className = 'text-cyan-400 underline decoration-cyan-400/40 underline-offset-2 hover:text-cyan-300'
  const internalPage = href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/api/')

  if (internalPage) {
    if (validRoutes && !validRoutes.has(normalizeAssistantRoute(href))) {
      return (
        <span
          className="cursor-help text-amber-300 underline decoration-dotted decoration-amber-400/60 underline-offset-2"
          title="This document isn't on the APEN Support site yet — contact the CESC to have it added, updated, or modified."
        >
          {children}<sup className="ml-0.5 text-[8px] font-bold text-amber-400">⚠</sup>
        </span>
      )
    }
    return <Link href={href} className={className}>{children}</Link>
  }

  return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>
}

function linkify(text: string, validRoutes: Set<string> | null, keyPrefix: string): ReactNode {
  const nodes: ReactNode[] = []
  let last = 0
  let key = 0

  for (const match of text.matchAll(INLINE_LINK_RE)) {
    const [full, markdownLabel, markdownHref, bareUrl, pathLead, barePath] = match
    let href = ''
    let label = ''
    let start = match.index ?? 0

    if (markdownLabel !== undefined && markdownHref !== undefined) {
      href = markdownHref
      label = markdownLabel
    } else if (bareUrl !== undefined) {
      href = bareUrl
      label = bareUrl
    } else if (barePath !== undefined) {
      const section = barePath.split('/')[1] ?? ''
      if (!SITE_SECTIONS.has(section)) continue
      start += (pathLead ?? '').length
      href = barePath.replace(/[.,;:!?]+$/, '')
      label = href
    }

    if (!href || href.startsWith('//')) continue
    if (start > last) nodes.push(text.slice(last, start))
    nodes.push(<ChatLink key={`${keyPrefix}-${key++}`} href={href} validRoutes={validRoutes}>{label}</ChatLink>)
    last = start + (markdownLabel !== undefined ? full.length - (pathLead?.length ?? 0) : label.length)
  }

  if (nodes.length === 0) return text
  if (last < text.length) nodes.push(text.slice(last))
  return <>{nodes}</>
}

/* **bold** is the only emphasis the assistant is allowed to emit (see the
   RESPONSE FORMAT block in proxy/voltron-proxy.mjs). Without this pass the
   asterisks printed literally, so a grouped answer arrived wearing
   "**Supported products**" instead of a heading.

   Bold is split BEFORE links, not after: the model writes its list items as
   "- **[Windows ISOs](/downloads/iso/windows)** — ...", so a link-first pass
   would leave the orphaned "**" on either side of the anchor as visible text.
   Splitting first means each bold run is linkified on its own. */
function renderInline(text: string, validRoutes: Set<string> | null): ReactNode {
  if (!text.includes('**')) return linkify(text, validRoutes, 'l')

  const parts = text.split(/\*\*([\s\S]+?)\*\*/g)
  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null
        const inner = linkify(part, validRoutes, `l${index}`)
        return index % 2 === 1
          ? <strong key={index} className="font-semibold">{inner}</strong>
          : <span key={index}>{inner}</span>
      })}
    </>
  )
}

type ListItem = { depth: 0 | 1; text: string }

/* One level of nesting, and no more. The model reaches for a sub-bullet
   whenever it groups an answer by category, and telling it not to in the
   prompt lost every time — so the panel renders the shape it actually emits.
   Depth is taken from leading whitespace; anything indented is depth 1, and
   deeper indents collapse into that same level rather than marching off the
   right edge of a narrow chat panel. */
function renderItems(items: ListItem[], validRoutes: Set<string> | null): ReactNode[] {
  const nodes: ReactNode[] = []
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]
    if (item.depth === 1 && nodes.length === 0) {
      // Indented run with no parent above it — render it flat rather than
      // dropping the content.
      nodes.push(<li key={index}>{renderInline(item.text, validRoutes)}</li>)
      continue
    }
    if (item.depth === 1) continue // consumed by its parent below

    const children: ListItem[] = []
    let lookahead = index + 1
    while (lookahead < items.length && items[lookahead].depth === 1) {
      children.push(items[lookahead])
      lookahead += 1
    }
    nodes.push(
      <li key={index}>
        {renderInline(item.text, validRoutes)}
        {children.length > 0 && (
          <ul className="mt-0.5 list-[circle] space-y-0.5 pl-4">
            {children.map((child, childIndex) => (
              <li key={childIndex}>{renderInline(child.text, validRoutes)}</li>
            ))}
          </ul>
        )}
      </li>,
    )
  }
  return nodes
}

export function FormattedMessage({ text, validRoutes }: { text: string; validRoutes: Set<string> | null }) {
  const lines = (text ?? '').split(/\r?\n/)
  const blocks: ReactNode[] = []
  let list: { ordered: boolean; items: ListItem[] } | null = null

  const flush = () => {
    if (!list) return
    const items = renderItems(list.items, validRoutes)
    blocks.push(list.ordered ? (
      <ol key={blocks.length} className="list-decimal space-y-0.5 pl-4">{items}</ol>
    ) : (
      <ul key={blocks.length} className="list-disc space-y-0.5 pl-4">{items}</ul>
    ))
    list = null
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    const bullet = line.match(/^(\s*)[-*•]\s+(.*)$/)
    const ordered = line.match(/^(\s*)\d+[.)]\s+(.*)$/)
    const match = bullet ?? ordered
    if (match) {
      const isOrdered = !bullet
      if (!list || list.ordered !== isOrdered) { flush(); list = { ordered: isOrdered, items: [] } }
      list.items.push({ depth: match[1].length >= 2 ? 1 : 0, text: match[2] })
    } else {
      flush()
      if (line.trim()) blocks.push(<p key={blocks.length}>{renderInline(line, validRoutes)}</p>)
    }
  }
  flush()

  if (blocks.length === 0) return <>{text}</>
  return <div className="space-y-1.5">{blocks}</div>
}
