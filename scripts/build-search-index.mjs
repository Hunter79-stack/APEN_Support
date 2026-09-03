#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────
//  build-search-index.mjs — site-wide search index for the static export
// ──────────────────────────────────────────────────────────────
//
// Runs after `next build` (see the "build" npm script). Walks every
// out/**/index.html page, extracts title / headings / visible text, and
// writes out/search-index.json, which the /search page loads client-side.
//
// Zero dependencies on purpose — this host is air-gapped, so the index
// is built with regex-level HTML stripping rather than a parser package.
// That is fine here: the input is our own Next.js export, not arbitrary HTML.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'out')

// Routes that should never appear in user-facing search results.
const EXCLUDE = [
  /^\/admin(\/|$)/,
  /^\/403(\/|$)/,
  /^\/404(\/|$)/,
  /^\/dren(\/|$)/,          // DREN admin tools — internal
  /^\/repos(\/|$)/,         // RedirectStub pages → /docs/repos
  /^\/network-analysis(\/|$)/, // unlinked legacy shell — the tab bar lives on /applications/tools/speedtest now
  /^\/tools(\/|$)/,         // RedirectStub pages → /applications/tools/*
  /^\/color-picker(\/|$)/,  // RedirectStub page → /applications/tools/color-picker
  /^\/speedtest(\/|$)/,     // RedirectStub page → /applications/tools/speedtest
  /^\/_next(\/|$)/,
]

const MAX_BODY_CHARS = 1600
const MAX_LINKS = 24
const MAX_LINK_LABEL_CHARS = 80

function* htmlPages(dir, urlPath = '/') {
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      yield* htmlPages(join(dir, entry.name), `${urlPath}${entry.name}/`)
    } else if (entry.name === 'index.html') {
      yield { file: join(dir, entry.name), route: urlPath }
    }
  }
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

function extract(html) {
  const title = decodeEntities((html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '').trim())
    .replace(/\s*\|\s*APEN.*$/i, '')

  const description = decodeEntities(
    html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1] ?? '',
  )

  // Strip non-content blocks before text extraction. The nav sidebar and
  // footer repeat on every page and would drown real matches.
  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')

  const headings = [...body.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map((m) => decodeEntities(m[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const text = decodeEntities(body.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_BODY_CHARS)

  // Anchor destinations, kept alongside the text. Tag-stripping throws every
  // href away, so a link card indexed as bare label text with no destination:
  // the home page's "APEN Voltron" tile became the words "APEN Voltron Launch
  // APEN Voltron, the on-network AI assistant. Open site" and nothing else.
  // The AI assistant (which reads this same index) could therefore see that
  // the service existed but had no URL for it, and invented /applications/.
  // Indexed page routes are dropped in the post-pass below — those are already
  // in the assistant's page map — leaving the off-site portals and the
  // /api/external/* redirector paths, which appear nowhere else.
  const links = []
  const seenHrefs = new Set()
  for (const match of body.matchAll(/<a\b[^>]*\shref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = decodeEntities(match[1]).trim()
    if (!href || href.startsWith('#') || seenHrefs.has(href)) continue
    seenHrefs.add(href)
    const label = decodeEntities(match[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
    links.push({ href, label: label.slice(0, MAX_LINK_LABEL_CHARS) })
  }

  return { title, description, headings: [...new Set(headings)].slice(0, 12), text, links }
}

if (!existsSync(OUT)) {
  console.error(`[search-index] ${OUT} does not exist — run \`next build\` first.`)
  process.exit(1)
}

const pages = []
for (const { file, route } of htmlPages(OUT)) {
  if (EXCLUDE.some((re) => re.test(route))) continue
  try {
    const { title, description, headings, text, links } = extract(readFileSync(file, 'utf8'))
    if (!title && !text) continue
    pages.push({ route, title: title || route, description, headings, text, links })
  } catch (err) {
    console.warn(`[search-index] skipped ${route}: ${err.message}`)
  }
}

// Keep only the destinations nothing else records: off-site URLs and internal
// paths that are not themselves indexed pages. Anything under EXCLUDE is
// dropped too, so internal-only routes stay out of search and out of the
// assistant's context.
const routeSet = new Set(pages.map((p) => p.route))
function indexedRoute(href) {
  if (!href.startsWith('/')) return null
  const path = href.split(/[?#]/)[0]
  return path.endsWith('/') ? path : `${path}/`
}
for (const page of pages) {
  page.links = page.links
    .filter((link) => {
      const route = indexedRoute(link.href)
      if (route === null) return true            // absolute/off-site URL
      if (routeSet.has(route)) return false      // already in the page map
      return !EXCLUDE.some((re) => re.test(route))
    })
    .slice(0, MAX_LINKS)
}

pages.sort((a, b) => a.route.localeCompare(b.route))
const payload = { generatedAt: new Date().toISOString(), count: pages.length, pages }
writeFileSync(join(OUT, 'search-index.json'), JSON.stringify(payload))
console.log(`[search-index] indexed ${pages.length} pages → out/search-index.json (${Math.round(JSON.stringify(payload).length / 1024)} KB)`)
