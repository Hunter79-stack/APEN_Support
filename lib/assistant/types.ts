export interface AssistantMessage {
  role: 'user' | 'assistant'
  text: string
  ts: number
  attachmentName?: string
}

export interface AssistantAttachment {
  name: string
  content: string
  size: number
}

export type AssistantRating = 1 | -1
