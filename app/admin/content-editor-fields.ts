/**
 * Field model shared by the admin content editor and its row editors:
 * the editable-field/scope types plus the pure value helpers. No React.
 */

export interface EditableScalarField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'url' | 'tags'
  full?: boolean
}

/**
 * A card field holding a LIST of rows — `downloads`, `links`, `patches`.
 *
 * The old approach flattened these into fixed indexed scalars
 * (downloads.0.href … downloads.2.href), which capped every card at three rows
 * and offered no way to remove one. A list field renders the real array
 * instead: add, edit, and delete rows, however many there are.
 *
 * Row columns are named `field`, NOT `key`, on purpose. tests/card-overrides.ts
 * parses this file for `key:` to check every offered field addresses something
 * a card actually has; a column keyed `build` would resolve to a root of
 * "build", which is on no card, and fail that test. The list's own
 * `key: 'patches'` is the honest root, and it is the only one the parser sees.
 */
export interface EditableListField {
  key: string
  label: string
  type: 'list'
  columns: { field: string; label: string; type: 'text' | 'url'; full?: boolean }[]
  /** Button text, e.g. "Add patch". Defaults to "Add row". */
  addLabel?: string
  full?: boolean
}

export type EditableField = EditableScalarField | EditableListField

export function isListField(field: EditableField): field is EditableListField {
  return field.type === 'list'
}

export interface EditableScope {
  scope: string
  /** Top-level group the dropdown uses for its <optgroup> headers (e.g. "VMware"). */
  productFamily: string
  /** Concise dropdown option label without the family prefix (e.g. "Landing page categories"). */
  sectionName: string
  /** Long-form label kept for backwards compatibility / display in the audit log. */
  label: string
  description: string
  /** Static defaults the editor compares against to pre-fill the form. */
  defaults: Array<Record<string, unknown> & { id: string; title: string }>
  fields: EditableField[]
}

export function getDeep(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, obj)
}


export function fieldStringValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function parseFieldValue(field: EditableField, raw: string): unknown {
  if (field.type === 'tags') {
    return raw.split(',').map((t) => t.trim()).filter(Boolean)
  }
  return raw
}

/** Derive a stable, url-safe card id from a title, e.g. "Ubuntu 26.04 Desktop"
 *  → "ubuntu-26-04-desktop". Used to auto-suggest a new id when an admin renames
 *  a card, until they hand-edit the id field themselves. */
export function slugify(input: string): string {
  return String(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // any run of non-alphanumerics → single hyphen
    .replace(/^-+|-+$/g, '')     // trim leading/trailing hyphens
}
