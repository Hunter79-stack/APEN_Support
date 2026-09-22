'use client'

/**
 * First-visit greeting card next to the launcher: brand line, one-paragraph
 * introduction, quick-start chips and an Open button. Split out of
 * APEN-chat-assistant.tsx (code-quality #76).
 */
import { ArrowRight, X } from 'lucide-react'
import { ASSISTANT_CONFIG, ASSISTANT_GREETING, ASSISTANT_LAUNCHER } from '@/lib/data/assistant'

const VOLTRON_IMAGE_SRC = ASSISTANT_CONFIG.imageSrc

export function GreetingCard({ anchor, prompts, onDismiss, onOpen, onPrompt }: {
  /** Which side/half of the launcher the card opens towards (getAssistantCalloutAnchor). */
  anchor: { horizontal: 'left' | 'right'; vertical: 'up' | 'down' }
  prompts: string[]
  onDismiss: () => void
  onOpen: () => void
  onPrompt: (prompt: string) => void
}) {
  return (
    /* A landmark region, deliberately NOT role="dialog": nothing here traps
       or receives focus, and announcing an unsolicited modal to a screen
       reader mid-page would be worse than letting them find it — the
       trigger button already states what the assistant is. The width cap
       subtracts the button's 40px corner inset plus a 16px far-side gutter
       so the card never touches the opposite screen edge on a phone. */
    <section
      aria-label={`${ASSISTANT_LAUNCHER.fullName} introduction`}
      className={`assistant-greeting-card absolute z-20 w-[min(19rem,calc(100vw-3.5rem))] rounded-xl border border-red-700/40 bg-[#040a16]/95 p-3.5 text-left shadow-[0_18px_44px_rgba(0,0,0,0.6)] backdrop-blur-xl ${
        anchor.horizontal === 'left' ? 'right-0' : 'left-0'
      } ${anchor.vertical === 'up' ? 'bottom-full mb-3' : 'top-full mt-3'}`}
    >
      <div className="flex items-start gap-2">
        <img src={VOLTRON_IMAGE_SRC} alt="" aria-hidden="true" className="h-8 w-8 shrink-0 rounded-full border border-red-700/50 object-cover" />
        <div className="min-w-0 flex-1 leading-none">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white">{ASSISTANT_LAUNCHER.brand}</p>
          <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.1em] text-red-300/90">{ASSISTANT_LAUNCHER.role}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={ASSISTANT_GREETING.dismissLabel}
          className="-mr-1 -mt-1 shrink-0 rounded p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      <p className="mt-3 text-[13px] font-semibold leading-snug text-white">{ASSISTANT_GREETING.title}</p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-gray-300">{ASSISTANT_GREETING.body}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {prompts.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPrompt(p)}
            className="rounded border border-white/10 px-2 py-1 text-[10px] text-gray-200 transition-colors hover:bg-white/5"
          >
            {p}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-700 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-red-600"
      >
        {ASSISTANT_GREETING.cta} <ArrowRight size={13} />
      </button>
    </section>
  )
}
