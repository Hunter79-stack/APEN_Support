'use client'

/**
 * AdminAssistantChipsPanel — add, remove, modify, and reorder the suggested-
 * prompt "chips" shown in the empty state of the APEN-chat-assistant.
 *
 * GET/POST/DELETE /api/admin/assistant-prompts (site-stats.mjs). Saved chips
 * persist to proxy/assistant-prompts.json and are exposed on the public
 * /api/content-overrides response, so the chat picks them up on its next page
 * load — no rebuild. "Reset to defaults" removes the override file.
 */

import { useCallback, useEffect, useState } from 'react'
import { GlowCard } from '@/components/ui/spotlight-card'
import { CheckCircle2, ChevronDown, ChevronUp, MessageSquarePlus, Plus, RotateCcw, Save, Trash2, XCircle } from 'lucide-react'
import { adminAuthHeaders } from '@/lib/data/admin-content'
import { API_ENDPOINTS } from '@/lib/data/runtime'

const ENDPOINT = API_ENDPOINTS.adminAssistantPrompts
const MAX_CHIPS = 12
const MAX_LEN = 120

export function AdminAssistantChipsPanel() {
  const [chips, setChips] = useState<string[]>([])
  const [source, setSource] = useState<'admin' | 'default'>('default')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(ENDPOINT, {
        cache: 'no-store',
        headers: adminAuthHeaders(),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (Array.isArray(data?.prompts)) {
        setChips(data.prompts.map((p: unknown) => String(p)))
        setSource(data.source === 'admin' ? 'admin' : 'default')
      }
    } catch (err) {
      setMessage({ kind: 'error', text: `Couldn't load chips — ${err instanceof Error ? err.message : 'unknown error'}` })
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const update = (i: number, value: string) =>
    setChips((cur) => cur.map((c, idx) => (idx === i ? value.slice(0, MAX_LEN) : c)))

  const move = (i: number, dir: -1 | 1) =>
    setChips((cur) => {
      const j = i + dir
      if (j < 0 || j >= cur.length) return cur
      const next = [...cur]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const save = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const cleaned = chips.map((c) => c.replace(/\s+/g, ' ').trim()).filter(Boolean)
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders({ write: true }) },
        body: JSON.stringify({ prompts: cleaned }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`)
      setSource('admin')
      setMessage({ kind: 'ok', text: 'Chips saved. The chat picks them up on its next page load.' })
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
        headers: adminAuthHeaders({ write: true }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setMessage({ kind: 'ok', text: 'Override removed — the chat shows the built-in default chips again.' })
      void load()
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Reset failed' })
    } finally { setBusy(false) }
  }

  return (
    <GlowCard glowColor="cyan" className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs text-slate-400">
          <MessageSquarePlus size={14} className="text-cyan-400" />
          Source:{' '}
          <span className={source === 'admin' ? 'text-cyan-300' : 'text-slate-300'}>
            {source === 'admin' ? 'admin-managed (assistant-prompts.json)' : 'built-in defaults'}
          </span>
          <span className="text-slate-400">· {chips.length}/{MAX_CHIPS}</span>
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setChips((cur) => (cur.length >= MAX_CHIPS ? cur : [...cur, '']))}
            disabled={chips.length >= MAX_CHIPS}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 enabled:hover:border-white/25 enabled:hover:text-white disabled:opacity-40"
          >
            <Plus size={13} /> Add chip
          </button>
          <button
            onClick={() => void reset()}
            disabled={busy || source !== 'admin'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 enabled:hover:border-white/25 enabled:hover:text-white disabled:opacity-40"
          >
            <RotateCcw size={13} /> Reset to defaults
          </button>
          <button
            onClick={() => void save()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-3 py-1.5 text-xs font-medium text-cyan-300 enabled:hover:bg-cyan-500/25 disabled:opacity-40"
          >
            <Save size={13} /> Save all
          </button>
        </div>
      </div>

      <p className="mb-3 text-xs text-slate-400 leading-relaxed">
        These are the clickable prompt chips under <span className="text-slate-300">“APEN Knowledge Base Active”</span> in the
        chat. Clicking a chip sends it immediately. Order here is the order shown. Save with an empty list to hide all chips.
      </p>

      <div className="space-y-2">
        {chips.map((chip, i) => (
          <div key={i} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-lg border border-white/5 bg-black/20 p-2">
            <div className="flex flex-col">
              <button onClick={() => move(i, -1)} disabled={i === 0} title="Move up" className="text-slate-400 enabled:hover:text-cyan-300 disabled:opacity-30"><ChevronUp size={14} /></button>
              <button onClick={() => move(i, 1)} disabled={i === chips.length - 1} title="Move down" className="text-slate-400 enabled:hover:text-cyan-300 disabled:opacity-30"><ChevronDown size={14} /></button>
            </div>
            <input
              value={chip}
              onChange={(e) => update(i, e.target.value)}
              maxLength={MAX_LEN}
              placeholder="e.g. How do I add an RPM repo?"
              className="h-9 w-full rounded-md border border-white/10 bg-black/30 px-2.5 text-xs text-white outline-none focus:border-cyan-400/60"
            />
            <button
              onClick={() => setChips((cur) => cur.filter((_, idx) => idx !== i))}
              title="Remove this chip"
              className="px-1 text-slate-400 transition-colors hover:text-red-400"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {chips.length === 0 && <p className="px-1 py-2 text-xs text-slate-400">No chips — the chat empty state will show no prompt buttons.</p>}
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
