'use client'

/**
 * AnnouncementPathsPanel — manage the live-announcement scan roots from the
 * dashboard instead of SSH-editing LIVE_ANNOUNCEMENT_PATHS in .env.local.
 *
 * GET/POST/DELETE /api/admin/announcement-paths (site-stats.mjs). Saved paths
 * persist to proxy/announcement-paths.json and take precedence over the env
 * var; "Reset to env/defaults" removes the override file.
 */

import { useCallback, useEffect, useState } from 'react'
import { GlowCard } from '@/components/ui/spotlight-card'
import { CheckCircle2, FolderSearch, Plus, RotateCcw, Save, Trash2, XCircle } from 'lucide-react'
import { adminAuthHeaders } from '@/lib/data/admin-content'

const ENDPOINT = '/api/admin/announcement-paths'

interface PathRow {
  label: string
  category: string
  fsPath: string
  urlPrefix: string
}

export function AnnouncementPathsPanel() {
  const [rows, setRows] = useState<PathRow[]>([])
  const [exists, setExists] = useState<boolean[]>([])
  const [source, setSource] = useState<'admin' | 'env'>('env')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(ENDPOINT, {
        cache: 'no-store',
        credentials: 'include',
        headers: adminAuthHeaders(),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (Array.isArray(data?.paths)) {
        setRows(data.paths)
        setExists(Array.isArray(data.exists) ? data.exists : [])
        setSource(data.source === 'admin' ? 'admin' : 'env')
      }
    } catch (err) {
      setMessage({ kind: 'error', text: `Couldn't load scan roots — ${err instanceof Error ? err.message : 'unknown error'}` })
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const update = (i: number, field: keyof PathRow, value: string) =>
    setRows((cur) => cur.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)))

  const save = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders({ write: true }) },
        body: JSON.stringify({ paths: rows }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`)
      setSource('admin')
      setMessage({ kind: 'ok', text: 'Scan roots saved. The home-page feed picks them up on its next refresh.' })
      void load()
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Save failed' })
    } finally { setBusy(false) }
  }

  const reset = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch(ENDPOINT, {
        method: 'DELETE',
        credentials: 'include',
        headers: adminAuthHeaders({ write: true }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setMessage({ kind: 'ok', text: 'Override removed — scan roots follow .env.local / built-in defaults again.' })
      void load()
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Reset failed' })
    } finally { setBusy(false) }
  }

  return (
    <GlowCard glowColor="cyan" className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs text-slate-400">
          <FolderSearch size={14} className="text-cyan-400" />
          Source:{' '}
          <span className={source === 'admin' ? 'text-cyan-300' : 'text-slate-300'}>
            {source === 'admin' ? 'admin-managed (announcement-paths.json)' : '.env.local / built-in defaults'}
          </span>
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setRows((cur) => [...cur, { label: '', category: 'Software', fsPath: '/', urlPrefix: '/' }])}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:border-white/25 hover:text-white"
          >
            <Plus size={13} /> Add root
          </button>
          <button
            onClick={() => void reset()}
            disabled={busy || source !== 'admin'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 enabled:hover:border-white/25 enabled:hover:text-white disabled:opacity-40"
          >
            <RotateCcw size={13} /> Reset to env/defaults
          </button>
          <button
            onClick={() => void save()}
            disabled={busy || rows.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-3 py-1.5 text-xs font-medium text-cyan-300 enabled:hover:bg-cyan-500/25 disabled:opacity-40"
          >
            <Save size={13} /> Save all
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {/* Column legend */}
        <div className="hidden gap-2 px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 lg:grid lg:grid-cols-[1fr_0.7fr_1.4fr_1fr_auto]">
          <span>Label</span><span>Category</span><span>Filesystem path</span><span>Public URL prefix</span><span />
        </div>
        {rows.map((row, i) => (
          <div key={i} className="grid gap-2 rounded-lg border border-white/5 bg-black/20 p-2 lg:grid-cols-[1fr_0.7fr_1.4fr_1fr_auto]">
            {(['label', 'category', 'fsPath', 'urlPrefix'] as const).map((field) => (
              <input
                key={field}
                value={row[field]}
                onChange={(e) => update(i, field, e.target.value)}
                placeholder={field}
                className="h-9 rounded-md border border-white/10 bg-black/30 px-2.5 font-mono text-xs text-white outline-none focus:border-cyan-400/60"
              />
            ))}
            <div className="flex items-center gap-2 px-1">
              {exists[i] === false && (
                <span title="Path does not exist on the server"><XCircle size={14} className="text-amber-400" /></span>
              )}
              <button
                onClick={() => setRows((cur) => cur.filter((_, idx) => idx !== i))}
                title="Remove this root"
                className="text-slate-400 transition-colors hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="px-1 py-2 text-xs text-slate-400">No scan roots configured.</p>}
      </div>

      {message && (
        <p className={`mt-3 flex items-center gap-1.5 text-xs ${message.kind === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
          {message.kind === 'ok' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
          {message.text}
        </p>
      )}
    </GlowCard>
  )
}
