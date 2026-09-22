'use client'

/**
 * The conversation itself: the composer text and attachment, the message
 * list and per-message ratings (mirrored to sessionStorage and to the
 * server's per-user transcript), the pending/error state, and the actions —
 * send, retry from an assistant turn, rate, clear. Lifted out of
 * APEN-chat-assistant.tsx (code-quality #76) so the component is layout.
 */
import { useCallback, useEffect, useState } from 'react'
import { API_ENDPOINTS } from '@/lib/data/runtime'
import { MAX_ASSISTANT_MESSAGE_CHARS, buildAssistantRequestMessages } from '@/lib/assistant/policy'
import {
  clearAssistantSession,
  readStoredMessages,
  readStoredRatings,
  storeMessages,
  storeRatings,
} from '@/lib/assistant/storage'
import type { AssistantAttachment, AssistantMessage as Message } from '@/lib/assistant/types'

export function useTranscript({ isVisible, onReply }: {
  /** The assistant is mounted on this page; persistence and hydration only run then. */
  isVisible: boolean
  /** Called with each assistant reply as it lands (the panel uses it for the HTML preview). */
  onReply?: (reply: string) => void
}) {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>(readStoredMessages)
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState('')
  const [ratings, setRatings] = useState<Record<number, 1 | -1>>(readStoredRatings)
  const [attached, setAttached] = useState<AssistantAttachment | null>(null)

  useEffect(() => { if (isVisible && messages.length) storeMessages(messages) }, [isVisible, messages])
  useEffect(() => { if (isVisible && Object.keys(ratings).length) storeRatings(ratings) }, [isVisible, ratings])
  useEffect(() => {
    if (!isVisible || !messages.length) return
    fetch(API_ENDPOINTS.chatHistory, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    }).catch(() => { /* best-effort */ })
  }, [isVisible, messages])

  /* Hydrate from the server's copy of this user's transcript once, on first
     become-visible — this is what makes the SAME conversation show up on a
     second device once signed in there too. Only overrides the local
     sessionStorage cache when the server actually has something; an empty
     server response (not signed in yet, or a brand new user) leaves
     whatever readStoredMessages() already loaded untouched. */
  useEffect(() => {
    if (!isVisible) return
    let cancelled = false
    fetch(API_ENDPOINTS.chatHistory, { credentials: 'include', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages)
        }
      })
      .catch(() => { /* best-effort */ })
    return () => { cancelled = true }
  }, [isVisible])

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (typeof overrideText === 'string' ? overrideText : message).trim()
    if ((!text && !attached) || thinking) return
    if (text.length > MAX_ASSISTANT_MESSAGE_CHARS) {
      setError(`Messages are limited to ${MAX_ASSISTANT_MESSAGE_CHARS.toLocaleString()} characters.`)
      return
    }

    const sentAttached = attached
    const newUserMsg: Message = { role: 'user', text, ts: Date.now(), attachmentName: sentAttached?.name }
    const updatedHistory = [...messages, newUserMsg]

    setMessages(updatedHistory)
    setMessage('')
    setAttached(null)
    setThinking(true)
    setError('')

    try {
      const response = await fetch(API_ENDPOINTS.voltronChat, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: buildAssistantRequestMessages(updatedHistory),
          // Sent as its own field (not folded into the message text) so the
          // server can apply attachment-specific limits and summarize large
          // files instead of the chat-message character cap silently
          // truncating most of it.
          attachment: sentAttached
            ? { name: sentAttached.name, content: sentAttached.content, size: sentAttached.size }
            : null,
        }),
      })

      if (!response.ok) {
        // 502/503/504 mean the proxy is up but every Voltron upstream is
        // unreachable — a persistent condition on this network, not a blip.
        // Surface that honestly instead of a generic "retry" nudge.
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          throw Object.assign(new Error('upstream_down'), { offline: true })
        }
        if (response.status === 429) {
          throw new Error('You are sending messages too quickly — wait a few seconds and try again.')
        }
        throw new Error('The assistant could not process that request. Please retry.')
      }
      const data = await response.json()
      const reply = data?.choices?.[0]?.message?.content ?? 'Unable to process request.'
      setMessages((p) => [...p, { role: 'assistant', text: reply, ts: Date.now() }])
      onReply?.(reply)
    } catch (err) {
      const offline = (err instanceof TypeError) /* network-level failure */
        || Boolean((err as { offline?: boolean })?.offline)
      setError(offline
        ? 'The AI assistant is offline right now (its backend is unreachable). Your other support options still work — try the knowledge base or open a TrackIt ticket.'
        : err instanceof Error && err.message && err.message !== 'upstream_down'
          ? err.message
          : 'Connection failed. Please retry.')
      // Put the user's text (and attachment) back so nothing they entered is lost.
      setMessages((p) => p.filter((m) => m.ts !== newUserMsg.ts))
      setMessage(text)
      if (sentAttached) setAttached(sentAttached)
    } finally {
      setThinking(false)
    }
  }, [message, messages, thinking, attached, onReply])

  const retryFrom = useCallback(async (assistantIdx: number) => {
    if (thinking) return
    let userIdx = assistantIdx - 1
    while (userIdx >= 0 && messages[userIdx]?.role !== 'user') userIdx--
    if (userIdx < 0) return
    const history = messages.slice(0, userIdx + 1)
    const snapshot = messages
    setMessages(history)
    setThinking(true); setError('')
    try {
      const response = await fetch(API_ENDPOINTS.voltronChat, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: buildAssistantRequestMessages(history) }),
      })
      if (!response.ok) throw new Error('retry_failed')
      const data = await response.json()
      const reply = data?.choices?.[0]?.message?.content ?? 'Unable to process request.'
      setMessages((p) => [...p, { role: 'assistant', text: reply, ts: Date.now() }])
      onReply?.(reply)
    } catch {
      setError('Retry failed. Please try again.')
      setMessages(snapshot)
    } finally {
      setThinking(false)
    }
  }, [messages, thinking, onReply])

  /* ── Thumbs up / down (local toggle) ── */
  const rateMessage = useCallback((i: number, rating: 1 | -1) => {
    setRatings((r) => {
      const next = { ...r }
      if (next[i] === rating) delete next[i]
      else next[i] = rating
      return next
    })
  }, [])

  /* ── Clear chat ── */
  const clearTranscript = useCallback(() => {
    setMessages([]); setError(''); setRatings({})
    try {
      clearAssistantSession()
    } catch { /* ignore */ }
  }, [])

  return {
    message, setMessage, attached, setAttached,
    messages, setMessages, ratings, thinking, error, setError,
    handleSend, retryFrom, rateMessage, clearTranscript,
  }
}
