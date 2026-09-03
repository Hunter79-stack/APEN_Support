'use client'

/**
 * AdminPageWizard — guided multi-step form for creating a new "custom page".
 *
 * Step 1 — choose a template (product downloads, docs, tools links).
 * Step 2 — page metadata (title, slug, subtitle, badge, category, logo).
 * Step 3 — add cards (template-driven fields, with per-card download rows).
 * Step 4 — review + publish.
 *
 * Validation runs at each step so the admin can't advance with missing required
 * fields. Slug uniqueness is checked against existing custom pages and the
 * server-side reserved-slug list (admin/api/vmware/...).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { GlowCard } from '@/components/ui/spotlight-card'
import {
  adminContentClient,
  CUSTOM_PAGE_PARENTS,
  getCustomPageParent,
  PAGE_TEMPLATES,
  BACK_LINK_PRESETS,
  BADGE_PRESETS,
  LOGO_PRESETS,
  GRID_LAYOUT_PRESETS,
  GLOW_COLOR_PRESETS,
  PREDEFINED_TAGS,
  DOWNLOAD_BASE_PRESETS,
  type CustomPage,
  type CustomPageCard,
  type PageTemplate,
} from '@/lib/data/admin-content'
import { APENSUPPORT_BASE } from '@/lib/data/constants'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  ExternalLink,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react'

const RESERVED = new Set(['admin', 'api', 'custom-pages', 'isos', 'vmware', 'docs', 'support', 'trellix', 'dren', 'tools', 'pdq', 'videos'])
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/

/** Path-style identifiers used to light up the offending field with a red border.
 *  Examples: "title", "slug", "cards.0.title", "cards.2.downloads.1.label". */
type FieldPath = string

interface ValidationError {
  message: string
  field?: FieldPath
}

/** Helper for the red-border + ring styling applied to whichever field failed validation. */
function errorBorderClass(field: FieldPath, errored?: FieldPath): string {
  return field === errored
    ? 'border-red-400/70 ring-2 ring-red-400/40 focus:border-red-300 focus:ring-red-300/40'
    : 'border-white/10 focus:border-cyan-400/60'
}

/* ─── Friendly dropdown components for non-technical admins ──
 *
 * These wrap a native <select> with a "Custom…" escape hatch that reveals a
 * text input when none of the presets fit. They avoid asking the admin to
 * type slugs, paths, or Tailwind classes by hand while still letting power
 * users override anything when needed.
 */

const CUSTOM_SENTINEL = '__custom__'

/** Generic preset+custom picker. Use for badge labels, back-link targets,
 *  download base URLs, etc. */
function DropdownWithCustom({
  label,
  help,
  value,
  onChange,
  options,
  customLabel = 'Custom (type your own)…',
  placeholder,
  fieldPath,
  erroredField,
}: {
  label: string
  help?: string
  value: string
  onChange: (next: string) => void
  options: { label: string; value: string }[]
  customLabel?: string
  placeholder?: string
  fieldPath?: FieldPath
  erroredField?: FieldPath
}) {
  // The <select> shows CUSTOM_SENTINEL when the current value isn't one of
  // the presets, in which case we render a text input below it.
  const matchedPreset = options.find((opt) => opt.value === value)
  const showCustom = !matchedPreset && value !== ''
  const selectValue = matchedPreset ? matchedPreset.value : showCustom ? CUSTOM_SENTINEL : ''
  const errored = fieldPath && fieldPath === erroredField

  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</label>
      <select
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value
          if (next === CUSTOM_SENTINEL) {
            // Switching from preset to custom — clear the value so the user
            // has an empty text box to type into.
            onChange('')
          } else {
            onChange(next)
          }
        }}
        className={`mt-1 h-10 w-full rounded-lg border bg-black/30 px-3 text-sm text-white outline-none ${
          errored
            ? 'border-red-400/70 ring-2 ring-red-400/40 focus:border-red-300'
            : 'border-white/10 focus:border-cyan-400/60'
        }`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
        <option value={CUSTOM_SENTINEL}>{customLabel}</option>
      </select>
      {showCustom && (
        <input
          {...(fieldPath ? { 'data-field-path': fieldPath } : {})}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`mt-2 h-10 w-full rounded-lg border bg-black/30 px-3 text-sm text-white outline-none ${
            errored
              ? 'border-red-400/70 ring-2 ring-red-400/40 focus:border-red-300'
              : 'border-white/10 focus:border-cyan-400/60'
          }`}
        />
      )}
      {help && <p className="mt-1 text-[10px] text-slate-600">{help}</p>}
    </div>
  )
}

/** Logo picker — dropdown grouped by category (Brand, VMware, Linux, etc.)
 *  with a thumbnail preview of the currently chosen logo. */
function LogoPicker({
  label,
  value,
  onChange,
  help,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  help?: string
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, typeof LOGO_PRESETS>()
    for (const opt of LOGO_PRESETS) {
      const list = map.get(opt.group) ?? []
      list.push(opt)
      map.set(opt.group, list)
    }
    return Array.from(map.entries())
  }, [])
  const matched = LOGO_PRESETS.find((p) => p.value === value)
  const showCustom = value !== '' && !matched
  const selectValue = matched ? matched.value : showCustom ? CUSTOM_SENTINEL : ''
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</label>
      <div className="mt-1 flex items-stretch gap-2">
        {value && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/40 p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="max-h-full max-w-full object-contain" />
          </div>
        )}
        <select
          value={selectValue}
          onChange={(e) => {
            const next = e.target.value
            if (next === '') onChange('')
            else if (next === CUSTOM_SENTINEL) onChange('')
            else onChange(next)
          }}
          className="h-10 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
        >
          <option value="">— No logo —</option>
          {grouped.map(([group, opts]) => (
            <optgroup key={group} label={group}>
              {opts.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </optgroup>
          ))}
          <option value={CUSTOM_SENTINEL}>Custom path…</option>
        </select>
      </div>
      {showCustom && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Choose a catalog image or enter a full URL"
          className="mt-2 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
        />
      )}
      {help && <p className="mt-1 text-[10px] text-slate-600">{help}</p>}
    </div>
  )
}

/** Glow-colour picker that shows each option as a small swatch dot in front
 *  of a friendly label like "Orange (warm)". */
function GlowColorPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (next: string) => void
}) {
  const current = GLOW_COLOR_PRESETS.find((p) => p.value === value) ?? GLOW_COLOR_PRESETS[0]
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</label>
      <div className="mt-1 flex items-stretch gap-2">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/40"
          aria-hidden="true"
        >
          <span className="block h-5 w-5 rounded-full" style={{ background: current.swatch, boxShadow: `0 0 12px ${current.swatch}` }} />
        </div>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
        >
          {GLOW_COLOR_PRESETS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

interface WizardCardDraft extends CustomPageCard {
  /** Used by the wizard to keep stable React keys before the card has a final id. */
  _localKey: string
}

interface WizardState {
  templateId: string
  slug: string
  title: string
  subtitle: string
  badge: string
  backHref: string
  backColor: CustomPage['backColor']
  logo: string
  category: string
  gridCols: string
  cards: WizardCardDraft[]
  published: boolean
}

const INITIAL_STATE: WizardState = {
  templateId: PAGE_TEMPLATES[0].id,
  slug: '',
  title: '',
  subtitle: '',
  badge: PAGE_TEMPLATES[0].defaultBadge,
  backHref: '/home',
  backColor: PAGE_TEMPLATES[0].defaultBackColor,
  logo: '',
  // Empty so admins must pick a section explicitly — Step 2 validation rejects
  // a blank category. The page URL is /<category>/<slug>, so leaving this
  // unset would publish to a URL no one can predict.
  category: '',
  gridCols: 'sm:grid-cols-2 lg:grid-cols-3',
  cards: [],
  published: true,
}

function suggestSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

function newCardDraft(template: PageTemplate, index: number): WizardCardDraft {
  return {
    _localKey: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    id: `card-${index + 1}`,
    title: '',
    description: '',
    glowColor: template.cardDefaults.glowColor || 'cyan',
    tags: [],
    logo: '',
    downloads: [],
    body: '',
    ...template.cardDefaults,
  }
}

function validateStep(step: number, state: WizardState, existingSlugs: Set<string>): ValidationError | null {
  if (step === 1) {
    if (!state.templateId) return { message: 'Pick a template to continue.', field: 'templateId' }
    return null
  }
  if (step === 2) {
    if (!state.title.trim() || state.title.trim().length < 2) return { message: 'Title must be at least 2 characters.', field: 'title' }
    const parent = getCustomPageParent(state.category)
    if (!parent) {
      return { message: 'Pick a section/category — it becomes the URL prefix and helps other admins find this page later.', field: 'category' }
    }
    if (!state.slug.trim()) return { message: 'Slug is required (auto-suggested from the title).', field: 'slug' }
    if (!SLUG_PATTERN.test(state.slug)) return { message: 'Slug must be lowercase a-z, 0-9, hyphens; 3+ chars; no leading/trailing hyphen.', field: 'slug' }
    if (RESERVED.has(state.slug)) return { message: `"${state.slug}" is reserved by the site. Pick a different slug.`, field: 'slug' }
    if (parent.reservedSubSlugs.includes(state.slug)) {
      return { message: `"/${parent.value}/${state.slug}" is already a real page on the site. Pick a different slug (reserved under ${parent.label}: ${parent.reservedSubSlugs.join(', ')}).`, field: 'slug' }
    }
    if (existingSlugs.has(state.slug)) return { message: `A custom page with slug "${state.slug}" already exists.`, field: 'slug' }
    return null
  }
  if (step === 3) {
    if (state.cards.length === 0) return { message: 'Add at least one card before reviewing.', field: 'cards' }
    for (const [i, card] of state.cards.entries()) {
      if (!card.title.trim()) return { message: `Card ${i + 1}: title is required.`, field: `cards.${i}.title` }
      if (!card.description.trim()) return { message: `Card ${i + 1}: description is required.`, field: `cards.${i}.description` }
      if (card.downloads && card.downloads.length > 0) {
        for (const [d, dl] of card.downloads.entries()) {
          if (!dl.label.trim()) return { message: `Card ${i + 1} download #${d + 1}: label is required.`, field: `cards.${i}.downloads.${d}.label` }
          if (!dl.href.trim()) return { message: `Card ${i + 1} download #${d + 1}: URL is required.`, field: `cards.${i}.downloads.${d}.href` }
        }
      }
    }
    return null
  }
  return null
}

const STEPS = [
  { n: 1, label: 'Template' },
  { n: 2, label: 'Page details' },
  { n: 3, label: 'Cards & downloads' },
  { n: 4, label: 'Review & publish' },
] as const

// Step 4 has a two-stage publish flow: save the page as a draft, then run a
// preflight check and flip it live. Each stage carries its own progress so the
// UI can show two checklist items instead of one opaque "submitting" spinner.
export type PublishPhase =
  | { kind: 'idle' }
  | { kind: 'draft-saving' }
  | { kind: 'draft-saved'; url: string }
  | { kind: 'preflight'; url: string }
  | { kind: 'preflight-failed'; error: string; url: string }
  | { kind: 'live-publishing'; url: string }
  | { kind: 'live'; url: string }
  | { kind: 'error'; stage: 'draft' | 'live'; error: string; url?: string }

export function AdminPageWizard({ onPublished }: { onPublished?: (slug: string) => void }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [state, setState] = useState<WizardState>(INITIAL_STATE)
  const [existingSlugs, setExistingSlugs] = useState<Set<string>>(new Set())
  const [validationError, setValidationError] = useState<ValidationError | null>(null)
  const [phase, setPhase] = useState<PublishPhase>({ kind: 'idle' })

  // After a failed validation, scroll the offending field into view + focus it.
  // Each form input below sets `data-field-path` so we can find it without refs.
  const wizardRoot = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!validationError?.field || !wizardRoot.current) return
    const target = wizardRoot.current.querySelector<HTMLElement>(
      `[data-field-path="${validationError.field}"]`,
    )
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Focus inputs so the user can fix the value immediately. Cards (parent
      // containers) get a soft focus that styles their wrapper instead.
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
        target.focus({ preventScroll: true })
      }
    }
  }, [validationError])

  const template = useMemo(
    () => PAGE_TEMPLATES.find((t) => t.id === state.templateId) || PAGE_TEMPLATES[0],
    [state.templateId],
  )

  // Pull existing slugs once so the wizard can warn about collisions immediately.
  useEffect(() => {
    adminContentClient.fetchAll().then((data) => {
      if (data) setExistingSlugs(new Set((data.customPages || []).map((p) => p.slug)))
    })
  }, [])

  function patch(updates: Partial<WizardState>) {
    setState((s) => ({ ...s, ...updates }))
    setValidationError(null)
  }

  function goNext() {
    const err = validateStep(step, state, existingSlugs)
    if (err) {
      setValidationError(err)
      return
    }
    if (step === 1) {
      // Apply template defaults when entering step 2 for the first time.
      patch({
        badge: template.defaultBadge,
        backHref: template.defaultParent,
        backColor: template.defaultBackColor,
      })
    }
    if (step < 4) setStep((step + 1) as 1 | 2 | 3 | 4)
  }

  function goBack() {
    if (step > 1) {
      setValidationError(null)
      setStep((step - 1) as 1 | 2 | 3 | 4)
    }
  }

  function reset() {
    setState(INITIAL_STATE)
    setStep(1)
    setPhase({ kind: 'idle' })
    setValidationError(null)
  }

  // Build the full saveCustomPage payload from current wizard state. Both
  // stages send the same fields — only the `published` flag differs.
  function buildPayload(published: boolean) {
    const cards: CustomPageCard[] = state.cards.map(({ _localKey, ...card }) => card)
    return {
      slug: state.slug,
      title: state.title,
      subtitle: state.subtitle,
      badge: state.badge,
      backHref: state.backHref,
      backColor: state.backColor,
      logo: state.logo,
      category: state.category,
      gridCols: state.gridCols,
      cards,
      published,
    }
  }

  // Stage 1 — write the page to the backend as a draft (published: false).
  // Validation matches the previous one-shot publish, including the jump-back
  // behavior when an earlier step's fields are invalid.
  async function saveDraft() {
    setValidationError(null)
    const step2Err = validateStep(2, state, existingSlugs)
    if (step2Err) {
      setValidationError(step2Err)
      setStep(2)
      return
    }
    const step3Err = validateStep(3, state, existingSlugs)
    if (step3Err) {
      setValidationError(step3Err)
      setStep(3)
      return
    }
    setPhase({ kind: 'draft-saving' })
    const result = await adminContentClient.saveCustomPage(buildPayload(false))
    if (result.ok) {
      setPhase({ kind: 'draft-saved', url: result.url })
      // Add to existingSlugs so subsequent validations don't flag the draft
      // as a fresh slug collision against itself.
      setExistingSlugs((prev) => new Set(prev).add(state.slug))
    } else {
      setPhase({ kind: 'error', stage: 'draft', error: result.error })
    }
  }

  // Stage 2 — preflight (backend reachable, draft present, no foreign
  // same-slug record) then flip published: true.
  async function goLive() {
    const draftUrl = phase.kind === 'draft-saved' || phase.kind === 'preflight-failed'
      ? phase.url
      : phase.kind === 'error' && phase.url
      ? phase.url
      : ''
    setPhase({ kind: 'preflight', url: draftUrl })
    const data = await adminContentClient.fetchAll()
    if (!data) {
      setPhase({ kind: 'preflight-failed', error: 'Backend unreachable — try again in a moment.', url: draftUrl })
      return
    }
    const match = (data.customPages || []).find((p) => p.slug === state.slug)
    if (!match) {
      setPhase({ kind: 'preflight-failed', error: 'Draft not found on the server. Save the draft again.', url: draftUrl })
      return
    }
    if (match.published) {
      setPhase({ kind: 'preflight-failed', error: 'A page with this slug is already published by someone else.', url: draftUrl })
      return
    }
    setPhase({ kind: 'live-publishing', url: draftUrl })
    const result = await adminContentClient.saveCustomPage(buildPayload(true))
    if (result.ok) {
      setPhase({ kind: 'live', url: result.url })
      onPublished?.(state.slug)
    } else {
      setPhase({ kind: 'error', stage: 'live', error: result.error, url: draftUrl })
    }
  }

  const erroredField = validationError?.field

  return (
    <div className="space-y-6" ref={wizardRoot}>
      {/* Stepper */}
      <GlowCard glowColor="cyan" className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wand2 size={16} className="text-cyan-300" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white">New Page Wizard</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {STEPS.map((s) => {
            const active = s.n === step
            const done = s.n < step
            return (
              <div
                key={s.n}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${
                  active
                    ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200'
                    : done
                    ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
                    : 'border-white/10 bg-white/5 text-slate-500'
                }`}
              >
                <span className={`w-5 h-5 rounded-full text-center ${done ? 'bg-emerald-500/30' : active ? 'bg-cyan-500/30' : 'bg-white/10'}`}>
                  {s.n}
                </span>
                {s.label}
              </div>
            )
          })}
        </div>
      </GlowCard>

      {/* Validation banner — sticky at the top of the step body so the admin
          always sees what they need to fix while scrolling through cards. */}
      {validationError && step !== 4 && (
        <div className="sticky top-2 z-20 flex items-center gap-2 rounded-lg border border-red-400/40 bg-red-500/15 backdrop-blur-md px-3 py-2 text-xs text-red-200 shadow-lg">
          <AlertTriangle size={14} className="shrink-0" />
          <span className="flex-1">{validationError.message}</span>
          {erroredField && (
            <span className="text-[10px] font-mono text-red-300/70 uppercase tracking-widest">field: {erroredField}</span>
          )}
        </div>
      )}

      {/* Step body */}
      {step === 1 && <Step1Template state={state} patch={patch} />}
      {step === 2 && <Step2Details state={state} patch={patch} existingSlugs={existingSlugs} erroredField={erroredField} />}
      {step === 3 && <Step3Cards state={state} patch={patch} template={template} erroredField={erroredField} />}
      {step === 4 && <Step4Review state={state} template={template} phase={phase} />}

      {/* Step navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={goBack}
          disabled={step === 1 || phase.kind === 'draft-saving' || phase.kind === 'preflight' || phase.kind === 'live-publishing'}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-white/20 disabled:opacity-30"
        >
          <ArrowLeft size={12} /> Back
        </button>
        <div className="flex gap-2">
          {step === 4 && (phase.kind === 'idle' || (phase.kind === 'error' && phase.stage === 'draft')) && (
            <button
              onClick={saveDraft}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 text-[10px] font-black uppercase tracking-widest text-amber-200 hover:bg-amber-400/20"
            >
              <Save size={12} /> {phase.kind === 'error' ? 'Retry save draft' : 'Save draft'}
            </button>
          )}
          {step === 4 && phase.kind === 'draft-saving' && (
            <button
              disabled
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 text-[10px] font-black uppercase tracking-widest text-amber-200 opacity-60"
            >
              <Loader2 size={12} className="animate-spin" /> Saving draft…
            </button>
          )}
          {step === 4 && (phase.kind === 'draft-saved' || phase.kind === 'preflight-failed' || (phase.kind === 'error' && phase.stage === 'live')) && (
            <button
              onClick={goLive}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 text-[10px] font-black uppercase tracking-widest text-emerald-200 hover:bg-emerald-400/20"
            >
              <Sparkles size={12} /> {phase.kind === 'draft-saved' ? 'Go live' : 'Retry go live'}
            </button>
          )}
          {step === 4 && (phase.kind === 'preflight' || phase.kind === 'live-publishing') && (
            <button
              disabled
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 text-[10px] font-black uppercase tracking-widest text-emerald-200 opacity-60"
            >
              <Loader2 size={12} className="animate-spin" /> {phase.kind === 'preflight' ? 'Preflight…' : 'Going live…'}
            </button>
          )}
          {step === 4 && phase.kind === 'live' && (
            <button
              onClick={reset}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 text-[10px] font-black uppercase tracking-widest text-cyan-200 hover:bg-cyan-400/20"
            >
              Create another page
            </button>
          )}
          {step < 4 && (
            <button
              onClick={goNext}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 text-[10px] font-black uppercase tracking-widest text-cyan-200 hover:bg-cyan-400/20"
            >
              Next <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Step 1 — template ─── */
function Step1Template({ state, patch }: { state: WizardState; patch: (u: Partial<WizardState>) => void }) {
  return (
    <GlowCard glowColor="indigo" className="p-5">
      <h3 className="text-base font-bold text-white mb-1">Pick a template</h3>
      <p className="text-xs text-slate-500 mb-4">Each template constrains card fields so you can&apos;t accidentally produce something the site can&apos;t render.</p>
      <div className="grid gap-3 md:grid-cols-3">
        {PAGE_TEMPLATES.map((t) => {
          const active = state.templateId === t.id
          return (
            <button
              key={t.id}
              onClick={() => patch({ templateId: t.id, badge: t.defaultBadge, backHref: t.defaultParent, backColor: t.defaultBackColor })}
              className={`text-left rounded-xl border p-4 transition-colors ${active ? 'border-cyan-400/50 bg-cyan-400/10' : 'border-white/10 bg-black/20 hover:border-cyan-400/20'}`}
            >
              <p className={`text-sm font-bold ${active ? 'text-cyan-200' : 'text-white'}`}>{t.label}</p>
              <p className="mt-1 text-xs text-slate-500">{t.description}</p>
              <p className="mt-3 text-[10px] font-mono uppercase tracking-widest text-slate-600">parent: {t.defaultParent}</p>
            </button>
          )
        })}
      </div>
    </GlowCard>
  )
}

/* ─── Step 2 — page details ─── */
function Step2Details({
  state,
  patch,
  existingSlugs,
  erroredField,
}: {
  state: WizardState
  patch: (u: Partial<WizardState>) => void
  existingSlugs: Set<string>
  erroredField?: FieldPath
}) {
  // Advanced settings are hidden by default since most admins won't need them.
  const [showAdvanced, setShowAdvanced] = useState(false)

  const slugSuggestion = suggestSlug(state.title)
  const slugInUse = existingSlugs.has(state.slug)
  const slugReserved = RESERVED.has(state.slug)
  const slugInvalid = state.slug.length > 0 && !SLUG_PATTERN.test(state.slug)
  // Per-section reserved sub-slugs — slugs that would shadow a real route
  // like /vmware/v9 or /support/ticket. The list lives on each section in
  // CUSTOM_PAGE_PARENTS so the wizard and proxy stay in sync.
  const sectionParent = getCustomPageParent(state.category)
  const slugCollidesWithRealRoute = !!sectionParent && state.slug.length > 0 && sectionParent.reservedSubSlugs.includes(state.slug)
  // Slug failures get a red border whether triggered live or by the validator.
  const slugErrored = erroredField === 'slug' || slugInUse || slugReserved || slugInvalid || slugCollidesWithRealRoute

  // Build the badge dropdown from BADGE_PRESETS (same value+label pair shape
  // the DropdownWithCustom helper expects).
  const badgeOptions = BADGE_PRESETS.map((b) => ({ label: b, value: b }))

  return (
    <GlowCard glowColor="cyan" className="p-5">
      <h3 className="text-base font-bold text-white mb-1">Page details</h3>
      <p className="text-xs text-slate-500 mb-4">
        These show up in the page header. Pick from the dropdowns where possible — the wizard fills in
        all the technical bits behind the scenes.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Page title *</label>
          <input
            data-field-path="title"
            value={state.title}
            onChange={(e) => {
              const title = e.target.value
              const next: Partial<WizardState> = { title }
              // Auto-update the slug as long as the admin hasn't typed their own.
              if (!state.slug || state.slug === suggestSlug(state.title)) next.slug = suggestSlug(title)
              patch(next)
            }}
            placeholder="e.g. VMware 10 Products"
            className={`mt-1 h-10 w-full rounded-lg border bg-black/30 px-3 text-sm text-white outline-none ${errorBorderClass('title', erroredField)}`}
          />
          <p className="mt-1 text-[10px] text-slate-600">The big heading at the top of the new page.</p>
        </div>

        <div className="md:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Subtitle</label>
          <textarea
            rows={2}
            value={state.subtitle}
            onChange={(e) => patch({ subtitle: e.target.value })}
            placeholder="A one-sentence description shown under the page title (optional)."
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Section / category *</label>
          <select
            data-field-path="category"
            value={state.category}
            onChange={(e) => {
              // Picking a section also locks in where the back-arrow goes,
              // so non-technical admins don't have to think about both.
              const next = e.target.value
              const parent = getCustomPageParent(next)
              patch({ category: next, ...(parent ? { backHref: parent.parentHref } : {}) })
            }}
            className={`mt-1 h-10 w-full rounded-lg border bg-black/30 px-3 text-sm text-white outline-none ${errorBorderClass('category', erroredField)}`}
          >
            <option value="" disabled>— Pick a section —</option>
            {CUSTOM_PAGE_PARENTS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <p className="mt-1 text-[10px] text-slate-600">
            Becomes the URL prefix:{' '}
            <code className="text-slate-400 font-mono">
              /{state.category || '<section>'}/{state.slug || '<slug>'}
            </code>
            . Required so other admins can find the page later.
          </p>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Card layout</label>
          <select
            value={state.gridCols}
            onChange={(e) => patch({ gridCols: e.target.value })}
            className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
          >
            {GRID_LAYOUT_PRESETS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
          <p className="mt-1 text-[10px] text-slate-600">How many cards appear side-by-side on a wide screen.</p>
        </div>

        <div>
          <DropdownWithCustom
            label="Header pill label"
            help="The small coloured chip above the title (e.g. 'VMware', 'Docs')."
            value={state.badge}
            onChange={(v) => patch({ badge: v })}
            options={badgeOptions}
            customLabel="Custom (type your own)…"
            placeholder="My label"
          />
        </div>

        <div>
          <DropdownWithCustom
            label="Where the back arrow goes"
            help="The pill in the page header sends users here when clicked."
            value={state.backHref}
            onChange={(v) => patch({ backHref: v })}
            options={BACK_LINK_PRESETS}
            customLabel="Custom URL…"
            placeholder="/some/path"
          />
        </div>

        <div className="md:col-span-2">
          <GlowColorPicker
            label="Header pill color"
            value={state.backColor as string}
            onChange={(v) => patch({ backColor: v as WizardState['backColor'] })}
          />
        </div>

        <div className="md:col-span-2">
          <LogoPicker
            label="Page logo (optional)"
            value={state.logo}
            onChange={(v) => patch({ logo: v })}
            help="Shown on the left of the page header, large size. Leave blank to skip."
          />
        </div>

        {/* Advanced settings — collapsed by default. The slug lives here so
            non-technical admins never have to think about URL slugs. */}
        <div className="md:col-span-2 rounded-xl border border-white/10 bg-black/20">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div>
              <p className="text-xs font-semibold text-white">Advanced settings</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                URL address ({state.slug && state.category ? `/${state.category}/${state.slug}` : 'auto-generated from section + title'})
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{showAdvanced ? '▲ Hide' : '▼ Show'}</span>
          </button>
          {showAdvanced && (
            <div className="px-4 pb-4 border-t border-white/5 pt-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Page address (auto)</label>
              <p className="text-[10px] text-slate-500 mt-1 mb-2">
                The address shown in the browser URL bar. Generated from the title automatically — only edit
                this if you want a specific URL.
              </p>
              <div className="flex items-stretch gap-2">
                <span className="inline-flex h-10 items-center rounded-lg border border-white/10 bg-black/30 px-3 text-xs font-mono text-slate-500">
                  /{state.category || '<section>'}/
                </span>
                <input
                  data-field-path="slug"
                  value={state.slug}
                  onChange={(e) => patch({ slug: e.target.value.toLowerCase() })}
                  placeholder={slugSuggestion || 'my-page'}
                  className={`h-10 flex-1 rounded-lg border bg-black/30 px-3 text-sm text-white font-mono outline-none ${slugErrored ? 'border-red-400/70 ring-2 ring-red-400/40 focus:border-red-400/70' : 'border-white/10 focus:border-cyan-400/60'}`}
                />
                <button
                  type="button"
                  onClick={() => patch({ slug: suggestSlug(state.title) })}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-cyan-400/30 hover:text-cyan-300"
                >
                  Reset to title
                </button>
              </div>
              {slugInUse && <p className="mt-1 text-[10px] text-red-300">Already in use — pick a different address.</p>}
              {slugReserved && <p className="mt-1 text-[10px] text-red-300">Reserved by the site — pick a different address.</p>}
              {slugInvalid && <p className="mt-1 text-[10px] text-red-300">Use lowercase letters, numbers, and hyphens only.</p>}
              {slugCollidesWithRealRoute && sectionParent && (
                <p className="mt-1 text-[10px] text-red-300">
                  <code className="font-mono">/{sectionParent.value}/{state.slug}</code> is already a real page on the site. Reserved under {sectionParent.label}: {sectionParent.reservedSubSlugs.join(', ')}.
                </p>
              )}
              {!slugInUse && !slugReserved && !slugInvalid && !slugCollidesWithRealRoute && state.slug && (
                <p className="mt-1 text-[10px] text-emerald-300">Address is available.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </GlowCard>
  )
}

/* ─── Step 3 — cards ─── */
/** Pick a sensible URL prefix for newly-added downloads based on the page's
 *  category. The admin can always edit it, but pre-filling beats forcing them
 *  to type the same prefix on every row. */
function downloadPrefixForCategory(category: string): string {
  const map: Record<string, string> = {
    vmware: `${APENSUPPORT_BASE}/vmware/`,
    docs: `${APENSUPPORT_BASE}/docs/`,
    isos: `${APENSUPPORT_BASE}/isos/`,
    tools: `${APENSUPPORT_BASE}/`,
    security: `${APENSUPPORT_BASE}/evaluate-stig/`,
    support: `${APENSUPPORT_BASE}/support/`,
    general: `${APENSUPPORT_BASE}/`,
  }
  return map[category] || `${APENSUPPORT_BASE}/`
}

function Step3Cards({
  state,
  patch,
  template,
  erroredField,
}: {
  state: WizardState
  patch: (u: Partial<WizardState>) => void
  template: PageTemplate
  erroredField?: FieldPath
}) {
  function addCard() {
    const next: WizardCardDraft = newCardDraft(template, state.cards.length)
    patch({ cards: [...state.cards, next] })
  }

  function updateCard(idx: number, updates: Partial<WizardCardDraft>) {
    const next = state.cards.map((card, i) => (i === idx ? { ...card, ...updates } : card))
    patch({ cards: next })
  }

  function removeCard(idx: number) {
    patch({ cards: state.cards.filter((_, i) => i !== idx) })
  }

  function addDownload(idx: number) {
    const card = state.cards[idx]
    // Pre-fill the URL with the category-appropriate prefix so admins don't
    // have to type the same APEN base URL on every row. They can clear it if
    // the link is genuinely external.
    const prefilledHref = downloadPrefixForCategory(state.category)
    const downloads = [...(card.downloads || []), { label: '', href: prefilledHref }]
    updateCard(idx, { downloads })
  }

  function updateDownload(cardIdx: number, dlIdx: number, key: 'label' | 'href' | 'desc' | 'isDoc', value: string | boolean) {
    const card = state.cards[cardIdx]
    const downloads = (card.downloads || []).map((d, i) => (i === dlIdx ? { ...d, [key]: value } : d))
    updateCard(cardIdx, { downloads })
  }

  function removeDownload(cardIdx: number, dlIdx: number) {
    const card = state.cards[cardIdx]
    updateCard(cardIdx, { downloads: (card.downloads || []).filter((_, i) => i !== dlIdx) })
  }

  // Did the validator complain about the cards array as a whole (zero cards)?
  const cardsArrayErrored = erroredField === 'cards'

  return (
    <GlowCard glowColor="indigo" className="p-5">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-base font-bold text-white">Cards on this page</h3>
        <button
          onClick={addCard}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 text-[10px] font-black uppercase tracking-widest text-cyan-200 hover:bg-cyan-400/20"
        >
          <Plus size={12} /> Add card
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-4">Required template fields: {template.cardFields.filter((f) => f.required).map((f) => f.label).join(', ') || '—'}.</p>

      {state.cards.length === 0 && (
        <div
          data-field-path="cards"
          className={`rounded-xl border border-dashed p-8 text-center ${cardsArrayErrored ? 'border-red-400/60 bg-red-500/10' : 'border-white/10'}`}
        >
          <p className={`text-sm ${cardsArrayErrored ? 'text-red-200' : 'text-slate-400'}`}>
            No cards yet — click <span className="text-cyan-300">Add card</span> to start.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {state.cards.map((card, idx) => (
          <CardEditor
            key={card._localKey}
            card={card}
            idx={idx}
            updateCard={updateCard}
            removeCard={removeCard}
            addDownload={addDownload}
            updateDownload={updateDownload}
            removeDownload={removeDownload}
            categoryPrefix={downloadPrefixForCategory(state.category)}
            erroredField={erroredField}
          />
        ))}
      </div>
    </GlowCard>
  )
}

/* ─── Per-card editor (extracted so each card can keep its own UI state
       like "show advanced", "split URL into base + filename", etc.) ─── */
function CardEditor({
  card,
  idx,
  updateCard,
  removeCard,
  addDownload,
  updateDownload,
  removeDownload,
  categoryPrefix,
  erroredField,
}: {
  card: WizardCardDraft
  idx: number
  updateCard: (idx: number, updates: Partial<WizardCardDraft>) => void
  removeCard: (idx: number) => void
  addDownload: (idx: number) => void
  updateDownload: (cardIdx: number, dlIdx: number, key: 'label' | 'href' | 'desc' | 'isDoc', value: string | boolean) => void
  removeDownload: (cardIdx: number, dlIdx: number) => void
  categoryPrefix: string
  erroredField?: FieldPath
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const titlePath = `cards.${idx}.title`
  const descPath = `cards.${idx}.description`
  const cardHasError = !!erroredField && erroredField.startsWith(`cards.${idx}.`)

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${cardHasError ? 'border-red-400/40 bg-red-500/5' : 'border-white/10 bg-black/20'}`}
    >
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-sm font-semibold text-white">
          Card #{idx + 1}
          {cardHasError && (
            <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-red-300">⚑ needs attention</span>
          )}
        </p>
        <button
          onClick={() => removeCard(idx)}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-red-400/30 hover:text-red-300"
        >
          <Trash2 size={12} /> Remove
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Title *</label>
          <input
            data-field-path={titlePath}
            value={card.title}
            onChange={(e) => updateCard(idx, { title: e.target.value })}
            placeholder="e.g. VMware vCenter Server 10"
            className={`mt-1 h-10 w-full rounded-lg border bg-black/30 px-3 text-sm text-white outline-none ${errorBorderClass(titlePath, erroredField)}`}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Description *</label>
          <textarea
            data-field-path={descPath}
            rows={2}
            value={card.description}
            onChange={(e) => updateCard(idx, { description: e.target.value })}
            placeholder="A short, friendly summary shown on the card."
            className={`mt-1 w-full rounded-lg border bg-black/30 px-3 py-2 text-sm text-white outline-none ${errorBorderClass(descPath, erroredField)}`}
          />
        </div>

        <GlowColorPicker
          label="Card glow color"
          value={card.glowColor}
          onChange={(v) => updateCard(idx, { glowColor: v as WizardCardDraft['glowColor'] })}
        />

        <LogoPicker
          label="Card logo (optional)"
          value={card.logo || ''}
          onChange={(v) => updateCard(idx, { logo: v })}
          help="Pick a logo from the list, or paste a custom path."
        />

        <div className="sm:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tags</label>
          <div className="mt-1">
            <div className="rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {PREDEFINED_TAGS.map((tag) => (
                  <label key={tag} className="flex items-center gap-2 cursor-pointer hover:text-cyan-300">
                    <input
                      type="checkbox"
                      checked={(card.tags || []).includes(tag)}
                      onChange={(e) => {
                        const newTags = e.target.checked
                          ? [...(card.tags || []), tag]
                          : (card.tags || []).filter((t) => t !== tag)
                        updateCard(idx, { tags: newTags })
                      }}
                      className="rounded border-white/20 bg-black/50 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-300">{tag}</span>
                  </label>
                ))}
              </div>
            </div>
            {(card.tags || []).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {(card.tags || []).map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/30 text-[10px] text-cyan-300 flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => updateCard(idx, { tags: (card.tags || []).filter((t) => t !== tag) })}
                      className="hover:text-cyan-100"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <p className="mt-1 text-[10px] text-slate-600">Select tags that appear as chips under the title. Choose from predefined options only.</p>
        </div>
      </div>

      {/* Downloads sub-form — each row uses a dropdown for the URL "starts
          with" and a text box for just the filename. Admins never have to
          paste a full URL by hand. */}
      <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Downloads on this card</p>
          <button
            onClick={() => addDownload(idx)}
            className="inline-flex h-7 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-cyan-400/30 hover:text-cyan-200"
          >
            <Plus size={10} /> Add
          </button>
        </div>
        {(card.downloads || []).length === 0 && (
          <p className="text-[10px] text-slate-600 italic">No downloads — card will display description only.</p>
        )}
        <div className="space-y-3">
          {(card.downloads || []).map((dl, dlIdx) => (
            <DownloadRowEditor
              key={dlIdx}
              cardIdx={idx}
              dlIdx={dlIdx}
              dl={dl}
              updateDownload={updateDownload}
              removeDownload={removeDownload}
              categoryPrefix={categoryPrefix}
              erroredField={erroredField}
            />
          ))}
        </div>
      </div>

      {/* Advanced — hide the auto-generated card id from non-technical admins. */}
      <div className="mt-3 rounded-lg border border-white/10 bg-black/20">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 text-left"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Advanced (card id: <span className="font-mono text-slate-400">{card.id}</span>)</p>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{showAdvanced ? '▲ Hide' : '▼ Show'}</span>
        </button>
        {showAdvanced && (
          <div className="px-3 pb-3 border-t border-white/5 pt-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Card id (auto)</label>
            <input
              value={card.id}
              onChange={(e) => updateCard(idx, { id: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })}
              className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white font-mono outline-none focus:border-cyan-400/60"
            />
            <p className="mt-1 text-[10px] text-slate-600">
              Internal identifier used when saving overrides. The wizard generates this for you — only edit if
              you have a specific reason.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/** A single download row with a base-URL dropdown + filename input.
 *  The combined value is written back through `updateDownload(cardIdx, dlIdx, 'href', ...)`. */
function DownloadRowEditor({
  cardIdx,
  dlIdx,
  dl,
  updateDownload,
  removeDownload,
  categoryPrefix,
  erroredField,
}: {
  cardIdx: number
  dlIdx: number
  dl: { label: string; href: string; desc?: string; isDoc?: boolean }
  updateDownload: (cardIdx: number, dlIdx: number, key: 'label' | 'href' | 'desc' | 'isDoc', value: string | boolean) => void
  removeDownload: (cardIdx: number, dlIdx: number) => void
  categoryPrefix: string
  erroredField?: FieldPath
}) {
  const labelPath = `cards.${cardIdx}.downloads.${dlIdx}.label`
  const hrefPath = `cards.${cardIdx}.downloads.${dlIdx}.href`

  // Try to detect which preset the current href uses so we can split it back
  // into "base + filename" when the row was loaded with an existing URL.
  const matchedPreset = useMemo(() => {
    if (!dl.href) return null
    const candidates = [...DOWNLOAD_BASE_PRESETS]
    if (categoryPrefix && !candidates.some((c) => c.value === categoryPrefix)) {
      candidates.unshift({ label: 'Suggested for this section', value: categoryPrefix })
    }
    return candidates
      .filter((p) => dl.href.startsWith(p.value))
      .sort((a, b) => b.value.length - a.value.length)[0] || null
  }, [dl.href, categoryPrefix])

  const [base, setBase] = useState<string>(matchedPreset?.value ?? categoryPrefix)
  const [filename, setFilename] = useState<string>(matchedPreset ? dl.href.slice(matchedPreset.value.length) : dl.href)
  const [externalMode, setExternalMode] = useState<boolean>(!matchedPreset && dl.href !== '' && /^https?:\/\//i.test(dl.href) && !dl.href.startsWith(categoryPrefix))

  // Whenever base or filename changes, push the combined href back to state.
  useEffect(() => {
    if (externalMode) {
      // In external mode, the filename input holds the entire URL.
      updateDownload(cardIdx, dlIdx, 'href', filename)
    } else {
      updateDownload(cardIdx, dlIdx, 'href', `${base}${filename}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, filename, externalMode])

  // Build the dropdown's option list. We always include the category prefix
  // and a "Custom external URL…" sentinel.
  const dropdownOptions = useMemo(() => {
    const opts = [...DOWNLOAD_BASE_PRESETS]
    if (categoryPrefix && !opts.some((o) => o.value === categoryPrefix)) {
      opts.unshift({ label: 'Suggested for this section', value: categoryPrefix })
    }
    return opts
  }, [categoryPrefix])

  return (
    <div className="rounded-md border border-white/5 bg-black/30 p-3 space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Download #{dlIdx + 1}</p>
        <button
          onClick={() => removeDownload(cardIdx, dlIdx)}
          className="inline-flex h-7 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-red-400/30 hover:text-red-300"
          aria-label="Remove download"
        >
          <Trash2 size={11} />
        </button>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Button label</label>
        <input
          data-field-path={labelPath}
          value={dl.label}
          onChange={(e) => updateDownload(cardIdx, dlIdx, 'label', e.target.value)}
          placeholder="e.g. Installer ISO"
          className={`mt-1 h-9 w-full rounded-lg border bg-black/30 px-3 text-xs text-white outline-none ${errorBorderClass(labelPath, erroredField)}`}
        />
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Where the file lives</label>
        <select
          value={externalMode ? '__external__' : base}
          onChange={(e) => {
            const next = e.target.value
            if (next === '__external__') {
              setExternalMode(true)
              setBase('')
              setFilename(dl.href || '')
            } else {
              setExternalMode(false)
              setBase(next)
              // If the user is switching base mid-edit, keep just the filename portion.
            }
          }}
          className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-xs text-white outline-none focus:border-cyan-400/60"
        >
          {dropdownOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label} — {opt.value}</option>
          ))}
          <option value="__external__">External URL (paste full link)…</option>
        </select>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          {externalMode ? 'Full URL' : 'Filename or path'}
        </label>
        <input
          data-field-path={hrefPath}
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          placeholder={externalMode ? 'https://example.com/file.pdf' : 'my-installer.iso'}
          className={`mt-1 h-9 w-full rounded-lg border bg-black/30 px-3 text-xs text-white font-mono outline-none ${errorBorderClass(hrefPath, erroredField)}`}
        />
        {!externalMode && filename && (
          <p className="mt-1 text-[10px] text-slate-600 break-all">
            Final URL: <span className="text-slate-400 font-mono">{`${base}${filename}`}</span>
          </p>
        )}
      </div>
    </div>
  )
}

/* ─── Step 4 — review ─── */
// Visual status for a single stage in the publish progress panel.
type StageStatus = 'pending' | 'active' | 'done' | 'error'

function StageRow({
  status,
  label,
  detail,
}: {
  status: StageStatus
  label: string
  detail?: string
}) {
  const icon =
    status === 'done' ? <CheckCircle2 size={14} className="text-emerald-300" />
    : status === 'active' ? <Loader2 size={14} className="text-cyan-300 animate-spin" />
    : status === 'error' ? <AlertTriangle size={14} className="text-red-300" />
    : <Circle size={14} className="text-slate-500" />
  const labelColor =
    status === 'done' ? 'text-emerald-200'
    : status === 'active' ? 'text-cyan-200'
    : status === 'error' ? 'text-red-200'
    : 'text-slate-400'
  return (
    <div className="flex items-center gap-3">
      {icon}
      <span className={`text-xs font-bold uppercase tracking-widest ${labelColor}`}>{label}</span>
      {detail && <span className="text-[11px] text-slate-400">{detail}</span>}
    </div>
  )
}

// Derive (stage1, stage2) statuses from the discriminated PublishPhase so the
// progress panel stays consistent with the button row.
function deriveStageStatus(phase: PublishPhase): { s1: StageStatus; s2: StageStatus; s1Detail?: string; s2Detail?: string; errorMessage?: string } {
  switch (phase.kind) {
    case 'idle':
      return { s1: 'pending', s2: 'pending' }
    case 'draft-saving':
      return { s1: 'active', s2: 'pending', s1Detail: 'writing to backend…' }
    case 'draft-saved':
      return { s1: 'done', s2: 'pending', s1Detail: phase.url }
    case 'preflight':
      return { s1: 'done', s2: 'active', s1Detail: phase.url, s2Detail: 'preflight check…' }
    case 'preflight-failed':
      return { s1: 'done', s2: 'error', s1Detail: phase.url, s2Detail: phase.error, errorMessage: phase.error }
    case 'live-publishing':
      return { s1: 'done', s2: 'active', s1Detail: phase.url, s2Detail: 'flipping published flag…' }
    case 'live':
      return { s1: 'done', s2: 'done', s1Detail: phase.url, s2Detail: 'live on nav and parent pages' }
    case 'error':
      return phase.stage === 'draft'
        ? { s1: 'error', s2: 'pending', s1Detail: phase.error, errorMessage: phase.error }
        : { s1: 'done', s2: 'error', s1Detail: phase.url, s2Detail: phase.error, errorMessage: phase.error }
  }
}

function Step4Review({
  state,
  template,
  phase,
}: {
  state: WizardState
  template: PageTemplate
  phase: PublishPhase
}) {
  const { s1, s2, s1Detail, s2Detail, errorMessage } = deriveStageStatus(phase)
  const liveUrl = phase.kind === 'live' ? phase.url : ''
  return (
    <div className="space-y-4">
      <GlowCard glowColor="cyan" className="p-5">
        <h3 className="text-base font-bold text-white mb-3">Review</h3>
        <dl className="grid gap-3 sm:grid-cols-2 text-xs">
          <div><dt className="text-slate-500 uppercase tracking-widest text-[10px] font-bold">Template</dt><dd className="text-white">{template.label}</dd></div>
          <div><dt className="text-slate-500 uppercase tracking-widest text-[10px] font-bold">Title</dt><dd className="text-white">{state.title}</dd></div>
          <div><dt className="text-slate-500 uppercase tracking-widest text-[10px] font-bold">URL</dt><dd className="text-cyan-300 font-mono">/{state.category}/{state.slug}</dd></div>
          <div><dt className="text-slate-500 uppercase tracking-widest text-[10px] font-bold">Category</dt><dd className="text-white">{state.category}</dd></div>
          <div className="sm:col-span-2"><dt className="text-slate-500 uppercase tracking-widest text-[10px] font-bold">Subtitle</dt><dd className="text-slate-300">{state.subtitle || '—'}</dd></div>
          <div><dt className="text-slate-500 uppercase tracking-widest text-[10px] font-bold">Cards</dt><dd className="text-white">{state.cards.length}</dd></div>
          <div><dt className="text-slate-500 uppercase tracking-widest text-[10px] font-bold">Total downloads</dt><dd className="text-white">{state.cards.reduce((sum, c) => sum + (c.downloads?.length || 0), 0)}</dd></div>
        </dl>
      </GlowCard>

      <GlowCard glowColor="indigo" className="p-5">
        <h4 className="text-sm font-bold text-white mb-3">Card preview</h4>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {state.cards.map((card) => (
            <div key={card._localKey} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-sm font-semibold text-white">{card.title}</p>
              <p className="mt-1 text-xs text-slate-400 line-clamp-3">{card.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {(card.tags || []).map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-slate-400 border border-white/10">{t}</span>
                ))}
              </div>
              {(card.downloads || []).length > 0 && (
                <p className="mt-2 text-[10px] text-cyan-300">{card.downloads!.length} download link{card.downloads!.length === 1 ? '' : 's'}</p>
              )}
            </div>
          ))}
        </div>
      </GlowCard>

      {/* Two-stage publish progress. Always shown on step 4 so admins can see
          where they are in the flow before, during, and after each stage. */}
      <GlowCard glowColor={phase.kind === 'live' ? 'cyan' : 'indigo'} className="p-5">
        <h4 className="text-sm font-bold text-white mb-3">Publish progress</h4>
        <div className="space-y-3">
          <StageRow status={s1} label="1 · Save draft" detail={s1Detail} />
          <StageRow status={s2} label="2 · Go live" detail={s2Detail} />
        </div>
        {errorMessage && (
          <p className="mt-3 flex items-center gap-2 text-xs text-red-300">
            <AlertTriangle size={12} /> {errorMessage}
          </p>
        )}
      </GlowCard>

      {phase.kind === 'live' && (
        <GlowCard glowColor="cyan" className="p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-300">
            <CheckCircle2 size={14} /> Page published. It is live now at the URL below.
          </p>
          {liveUrl && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 text-[10px] font-black uppercase tracking-widest text-cyan-200 hover:bg-cyan-400/20"
            >
              <ExternalLink size={12} /> Open page in new tab
            </a>
          )}
        </GlowCard>
      )}
    </div>
  )
}
