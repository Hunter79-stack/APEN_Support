'use client'

import { ASSISTANT_CONFIG } from '@/lib/data/assistant'

export function FeedbackLink() {
  return (
    <button 
      type="button"
      onClick={() => window.dispatchEvent(new Event(ASSISTANT_CONFIG.openFeedbackEvent))}
      aria-label="Open site feedback form"
      className="hover:text-cyan-400 transition-colors"
    >
      Feedback
    </button>
  )
}
