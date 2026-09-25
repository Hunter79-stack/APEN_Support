'use client'

import React, { useState, useRef, useEffect, useCallback, useSyncExternalStore, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import {
  Send, X, ShieldAlert,
  Sun, Moon, Maximize2, Minimize2, Download, Trash2,
  Copy, Check, ThumbsUp, ThumbsDown, RotateCcw, Paperclip, ArrowDown, MessageSquare,
  Sparkles,
} from 'lucide-react'
import { API_ENDPOINTS } from '@/lib/data/runtime'
import {
  ASSISTANT_CONFIG,
  ASSISTANT_SUGGESTED_PROMPTS,
  ASSISTANT_LAUNCHER,
  ASSISTANT_GREETING,
  ASSISTANT_INPUT_PLACEHOLDER,
  ASSISTANT_AI_DISCLAIMER,
  ASSISTANT_SHORTCUT,
  ASSISTANT_ATTACH_LABEL,
  assistantAttachTooltip,
} from '@/lib/data/assistant'
import { FormattedMessage, normalizeAssistantRoute } from '@/components/assistant/FormattedMessage'
import { FeedbackForm } from '@/components/assistant/FeedbackForm'
import { GreetingCard } from '@/components/assistant/GreetingCard'
import { useLauncherIntro } from '@/lib/hooks/useLauncherIntro'
import {
  ASSISTANT_ATTACHMENT_ACCEPT,
  ASSISTANT_ATTACHMENT_LIMIT_LABEL,
  MAX_ASSISTANT_MESSAGE_CHARS,
  readAssistantTextAttachment,
} from '@/lib/assistant/policy'
import { ASSISTANT_MESSAGES_STORAGE_KEY, ASSISTANT_RATINGS_STORAGE_KEY } from '@/lib/assistant/storage'
import { useTranscript } from '@/lib/hooks/useTranscript'
import type { AssistantMessage as Message } from '@/lib/assistant/types'
import {
  ASSISTANT_MARGIN,
  ASSISTANT_PANEL_POSITION_STORAGE_KEY,
  ASSISTANT_PANEL_SIZE_STORAGE_KEY,
  PANEL_DEFAULT_HEIGHT,
  PANEL_DEFAULT_WIDTH,
  clampPanelPosition,
  clampPanelSize,
  storePanelPosition,
  storePanelSize,
  type AssistantPosition,
  type AssistantSize,
  type AssistantViewport,
} from '@/lib/assistant/panel-geometry'
import { usePanelGeometry, type ResizeDirection } from '@/lib/hooks/usePanelGeometry'
import { downloadFile, openPrintableReport } from '@/lib/utils/download-file'

type ExportFormat = 'pdf' | 'markdown' | 'html' | 'json'

const subscribeToClientEnvironment = () => () => undefined
const getClientEnvironmentSnapshot = () => true
const getServerEnvironmentSnapshot = () => false

function getCurrentViewport(): AssistantViewport {
  return typeof window === 'undefined'
    ? { width: 0, height: 0 }
    : { width: window.innerWidth, height: window.innerHeight }
}

function readStoredTheme(): 'dark' | 'light' {
  try {
    const storedTheme = window.localStorage.getItem('apen-ai-assistant-theme')
    return storedTheme === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

/* The first-visit greeting is a once-per-browser event. The flag is written
   the moment the card is shown (not when it is dismissed) so a visitor who
   navigates away mid-greeting isn't re-greeted on every subsequent page.
   A storage failure (private mode, blocked cookies) degrades to "not seen",
   which just means the greeting may appear again — never a hard error. */
function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element || typeof element.tagName !== 'string') return false
  return element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)
}

/** Escape text for safe interpolation into exported HTML. */
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ))
}

/** Pull the first ```html fenced block out of an assistant reply (for Live Preview). */
function extractHtmlBlock(text: string): string | null {
  const m = text.match(/```html\s*([\s\S]*?)```/i)
  return m ? m[1].trim() : null
}

/** Tenable-style robot mark used as the assistant message avatar (matches the FCC widget). */
function BotAvatar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} fill="currentColor" aria-hidden="true">
      <path d="M491.844 22.533l-83.42 14.865L196.572 249.25c3.262 4.815 5.37 10.72 5.37 16.932 0 5.863-1.71 11.35-4.643 15.996-5.065-1.606-10.448-2.477-16.027-2.477-15.724 0-29.904 6.89-39.69 17.796l-9.112-9.113 17.237-17.237c-4.515-5.772-8.907-11.645-13.19-17.6l-19.443 19.44-13.215-13.215 21.828-21.827c-4.403-6.59-8.67-13.278-12.792-20.068l-40.802 40.803 58.314 58.314c-1.613 5.075-2.49 10.47-2.49 16.063 0 7.666 1.65 14.96 4.592 21.564l-72.14 72.14-14.56-14.56L21.013 437l14.558 14.56-8.607 8.608 27.246 27.246 8.606-8.61 14.56 14.56 24.798-24.8-14.557-14.556 72.158-72.16c6.586 2.922 13.858 4.562 21.498 4.562 5.593 0 10.988-.877 16.063-2.49l58.363 58.363L296.5 401.48c-6.797-4.127-13.486-8.395-20.068-12.793l-21.83 21.83L241.39 397.3l19.442-19.44c-5.962-4.29-11.835-8.683-17.603-13.194l-17.238 17.238-9.16-9.16c10.905-9.785 17.795-23.965 17.795-39.69 0-5.346-.806-10.51-2.285-15.39 4.703-3.04 10.288-4.817 16.265-4.816 6.21 0 11.776 1.77 16.52 4.955L476.98 105.95l14.864-83.417zm-66.227 53.012l13.215 13.215-191.684 191.68-13.214-13.213L425.617 75.545zM181.273 298.39c19.257 0 34.665 15.41 34.665 34.665 0 19.256-15.408 34.666-34.665 34.666-19.256 0-34.666-15.41-34.666-34.665s15.41-34.666 34.666-34.666z" />
    </svg>
  )
}

interface AssistantDragState {
  pointerId: number
  target: HTMLButtonElement
  offsetX: number
  offsetY: number
  startX: number
  startY: number
  moved: boolean
}

export const VOLTRON_IMAGE_SRC = ASSISTANT_CONFIG.imageSrc
// Storage key was bumped from -position → -position-v2 when the default
// anchor moved from bottom-left to bottom-right. Old entries pinned to
// the left edge are abandoned so every returning user starts on the right
// (the new design intent); anyone who explicitly drags the button still
// gets their new position persisted under the v2 key.
export const ASSISTANT_POSITION_STORAGE_KEY = 'apen-ai-assistant-position-v2'
export { ASSISTANT_PANEL_POSITION_STORAGE_KEY, ASSISTANT_PANEL_SIZE_STORAGE_KEY }
/* Chat transcript persistence — sessionStorage survives client-side navigation
   but clears when the browser tab/session ends. */
export { ASSISTANT_MESSAGES_STORAGE_KEY, ASSISTANT_RATINGS_STORAGE_KEY }

/* Capsule geometry, in px, applied as INLINE STYLE rather than through
   Tailwind utilities. The alignment here has to be pixel-exact — the pill's
   rounded cap must land concentric with the head — and inline styles can't be
   defeated by a utility failing to resolve, a cascade-layer surprise, or a
   stale stylesheet. Everything cosmetic (colour, border, radius) stays in
   classes; only the numbers that decide alignment live here.

   LAUNCHER_VISUAL_SIZE must match the trigger's h-14/w-14 (56px): the pill is
   the same height, so its cap radius (28) is the button's radius, and the two
   silhouettes fuse. HEAD_SIZE is smaller so the head sits INSIDE the capsule
   with an even (56-40)/2 = 8px ring of pill body around it. */
