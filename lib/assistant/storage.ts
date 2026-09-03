import type { AssistantMessage, AssistantRating } from '@/lib/assistant/types'

export const ASSISTANT_MESSAGES_STORAGE_KEY = 'apen-ai-assistant-messages'
export const ASSISTANT_RATINGS_STORAGE_KEY = 'apen-ai-assistant-ratings'
const MAX_STORED_MESSAGES = 40
const MAX_STORED_MESSAGE_CHARS = 20_000

export function readStoredMessages(): AssistantMessage[] {
  try {
    const raw = window.sessionStorage.getItem(ASSISTANT_MESSAGES_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((message): message is AssistantMessage =>
      Boolean(message)
      && typeof message === 'object'
      && ((message as AssistantMessage).role === 'user' || (message as AssistantMessage).role === 'assistant')
      && typeof (message as AssistantMessage).text === 'string'
      && (message as AssistantMessage).text.length <= MAX_STORED_MESSAGE_CHARS
      && typeof (message as AssistantMessage).ts === 'number')
      .slice(-MAX_STORED_MESSAGES)
  } catch {
    return []
  }
}

export function storeMessages(messages: AssistantMessage[]) {
  try {
    const bounded = messages.slice(-MAX_STORED_MESSAGES).map((message) => ({
      ...message,
      text: message.text.slice(0, MAX_STORED_MESSAGE_CHARS),
    }))
    if (bounded.length === 0) window.sessionStorage.removeItem(ASSISTANT_MESSAGES_STORAGE_KEY)
    else window.sessionStorage.setItem(ASSISTANT_MESSAGES_STORAGE_KEY, JSON.stringify(bounded))
  } catch { /* session storage is optional */ }
}

export function readStoredRatings(): Record<number, AssistantRating> {
  try {
    const raw = window.sessionStorage.getItem(ASSISTANT_RATINGS_STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed as Record<number, AssistantRating> : {}
  } catch {
    return {}
  }
}

export function storeRatings(ratings: Record<number, AssistantRating>) {
  try {
    if (Object.keys(ratings).length === 0) window.sessionStorage.removeItem(ASSISTANT_RATINGS_STORAGE_KEY)
    else window.sessionStorage.setItem(ASSISTANT_RATINGS_STORAGE_KEY, JSON.stringify(ratings))
  } catch { /* session storage is optional */ }
}

export function clearAssistantSession() {
  try {
    window.sessionStorage.removeItem(ASSISTANT_MESSAGES_STORAGE_KEY)
    window.sessionStorage.removeItem(ASSISTANT_RATINGS_STORAGE_KEY)
  } catch { /* session storage is optional */ }
}
