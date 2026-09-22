'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckSquare, Copy, Download, RefreshCw, Search, Terminal, X } from 'lucide-react'
import { TileGrid, TileIcon, type TileItem } from '@/components/cards/TileGrid'
import { useCardOverrides } from '@/lib/data/admin-content'
import { LOGOS } from '@/lib/data/logos'
import { STORE_CATEGORIES } from '@/lib/data/store-app-meta'
import {
  curatedFallbackCards,
  fetchWingetCatalog,
  packInstallScript,
  sourceSetupScript,
  type WingetAppCard,
} from '@/lib/data/winget-catalog'

type Status = 'loading' | 'ok' | 'error'

export function MSStoreAppxCards() {
  // Static-first: the published 46-package list renders synchronously so the
  // exported HTML carries every app name as real text (site search and the AI
  // assistant only ever see the static export), then the live catalog from
  // /winget/api/catalog replaces it with real versions and download routes.
  // Both lists are keyed by PackageIdentifier, so admin overrides match either.
  const [status, setStatus] = useState<Status>('loading')
  const [cards, setCards] = useState<WingetAppCard[]>(curatedFallbackCards)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [note, setNote] = useState('')
  const [showSource, setShowSource] = useState(false)
  // App pack — selected package ids. Survives search filtering.
  const [selected, setSelected] = useState<Set<string>>(new Set())

  async function load() {
    setStatus('loading')
    setNote('')
    try {
      const { cards, lastUpdated } = await fetchWingetCatalog()
      setCards(cards)
      setLastUpdated(lastUpdated)
      setStatus('ok')
    } catch {
      setCards(curatedFallbackCards())
      setLastUpdated(null)
      setStatus('error')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const overridden = useCardOverrides<WingetAppCard>('microsoft/store/appx', cards)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return overridden
    return overridden.filter((c) =>
      [c.title, c.publisher, c.packageIdentifier, c.description, ...c.tags].join(' ').toLowerCase().includes(q))
  }, [overridden, query])

  const tiles = useMemo<TileItem[]>(() => visible.map((app) => ({
    id: app.id,
    title: app.title,
    subtitle: app.publisher,
    version: app.version ? `v${app.version}${app.architecture ? ` · ${app.architecture}` : ''}` : undefined,
    icon: app.logo,
    category: app.storeCategory,
    downloads: app.downloadUrl ? [{ label: `${app.title} installer`, href: app.downloadUrl }] : [],
  })), [visible])

  const selectedApps = useMemo(
    () => overridden.filter((a) => selected.has(a.id) && a.packageIdentifier && a.downloadUrl),
    [overridden, selected],
  )

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const a of visible) if (a.packageIdentifier && a.downloadUrl) next.add(a.id)
      return next
    })
  }

  function copy(text: string, msg: string) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => setNote(msg)).catch(() => setNote('Copy failed.'))
    } else {
      setNote('Clipboard unavailable.')
    }
  }

  function downloadPackScript() {
    const url = URL.createObjectURL(new Blob([packInstallScript(selectedApps)], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'apen-app-pack.ps1'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    setNote(`Install script for ${selectedApps.length} app(s) saved.`)
  }

  function downloadPackInstallers() {
    // ponytail: staggered anchor clicks — browsers throttle simultaneous
    // downloads; switch to a server-side zip bundle if packs get large.
    selectedApps.forEach((pkg, i) => {
      setTimeout(() => {
        const a = document.createElement('a')
        a.href = pkg.downloadUrl
        a.download = ''
        document.body.appendChild(a)
        a.click()
        a.remove()
      }, i * 700)
    })
    setNote(`Downloading ${selectedApps.length} installer(s) — allow multiple downloads if the browser asks.`)
  }

  return (
    <div className="relative">
      {lastUpdated && (
        <p className="text-xs text-slate-400 mb-4">
          Catalog last synced from the WinGet repository&nbsp;
          <time dateTime={lastUpdated} className="font-medium text-slate-200">
            {new Date(lastUpdated).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
          </time>
        </p>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search apps…"
            aria-label="Search apps"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSource((v) => !v)}
            aria-expanded={showSource}
            aria-controls="winget-source-panel"
            className="btn-download text-sm flex items-center gap-2"
            title="Show the PowerShell to register this server as a winget source"
          >
            <Terminal size={14} aria-hidden="true" /> Winget Source
          </button>
          {showSource && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSource(false)} />
              <div
                id="winget-source-panel"
                className="absolute right-0 top-full mt-2 z-50 w-[min(34rem,92vw)] rounded-2xl border border-white/10 bg-slate-900 shadow-2xl text-left"
              >
                <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-white/10">
                  <div>
                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                      <Terminal size={15} aria-hidden="true" /> Add this server as a winget source
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Run in an elevated PowerShell, then install any listed app with{' '}
                      <code className="text-slate-300">winget install</code>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSource(false)}
                    className="text-slate-400 hover:text-white transition-colors p-1 rounded"
                    aria-label="Close"
                  >
                    <X size={15} aria-hidden="true" />
                  </button>
                </div>
                <div className="p-5">
                  <pre className="text-xs text-slate-200 bg-black/50 border border-white/10 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
                    {sourceSetupScript()}
                  </pre>
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => copy(sourceSetupScript(), 'winget source setup copied to clipboard.')}
                      className="btn-download text-sm flex items-center gap-2"
                    >
                      <Copy size={14} aria-hidden="true" /> Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSource(false)}
                      className="px-4 py-2 rounded-lg text-sm text-slate-300 border border-white/10 hover:bg-white/5"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {status === 'ok' && (
          <button
            type="button"
            onClick={selectAllVisible}
            className="btn-download text-sm flex items-center gap-2"
            title="Add every visible app to the app pack"
          >
            <CheckSquare size={14} aria-hidden="true" /> Select all
          </button>
        )}

        <button
          type="button"
          onClick={load}
          className="btn-download text-sm flex items-center gap-2"
          title="Reload the live package list from the WinGet repo"
        >
          <RefreshCw size={14} aria-hidden="true" /> Refresh
        </button>
      </div>

      {/* Status line */}
      <p className="text-xs mb-6">
        {status === 'loading' && (
          <span className="text-slate-400">
            Showing the published package list — checking the WinGet repository for live versions…
          </span>
        )}
        {status === 'ok' && (
          <span className="text-slate-400">
            Live from the WinGet repository · {visible.length} of {overridden.length} app(s) · tick an app to add it
            to your app pack{note ? ` · ${note}` : ''}
          </span>
        )}
        {status === 'error' && (
          <span className="text-amber-300 inline-flex items-center gap-1.5">
            <AlertTriangle size={13} aria-hidden="true" /> Live catalog unavailable — showing the published reference
            list without downloads. Verify the WinGet repo / replication link, then Refresh.
          </span>
        )}
      </p>

      <TileGrid
        items={tiles}
        categoryOrder={STORE_CATEGORIES}
        showCounts
        unitLabel="app"
        selectedIds={selected}
        onToggle={toggleSelect}
        fallbackIcon={LOGOS.msStore}
        emptyMessage="No apps match the current search."
      />

      {/* App pack panel — the one page on the site with a single scriptable
          install channel (winget + a registered source), so the only place a
          multi-select pack produces something a visitor can actually run. */}
      {selectedApps.length > 0 && (
        <div className="sticky bottom-4 z-40 mt-6">
          <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur shadow-2xl px-5 py-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {selectedApps.map((a) => (
                <span
                  key={a.id}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 pl-1.5 pr-2 py-1"
                >
                  <TileIcon src={a.logo} alt="" size={20} fallback={LOGOS.msStore} />
                  <span className="text-xs text-slate-200 max-w-[10rem] truncate">{a.title}</span>
                  <button
                    type="button"
                    onClick={() => toggleSelect(a.id)}
                    aria-label={`Remove ${a.title} from the app pack`}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-white flex-1 min-w-[150px]">
                App pack · {selectedApps.length} app{selectedApps.length === 1 ? '' : 's'} selected
              </p>
              <button
                type="button"
                onClick={() =>
                  copy(packInstallScript(selectedApps), `Install script copied for ${selectedApps.length} app(s).`)
                }
                className="btn-download text-sm flex items-center gap-2"
                title="Copy one PowerShell script that winget-installs every selected app"
              >
                <Copy size={14} aria-hidden="true" /> Copy install script
              </button>
              <button
                type="button"
                onClick={downloadPackScript}
                className="btn-download text-sm flex items-center gap-2"
                title="Save the install script as apen-app-pack.ps1"
              >
                <Download size={14} aria-hidden="true" /> Download .ps1
              </button>
              <button
                type="button"
                onClick={downloadPackInstallers}
                className="btn-download text-sm flex items-center gap-2"
                title="Download every selected installer from the repo"
              >
                <Download size={14} aria-hidden="true" /> Installers
              </button>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="px-4 py-2 rounded-lg text-sm text-slate-300 border border-white/10 hover:bg-white/5 flex items-center gap-2"
                title="Clear the app pack"
              >
                <X size={14} aria-hidden="true" /> Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
