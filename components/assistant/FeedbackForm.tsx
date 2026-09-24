'use client'

/**
 * The assistant's feedback tab: name, category, message with live moderation
 * and character count, submit to /api/site-feedback, then a three-second
 * "received" view before returning to chat. Owns its own draft state; a
 * `seed` from "send feedback on this response" pre-fills an empty message.
 * Split out of APEN-chat-assistant.tsx (code-quality #76).
 */
import { useState } from 'react'
import { ArrowLeft, CheckCircle, ShieldAlert } from 'lucide-react'
import { API_ENDPOINTS } from '@/lib/data/runtime'
import { ASSISTANT_CONFIG, FEEDBACK_CATEGORIES, type FeedbackCategory } from '@/lib/data/assistant'
import { analyzeFeedbackContent } from '@/lib/feedback-moderation.strict'

export function FeedbackForm({ hidden, seed, toolBtnClass, onBack }: {
  hidden: boolean
  /** Pre-fill for an empty message; a new `at` re-applies it. */
  seed: { text: string; at: number } | null
  /** Theme class for the "Back to chat" control (matches the panel's tool buttons). */
  toolBtnClass: string
  onBack: () => void
}) {
  const [fbName, setFbName] = useState('')
  const [fbCategory, setFbCategory] = useState<FeedbackCategory>('General Feedback')
  const [fbMessage, setFbMessage] = useState(seed?.text ?? '')
  const [fbSending, setFbSending] = useState(false)
  const [fbSent, setFbSent] = useState(false)
  const feedbackModeration = analyzeFeedbackContent(fbMessage)
  const feedbackCharactersRemaining = ASSISTANT_CONFIG.maxFeedbackChars - fbMessage.length
  const feedbackCounterTone = feedbackCharactersRemaining <= 100 ? 'text-amber-300' : 'text-gray-500'

  // A new seed pre-fills an EMPTY message (adjusted during render, no effect).
  const [seenSeed, setSeenSeed] = useState(seed)
  if (seed !== seenSeed) {
    setSeenSeed(seed)
    if (seed && !fbMessage.trim()) setFbMessage(seed.text)
  }

  const handleFeedbackSubmit = async () => {
    if (!fbMessage.trim() || fbSending) return
    setFbSending(true)
    try {
      const response = await fetch(API_ENDPOINTS.siteFeedback, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fbName.trim(),
          category: fbCategory,
          message: fbMessage,
          moderation: feedbackModeration,
          timestamp: new Date().toISOString(),
        }),
      })

      if (response.ok) {
        setFbSent(true)
        setFbName('')
        setFbMessage('')
        setTimeout(() => {
          setFbSent(false)
          onBack()
        }, 3000)
      }
    } catch (err) {
      console.error('Feedback submission failed', err)
    } finally {
      setFbSending(false)
    }
  }

  return (
  <div hidden={hidden} className="flex-1 space-y-4 overflow-y-auto p-6 text-xs">
    <button onClick={onBack} className={`-mt-2 inline-flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-bold uppercase tracking-widest ${toolBtnClass}`}>
      <ArrowLeft size={12} /> Back to chat
    </button>
    {fbSent ? (
      <div className="flex h-full flex-col items-center justify-center space-y-3 text-center">
        <CheckCircle className="text-green-500" size={48} />
        <p className="font-bold uppercase tracking-widest text-white">Feedback Received</p>
        <p className="text-gray-400">Thank you for helping improve the APEN Environment.</p>
      </div>
    ) : (
      <>
        <p className="mb-4 text-center text-gray-400">Report bugs or request features for the CESC team.</p>
        <div className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="feedback-name" className="text-[10px] font-bold uppercase text-gray-500">Name (Optional)</label>
            <input
              id="feedback-name"
              value={fbName}
              onChange={(event) => setFbName(event.target.value)}
              maxLength={80}
              autoComplete="name"
              placeholder="Name or team"
              className="w-full rounded border border-white/10 bg-white/5 p-2 text-white placeholder:text-gray-600 focus:border-red-600 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="feedback-category" className="text-[10px] font-bold uppercase text-gray-500">Category</label>
            <select
              id="feedback-category"
              value={fbCategory}
              onChange={e => setFbCategory(e.target.value as FeedbackCategory)}
              className="w-full rounded border border-white/10 bg-white/5 p-2 text-white focus:border-red-600 focus:outline-none"
            >
              {FEEDBACK_CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0a0f23]">{c}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="feedback-details" className="text-[10px] font-bold uppercase text-gray-500">Details</label>
              <span id="feedback-character-count" aria-live="polite" className={`text-[10px] font-bold tabular-nums ${feedbackCounterTone}`}>
                {fbMessage.length} / {ASSISTANT_CONFIG.maxFeedbackChars}
              </span>
            </div>
            <textarea
              id="feedback-details"
              value={fbMessage}
              onChange={e => setFbMessage(e.target.value)}
              rows={6}
              maxLength={ASSISTANT_CONFIG.maxFeedbackChars}
              aria-describedby="feedback-character-count feedback-moderation.strict-status"
              placeholder="Please describe the issue or suggestion..."
              className="w-full resize-none rounded border border-white/10 bg-white/5 p-2 text-white placeholder:text-gray-600 focus:border-red-600 focus:outline-none"
            />
          </div>

          {fbMessage.trim() && (
            <div
              id="feedback-moderation.strict-status"
              aria-live="polite"
              className={`rounded border p-3 ${feedbackModeration.flagged ? 'border-amber-400/30 bg-amber-500/10 text-amber-100' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'}`}
            >
              <div className="flex items-start gap-2">
                {feedbackModeration.flagged ? (
                  <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
                ) : (
                  <CheckCircle size={16} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
                )}
                <div className="min-w-0 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest">
                    {feedbackModeration.flagged ? 'Flagged by Local AI' : 'Local AI Review Clear'}
                  </p>
                  <p className="text-[11px] leading-relaxed opacity-80">{feedbackModeration.guidance}</p>
                  {feedbackModeration.flagged && (
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                      Review reason: {feedbackModeration.reasons.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleFeedbackSubmit}
            disabled={fbSending}
            className="w-full rounded bg-red-700 py-3 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            {fbSending ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </>
    )}
  </div>
  )
}
