/**
 * Chat-panel geometry: the position/size types, the panel's bounds and
 * storage keys, and the pure clamp/persist helpers. No React.
 */

export interface AssistantPosition { x: number; y: number }
export interface AssistantSize     { width: number; height: number }
export interface AssistantViewport { width: number; height: number }

/* Edge clamping margin for the launcher and the panel. */
export const ASSISTANT_MARGIN = 16

/* Separate localStorage keys for the chat PANEL's drag position and
   resize dimensions. Both are nullable in state — when null, the panel
   auto-positions next to the trigger button and uses default size. */
export const ASSISTANT_PANEL_POSITION_STORAGE_KEY = 'apen-ai-assistant-panel-position'
export const ASSISTANT_PANEL_SIZE_STORAGE_KEY     = 'apen-ai-assistant-panel-size'

/* Panel default + bounds — used both as initial values and as clamps
   while the user drags / resizes. */
export const PANEL_DEFAULT_WIDTH  = 440
export const PANEL_DEFAULT_HEIGHT = 600
export const PANEL_MIN_WIDTH      = 320
export const PANEL_MIN_HEIGHT     = 360

export function storePanelPosition(pos: AssistantPosition | null) {
  try {
    if (pos === null) window.localStorage.removeItem(ASSISTANT_PANEL_POSITION_STORAGE_KEY)
    else window.localStorage.setItem(ASSISTANT_PANEL_POSITION_STORAGE_KEY, JSON.stringify(pos))
  } catch { /* ignore */ }
}

export function storePanelSize(size: AssistantSize | null) {
  try {
    if (size === null) window.localStorage.removeItem(ASSISTANT_PANEL_SIZE_STORAGE_KEY)
    else window.localStorage.setItem(ASSISTANT_PANEL_SIZE_STORAGE_KEY, JSON.stringify(size))
  } catch { /* ignore */ }
}


export function clampPanelPosition(
  pos: AssistantPosition,
  size: AssistantSize,
  viewport: AssistantViewport,
): AssistantPosition {
  const maxX = Math.max(ASSISTANT_MARGIN, viewport.width  - size.width  - ASSISTANT_MARGIN)
  const maxY = Math.max(ASSISTANT_MARGIN, viewport.height - size.height - ASSISTANT_MARGIN)
  return {
    x: Math.min(Math.max(pos.x, ASSISTANT_MARGIN), maxX),
    y: Math.min(Math.max(pos.y, ASSISTANT_MARGIN), maxY),
  }
}

export function clampPanelSize(size: AssistantSize, viewport: AssistantViewport): AssistantSize {
  const maxW = Math.max(PANEL_MIN_WIDTH,  viewport.width  - ASSISTANT_MARGIN * 2)
  const maxH = Math.max(PANEL_MIN_HEIGHT, viewport.height - ASSISTANT_MARGIN * 2)
  return {
    width:  Math.min(Math.max(size.width,  PANEL_MIN_WIDTH),  maxW),
    height: Math.min(Math.max(size.height, PANEL_MIN_HEIGHT), maxH),
  }
}
