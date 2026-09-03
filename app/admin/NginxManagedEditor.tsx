'use client'

/**
 * NginxManagedEditor — the "Manage Zones & Upstreams" surface on /admin#nginx.
 *
 * Sysadmins add NEW proxied paths here; each one becomes a live VTS server-zone
 * AND a named HTTP upstream on the dashboard. "Publish & Reload NGINX" writes the
 * nginx config fragments and reloads nginx (mirrors the content "Publish &
 * Rebuild" flow). Degrades to an honest "reload pending" state when the proxy
 * isn't yet allowed to reload nginx (sudoers rule) — the config is still written
 * and takes effect on the next $SITEUPDATE.
 */

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, UploadCloud, Loader2, CheckCircle2, AlertTriangle, Clock, RefreshCw } from 'lucide-react'
import { GlowCard } from '@/components/ui/spotlight-card'
import { adminContentClient } from '@/lib/data/admin-content'
import type { NginxManagedEntry, NginxReloadStatus } from '@/lib/data/nginx-stats'

const BLANK: NginxManagedEntry = { key: '', path: '', label: '', sub: '', backends: [] }
const KEY_RE = /^[a-z][a-z0-9_]{1,31}$/
const PATH_RE = /^\/[A-Za-z0-9._~/-]*$/
const BACKEND_RE = /^[A-Za-z0-9.-]+:\d{1,5}$/
const RESERVED_KEYS = new Set(['main', 'speedtest', 'api', 'winget', 'mirrors', 'apen'])

/** Client-side validation mirroring proxy/nginx-managed.mjs (backend is authoritative). */
function entryError(e: NginxManagedEntry): string | null {
  if (!KEY_RE.test(e.key)) return 'key must be lowercase letters/numbers/underscore, 2–32 chars, starting with a letter'
  if (RESERVED_KEYS.has(e.key)) return `key "${e.key}" is reserved by the base config`
  if (e.path === '/' || !PATH_RE.test(e.path)) return 'path must start with "/" and use only URL-safe characters (e.g. /reports/)'
  if (e.backends.length === 0) return 'add at least one backend (host:port)'
  for (const b of e.backends) if (!BACKEND_RE.test(b)) return `backend "${b}" must be host:port (e.g. 127.0.0.1:9000)`
  return null
}

function StatusLine({ status, reloadEnabled }: { status: NginxReloadStatus; reloadEnabled: boolean }) {
  if (status.state === 'idle') {
    return (
      <p className="text-[11px] text-slate-500">
        {reloadEnabled
          ? 'Edits are staged; Publish & Reload writes the nginx config and reloads nginx.'
          : 'Auto-reload is disabled — Publish writes the config; it applies on the next $SITEUPDATE.'}
      </p>
    )
  }
  const map = {
    running: { icon: <Loader2 size={12} className="animate-spin" />, cls: 'text-cyan-300', text: status.message || 'Reloading nginx…' },
    success: { icon: <CheckCircle2 size={12} />, cls: 'text-emerald-300', text: status.message || 'Published — nginx reloaded.' },
    pending: { icon: <Clock size={12} />, cls: 'text-amber-300', text: status.message || 'Config written — reload pending.' },
    error: { icon: <AlertTriangle size={12} />, cls: 'text-red-300', text: status.message || 'Publish failed.' },
  } as const
  const s = map[status.state as keyof typeof map] ?? map.error
  return <p className={`flex items-start gap-1.5 text-[11px] leading-relaxed ${s.cls}`}>{s.icon}<span>{s.text}</span></p>
}

