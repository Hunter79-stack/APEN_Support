'use client'

/**
 * One card's edit form (CardRowEditor) and the list-field sub-editor it
 * embeds (ListRowsEditor). Split out of AdminContentEditor.tsx (code-quality #64).
 */
import { useMemo, useState } from 'react'
import { adminContentClient } from '@/lib/data/admin-content'
import { setDeep, deepMerge } from '@/lib/data/deep-patch'
import { AlertTriangle, CheckCircle2, Edit3, Plus, RotateCcw, Save, Trash2, X } from 'lucide-react'
import {
  fieldStringValue,
  getDeep,
  isListField,
  parseFieldValue,
  slugify,
  type EditableField,
  type EditableListField,
} from './content-editor-fields'

interface ListRow {
  values: Record<string, string>
  __extra: Record<string, unknown>
  __deleted?: boolean
}

/** Read a card's list field into editable rows. Non-arrays read as empty. */
function toListRows(value: unknown): ListRow[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    const row: ListRow = { values: {}, __extra: {} }
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      for (const [key, val] of Object.entries(item as Record<string, unknown>)) {
        if (typeof val === 'string' || typeof val === 'number') row.values[key] = String(val)
        else row.__extra[key] = val
      }
    }
    return row
  })
}

/** A row back to the shape the card data uses. Tombstones stay tombstones. */
function serializeRow(row: ListRow): Record<string, unknown> {
  if (row.__deleted) return { __deleted: true }
  return { ...row.__extra, ...row.values }
}

/** True once a row has anything in at least one of its offered columns. */
function rowHasContent(row: ListRow, field: EditableListField): boolean {
  return field.columns.some((column) => (row.values[column.field] ?? '').trim() !== '')
}

/** Cheap structural compare so an untouched list is left out of the patch. */
function listRowsChanged(before: ListRow[], after: ListRow[]): boolean {
  return JSON.stringify(before.map(serializeRow)) !== JSON.stringify(after.map(serializeRow))
}

/**
 * Editor for one list field. Rows render in source order with tombstones
 * hidden; "Restore" brings a just-deleted row back so a misclick is not a trip
 * to the source file. Nothing here writes anything — the parent's Save does.
 */
