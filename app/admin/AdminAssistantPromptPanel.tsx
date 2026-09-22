'use client'

/**
 * AdminAssistantPromptPanel — edit the half of the Voltron system prompt that
 * goes stale: who the assistant is, and what the APEN offers (including the
 * AI SERVICES block).
 *
 * GET/POST/DELETE /api/admin/assistant-system-prompt (site-stats.mjs), stored
 * in proxy/assistant-system-prompt.json. voltron-proxy.mjs re-reads that file
 * on its next request, so a save reaches the very next question asked — no
 * rebuild, no proxy restart.
 *
 * The response-format and anti-hallucination rules are deliberately NOT
 * editable here: they encode what the chat panel can render and what stops the
 * model inventing links. See proxy/assistant-knowledge.mjs.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { GlowCard } from '@/components/ui/spotlight-card'
import { Bot, CheckCircle2, RotateCcw, Save, XCircle } from 'lucide-react'
import { adminAuthHeaders } from '@/lib/data/admin-content'
import { API_ENDPOINTS } from '@/lib/data/runtime'

const ENDPOINT = API_ENDPOINTS.adminAssistantSystemPrompt

export function AdminAssistantPromptPanel() {
  const [text, setText] = useState('')
  const [saved, setSaved] = useState('')
  const [fallback, setFallback] = useState('')
  const [maxChars, setMaxChars] = useState(24_000)
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
      const knowledge = String(data?.knowledge ?? '')
      setText(knowledge)
      setSaved(knowledge)
      setFallback(String(data?.default ?? ''))
      if (Number.isFinite(data?.maxChars)) setMaxChars(Number(data.maxChars))
      setSource(data?.source === 'admin' ? 'admin' : 'default')
    } catch (err) {
      setMessage({ kind: 'error', text: `Couldn't load the knowledge block — ${err instanceof Error ? err.message : 'unknown error'}` })
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const dirty = text !== saved
  const tooLong = text.length > maxChars
  const matchesDefault = useMemo(() => text.trim() === fallback.trim(), [text, fallback])

  const save = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders({ write: true }) },
        body: JSON.stringify({ knowledge: text }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`)
      setMessage({ kind: 'ok', text: 'Saved. The next question the assistant answers uses it — no restart needed.' })
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
      setMessage({ kind: 'ok', text: 'Override removed — the assistant is back on the built-in knowledge block.' })
      void load()
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : 'Reset failed' })
    } finally { setBusy(false) }
  }

  return (
    <GlowCard glowColor="cyan" className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <Bot size={14} className="text-cyan-400" />
          Source:{' '}
          <span className={source === 'admin' ? 'text-cyan-300' : 'text-slate-300'}>
            {source === 'admin' ? 'admin-managed (assistant-system-prompt.json)' : 'built-in default'}
          </span>
          <span className={tooLong ? 'text-red-400' : 'text-slate-400'}>
            · {text.length.toLocaleString()}/{maxChars.toLocaleString()} chars
          </span>
          {dirty && <span className="text-amber-300">· unsaved changes</span>}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setText(fallback)}
            disabled={busy || !fallback || matchesDefault}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 enabled:hover:border-white/25 enabled:hover:text-white disabled:opacity-40"
          >
            Load default text
          </button>
          <button
            onClick={() => void reset()}
            disabled={busy || source !== 'admin'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 enabled:hover:border-white/25 enabled:hover:text-white disabled:opacity-40"
          >
            <RotateCcw size={13} /> Reset to default
          </button>
          <button
            onClick={() => void save()}
            disabled={busy || !dirty || tooLong || !text.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200 enabled:hover:border-cyan-300/60 enabled:hover:text-white disabled:opacity-40"
          >
            <Save size={13} /> Save
          </button>
        </div>
      </div>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        spellCheck={false}
        rows={26}
        className="w-full rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs leading-relaxed text-slate-200 outline-none focus:border-cyan-400/50"
        aria-label="Assistant knowledge block"
      />

      {message && (
        <p className={`mt-3 flex items-center gap-2 text-xs ${message.kind === 'ok' ? 'text-emerald-300' : 'text-red-300'}`}>
          {message.kind === 'ok' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          {message.text}
        </p>
      )}
    </GlowCard>
  )
}
