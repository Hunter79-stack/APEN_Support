'use client'

/**
 * The chat panel's user-controlled layout: dragged position, resized size,
 * the pointer handlers that drive them, and the double-click reset. Both
 * values are null until the user touches them, which means "auto-position
 * next to the launcher at the default size". Lifted out of
 * APEN-chat-assistant.tsx (code-quality #76).
 */
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  clampPanelPosition,
  clampPanelSize,
  storePanelPosition,
  storePanelSize,
  type AssistantPosition,
  type AssistantSize,
} from '@/lib/assistant/panel-geometry'

export type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

/* Tracks an active panel drag (header) or resize (corner handle). */
interface PanelInteractionState {
  pointerId: number
  startClientX: number
  startClientY: number
  startPanelX:  number
  startPanelY:  number
  startWidth:   number
  startHeight:  number
}

export function usePanelGeometry() {
  const [panelPos,  setPanelPos]  = useState<AssistantPosition | null>(null)
  const [panelSize, setPanelSize] = useState<AssistantSize | null>(null)
  const panelInteractionRef = useRef<PanelInteractionState | null>(null)
  const removePanelListenersRef = useRef<(() => void) | null>(null)

  /* ── Panel drag (header bar) ─────────────────────────────────
     Press anywhere in the header (except the close button — its
     pointerdown is stopped) and the panel follows the pointer until
     release. The new position is persisted to localStorage. */
  const onHeaderPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    /* Anchor the panel at its current rendered position before the
       drag starts. Defer pointer capture / listeners to window so
       pointer movement outside the header still tracks. */
    event.preventDefault()
    const panelEl = (event.currentTarget.closest('[data-assistant-panel]') as HTMLElement | null)
    if (!panelEl) return
    const rect = panelEl.getBoundingClientRect()

    panelInteractionRef.current = {
      pointerId:    event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPanelX:  rect.left,
      startPanelY:  rect.top,
      startWidth:   rect.width,
      startHeight:  rect.height,
    }

    const sizeAtStart: AssistantSize = panelSize ?? { width: rect.width, height: rect.height }

    const handleMove = (move: PointerEvent) => {
      const state = panelInteractionRef.current
      if (!state || move.pointerId !== state.pointerId) return
      const dx = move.clientX - state.startClientX
      const dy = move.clientY - state.startClientY
      const next = clampPanelPosition(
        { x: state.startPanelX + dx, y: state.startPanelY + dy },
        sizeAtStart,
        { width: window.innerWidth, height: window.innerHeight },
      )
      setPanelPos(next)
    }
    const handleUp = (up: PointerEvent) => {
      const state = panelInteractionRef.current
      if (!state || up.pointerId !== state.pointerId) return
      panelInteractionRef.current = null
      removePanelListenersRef.current?.()
      removePanelListenersRef.current = null
      setPanelPos((current) => { if (current) storePanelPosition(current); return current })
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup',   handleUp)
    window.addEventListener('pointercancel', handleUp)
    removePanelListenersRef.current = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup',   handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [panelSize])

  /* ── Panel resize (any edge or corner) ───────────────────────
     Eight handles wrap the panel — four edges and four corners.
     The direction string says which axes grow with pointer motion
     and which need to also move the panel's top-left so the
     opposite edge stays anchored. Examples:
       'se' → drag bottom-right: width += dx, height += dy
       'nw' → drag top-left:     position moves with pointer,
                                 size shrinks/grows from the opposite edge */
  const onResizePointerDown = useCallback(
    (direction: ResizeDirection) => (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()
      const panelEl = (event.currentTarget.closest('[data-assistant-panel]') as HTMLElement | null)
      if (!panelEl) return
      const rect = panelEl.getBoundingClientRect()

      panelInteractionRef.current = {
        pointerId:    event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPanelX:  rect.left,
        startPanelY:  rect.top,
        startWidth:   rect.width,
        startHeight:  rect.height,
      }

      const growsRight  = direction.includes('e')
      const growsLeft   = direction.includes('w')
      const growsDown   = direction.includes('s')
      const growsUp     = direction.includes('n')

      const handleMove = (move: PointerEvent) => {
        const state = panelInteractionRef.current
        if (!state || move.pointerId !== state.pointerId) return
        const dx = move.clientX - state.startClientX
        const dy = move.clientY - state.startClientY
        const viewport = { width: window.innerWidth, height: window.innerHeight }

        // Compute the raw target size from the active axes.
        let nextWidth  = state.startWidth
        let nextHeight = state.startHeight
        if (growsRight) nextWidth  = state.startWidth  + dx
        if (growsLeft)  nextWidth  = state.startWidth  - dx
        if (growsDown)  nextHeight = state.startHeight + dy
        if (growsUp)    nextHeight = state.startHeight - dy
        const clampedSize = clampPanelSize({ width: nextWidth, height: nextHeight }, viewport)

        // When dragging from a west/north edge, the OPPOSITE edge must stay
        // anchored — so the top-left moves by however much the size changed.
        let nextX = state.startPanelX
        let nextY = state.startPanelY
        if (growsLeft) nextX = state.startPanelX + (state.startWidth  - clampedSize.width)
        if (growsUp)   nextY = state.startPanelY + (state.startHeight - clampedSize.height)
        const clampedPos = clampPanelPosition(
          { x: nextX, y: nextY },
          clampedSize,
          viewport,
        )

        setPanelSize(clampedSize)
        if (growsLeft || growsUp) setPanelPos(clampedPos)
      }
      const handleUp = (up: PointerEvent) => {
        const state = panelInteractionRef.current
        if (!state || up.pointerId !== state.pointerId) return
        panelInteractionRef.current = null
        removePanelListenersRef.current?.()
        removePanelListenersRef.current = null
        setPanelSize((current) => { if (current) storePanelSize(current); return current })
        if (growsLeft || growsUp) {
          setPanelPos((current) => { if (current) storePanelPosition(current); return current })
        }
      }

      window.addEventListener('pointermove', handleMove)
      window.addEventListener('pointerup',   handleUp)
      window.addEventListener('pointercancel', handleUp)
      removePanelListenersRef.current = () => {
        window.removeEventListener('pointermove', handleMove)
        window.removeEventListener('pointerup',   handleUp)
        window.removeEventListener('pointercancel', handleUp)
      }
    },
    [],
  )

  /* Double-clicking the header resets to the auto-position + default
     size — same gesture-symmetry as the trigger button's double-click
     reset, so users have an obvious recovery path if they drag the
     panel somewhere awkward. */
  const resetPanelLayout = useCallback(() => {
    setPanelPos(null)
    setPanelSize(null)
    storePanelPosition(null)
    storePanelSize(null)
  }, [])

  return { panelPos, panelSize, setPanelPos, setPanelSize, onHeaderPointerDown, onResizePointerDown, resetPanelLayout }
}