export const LAUNCHER_VISUAL_SIZE = 56
export const LAUNCHER_HEAD_SIZE = 40
/* Padding on the capped side must clear the head plus a breathing gap. */
const PILL_CAP_PADDING = LAUNCHER_VISUAL_SIZE + 8
const PILL_OUTER_PADDING = 20

const ASSISTANT_BUTTON_SIZE = 65
/* How far the DEFAULT first-load anchor sits in from the bottom-right corner.
   Deliberately larger than ASSISTANT_MARGIN so the button (and the panel that
   opens next to it) rest clear of the very corner / footer content instead of
   jammed against the edges. ASSISTANT_MARGIN still governs edge clamping while
   dragging and the button↔panel gap — only the resting anchor is inset. */
const ASSISTANT_DEFAULT_INSET = 40
const DRAG_THRESHOLD_PX = 4


type PanelTab = 'chat' | 'feedback'

/* Eight resize directions — four edges + four corners. The string includes
   the axis letters that should grow with the pointer (n = north / s = south
   / e = east / w = west). 'n' means dragging the top edge; 'se' means
   dragging the bottom-right corner; etc. */

const RESIZE_HANDLE_CONFIG: Record<ResizeDirection, { className: string; label: string }> = {
  // Edges — thin strips just inside the panel border. Corner handles
  // overlay these where they meet, so cursor priority works out.
  n:  { className: 'absolute left-3 right-3 top-0 h-1.5 cursor-ns-resize touch-none',   label: 'Resize panel from top edge'         },
  s:  { className: 'absolute left-3 right-3 bottom-0 h-1.5 cursor-ns-resize touch-none', label: 'Resize panel from bottom edge'     },
  e:  { className: 'absolute top-3 bottom-3 right-0 w-1.5 cursor-ew-resize touch-none', label: 'Resize panel from right edge'       },
  w:  { className: 'absolute top-3 bottom-3 left-0 w-1.5 cursor-ew-resize touch-none',  label: 'Resize panel from left edge'        },
  // Corners — slightly bigger square targets, layered above edges so the
  // diagonal cursor wins where they intersect the edge handles.
  nw: { className: 'absolute top-0 left-0 h-3 w-3 cursor-nwse-resize touch-none z-10',  label: 'Resize panel from top-left corner'  },
  ne: { className: 'absolute top-0 right-0 h-3 w-3 cursor-nesw-resize touch-none z-10', label: 'Resize panel from top-right corner' },
  sw: { className: 'absolute bottom-0 left-0 h-3 w-3 cursor-nesw-resize touch-none z-10', label: 'Resize panel from bottom-left corner' },
  se: { className: 'absolute bottom-0 right-0 h-4 w-4 cursor-se-resize touch-none z-10', label: 'Resize panel from bottom-right corner' },
}

export function shouldShowAssistant(pathname: string | null) {
  return !(pathname ?? '').toLowerCase().startsWith('/admin')
}

export function shouldAutoOpenAssistant(args: {
  open: boolean
  hasAutoOpened: boolean
  selectedText: string
  lowPowerMode?: boolean
}) {
  return !args.open && !args.hasAutoOpened && !args.selectedText.trim() && !args.lowPowerMode
}

export function clampAssistantPosition(
  position: AssistantPosition,
  viewport: AssistantViewport,
  size = ASSISTANT_BUTTON_SIZE,
  margin = ASSISTANT_MARGIN,
): AssistantPosition {
  const maxX = Math.max(margin, viewport.width - size - margin)
  const maxY = Math.max(margin, viewport.height - size - margin)

  return {
    x: Math.min(Math.max(position.x, margin), maxX),
    y: Math.min(Math.max(position.y, margin), maxY),
  }
}

function defaultAssistantPosition(viewport: AssistantViewport): AssistantPosition {
  // Bottom-right of the viewport, inset from the corner by ASSISTANT_DEFAULT_INSET
  // so it rests clear of the very corner rather than jammed against the edges.
  // Users can drag elsewhere and the position is persisted in localStorage; this
  // is just the first-load anchor and the fallback when the stored position
  // would land in an unusable spot.
  return clampAssistantPosition(
    {
      x: viewport.width - ASSISTANT_BUTTON_SIZE - ASSISTANT_DEFAULT_INSET,
      y: viewport.height - ASSISTANT_BUTTON_SIZE - ASSISTANT_DEFAULT_INSET,
    },
    viewport,
  )
}

export function isAssistantPositionTrapped(position: AssistantPosition, viewport: AssistantViewport) {
  const hasRoomToReset = viewport.width > ASSISTANT_BUTTON_SIZE + ASSISTANT_MARGIN * 2
    && viewport.height > ASSISTANT_BUTTON_SIZE + ASSISTANT_MARGIN * 2

  // Treat the top-left corner as a trap — historic behaviour for when a
  // stored position lands somewhere unreachable after a viewport shrink.
  // The "x <= margin" half still catches the old left-anchor that we have
  // since deprecated, which gives any returning user a clean reset to the
  // new bottom-right default.
  return hasRoomToReset && position.x <= ASSISTANT_MARGIN && position.y <= ASSISTANT_MARGIN
}

export function resolveAssistantPositionForViewportChange({
  currentPosition,
  viewport,
  storedPosition,
  resetToDefault = false,
}: {
  currentPosition: AssistantPosition | null
  viewport: AssistantViewport
  storedPosition: AssistantPosition
  resetToDefault?: boolean
}) {
  if (resetToDefault) return defaultAssistantPosition(viewport)

  return currentPosition && !isAssistantPositionTrapped(currentPosition, viewport)
    ? clampAssistantPosition(currentPosition, viewport)
    : storedPosition
}

function storeAssistantPosition(position: AssistantPosition) {
  try {
    window.localStorage.setItem(ASSISTANT_POSITION_STORAGE_KEY, JSON.stringify(position))
  } catch {
    // Ignore storage failures; dragging should still work for the current session.
  }
}

/* ── Panel position/size persistence ───────────────────────────── */

export function getAssistantPanelPosition(
  buttonPosition: AssistantPosition,
  viewport: AssistantViewport,
  panelSize: AssistantSize,
  buttonSize = ASSISTANT_BUTTON_SIZE,
  margin = ASSISTANT_MARGIN,
): AssistantPosition {
  // Place + clamp using the panel's ACTUAL footprint (first clamped to the
  // viewport) so the real, possibly-large panel stays fully on-screen. A fixed
  // smaller assumption here would position the panel as if it were small and
  // let the extra width/height spill off the right and bottom edges — which
  // showed up as the window opening barely visible in the corner.
  const panelWidth = Math.min(panelSize.width, Math.max(0, viewport.width - margin * 2))
  const panelHeight = Math.min(panelSize.height, Math.max(0, viewport.height - margin * 2))
  const openLeft = buttonPosition.x + buttonSize / 2 > viewport.width / 2
  const openUp = buttonPosition.y + buttonSize / 2 > viewport.height / 2
  const rawX = openLeft ? buttonPosition.x + buttonSize - panelWidth : buttonPosition.x
  const rawY = openUp ? buttonPosition.y - panelHeight - margin : buttonPosition.y + buttonSize + margin
  const maxX = Math.max(margin, viewport.width - panelWidth - margin)
  const maxY = Math.max(margin, viewport.height - panelHeight - margin)

  return {
    x: Math.min(Math.max(rawX, margin), maxX),
    y: Math.min(Math.max(rawY, margin), maxY),
  }
}

/* Which side of the (draggable) button the name pill and the greeting card
   should grow toward, so neither ever runs off the edge of the screen. Same
   half-of-the-viewport test getAssistantPanelPosition() uses, so the label,
   the greeting and the chat window all flip together and stay visually
   consistent. `null` position = pre-hydration, when the button is anchored
   bottom-right by CSS — the callout belongs left/up from there. */
