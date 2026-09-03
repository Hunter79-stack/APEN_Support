import type { AssistantAttachment, AssistantMessage } from '@/lib/assistant/types'

export const ASSISTANT_ATTACHMENT_ACCEPT = '.txt,.csv,.json,.xml,.md,.html,.js,.ts,.tsx,.py,.ps1,.sh,.css,.log,.yaml,.yml,.toml,.ini,.cfg,.conf'
// Raised from 256 KB / 100,000 chars — log dumps, config exports, and similar
// support-ticket attachments regularly exceed that. The server (see
// resolveAttachmentContext in proxy/voltron-proxy.mjs) summarizes anything too
// big to fit in one model call rather than silently truncating it, so a much
// higher accept limit here is safe: nothing downstream just drops the excess.
export const MAX_ASSISTANT_ATTACHMENT_BYTES = 10 * 1024 * 1024 // 10 MB
/* Single derived source for the human-readable size cap. The old assistant
   privacy notice hard-coded "256 KB" and silently went stale when the limit
   was raised to 10 MB — deriving the label means the UI can never disagree
   with the validator again. */
export const ASSISTANT_ATTACHMENT_LIMIT_LABEL = `${Math.floor(MAX_ASSISTANT_ATTACHMENT_BYTES / (1024 * 1024))} MB`
export const MAX_ASSISTANT_ATTACHMENT_CHARS = 10_000_000
export const MAX_ASSISTANT_MESSAGE_CHARS = 8_000
export const MAX_ASSISTANT_REQUEST_MESSAGES = 20
export const MAX_ASSISTANT_REQUEST_CHARS = 140_000

const ALLOWED_EXTENSIONS = new Set(ASSISTANT_ATTACHMENT_ACCEPT.split(',').map((value) => value.slice(1)))

export function validateAssistantAttachment(file: Pick<File, 'name' | 'size'>): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTENSIONS.has(extension)) return 'Only approved text and script files can be attached.'
  if (file.size <= 0) return 'The selected file is empty.'
  if (file.size > MAX_ASSISTANT_ATTACHMENT_BYTES) {
    return `Attachments are limited to ${ASSISTANT_ATTACHMENT_LIMIT_LABEL}.`
  }
  return null
}

export async function readAssistantTextAttachment(file: File): Promise<AssistantAttachment> {
  const validationError = validateAssistantAttachment(file)
  if (validationError) throw new Error(validationError)

  const content = await file.text()
  if (content.includes('\0')) throw new Error('Binary files are not supported.')

  return {
    name: file.name,
    size: file.size,
    content: content.slice(0, MAX_ASSISTANT_ATTACHMENT_CHARS),
  }
}

// Trims chat history to the last N turns and an overall character budget. The
// attachment is no longer folded in here — it travels as its own request
// field (see handleSend in APEN-chat-assistant.tsx) so a large file doesn't
// eat into this budget or get clipped by it. The server applies its own,
// much larger, attachment-specific limits and summarizes anything too big for
// a single model call (see MAX_ATTACHMENT_* in proxy/voltron-proxy.mjs).
export function buildAssistantRequestMessages(history: AssistantMessage[]) {
  const recent = history.slice(-MAX_ASSISTANT_REQUEST_MESSAGES).map((message) => ({
    role: message.role,
    content: message.text,
  }))

  const bounded: typeof recent = []
  let totalCharacters = 0
  for (let index = recent.length - 1; index >= 0; index -= 1) {
    const entry = recent[index]
    const available = MAX_ASSISTANT_REQUEST_CHARS - totalCharacters
    if (available <= 0) break
    const content = entry.content.slice(-available)
    bounded.unshift({ ...entry, content })
    totalCharacters += content.length
  }
  return bounded
}
