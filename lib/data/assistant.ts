import { LOGOS } from '@/lib/data/logos'

export const ASSISTANT_CONFIG = {
  imageSrc: LOGOS.voltronFull,
  headerImageSrc: LOGOS.fccAssistant,
  idleAutoOpenMs: 20_000,
  maxMessageChars: 1000,
  maxFeedbackChars: 1000,
  openFeedbackEvent: 'open-feedback',
  title: 'VOLTRON',
  subtitle: 'Virtual Assistant',
  badgeLabel: 'VOLTRON AI',
  launcherTitle: 'Powered by FCC Voltron AI',
  badgeTitle: 'Powered by FCC Voltron AI — answers scoped to APEN Support content',
} as const

/* ── Launcher identity ──────────────────────────────────────────────────
   The floating button used to be an unlabeled robot head — a visitor had no
   way to know it was a support assistant rather than decoration. These
   strings name it in place, the way dell.com and microsoft.com label their
   virtual-assistant entry points instead of relying on an icon alone. */
export const ASSISTANT_LAUNCHER = {
  /** Bold first line of the pill welded to the button. Keep it short. */
  brand: 'VOLTRON',
  /** Second line — the words that tell a first-time visitor what this is. */
  role: 'Virtual Assistant',
  /** Full name, used for aria-labels, tooltips and the greeting card header. */
  fullName: 'Voltron Virtual Assistant',
  /** Native tooltip on the button — states the click action AND the drag affordance. */
  tooltip: 'Voltron Virtual Assistant — click to chat · drag to move · Alt+A',
  /** Screen-reader name when the panel is closed / open. */
  openLabel: 'Open the Voltron Virtual Assistant chat',
  closeLabel: 'Close the Voltron Virtual Assistant chat',
} as const

/* ── First-visit greeting card ──────────────────────────────────────────
   Dell's assistant introduces itself with a title + welcome subtitle before
   the visitor types anything; this is the same idea, anchored to our button.
   Shown once per browser — dismissal is remembered under greetingStorageKey. */
export const ASSISTANT_GREETING = {
  title: 'How can I help you today?',
  body: "I'm the Voltron Virtual Assistant. I can find guides, downloads, STIG and patch answers across APEN Support.",
  cta: 'Ask a question',
  dismissLabel: 'Dismiss the Voltron Virtual Assistant greeting',
  /** Quick-start chips shown in the card (a short slice of the suggested prompts). */
  maxChips: 2,
  /** Delay after load before the card slides out — long enough not to fight page paint. */
  delayMs: 5_000,
  /** Card retracts on its own if the visitor never interacts with it. */
  autoHideMs: 25_000,
  storageKey: 'apen-ai-assistant-greeting-seen',
} as const

/* How long the name pill stays extended on a visit where NO greeting is due
   (i.e. every visit after the first). Long enough to read two short lines,
   short enough not to sit as permanent furniture for daily users. On a first
   visit the pill instead stays out for the whole greeting sequence and
   retracts when the card closes. */
export const ASSISTANT_PILL_INTRO_MS = 6_000

/** Placeholder that shows what this assistant is actually good at. */
export const ASSISTANT_INPUT_PLACEHOLDER = 'Ask me about STIGs, patches, or downloads...'

/* Attach button. The old label just said "Attach file", which explained the
   mechanism but not the point — people had no reason to think Voltron would
   READ the file. Size cap is interpolated from the validator's own constant
   so the two can never drift apart. */
export const ASSISTANT_ATTACH_LABEL = 'Attach a file for Voltron to read'
export function assistantAttachTooltip(limitLabel: string): string {
  return `Attach a log, config, or script file for Voltron to read and explain — plain-text files only (.log, .conf, .json, .ps1, .sh, …), up to ${limitLabel}`
}

/** Transparency line under the composer, mirroring Dell's "verify responses" statement. */
export const ASSISTANT_AI_DISCLAIMER = 'AI-generated responses — please verify before acting.'

/* Keyboard shortcut that opens/closes the assistant from anywhere on the site.
   `code` is the physical key and must be matched FIRST: with Alt held, browsers
   report a composed character in `event.key` on several layouts (macOS Option+A
   gives 'å'), which silently broke a key-only comparison. `key` stays as the
   fallback for layouts that remap the physical position. */
export const ASSISTANT_SHORTCUT = { altKey: true, code: 'KeyA', key: 'a', label: 'Alt+A' } as const

export const ASSISTANT_SUGGESTED_PROMPTS = [
  'How do I add an RPM repo?',
  'Download Evaluate-STIG',
  'Install Trellix on Ubuntu',
  'VMware patch list',
] as const

export const FEEDBACK_CATEGORIES = [
  'Bug Report',
  'Feature Request',
  'General Feedback',
] as const

export type FeedbackCategory = typeof FEEDBACK_CATEGORIES[number]