export function getAssistantCalloutAnchor(
  buttonPosition: AssistantPosition | null,
  viewport: AssistantViewport,
  buttonSize = ASSISTANT_BUTTON_SIZE,
): { horizontal: 'left' | 'right'; vertical: 'up' | 'down' } {
  if (!buttonPosition || !viewport.width || !viewport.height) {
    return { horizontal: 'left', vertical: 'up' }
  }
  return {
    horizontal: buttonPosition.x + buttonSize / 2 > viewport.width / 2 ? 'left' : 'right',
    vertical: buttonPosition.y + buttonSize / 2 > viewport.height / 2 ? 'up' : 'down',
  }
}

export function FloatingAiAssistant() {
  const pathname = usePathname()
  const isVisible = shouldShowAssistant(pathname)
  const [open, setOpen] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const onReply = useCallback((reply: string) => {
    const html = extractHtmlBlock(reply)
    if (html) setPreviewHtml(html)
  }, [])
  const {
    message, setMessage, attached, setAttached,
    messages, ratings, thinking, error, setError,
    handleSend, retryFrom, rateMessage, clearTranscript,
  } = useTranscript({ isVisible, onReply })
  const mounted = useSyncExternalStore(
    subscribeToClientEnvironment,
    getClientEnvironmentSnapshot,
    getServerEnvironmentSnapshot,
  )
  const [position, setPosition] = useState<AssistantPosition | null>(null)
  const [viewport, setViewport] = useState<AssistantViewport>(getCurrentViewport)
  const [isDragging, setIsDragging] = useState(false)
  const [tab, setTab] = useState<PanelTab>('chat')
  const assistantRootRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef<AssistantDragState | null>(null)
  const suppressClickRef = useRef(false)
  const removeWindowPointerListenersRef = useRef<(() => void) | null>(null)

  /* User-overridden panel position + size. Both null = auto-position
     next to the button and use the default size. Hydrated from
     localStorage on mount so user choices survive reloads. */
  const {
    panelPos, panelSize, setPanelPos, setPanelSize,
    onHeaderPointerDown: handlePanelHeaderPointerDown,
    onResizePointerDown: handlePanelResizePointerDown,
    resetPanelLayout,
  } = usePanelGeometry()

  /* Feedback state */
  /** Seed for the feedback form: set by "send feedback on this response".
   *  A fresh object each time so the form re-applies it. */
  const [feedbackSeed, setFeedbackSeed] = useState<{ text: string; at: number } | null>(null)

  /* ── Widget tooling state (theme, modes, exports, per-message actions,
        file attach, live preview, scroll-to-bottom) ── */
  const [theme, setThemeState] = useState<'dark' | 'light'>(readStoredTheme)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [headerExportOpen, setHeaderExportOpen] = useState(false)
  const [msgExportOpen, setMsgExportOpen] = useState<number | null>(null)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dark = theme === 'dark'
  const [validRoutes, setValidRoutes] = useState<Set<string> | null>(null)
  const [livePrompts, setLivePrompts] = useState<string[] | null>(null)
  // Admin-managed chips (live) fall back to the built-in defaults until loaded.
  const suggestedPrompts = livePrompts ?? (ASSISTANT_SUGGESTED_PROMPTS as readonly string[])

  const messageInputRef = useRef<HTMLInputElement>(null)
  const {
    greetingOpen, setGreetingOpen, dismissGreeting,
    pillExpanded, pillNaturalWidth, measurePill, setPillHovered, setPillFocused,
  } = useLauncherIntro({ isVisible, mounted, open })

  const openAssistant = useCallback(() => {
    setGreetingOpen(false)
    setTab('chat')
    setOpen(true)
  }, [setGreetingOpen])

  /* Move focus into the composer when the panel opens, so the keyboard
     shortcut lands the visitor on the thing they came to use. */
  useEffect(() => {
    if (!open || tab !== 'chat') return
    const focusTimer = window.setTimeout(() => messageInputRef.current?.focus(), 0)
    return () => window.clearTimeout(focusTimer)
  }, [open, tab])

  /* Global keyboard access: Alt+A toggles the assistant from anywhere on the
     site, Escape unwinds the topmost layer (menu → preview → greeting → panel)
     rather than nuking everything at once. Alt+A is ignored while the visitor
     is typing in some other field so it can never eat their input. */
  useEffect(() => {
    if (!isVisible) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (headerExportOpen || msgExportOpen !== null) {
          setHeaderExportOpen(false)
          setMsgExportOpen(null)
        } else if (previewHtml) {
          setPreviewHtml(null)
        } else if (greetingOpen) {
          dismissGreeting()
        } else if (open) {
          setOpen(false)
        }
        return
      }

      if (!event.altKey || event.ctrlKey || event.metaKey) return
      // Physical key first — see ASSISTANT_SHORTCUT for why `key` alone fails.
      const matchesShortcut = event.code
        ? event.code === ASSISTANT_SHORTCUT.code
        : event.key.toLowerCase() === ASSISTANT_SHORTCUT.key
      if (!matchesShortcut) return
      if (!open && isTypingTarget(event.target)) return

      event.preventDefault()
      setGreetingOpen(false)
      setOpen((currentOpen) => !currentOpen)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, open, greetingOpen, headerExportOpen, msgExportOpen, previewHtml, dismissGreeting, setGreetingOpen])

  useEffect(() => {
    if (!isVisible) return

    const openFeedbackPanel = () => {
      setGreetingOpen(false)
      setOpen(true)
      setTab('feedback')
    }

    window.addEventListener(ASSISTANT_CONFIG.openFeedbackEvent, openFeedbackPanel)
    return () => window.removeEventListener(ASSISTANT_CONFIG.openFeedbackEvent, openFeedbackPanel)
  }, [isVisible, setGreetingOpen])

  /* The panel position AND size are intentionally NOT restored on load — the
     window always opens anchored to the bot (bottom-right) at the proportional
     default size, so it "starts where the bot is" and never opens tiny. Users
     can still drag/resize it during the session. */

  /* Persist transcript + ratings whenever they change. Only writes a non-empty
     value, so the mount-time empty state never clobbers a stored transcript
     before the restore effect runs; clearChat removes the keys explicitly.
     Also write-through to the server (/api/chat-history) so the transcript
     follows a signed-in user to another device — best-effort: a 401 (not
     signed in) or a network error just means it stays local-only, exactly
     like the sessionStorage-only behavior before server sync existed. */
  useEffect(() => {
    if (!open || !isVisible) return

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (assistantRootRef.current?.contains(target)) return

      setOpen(false)
    }

    document.addEventListener('pointerdown', handleDocumentPointerDown)
    return () => document.removeEventListener('pointerdown', handleDocumentPointerDown)
  }, [isVisible, open])

  useEffect(() => {
    if (!isVisible) return

    const syncPosition = (resetToDefault = false) => {
      const nextViewport = getCurrentViewport()
      const storedPosition = defaultAssistantPosition(nextViewport)

      setViewport(nextViewport)
      setPosition((currentPosition) => resolveAssistantPositionForViewportChange({
        currentPosition,
        viewport: nextViewport,
        storedPosition,
        resetToDefault,
      }))

      setPanelPos((current) => {
        if (!current) return current
        const size = panelSize ?? { width: PANEL_DEFAULT_WIDTH, height: PANEL_DEFAULT_HEIGHT }
        const clamped = clampPanelPosition(current, size, nextViewport)
        if (clamped.x === current.x && clamped.y === current.y) return current
        storePanelPosition(clamped)
        return clamped
      })
      setPanelSize((current) => {
        if (!current) return current
        const clamped = clampPanelSize(current, nextViewport)
        if (clamped.width === current.width && clamped.height === current.height) return current
        storePanelSize(clamped)
        return clamped
      })

      if (resetToDefault) storeAssistantPosition(storedPosition)
    }

    syncPosition()
    const handleResize = () => syncPosition(true)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isVisible, panelSize, setPanelPos, setPanelSize])

  // Sync scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, thinking])

  /* ── Theme (persisted) ── */
  const setTheme = useCallback((t: 'dark' | 'light') => {
    setThemeState(t)
    try { window.localStorage.setItem('apen-ai-assistant-theme', t) } catch { /* ignore */ }
  }, [])

  /* Load the set of real site routes (the search index lists every page) so
     the chat can flag links to documents that don't exist and steer the user
     to the CESC. Until this resolves, links render optimistically. */
  useEffect(() => {
    let cancelled = false
    fetch('/search-index.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        const pages: Array<{ route?: string }> = Array.isArray(data) ? data : (data.pages ?? [])
        const set = new Set<string>()
        for (const p of pages) if (p?.route) set.add(normalizeAssistantRoute(p.route))
        setValidRoutes(set)
      })
      .catch(() => { /* index unavailable — links stay optimistic */ })
    return () => { cancelled = true }
  }, [])

  /* Load admin-managed suggested-prompt chips (live, via the public content-
     overrides endpoint). Falls back to the built-in defaults if unavailable. */
  useEffect(() => {
    let cancelled = false
    fetch(API_ENDPOINTS.contentOverrides)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        if (Array.isArray(data.assistantPrompts)) {
          setLivePrompts(data.assistantPrompts.filter((p: unknown): p is string => typeof p === 'string'))
        }
      })
      .catch(() => { /* offline — keep the built-in defaults */ })
    return () => { cancelled = true }
  }, [])

  /* Open the integrated feedback view, pre-referencing a specific response. */
  const openFeedbackForResponse = useCallback((text: string) => {
    setTab('feedback')
    setFeedbackSeed({ text: `Regarding this response:\n"${text.slice(0, 220)}${text.length > 220 ? '…' : ''}"\n\n`, at: Date.now() })
  }, [])

  /* Close any open export menu on the next outside click. */
  useEffect(() => {
    if (!headerExportOpen && msgExportOpen === null) return
    const close = () => { setHeaderExportOpen(false); setMsgExportOpen(null) }
    const id = window.setTimeout(() => document.addEventListener('click', close, { once: true }), 0)
    return () => { window.clearTimeout(id); document.removeEventListener('click', close) }
  }, [headerExportOpen, msgExportOpen])

  /* ── Clear chat ── */
  const clearChat = useCallback(() => {
    clearTranscript()
    setPreviewHtml(null); setCopiedIdx(null); setMsgExportOpen(null); setHeaderExportOpen(false)
  }, [clearTranscript])

  /* ── Copy a message to the clipboard ── */
  const copyMessage = useCallback(async (text: string, i: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(i)
      setTimeout(() => setCopiedIdx((c) => (c === i ? null : c)), 1500)
    } catch { /* clipboard unavailable */ }
  }, [])


  /* ── Retry: regenerate the assistant reply from the preceding user turn ── */
  /* ── File attach (text contents folded into the next message's context) ── */
  const handleAttachClick = useCallback(() => fileInputRef.current?.click(), [])
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setError('')
    try {
      setAttached(await readAssistantTextAttachment(file))
    } catch (attachmentError) {
      setAttached(null)
      setError(attachmentError instanceof Error ? attachmentError.message : 'The attachment could not be read.')
    }
  }, [setAttached, setError])

  /* ── Export (Markdown / HTML / JSON download · PDF via print) ── */
  const chatToMarkdown = useCallback((msgs: Message[]) =>
    msgs.map((m) => `**${m.role === 'user' ? 'You' : 'Voltron'}:**\n\n${m.text}`).join('\n\n---\n\n'), [])
  const chatToJson = useCallback((msgs: Message[]) =>
    JSON.stringify(msgs.map((m) => ({ role: m.role, text: m.text, ts: m.ts })), null, 2), [])
  const chatToHtml = useCallback((msgs: Message[]) => {
    const rows = msgs.map((m) =>
      `<div class="m ${m.role}"><strong>${m.role === 'user' ? 'You' : 'Voltron'}</strong><pre>${escapeHtml(m.text)}</pre></div>`).join('\n')
    return `<!doctype html><html><head><meta charset="utf-8"><title>VOLTRON SUPPORT AGENT — Chat</title><style>body{font-family:system-ui,sans-serif;max-width:760px;margin:24px auto;padding:0 16px;color:#111}.m{margin:0 0 14px;padding:12px 16px;border-radius:10px}.user{background:#eef2ff}.assistant{background:#f5f5f5}strong{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#666;margin-bottom:4px}pre{white-space:pre-wrap;word-wrap:break-word;font-family:inherit;margin:0}footer{margin-top:24px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:.12em}</style></head><body><h1>VOLTRON SUPPORT AGENT</h1>${rows}<footer>Powered by FCC Voltron AI</footer></body></html>`
  }, [])
  const exportChat = useCallback((format: ExportFormat, msgs: Message[]) => {
    setHeaderExportOpen(false); setMsgExportOpen(null)
    if (!msgs.length) return
    const stamp = new Date().toISOString().slice(0, 10)
    if (format === 'markdown') return downloadFile(`voltron-chat-${stamp}.md`, chatToMarkdown(msgs), 'text/markdown')
    if (format === 'json')     return downloadFile(`voltron-chat-${stamp}.json`, chatToJson(msgs), 'application/json')
    if (format === 'html')     return downloadFile(`voltron-chat-${stamp}.html`, chatToHtml(msgs), 'text/html')
    // PDF → open a clean print view and let the browser "Save as PDF".
    openPrintableReport(chatToHtml(msgs))
  }, [chatToMarkdown, chatToJson, chatToHtml])

  /* ── Scroll-to-bottom affordance ── */
  const handleMessagesScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 80)
  }, [])
  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [])

  const getPositionFromPointer = useCallback((clientX: number, clientY: number, nextViewport: AssistantViewport) => {
    const dragState = dragStateRef.current
    if (!dragState) return null

    return clampAssistantPosition(
      {
        x: clientX - dragState.offsetX,
        y: clientY - dragState.offsetY,
      },
      nextViewport,
    )
  }, [])

  const handleWindowPointerMove = useCallback((event: PointerEvent) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) return

    event.preventDefault()

    const distance = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY)
    if (distance <= DRAG_THRESHOLD_PX && !dragState.moved) return

    dragState.moved = true
    setIsDragging(true)

    const nextViewport = { width: window.innerWidth, height: window.innerHeight }
    setViewport(nextViewport)
    const nextPosition = getPositionFromPointer(event.clientX, event.clientY, nextViewport)
    if (nextPosition) setPosition(nextPosition)
  }, [getPositionFromPointer])

  const handleWindowPointerEnd = useCallback((event: PointerEvent) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) return

    const nextViewport = { width: window.innerWidth, height: window.innerHeight }
    setViewport(nextViewport)
    const nextPosition = getPositionFromPointer(event.clientX, event.clientY, nextViewport)

    if (dragState.moved && nextPosition) {
      suppressClickRef.current = true
      setPosition(nextPosition)
      storeAssistantPosition(nextPosition)
    }

    try {
      if (dragState.target.hasPointerCapture(event.pointerId)) {
        dragState.target.releasePointerCapture(event.pointerId)
      }
    } catch {
      // Pointer capture can already be gone if the browser cancelled the gesture.
    }

    removeWindowPointerListenersRef.current?.()
    dragStateRef.current = null
    setIsDragging(false)
  }, [getPositionFromPointer])

  const addWindowPointerListeners = useCallback(() => {
    removeWindowPointerListenersRef.current?.()
    window.addEventListener('pointermove', handleWindowPointerMove, { passive: false })
    window.addEventListener('pointerup', handleWindowPointerEnd)
    window.addEventListener('pointercancel', handleWindowPointerEnd)
    removeWindowPointerListenersRef.current = () => {
      window.removeEventListener('pointermove', handleWindowPointerMove)
      window.removeEventListener('pointerup', handleWindowPointerEnd)
      window.removeEventListener('pointercancel', handleWindowPointerEnd)
      removeWindowPointerListenersRef.current = null
    }
  }, [handleWindowPointerEnd, handleWindowPointerMove])

  useEffect(() => () => {
    removeWindowPointerListenersRef.current?.()
  }, [])

  const resetAssistantPosition = useCallback(() => {
    const nextViewport = { width: window.innerWidth, height: window.innerHeight }
    const nextPosition = defaultAssistantPosition(nextViewport)
    setViewport(nextViewport)
    setPosition(nextPosition)
    storeAssistantPosition(nextPosition)
  }, [])

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return

    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const nextViewport = { width: window.innerWidth, height: window.innerHeight }
    setViewport(nextViewport)
    dragStateRef.current = {
      pointerId: event.pointerId,
      target: event.currentTarget,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    }

    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Window-level listeners still keep dragging functional without capture support.
    }
    addWindowPointerListeners()
  }, [addWindowPointerListeners])

  const handleTriggerClick = useCallback(() => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }

    setGreetingOpen(false)
    setOpen((currentOpen) => !currentOpen)
  }, [setGreetingOpen])

  /* Greeting quick-start chip: open the panel AND fire the question in one
     click, so the card doubles as a working entry point rather than an ad.
     Declared after handleSend so it can call it directly. */
  const openAssistantWithPrompt = useCallback((prompt: string) => {
    setGreetingOpen(false)
    setTab('chat')
    setOpen(true)
    void handleSend(prompt)
  }, [handleSend, setGreetingOpen])

  if (!isVisible) return null

  // SSR fallback before useEffect loads the stored position. Uses right+bottom
  // (matches the default's bottom-right anchor) so the brief pre-hydration
  // paint sits at the same spot the JS will compute next tick — no jump.
  const rootStyle: CSSProperties = position
    ? { left: position.x, top: position.y }
    : { right: ASSISTANT_DEFAULT_INSET, bottom: ASSISTANT_DEFAULT_INSET }
  /* Which way the name pill and greeting card should grow. Recomputed on every
     render so dragging the button across the screen re-aims both immediately. */
  const calloutAnchor = getAssistantCalloutAnchor(position, viewport)
  /* Whether the pill and the circle are currently fused into one capsule.
     Driven from viewport state (kept current by the existing resize handler)
     rather than a `max-sm:hidden` class, because the button's OWN styling has
     to change in lockstep — a CSS-only hide would let the two disagree.

     Why the styling must change: the button paints above the pill (z-10), so
     its circular border-2, its .assistant-red-pulse ring and its red glow all
     traced a full circle straight through the pill body. That is what made
     the head read as a separate icon dropped on top of a box instead of the
     capsule's cap. When assembled, the button becomes a transparent window
     and the PILL alone draws the outline, glow and pulse — once, around the
     whole capsule. The widget only renders after `mounted`, so viewport is
     always real here and there is no hydration flash. */
  const capsuleAssembled = !open && !isDragging && viewport.width >= 640
  /* Default open size is PROPORTIONAL to the viewport (clamped to sane min/max,
     never larger than the screen) and computed in px, applied inline. This is
     bulletproof — the old Tailwind calc() size classes weren't emitting, which
     left the panel content-sized (too small). A user resize (panelSize) wins.
     The Live Preview split gets a wider cap so both panes have room.
     Computed BEFORE the auto-position below so placement uses the real size. */
  const vw = viewport.width || 1200
  const vh = viewport.height || 800
  const defaultPanelSize: AssistantSize = {
    width:  Math.round(Math.min(vw - ASSISTANT_MARGIN * 2, Math.max(380, Math.min(vw * 0.34, previewHtml ? 1040 : 620)))),
    height: Math.round(Math.min(vh - 112,                  Math.max(520, Math.min(vh * 0.82, 880)))),
  }
  const sizeToUse = panelSize ?? defaultPanelSize

  /* Panel placement priority:
       1. User-dragged position (panelPos) — sticky across renders.
       2. Auto-positioned next to the trigger button, using the SAME size the
          panel actually renders at (sizeToUse) so its right/bottom edges stay
          on-screen instead of overflowing out of the viewport.
       3. SSR fallback (right + bottom anchor).
     Same idea for size: user-resized value wins, otherwise default. */
  const autoPanelPosition = position && viewport.width > 0 && viewport.height > 0
    ? getAssistantPanelPosition(position, viewport, sizeToUse)
    : null
  const resolvedPanelPosition = panelPos ?? autoPanelPosition

  const panelStyle: CSSProperties = isFullscreen
    ? { left: 0, top: 0, width: '100vw', height: '100dvh' }
    : {
        ...(resolvedPanelPosition
          ? { left: resolvedPanelPosition.x, top: resolvedPanelPosition.y }
          : { right: ASSISTANT_DEFAULT_INSET, bottom: ASSISTANT_DEFAULT_INSET + ASSISTANT_BUTTON_SIZE + ASSISTANT_MARGIN }),
        width:  sizeToUse.width,
        height: sizeToUse.height,
      }
  /* The inline size retains drag/resize precision while these responsive
     constraints keep the panel usable on narrow phones and large previews. */
  const panelSizeClass = isFullscreen
    ? ''
    : 'w-[calc(100vw-2rem)] max-w-[440px] sm:max-w-[620px] xl:max-w-[1040px]'

  /* Theme tokens — light vs dark surfaces for the chat panel. */
  const ui = dark
    ? {
        panel:      'border-white/10 bg-[#0a0f23]/95 text-gray-300',
        header:     'border-white/10 bg-[#003366]',
        title:      'text-white', subtitle: 'text-blue-200',
        tabBar:     'bg-black/20',
        tabActive:  'border-red-600 bg-white/5 text-white',
        tabIdle:    'border-transparent text-gray-500',
        botBubble:  'border border-white/10 bg-white/5 text-gray-300',
        userBubble: 'border border-red-700/40 bg-red-900/30 text-white',
        inputBar:   'border-white/5 bg-black/20',
        input:      'border-white/10 bg-[#040a16] text-white placeholder:text-gray-600 focus:border-red-700',
        toolBtn:    'text-white/60 hover:bg-white/10 hover:text-white',
        menu:       'border-white/10 bg-[#0a0f23] text-gray-200',
        menuItem:   'hover:bg-white/10',
        preview:    'border-white/10 bg-[#070b18]',
        chip:       'bg-white/5 text-gray-300',
        suggestion: 'border-white/10 hover:bg-white/5',
      }
    : {
        panel:      'border-black/10 bg-white/95 text-gray-800',
        header:     'border-black/10 bg-[#dbe5f1]',
        title:      'text-[#0a2a4a]', subtitle: 'text-[#3a6ea5]',
        tabBar:     'bg-black/5',
        tabActive:  'border-red-600 bg-black/5 text-gray-900',
        tabIdle:    'border-transparent text-gray-400',
        botBubble:  'border border-black/10 bg-black/[0.04] text-gray-800',
        userBubble: 'border border-red-300 bg-red-50 text-red-900',
        inputBar:   'border-black/10 bg-black/[0.03]',
        input:      'border-black/15 bg-white text-gray-900 placeholder:text-gray-400 focus:border-red-500',
        toolBtn:    'text-gray-500 hover:bg-black/10 hover:text-gray-900',
        menu:       'border-black/10 bg-white text-gray-800',
        menuItem:   'hover:bg-black/5',
        preview:    'border-black/10 bg-gray-50',
        chip:       'bg-black/5 text-gray-700',
        suggestion: 'border-black/10 hover:bg-black/5',
      }

  const content = (
    <div
      ref={assistantRootRef}
      /* `group` here (not on the button) so hovering EITHER half of the
         capsule lights the shared outline. :hover applies to ancestors of the
         hovered node regardless of positioning, so this works even though the
         pill is absolutely positioned outside the root's box. */
      className={`group fixed z-[200] ${isDragging ? 'transition-none' : 'transition-[opacity,filter] duration-200'}`}
      style={rootStyle}
      /* On the root, so pointing anywhere on the capsule — label or head —
         brings the label back out once it has retracted. */
      onMouseEnter={() => setPillHovered(true)}
      onMouseLeave={() => setPillHovered(false)}
    >
      {/* Trigger Button */}
      <button
        aria-label={open ? ASSISTANT_LAUNCHER.closeLabel : ASSISTANT_LAUNCHER.openLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="apen-assistant-panel"
        title={ASSISTANT_LAUNCHER.tooltip}
        onClick={handleTriggerClick}
        onDoubleClick={resetAssistantPosition}
        onPointerDown={handlePointerDown}
        /* Keyboard parity with hover: tabbing to the launcher re-extends the
           label, so a keyboard user gets the same "what is this?" affordance
           a mouse user gets by pointing at it. */
        onFocus={() => setPillFocused(true)}
        onBlur={() => setPillFocused(false)}
        onContextMenu={(event) => {
          event.preventDefault()
          resetAssistantPosition()
        }}
        /* z-10 keeps the circle painting ABOVE the name pill it caps. When the
           capsule is assembled the button drops its own border, glow and pulse
           and becomes a transparent window onto the pill behind it — the pill
           draws the single shared outline. Standalone (mobile, or panel open)
           it keeps the full circular treatment it always had. */
        className={`relative z-10 flex touch-none cursor-grab items-center justify-center rounded-full transition-transform active:cursor-grabbing ${
          capsuleAssembled
            ? ''
            : 'assistant-red-pulse border-2 border-red-700/50 bg-[#040a16] shadow-[0_0_20px_rgba(185,28,28,0.3)] hover:scale-110 hover:border-red-500'
        }`}
        /* Inline, so the pill (whose height is pinned to the same constant)
           can never disagree with the circle it caps. */
        style={{ height: LAUNCHER_VISUAL_SIZE, width: LAUNCHER_VISUAL_SIZE }}
      >
        {/* Name pill — the whole point of this treatment: the button says what
            it IS instead of making visitors guess at a robot head.

            It is a non-focusable <span> INSIDE the trigger, not a button beside
            it. An earlier version made it its own <button aria-hidden tabIndex={-1}>;
            tabIndex={-1} keeps it out of the tab order but a <button> still
            takes focus when clicked, so clicking the label focused an
            aria-hidden element and the browser rightly complained that focus
            was being hidden from assistive technology. As a plain span it can
            never hold focus, aria-hidden is valid, and clicks/drags simply
            bubble to the real trigger that wraps it — one control, one
            accessible name, no duplicate tab stop.

            Absolutely positioned, so however wide it grows it never enlarges
            the trigger's 56px layout box or disturbs the stored 65px geometry
            the panel-anchor math depends on. handlePointerDown measures
            currentTarget (always the button), so dragging by the label works
            and keeps the label under the cursor.

            Anchoring is `right: 0` (or `left: 0`) against the button, which
            pins the pill's capped edge flush to the button's edge — the pill
            then grows outward and its rounded cap ends up concentric with the
            head. This replaced a `right-full` + `-mr-14` pairing left over
            from when the pill was a SIBLING of the button and had to be pulled
            a full button-width back across it. As a child that indirection is
            pointless, and it had a nasty failure mode: if the negative margin
            did not apply for any reason, `right: 100%` alone threw the pill
            clear of the button's left edge, stranding the head outside it.
            Offsets, height and padding are inline (see LAUNCHER_VISUAL_SIZE)
            so nothing about the alignment depends on a utility resolving.

            Carries assistant-red-pulse for the whole capsule: the ::after ring
            is inset -2px with a 9999px radius, so on this 56px-tall pill it
            renders as a capsule-shaped glow wrapping the head too, instead of
            a circle cutting across the body. Rendered before the <img> so the
            head paints on top of it. */}
        {capsuleAssembled && (
          <span
            ref={measurePill}
            aria-hidden="true"
            className={`assistant-launcher-pill assistant-red-pulse absolute flex max-w-[15rem] items-center whitespace-nowrap rounded-full border-2 border-red-700/50 bg-[#040a16] shadow-[0_0_20px_rgba(185,28,28,0.3)] group-hover:border-red-500 ${
              calloutAnchor.horizontal === 'left' ? 'origin-right text-right' : 'origin-left text-left'
            }`}
            style={{
              height: LAUNCHER_VISUAL_SIZE,
              top: '50%',
              // Fallback only — the assistantPillIn keyframes restate this and
              // animations outrank inline styles, so the two must agree.
              transform: 'translateY(-50%)',
              /* Collapsing to exactly the head's diameter turns the capsule
                 back into the circle behind it. The padding has to go to 0 in
                 the same breath: with border-box sizing, padding that exceeds
                 max-width sets the floor for the used width, so leaving it
                 would stop the capsule ~88px wide instead of 56.
                 NOTE: deliberately no `overflow: hidden` here — it would clip
                 the .assistant-red-pulse ::after ring, which sits at inset
                 -2px OUTSIDE this box. The inner wrapper clips the text. */
              maxWidth: pillExpanded ? (pillNaturalWidth ?? undefined) : LAUNCHER_VISUAL_SIZE,
              transition: 'max-width 320ms cubic-bezier(0.4, 0, 0.2, 1), padding 320ms cubic-bezier(0.4, 0, 0.2, 1), border-color 150ms ease',
              ...(calloutAnchor.horizontal === 'left'
                ? {
                    right: 0,
                    paddingLeft: pillExpanded ? PILL_OUTER_PADDING : 0,
                    paddingRight: pillExpanded ? PILL_CAP_PADDING : 0,
                  }
                : {
                    left: 0,
                    paddingLeft: pillExpanded ? PILL_CAP_PADDING : 0,
                    paddingRight: pillExpanded ? PILL_OUTER_PADDING : 0,
                  }),
            }}
          >
            {/* min-w-0 lets this flex child actually shrink; overflow-hidden
                keeps the label from spilling out of the collapsing capsule. */}
            <span
              className="block min-w-0 overflow-hidden leading-none"
              style={{ opacity: pillExpanded ? 1 : 0, transition: 'opacity 180ms ease' }}
            >
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-white">{ASSISTANT_LAUNCHER.brand}</span>
              <span className="mt-1 block text-[9px] font-medium uppercase tracking-[0.1em] text-red-300/90">{ASSISTANT_LAUNCHER.role}</span>
            </span>
          </span>
        )}
        {open ? <X className="text-white" size={24} /> : (
          /* `relative` so the head paints above the absolutely-positioned pill
             (positioned siblings beat static ones; both at z-index auto, so
             DOM order decides and the img comes last).

             Size is what puts the head INSIDE the capsule rather than capping
             it. At h-full (56px) the image filled the button edge to edge and
             sat flush with the pill's rounded end, so it read as the capsule's
             cap. At h-10 (40px) it is centred in the same 56px box, leaving an
             even 8px ring of pill body all the way around — the pill's cap
             radius is 28px and the head's is 20px, concentric — so it reads as
             an avatar seated inside the capsule. Standalone (mobile, or panel
             open) it goes back to filling its own bordered circle. */
          <img
            src={VOLTRON_IMAGE_SRC}
            alt={ASSISTANT_LAUNCHER.fullName}
            className={`relative rounded-full object-cover ${capsuleAssembled ? '' : 'h-full w-full p-1'}`}
            style={capsuleAssembled ? { height: LAUNCHER_HEAD_SIZE, width: LAUNCHER_HEAD_SIZE } : undefined}
          />
        )}
      </button>

      {/* First-visit greeting — introduces the assistant by name, states what
          it can answer, and offers a working shortcut into a real question.
          Anchored to the same side/vertical half as the pill so it always
          opens into free screen space. */}
      {greetingOpen && !open && !isDragging && (
        <GreetingCard
          anchor={calloutAnchor}
          prompts={suggestedPrompts.slice(0, ASSISTANT_GREETING.maxChips)}
          onDismiss={dismissGreeting}
          onOpen={openAssistant}
          onPrompt={openAssistantWithPrompt}
        />
      )}

      {/* Assistant Panel */}
      {open && (
        <div
          data-assistant-panel
          id="apen-assistant-panel"
          role="dialog"
          aria-label={ASSISTANT_LAUNCHER.fullName}
          className={`fixed z-[201] flex overflow-hidden border shadow-2xl backdrop-blur-xl ${isFullscreen ? 'rounded-none' : 'rounded-xl'} ${ui.panel} ${panelSizeClass}`}
          style={panelStyle}
        >
          {/* main-chat-area column (header · banner · tabs · content) */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Header — drag handle (disabled in fullscreen). The toolbar
              stops pointer propagation so its buttons don't start a drag. */}
          <div
            className={`flex items-center gap-2 border-b px-3 py-2.5 select-none touch-none ${ui.header} ${isFullscreen ? '' : 'cursor-grab active:cursor-grabbing'}`}
            onPointerDown={isFullscreen ? undefined : handlePanelHeaderPointerDown}
            onDoubleClick={isFullscreen ? undefined : resetPanelLayout}
            title={isFullscreen ? undefined : 'Drag to move · Double-click to reset'}
          >
            <img src={ASSISTANT_CONFIG.headerImageSrc} className="h-7 w-7 shrink-0 rounded-full object-contain" alt="FCC" draggable={false} />
            <div className="min-w-0">
              <h3 className={`truncate text-xs font-bold uppercase tracking-wider ${ui.title}`}>{ASSISTANT_CONFIG.title}</h3>
              <p className={`truncate text-[9px] font-medium uppercase ${ui.subtitle}`}>{ASSISTANT_CONFIG.subtitle}</p>
            </div>
            <div className="ml-auto flex items-center gap-0.5" onPointerDown={(e) => e.stopPropagation()}>
              <button onClick={() => setTheme(dark ? 'light' : 'dark')} title={dark ? 'Switch to light mode' : 'Switch to dark mode'} aria-label="Toggle light/dark mode" className={`rounded p-1.5 ${ui.toolBtn}`}>{dark ? <Moon size={14} /> : <Sun size={14} />}</button>
              {isFullscreen ? (
                <button onClick={() => setIsFullscreen(false)} title="Windowed mode" aria-label="Windowed mode" className={`rounded p-1.5 ${ui.toolBtn}`}><Minimize2 size={14} /></button>
              ) : (
                <button onClick={() => setIsFullscreen(true)} title="Fullscreen" aria-label="Fullscreen" className={`rounded p-1.5 ${ui.toolBtn}`}><Maximize2 size={14} /></button>
              )}
              <div className="relative">
                <button onClick={() => setHeaderExportOpen((o) => !o)} title="Export chat" aria-haspopup="true" aria-expanded={headerExportOpen} aria-label="Export chat" className={`rounded p-1.5 ${ui.toolBtn}`}><Download size={14} /></button>
                {headerExportOpen && (
                  <div role="menu" aria-label="Export chat as" className={`absolute right-0 top-full z-20 mt-1 w-32 overflow-hidden rounded-md border text-[11px] shadow-xl ${ui.menu}`}>
                    {(['pdf', 'markdown', 'html', 'json'] as ExportFormat[]).map((f) => (
                      <button key={f} role="menuitem" onClick={() => exportChat(f, messages)} className={`block w-full px-3 py-1.5 text-left uppercase tracking-wide ${ui.menuItem}`}>{f === 'pdf' ? 'PDF' : f}</button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={clearChat} title="Clear chat" aria-label="Clear chat" className={`rounded p-1.5 ${ui.toolBtn}`}><Trash2 size={14} /></button>
              <button onClick={() => setOpen(false)} title="Close" aria-label="Close APEN assistant panel" className={`rounded p-1.5 ${ui.toolBtn}`}><X size={16} /></button>
            </div>
          </div>

          {/* Mandatory DoD Notice Banner */}
          <div className="border-b border-amber-500/20 bg-amber-950/40 px-4 py-2">
            <p className="text-[9px] font-bold uppercase leading-tight tracking-normal text-amber-200">
              <ShieldAlert size={10} className="mb-0.5 mr-1 inline" />
              USG Information System: No Expectation of Privacy. Consent to Monitoring.
            </p>
          </div>

          {/* Chat / Feedback content — the Feedback view is reached via the
              "Feedback" button in the composer (no tab bar). */}
          <div className="relative flex flex-1 flex-col overflow-hidden">
            {tab === 'chat' ? (
              <>
                <div ref={scrollRef} onScroll={handleMessagesScroll} role="log" aria-live="polite" aria-label="Conversation" aria-busy={thinking} tabIndex={0} className="flex-1 space-y-4 overflow-y-auto p-4">
                  {messages.length === 0 && (
                    /* Empty state greets by name and asks the question, instead
                       of the old bare "knowledge base active" status line — a
                       visitor arriving here should never have to work out what
                       they are allowed to type. */
                    <div className="space-y-3 py-8 text-center">
                      <img src={VOLTRON_IMAGE_SRC} alt="" aria-hidden="true" className="mx-auto h-12 w-12 rounded-full border border-red-700/40 object-cover" />
                      <div className="space-y-1">
                        <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{ASSISTANT_GREETING.title}</p>
                        <p className="text-[11px] leading-relaxed opacity-70">
                          Welcome to APEN Support — I&rsquo;m the {ASSISTANT_LAUNCHER.fullName}.
                        </p>
                      </div>
                      <p className="text-[9px] uppercase tracking-widest opacity-50">APEN Knowledge Base Active</p>
                      <div className="flex flex-wrap justify-center gap-2 pt-1">
                        {suggestedPrompts.map(p => (
                          <button key={p} onClick={() => handleSend(p)} className={`rounded border px-2 py-1 text-[10px] ${ui.suggestion}`}>{p}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {m.role === 'assistant' && (
                        <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${dark ? 'bg-white/10 text-blue-300' : 'bg-black/5 text-[#0a2a4a]'}`}>
                          <BotAvatar className="h-3.5 w-3.5" />
                        </div>
                      )}
                      <div className="min-w-0 max-w-[82%]">
                        <div className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${m.role === 'user' ? ui.userBubble : ui.botBubble}`}>
                          <FormattedMessage text={m.text} validRoutes={validRoutes} />
                          {m.attachmentName && (
                            <div className={`mt-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] ${ui.chip}`}>
                              <Paperclip size={9} /> {m.attachmentName}
                            </div>
                          )}
                        </div>
                        <div className={`mt-1 flex items-center gap-0.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <button onClick={() => copyMessage(m.text, i)} title="Copy" aria-label="Copy message" className={`rounded p-1 ${ui.toolBtn}`}>{copiedIdx === i ? <Check size={12} /> : <Copy size={12} />}</button>
                          {m.role === 'assistant' && (
                            <>
                              <button onClick={() => rateMessage(i, 1)} title="Helpful" aria-label="Helpful" aria-pressed={ratings[i] === 1} className={`rounded p-1 ${ratings[i] === 1 ? 'text-emerald-400' : ui.toolBtn}`}><ThumbsUp size={12} /></button>
                              <button onClick={() => rateMessage(i, -1)} title="Not helpful" aria-label="Not helpful" aria-pressed={ratings[i] === -1} className={`rounded p-1 ${ratings[i] === -1 ? 'text-red-400' : ui.toolBtn}`}><ThumbsDown size={12} /></button>
                              <button onClick={() => openFeedbackForResponse(m.text)} title="Send feedback on this response" aria-label="Send feedback on this response" className={`rounded p-1 ${ui.toolBtn}`}><MessageSquare size={12} /></button>
                              <button onClick={() => retryFrom(i)} disabled={thinking} title="Retry" aria-label="Retry" className={`rounded p-1 disabled:opacity-40 ${ui.toolBtn}`}><RotateCcw size={12} /></button>
                              <div className="relative">
                                <button onClick={() => setMsgExportOpen((o) => (o === i ? null : i))} title="Export this response" aria-haspopup="true" aria-expanded={msgExportOpen === i} aria-label="Export this response" className={`rounded p-1 ${ui.toolBtn}`}><Download size={12} /></button>
                                {msgExportOpen === i && (
                                  <div role="menu" aria-label="Export response as" className={`absolute left-0 top-full z-20 mt-1 w-28 overflow-hidden rounded-md border text-[11px] shadow-xl ${ui.menu}`}>
                                    {(['pdf', 'markdown', 'html', 'json'] as ExportFormat[]).map((f) => (
                                      <button key={f} role="menuitem" onClick={() => exportChat(f, [m])} className={`block w-full px-3 py-1.5 text-left uppercase tracking-wide ${ui.menuItem}`}>{f === 'pdf' ? 'PDF' : f}</button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {thinking && <div className="animate-pulse font-mono text-[10px] text-blue-400">SYSTEM THINKING...</div>}
                </div>

                {showScrollBtn && (
                  <button onClick={scrollToBottom} aria-label="Scroll to bottom" className={`absolute bottom-24 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase shadow-lg ${ui.menu}`}>
                    <ArrowDown size={12} /> New
                  </button>
                )}

                <div className={`border-t p-4 ${ui.inputBar}`}>
                  {attached && (
                    <div className={`mb-2 flex items-center gap-2 rounded px-2 py-1 text-[10px] ${ui.chip}`}>
                      <Paperclip size={11} className="shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{attached.name}</span>
                      <button onClick={() => setAttached(null)} aria-label="Remove file" className={`rounded p-0.5 ${ui.toolBtn}`}><X size={12} /></button>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleAttachClick}
                      title={assistantAttachTooltip(ASSISTANT_ATTACHMENT_LIMIT_LABEL)}
                      aria-label={ASSISTANT_ATTACH_LABEL}
                      className={`shrink-0 rounded p-1.5 ${ui.toolBtn}`}
                    >
                      <Paperclip size={16} />
                    </button>
                    <input ref={fileInputRef} type="file" onChange={handleFileChange} accept={ASSISTANT_ATTACHMENT_ACCEPT} className="hidden" />
                    <div className="relative flex-1">
                      <input
                        ref={messageInputRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={ASSISTANT_INPUT_PLACEHOLDER}
                        aria-label={`Ask the ${ASSISTANT_LAUNCHER.fullName} a question`}
                        maxLength={MAX_ASSISTANT_MESSAGE_CHARS}
                        aria-describedby="assistant-ai-disclaimer"
                        className={`w-full rounded-lg border py-2 pl-3 pr-10 text-xs focus:outline-none ${ui.input}`}
                      />
                      <button onClick={() => handleSend()} className="absolute right-2 top-1/2 -translate-y-1/2 text-red-600 transition-colors hover:text-red-400" aria-label="Send message">
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                  {error && <p role="alert" className="mt-2 text-center text-[10px] text-red-300">{error}</p>}
                  {/* Transparency line — the answers are model-generated and the
                      visitor is told so at the point of asking, not buried. */}
                  <p id="assistant-ai-disclaimer" className={`mt-2 flex items-center gap-1 text-[9px] font-medium ${dark ? 'text-amber-200/80' : 'text-amber-700'}`}>
                    <Sparkles size={10} className="shrink-0" aria-hidden="true" />
                    {ASSISTANT_AI_DISCLAIMER}
                  </p>
                  {/* The session-storage / "256 KB attachments" paragraph that
                      used to sit here was removed: it had gone stale on both
                      counts (attachments are now 10 MB, and transcripts sync
                      server-side for signed-in users via /api/chat-history).
                      The mandatory USG monitoring banner above the transcript
                      is untouched and still carries the required notice. */}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <button onClick={() => setTab('feedback')} className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${ui.toolBtn}`}>
                      <MessageSquare size={11} /> Feedback
                    </button>
                    <p className="text-[8px] uppercase tracking-widest text-gray-500">Powered by FCC <span className={`font-semibold ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Voltron AI</span></p>
                  </div>
                </div>
              </>
            ) : (
              <FeedbackForm
                hidden={false}
                seed={feedbackSeed}
                toolBtnClass={ui.toolBtn}
                onBack={() => setTab('chat')}
              />
            )}
          </div>
          </div>{/* /main-chat-area */}

          {/* Live Preview — renders the first fenced html block from a reply
              in a sandboxed iframe (allow-scripts only → opaque origin, so
              the preview cannot reach back into the host page). */}
          {previewHtml && tab === 'chat' && (
            <div className={`flex w-[44%] min-w-[240px] flex-col border-l ${ui.preview}`}>
              <div className={`flex items-center justify-between border-b px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${dark ? 'border-white/10 text-gray-300' : 'border-black/10 text-gray-700'}`}>
                <span>👁 Live Preview</span>
                <button onClick={() => setPreviewHtml(null)} title="Close preview" aria-label="Close preview" className={`rounded p-1 ${ui.toolBtn}`}><X size={14} /></button>
              </div>
              <iframe title="Live preview" sandbox="allow-scripts" srcDoc={previewHtml} className="flex-1 bg-white" />
            </div>
          )}

          {/* Resize handles — eight invisible drag targets around the
              panel border (four edges + four corners). Pointerdown on
              any one stops propagation so it doesn't trigger the header
              drag or the document outside-click handler. Only the SE
              corner gets the visible diagonal stripe as a discoverability
              affordance; the rest are intentionally invisible — the
              cursor change on hover is the cue. Hidden in fullscreen. */}
          {!isFullscreen && (Object.keys(RESIZE_HANDLE_CONFIG) as ResizeDirection[]).map((dir) => (
            <div
              key={dir}
              role="separator"
              aria-orientation={dir === 'n' || dir === 's' ? 'horizontal' : 'vertical'}
              aria-label={RESIZE_HANDLE_CONFIG[dir].label}
              title="Drag to resize"
              onPointerDown={handlePanelResizePointerDown(dir)}
              className={RESIZE_HANDLE_CONFIG[dir].className}
              style={dir === 'se' ? {
                backgroundImage:
                  'linear-gradient(135deg, transparent 0 45%, rgba(255,255,255,0.35) 45% 55%, transparent 55% 70%, rgba(255,255,255,0.35) 70% 80%, transparent 80%)',
              } : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )

  // Portal to <body> so the floating widget's position:fixed is always
  // viewport-relative (immune to transformed/contained ancestors). Render
  // nothing until mounted to keep SSR/static export safe (no document access).
  return mounted ? createPortal(content, document.body) : null
}