function ListRowsEditor({
  field,
  rows,
  onChange,
}: {
  field: EditableListField
  rows: ListRow[]
  onChange: (next: ListRow[]) => void
}) {
  const liveCount = rows.filter((row) => !row.__deleted).length
  const removedCount = rows.length - liveCount

  function patchRow(index: number, columnField: string, value: string) {
    onChange(rows.map((row, i) => (
      i === index ? { ...row, values: { ...row.values, [columnField]: value } } : row
    )))
  }

  function setDeleted(index: number, deleted: boolean) {
    onChange(rows.map((row, i) => (i === index ? { ...row, __deleted: deleted || undefined } : row)))
  }

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {field.label}
        </p>
        <p className="text-[10px] font-mono text-slate-400">
          {liveCount} {liveCount === 1 ? 'row' : 'rows'}
          {removedCount > 0 ? ` · ${removedCount} removed` : ''}
        </p>
      </div>

      <div className="space-y-2">
        {rows.map((row, index) => (
          row.__deleted ? (
            <div
              key={index}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-400/20 bg-red-500/5 px-3 py-2"
            >
              <p className="min-w-0 flex-1 truncate text-[11px] font-mono text-slate-400 line-through">
                {field.columns.map((c) => row.values[c.field]).filter(Boolean)[0] || `row ${index + 1}`}
              </p>
              <button
                type="button"
                onClick={() => setDeleted(index, false)}
                className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-emerald-400/40 hover:text-emerald-300"
              >
                <RotateCcw size={11} /> Restore
              </button>
            </div>
          ) : (
            <div key={index} className="rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                  {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => setDeleted(index, true)}
                  aria-label={`Remove ${field.label} row ${index + 1}`}
                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-red-400/40 hover:text-red-300"
                >
                  <Trash2 size={11} /> Remove
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {field.columns.map((column) => (
                  <div key={column.field} className={column.full ? 'sm:col-span-2' : ''}>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {column.label}
                    </label>
                    <input
                      type={column.type === 'url' ? 'url' : 'text'}
                      value={row.values[column.field] ?? ''}
                      onChange={(e) => patchRow(index, column.field, e.target.value)}
                      list={column.type === 'url' ? 'admin-scope-file-options' : undefined}
                      title={column.type === 'url'
                        ? 'Click to pick from the files already on the download server for this section, or paste any URL.'
                        : undefined}
                      className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/30 px-2 text-xs text-white outline-none focus:border-cyan-400/60"
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </div>

      {liveCount === 0 && (
        <p className="py-3 text-center text-[11px] font-mono text-slate-400">
          No rows. Add one below.
        </p>
      )}

      <button
        type="button"
        onClick={() => onChange([...rows, { values: {}, __extra: {} }])}
        className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 text-[10px] font-black uppercase tracking-widest text-cyan-300 hover:bg-cyan-400/20"
      >
        <Plus size={12} /> {field.addLabel ?? 'Add row'}
      </button>
    </div>
  )
}

/* ─── Card editor row ─── */

export function CardRowEditor({
  scope,
  card,
  override,
  publishedOverride,
  scopeOverride,
  allCards,
  fields,
  adminAdded = false,
  onSaved,
}: {
  scope: string
  card: Record<string, unknown> & { id: string; title: string }
  /** True when this card exists ONLY as an override (added from Admin, not in
   *  source). Its patch IS the whole card, so a save must extend that patch
   *  rather than replace it with a diff taken against itself. */
  adminAdded?: boolean
  /** Per-card DRAFT override patch (undefined when this card hasn't been edited). */
  override?: Record<string, unknown>
  /** Per-card PUBLISHED override patch — the last snapshot baked into the build.
   *  Compared against `override` to tell pending edits from permanent ones. */
  publishedOverride?: Record<string, unknown>
  /** Full scope-wide draft override map; kept so save preserves siblings' patches. */
  scopeOverride: Record<string, unknown>
  /** Every source card in this scope — used to keep a renamed id unique. */
  allCards: Array<Record<string, unknown> & { id: string; title: string }>
  fields: EditableField[]
  onSaved: () => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})
  /**
   * List fields (downloads / links / patches) held as real rows, one entry per
   * SOURCE index. A deleted row keeps its slot as a tombstone instead of being
   * spliced out: the saved patch is always base-indexed, so removing row 1
   * never makes a later edit to row 2 land on row 3.
   */
  const [rows, setRows] = useState<Record<string, ListRow[]>>({})
  const [idDraft, setIdDraft] = useState('')
  const [idTouched, setIdTouched] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Effective (merged) card = source defaults + this card's draft patch. Drives
  // the row header so it shows the admin-edited name/id, not stale source values.
  const merged = useMemo(() => ({ ...card, ...(override || {}) }), [card, override])

  function toggleEditor() {
    if (open) {
      setOpen(false)
      return
    }
    const initial: Record<string, string> = {}
    const initialRows: Record<string, ListRow[]> = {}
    for (const field of fields) {
      if (isListField(field)) {
        initialRows[field.key] = toListRows(getDeep(merged, field.key))
        continue
      }
      initial[field.key] = fieldStringValue(getDeep(merged, field.key))
    }
    setDraft(initial)
    setRows(initialRows)
    setIdDraft(String(merged.id ?? ''))
    setIdTouched(false)
    setStatus('idle')
    setErrorMsg('')
    setOpen(true)
  }

  const isOverridden = Boolean(override && Object.keys(override).length > 0)
  // Unpublished = live draft differs from the last published snapshot. Published
  // overrides (draft === published) are permanent, not pending — they must NOT
  // trigger the amber "pending" styling or the section-picker flags.
  const isUnpublished = JSON.stringify(override ?? null) !== JSON.stringify(publishedOverride ?? null)

  // Editing a field. When the title changes we auto-suggest a matching id until
  // the admin hand-edits the id field themselves.
  function handleFieldChange(key: string, value: string) {
    setDraft((d) => ({ ...d, [key]: value }))
    if (key === 'title' && !idTouched) setIdDraft(slugify(value))
  }

  async function handleSave() {
    setStatus('saving')
    // Build the patch diff — only fields that differ from the static default.
    // An admin-added card has no static default (its patch is the card), so we
    // start from the existing patch or the save would drop every field the
    // admin didn't just retype.
    const patch: Record<string, unknown> = adminAdded ? { ...(override || {}) } : {}
    for (const field of fields) {
      if (isListField(field)) continue
      const original = fieldStringValue(getDeep(card, field.key))
      const next = draft[field.key] ?? ''
      if (next !== original) {
        // Use setDeep so dotted keys like "installer.label" build a nested object
        const parsedValue = parseFieldValue(field, next)
        const nested = setDeep({}, field.key, parsedValue)
        // Merge into patch
        Object.assign(patch, deepMerge(patch, nested))
      }
    }
    // List fields. A list is written WHOLE and base-indexed — never sparse —
    // because that is what keeps tombstones aligned with the source rows they
    // remove. deepMerge slot-merges it over the source array and drops the
    // tombstones, so the page sees exactly the rows shown in this editor.
    for (const field of fields) {
      if (!isListField(field)) continue
      const sourceRows = toListRows(getDeep(card, field.key))
      const nextRows = rows[field.key] ?? []
      if (!listRowsChanged(sourceRows, nextRows)) continue
      const emptyRow = nextRows.findIndex((row) => !row.__deleted && !rowHasContent(row, field))
      if (emptyRow !== -1) {
        setStatus('error')
        setErrorMsg(`${field.label}: row ${emptyRow + 1} is empty. Fill it in or remove it.`)
        return
      }
      Object.assign(patch, deepMerge(patch, { [field.key]: nextRows.map(serializeRow) }))
    }
    // Card id rename (optional). The patch stays keyed by the card's SOURCE id
    // (card.id) — the stable join key — and records the new id INSIDE the patch
    // so applyScopeOverride renames the card on the live pages.
    const nextId = idDraft.trim()
    if (nextId !== card.id) {
      if (!nextId) {
        setStatus('error'); setErrorMsg('Card ID cannot be empty.'); return
      }
      if (!/^[a-z0-9][a-z0-9-]*$/.test(nextId)) {
        setStatus('error'); setErrorMsg('Card ID must be lowercase letters, numbers, and hyphens (e.g. ubuntu-26-04-desktop).'); return
      }
      // Uniqueness — no OTHER card in this scope may already resolve to nextId,
      // or the live grid would render two cards with the same React key.
      const defaultIds = new Set(allCards.map((c) => c.id))
      const taken = new Set<string>()
      for (const c of allCards) {
        if (c.id === card.id) continue
        const ov = scopeOverride[c.id] as Record<string, unknown> | undefined
        taken.add(String((ov?.id as string) ?? c.id))
      }
      for (const [key, p] of Object.entries(scopeOverride)) {
        if (defaultIds.has(key) || key === card.id) continue
        const pr = p as Record<string, unknown>
        taken.add(String((pr?.id as string) ?? key))
      }
      if (taken.has(nextId)) {
        setStatus('error'); setErrorMsg(`Another card already uses the id "${nextId}".`); return
      }
      patch.id = nextId
    }
    if (Object.keys(patch).length === 0) {
      setStatus('idle')
      setErrorMsg('No changes to save.')
      return
    }
    // Read existing override map for this scope and patch only this card.
    // Using scopeOverride (passed from the parent) ensures sibling cards'
    // patches survive even if this card has no patch yet.
    const nextValueForScope = { ...scopeOverride, [card.id]: patch }
    const result = await adminContentClient.saveOverride(scope, nextValueForScope, 'admin-ui')
    if (result.ok) {
      setStatus('saved')
      onSaved()
      setTimeout(() => setOpen(false), 800)
    } else {
      setStatus('error')
      setErrorMsg(result.error)
    }
  }

  async function handleRevert() {
    setStatus('saving')
    // Remove this card's entry from the scope. If the scope becomes empty,
    // we DELETE the override record entirely (cleaner audit log) rather than
    // saving an empty object.
    const nextScope = { ...scopeOverride }
    delete nextScope[card.id]
    const result = Object.keys(nextScope).length === 0
      ? await adminContentClient.revertOverride(scope, 'admin-ui')
      : await adminContentClient.saveOverride(scope, nextScope, 'admin-ui')
    if (result.ok) {
      setStatus('saved')
      onSaved()
      setTimeout(() => setOpen(false), 600)
    } else {
      setStatus('error')
      setErrorMsg(result.error)
    }
  }

  // Amber ONLY while an edit is unpublished (pending). Once published, the card
  // looks fully clean — default border, no status badge, and no collapsed Revert
  // (the edit is now the baked-in truth, not a pending "override"). A published
  // edit can still be undone from inside its editor ("Revert to default").
  const borderClass = isUnpublished
    ? 'border-amber-400/30 bg-amber-400/5'
    : 'border-white/10 bg-black/20'

  return (
    <div className={`rounded-lg border ${borderClass} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{String(merged.title)}</p>
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
            id: {String(merged.id)}{String(merged.id) !== card.id ? ` (was ${card.id})` : ''}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {/* Revert only while an edit is UNPUBLISHED (undo the pending change).
              Published cards look clean — undo one from inside its editor. */}
          {isUnpublished && (
            <button
              onClick={handleRevert}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-amber-400/40 hover:text-amber-300"
            >
              <RotateCcw size={12} /> Revert
            </button>
          )}
          <button
            onClick={toggleEditor}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 text-[10px] font-black uppercase tracking-widest text-cyan-300 hover:bg-cyan-400/20"
          >
            {open ? <X size={12} /> : <Edit3 size={12} />} {open ? 'Close' : 'Edit'}
          </button>
        </div>
      </div>
      {!open && isUnpublished && (
        <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-amber-300">
          ⚑ Unpublished override — live now, not yet baked into the build
        </p>
      )}
      {open && (
        <div className="mt-4 space-y-4">
          {/* Card ID — auto-suggested from the title, editable for a specific id.
              The "From title" button re-syncs a stale id to the current title in
              one click (useful when the title was renamed earlier). */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Card ID</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={idDraft}
                onChange={(e) => { setIdDraft(e.target.value); setIdTouched(true) }}
                className="h-10 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-sm font-mono text-white outline-none focus:border-cyan-400/60"
              />
              <button
                type="button"
                onClick={() => { setIdDraft(slugify(draft.title ?? String(merged.title ?? ''))); setIdTouched(false) }}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 text-[10px] font-black uppercase tracking-widest text-cyan-300 hover:bg-cyan-400/20"
                title="Set the id to a slug of the current title"
              >
                <RotateCcw size={12} /> From title
              </button>
            </div>
            <p className="mt-1 text-[10px] font-mono text-slate-400 truncate">
              {idTouched ? 'custom id' : 'auto-suggested from title'} · source id: {card.id}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              isListField(field) ? (
                <div key={field.key} className="sm:col-span-2">
                  <ListRowsEditor
                    field={field}
                    rows={rows[field.key] ?? []}
                    onChange={(next) => setRows((current) => ({ ...current, [field.key]: next }))}
                  />
                </div>
              ) : (
              <div key={field.key} className={field.full || field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{field.label}</label>
                {field.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={draft[field.key] ?? ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
                  />
                ) : (
                  <input
                    type={field.type === 'url' ? 'url' : 'text'}
                    value={draft[field.key] ?? ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    list={field.type === 'url' ? 'admin-scope-file-options' : undefined}
                    placeholder={field.type === 'tags'
                      ? 'comma, separated, values'
                      : field.type === 'url' ? 'pick a server file from the list, or paste any URL' : ''}
                    title={field.type === 'url'
                      ? 'Click to pick from the files already on the download server for this section, or paste any URL.'
                      : undefined}
                    className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
                  />
                )}
                <p className="mt-1 text-[10px] font-mono text-slate-400 truncate">
                  default: {fieldStringValue(getDeep(card, field.key)) || '—'}
                </p>
              </div>
              )
            ))}
            <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <button
              onClick={handleSave}
              disabled={status === 'saving'}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 text-[10px] font-black uppercase tracking-widest text-emerald-300 hover:bg-emerald-400/20 disabled:opacity-50"
            >
              <Save size={12} /> {status === 'saving' ? 'Saving…' : 'Save override'}
            </button>
            {/* Undo an override entirely — reachable here so published cards stay
                clean when collapsed but can still be reverted (then re-published). */}
            {isOverridden && (
              <button
                onClick={handleRevert}
                disabled={status === 'saving'}
                title="Remove this card's override and go back to the source default (publish to bake it in)"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-amber-400/40 hover:text-amber-300 disabled:opacity-50"
              >
                <RotateCcw size={12} /> Revert to default
              </button>
            )}
            {status === 'saved' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                <CheckCircle2 size={12} /> Saved
              </span>
            )}
            {status === 'error' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-red-300">
                <AlertTriangle size={12} /> {errorMsg || 'Save failed'}
              </span>
            )}
            {status === 'idle' && errorMsg && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{errorMsg}</span>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Tiny deep-merge that the editor uses when several fields update inside one
 *  patch (e.g. installer.label and installer.href both changed). */

/* ─── Main editor surface ─── */
