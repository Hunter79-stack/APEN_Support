'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, FileText, Loader2, SearchX, X } from 'lucide-react'
import { GlowCard } from '@/components/ui/spotlight-card'
import { StaticLink } from '@/components/common/StaticLink'

interface IndexedPage {
  route: string
  title: string
  description: string
  headings: string[]
  text: string
}

interface Hit {
  page: IndexedPage
  score: number
  snippet: string
}

const MAX_RESULTS = 30

function makeSnippet(text: string, term: string): string {
  const index = text.toLowerCase().indexOf(term)
  if (index < 0) return text.slice(0, 180)
  const start = Math.max(0, index - 75)
  const end = Math.min(text.length, index + 105)
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`
}

function searchIndex(pages: IndexedPage[], query: string): Hit[] {
  const terms = query.toLowerCase().split(/\s+/).filter((term) => term.length >= 2)
  if (terms.length === 0) return []
  const hits: Hit[] = []

  for (const page of pages) {
    const title = page.title.toLowerCase()
    const description = page.description.toLowerCase()
    const headings = page.headings.join(' ').toLowerCase()
    const body = page.text.toLowerCase()
    let score = 0
    let allMatched = true

    for (const term of terms) {
      let termScore = 0
      if (title.includes(term)) termScore += 8
      if (headings.includes(term)) termScore += 4
      if (description.includes(term)) termScore += 3
      if (body.includes(term)) termScore += 1
      if (termScore === 0) {
        allMatched = false
        break
      }
      score += termScore
    }

    if (allMatched) hits.push({ page, score, snippet: makeSnippet(page.text, terms[0]) })
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS)
}

function pageCategory(route: string) {
  return route.split('/').filter(Boolean)[0] || 'home'
}

function highlight(text: string, query: string) {
  const terms = query.trim().split(/\s+/).filter((term) => term.length >= 2)
  if (!terms.length) return text
  const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`(${escaped.join('|')})`, 'ig')
  return text.split(pattern).map((part, index) =>
    terms.some((term) => part.toLowerCase() === term.toLowerCase())
      ? <mark key={`${part}-${index}`} className="rounded bg-cyan-300/20 px-0.5 text-cyan-100">{part}</mark>
      : part)
}

export function SearchClient() {
  const [pages, setPages] = useState<IndexedPage[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [fragmentReady, setFragmentReady] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const applyFragmentState = () => {
      const parameters = new URLSearchParams(window.location.hash.slice(1))
      setQuery(parameters.get('q') ?? '')
      setCategory(parameters.get('category') ?? 'all')
      setFragmentReady(true)
    }

    applyFragmentState()
    window.addEventListener('hashchange', applyFragmentState)
    window.addEventListener('popstate', applyFragmentState)

    let cancelled = false
    fetch('/search-index.json', { cache: 'no-cache' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
      .then((data) => { if (!cancelled && Array.isArray(data?.pages)) setPages(data.pages) })
      .catch(() => { if (!cancelled) setLoadError(true) })

    return () => {
      cancelled = true
      window.removeEventListener('hashchange', applyFragmentState)
      window.removeEventListener('popstate', applyFragmentState)
    }
  }, [])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return
      event.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  useEffect(() => {
    if (!fragmentReady) return
    const parameters = new URLSearchParams(window.location.hash.slice(1))
    if (query.trim()) parameters.set('q', query.trim())
    else parameters.delete('q')
    if (category !== 'all') parameters.set('category', category)
    else parameters.delete('category')

    const requestParameters = new URLSearchParams(window.location.search)
    requestParameters.delete('q')
    requestParameters.delete('category')
    const requestQuery = requestParameters.size ? `?${requestParameters}` : ''
    const next = `${window.location.pathname}${requestQuery}${parameters.size ? `#${parameters}` : ''}`
    window.history.replaceState(null, '', next)
  }, [query, category, fragmentReady])

  const categories = useMemo(
    () => Array.from(new Set((pages ?? []).map((page) => pageCategory(page.route)))).sort(),
    [pages],
  )
  const searchablePages = useMemo(
    () => category === 'all'
      ? (pages ?? [])
      : (pages ?? []).filter((page) => pageCategory(page.route) === category),
    [pages, category],
  )
  const results = useMemo(() => searchIndex(searchablePages, query), [searchablePages, query])

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-[1fr_14rem]">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search docs, downloads, repos, guides…"
            aria-label="Search the support site"
            className="h-12 w-full rounded-xl border border-white/10 bg-black/30 pl-12 pr-11 text-base text-white outline-none transition-colors focus:border-cyan-400/60"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); inputRef.current?.focus() }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        <label className="sr-only" htmlFor="search-category">Filter by category</label>
        <select
          id="search-category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="h-12 rounded-xl border border-white/10 bg-[#07111f] px-3 text-sm text-slate-200 outline-none focus:border-cyan-400/60"
        >
          <option value="all">All categories</option>
          {categories.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>

      <p className="text-xs text-slate-600">
        Press <kbd className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-slate-400">/</kbd> anywhere to focus search.
      </p>

      {loadError && (
        <p role="alert" className="text-sm text-slate-400">
          The offline search index is unavailable. Run <code className="text-cyan-400">npm run build</code> to regenerate it, or browse using the navigation menu.
        </p>
      )}
      {!pages && !loadError && query && (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Loading search index…
        </p>
      )}

      <div aria-live="polite" aria-atomic="true">
        {pages && query.trim().length >= 2 && results.length === 0 && (
          <div className="space-y-3 text-sm text-slate-400">
            <div className="flex items-center gap-3">
              <SearchX size={18} className="text-slate-500" aria-hidden="true" />
              No pages match “{query}” in {category === 'all' ? 'the site' : category}.
            </div>
            <p>Try a shorter term, switch to All categories, or use the main navigation.</p>
            <StaticLink href="/home" className="inline-flex text-cyan-400 hover:text-cyan-300">
              Return to support home →
            </StaticLink>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-slate-500">
            {results.length === MAX_RESULTS ? `Top ${MAX_RESULTS} results` : `${results.length} result${results.length === 1 ? '' : 's'}`}
          </p>
          {results.map(({ page, snippet }) => (
            <StaticLink key={page.route} href={page.route} className="block">
              <GlowCard glowColor="cyan" className="p-4 transition-colors hover:border-cyan-400/40">
                <div className="flex items-start gap-3">
                  <FileText size={16} className="mt-0.5 shrink-0 text-cyan-400/80" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{highlight(page.title, query)}</p>
                    <p className="truncate font-mono text-[11px] text-cyan-400/60">{page.route}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      {highlight(page.description || snippet, query)}
                    </p>
                  </div>
                </div>
              </GlowCard>
            </StaticLink>
          ))}
        </div>
      )}
    </div>
  )
}
