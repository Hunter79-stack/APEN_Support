'use client'

/**
 * AdminChatTranscriptsPanel — admin-wide audit view of every user's chat
 * transcript (see proxy/chat-history.json). Read + delete only; transcripts
 * themselves are written by the chat widget (components/ui/APEN-chat-assistant.tsx)
 * via /api/chat-history, one record per signed-in (realm, username).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GlowCard } from '@/components/ui/spotlight-card'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, RefreshCw, Trash2, X } from 'lucide-react'
import { adminContentClient, type ChatTranscript } from '@/lib/data/admin-content'
import { ExportBar } from '@/components/admin/ExportBar'
import type { ExportColumn } from '@/lib/admin/export'

type Feedback = { kind: 'ok' | 'err'; text: string }

function formatTimestamp(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

function transcriptText(t: ChatTranscript): string {
  return t.messages.map((m) => `[${m.role}] ${m.text}`).join('\n')
}

const EXPORT_COLUMNS: ExportColumn<ChatTranscript>[] = [
  { label: 'Username', value: (t) => t.username },
  { label: 'Realm', value: (t) => t.realm },
  { label: 'Messages', value: (t) => String(t.messages.length) },
  { label: 'Started', value: (t) => formatTimestamp(t.startedAt) },
  { label: 'Updated', value: (t) => formatTimestamp(t.updatedAt) },
  { label: 'Transcript', value: (t) => transcriptText(t) },
]

export function AdminChatTranscriptsPanel() {
  const [transcripts, setTranscripts] = useState<ChatTranscript[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const refreshSeq = useRef(0) // latest request wins: an older list must not land after a newer one
  const refresh = useCallback(async () => {
    const seq = ++refreshSeq.current
    setLoading(true)
    const data = await adminContentClient.fetchChatTranscripts()
    if (seq !== refreshSeq.current) return
    setLoading(false)
    if (!data) {
      setFeedback({ kind: 'err', text: 'Could not reach the admin API. Is the site-stats proxy running?' })
      return
    }
    setTranscripts(data)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const handleDelete = useCallback(async (id: string, username: string) => {
    if (!window.confirm(`Permanently delete the chat transcript for "${username}"?`)) return
    setBusyId(id)
    setFeedback(null)
    const ok = await adminContentClient.deleteChatTranscript(id)
    setBusyId(null)
    if (!ok) {
      setFeedback({ kind: 'err', text: 'Delete failed.' })
      return
    }
    setFeedback({ kind: 'ok', text: `Removed the transcript for "${username}".` })
    await refresh()
  }, [refresh])

  const sorted = useMemo(
    () => [...transcripts].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
    [transcripts],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <span className="text-cyan-200">{transcripts.length}</span>
          <span>transcript{transcripts.length === 1 ? '' : 's'}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ExportBar rows={sorted} columns={EXPORT_COLUMNS} filenameBase="chat-transcripts" title="APEN Chat Transcripts" />
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-cyan-400/30 hover:text-cyan-300 disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role={feedback.kind === 'err' ? 'alert' : 'status'}
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed ${
            feedback.kind === 'ok'
              ? 'border-emerald-400/30 bg-emerald-400/5 text-emerald-200'
              : 'border-red-400/30 bg-red-500/5 text-red-200'
          }`}
        >
          {feedback.kind === 'ok'
            ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
            : <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          }
          <span className="flex-1 whitespace-pre-wrap break-words">{feedback.text}</span>
          <button onClick={() => setFeedback(null)} aria-label="Dismiss" className="shrink-0 text-slate-400 hover:text-white">
            <X size={12} />
          </button>
        </div>
      )}

      {loading && transcripts.length === 0 && (
        <GlowCard glowColor="indigo" className="p-6 text-center">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Loading transcripts…</p>
        </GlowCard>
      )}

      {!loading && sorted.length === 0 && (
        <GlowCard glowColor="indigo" className="p-6 text-center">
          <p className="text-sm text-slate-400">No chat transcripts yet.</p>
          <p className="mt-1 text-xs text-slate-400">Transcripts appear here once a signed-in user starts a chat.</p>
        </GlowCard>
      )}

      {sorted.length > 0 && (
        <div className="grid gap-3">
          {sorted.map((t) => {
            const expanded = expandedId === t.id
            return (
              <GlowCard key={t.id} glowColor="cyan" className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <button
                    onClick={() => setExpandedId(expanded ? null : t.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {expanded ? <ChevronDown size={14} className="shrink-0 text-slate-400" /> : <ChevronRight size={14} className="shrink-0 text-slate-400" />}
                      <p className="text-sm font-semibold text-white">{t.username}</p>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {t.realm}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {t.messages.length} message{t.messages.length === 1 ? '' : 's'}
                      {' · '}
                      started {formatTimestamp(t.startedAt)}
                      {' · '}
                      updated {formatTimestamp(t.updatedAt)}
                    </p>
                  </button>
                  <button
                    onClick={() => handleDelete(t.id, t.username)}
                    disabled={busyId === t.id}
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-red-400/30 hover:text-red-300 disabled:opacity-50"
                  >
                    <Trash2 size={11} /> {busyId === t.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
                {expanded && (
                  <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
                    {t.messages.map((m, i) => (
                      <div key={i} className="rounded-lg border border-white/5 bg-black/20 p-2.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400/80">{m.role}</p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-300">{m.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </GlowCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