export function NginxManagedEditor({ onPublished }: { onPublished?: () => void }) {
  const [entries, setEntries] = useState<NginxManagedEntry[]>([])
  const [status, setStatus] = useState<NginxReloadStatus>({ state: 'idle' })
  const [reloadEnabled, setReloadEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const r = await adminContentClient.fetchNginxManaged()
    if (r) { setEntries(r.entries); setStatus(r.reloadStatus); setReloadEnabled(r.reloadEnabled) }
    setLoading(false)
  }, [])
  useEffect(() => { refresh() }, [refresh])

  // Poll while a reload is running so the status settles on its own.
  useEffect(() => {
    if (status.state !== 'running') return
    let cancelled = false
    const t = setInterval(async () => {
      const s = await adminContentClient.getNginxManagedStatus()
      if (cancelled) return
      if (s) setStatus(s)
      if (s && s.state !== 'running') { clearInterval(t); onPublished?.() }
    }, 2000)
    return () => { cancelled = true; clearInterval(t) }
  }, [status.state, onPublished])

  const update = (i: number, patch: Partial<NginxManagedEntry>) => setEntries((es) => es.map((e, j) => (j === i ? { ...e, ...patch } : e)))
  const remove = (i: number) => setEntries((es) => es.filter((_, j) => j !== i))
  const add = () => setEntries((es) => [...es, { ...BLANK }])

  const dupKeys = new Set(entries.map((e) => e.key)).size !== entries.length
  const firstError = entries.map(entryError).find(Boolean) || (dupKeys ? 'two entries share the same key' : null)
  const building = status.state === 'running' || publishing

  async function publish() {
    if (firstError) { setError(firstError); return }
    setError(null); setPublishing(true)
    const r = await adminContentClient.publishNginxManaged(entries, 'admin-ui')
    setPublishing(false)
    if (r.ok) setStatus(r.status)
    else setError(r.error)
  }

  return (
    <GlowCard glowColor={status.state === 'pending' ? 'amber' : 'cyan'} className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <UploadCloud size={16} className="text-cyan-300" />
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white">Manage Zones &amp; Upstreams</p>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
            Add a proxied path — each becomes a live <strong className="text-slate-200">Zone</strong> and{' '}
            <strong className="text-slate-200">Upstream</strong> on the dashboard. Then{' '}
            <strong className="text-slate-200">Publish &amp; Reload NGINX</strong> to apply it.
          </p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-cyan-400/30 hover:text-cyan-300"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="mb-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2">
        <StatusLine status={status} reloadEnabled={reloadEnabled} />
      </div>

      {loading ? (
        <p className="py-6 text-center text-xs text-slate-500">Loading…</p>
      ) : (
        <div className="space-y-3">
          {entries.length === 0 && (
            <p className="rounded-lg border border-dashed border-white/10 px-3 py-6 text-center text-xs text-slate-600">
              No managed zones yet. Click <span className="text-cyan-300">Add</span> to create one.
            </p>
          )}
          {entries.map((e, i) => {
            const err = entryError(e)
            return (
              <div key={i} className={`rounded-lg border p-3 ${err ? 'border-amber-400/25 bg-amber-400/[0.03]' : 'border-white/10 bg-black/20'}`}>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="Key (zone + upstream id)" value={e.key} mono placeholder="reports" onChange={(v) => update(i, { key: v.toLowerCase() })} />
                  <Field label="Path (URL prefix)" value={e.path} mono placeholder="/reports/" onChange={(v) => update(i, { path: v })} />
                  <Field label="Label (dashboard name)" value={e.label} placeholder="/reports/" onChange={(v) => update(i, { label: v })} />
                  <Field label="Description" value={e.sub} placeholder="→ 127.0.0.1:8090" onChange={(v) => update(i, { sub: v })} />
                  <div className="sm:col-span-2">
                    <Field
                      label="Backends (comma-separated host:port)"
                      value={e.backends.join(', ')}
                      mono
                      placeholder="127.0.0.1:8090, 127.0.0.1:8091"
                      onChange={(v) => update(i, { backends: v.split(',').map((b) => b.trim()).filter(Boolean) })}
                    />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-amber-300">{err || ''}</span>
                  <button
                    onClick={() => remove(i)}
                    className="inline-flex h-7 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:border-red-400/40 hover:text-red-300"
                  >
                    <Trash2 size={11} /> Remove
                  </button>
                </div>
              </div>
            )
          })}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={add}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 text-[10px] font-black uppercase tracking-widest text-cyan-300 hover:bg-cyan-400/20"
            >
              <Plus size={12} /> Add zone / upstream
            </button>
            <button
              onClick={publish}
              disabled={building || !!firstError}
              title={firstError ? `Fix: ${firstError}` : undefined}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 text-[10px] font-black uppercase tracking-widest text-emerald-300 hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {building ? (<><Loader2 size={12} className="animate-spin" /> Publishing…</>) : (<><UploadCloud size={12} /> Publish &amp; Reload NGINX</>)}
            </button>
            {error && <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-red-300"><AlertTriangle size={12} /> {error}</span>}
          </div>
        </div>
      )}
    </GlowCard>
  )
}

function Field({ label, value, onChange, placeholder, mono }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-cyan-400/60 ${mono ? 'font-mono' : ''}`}
      />
    </div>
  )
}
