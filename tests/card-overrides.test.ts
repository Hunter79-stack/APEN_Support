/**
 * Admin override integrity — the guard against phantom cards.
 *
 * applyScopeOverride() joins an admin's saved patch to a source card BY ID. When
 * a page redesign renames, splits, or removes a card id, every patch keyed on
 * the old id silently stops applying — and (before the orphan guard) got
 * APPENDED to the page as a title-less phantom card that no admin could find or
 * delete. Nothing in the build caught that: no error, no type error, no test.
 *
 * These tests are that catch. They are deliberately data-driven off the real
 * editor source, so a scope added or renamed in AdminContentEditor.tsx is
 * covered automatically instead of needing a matching edit here.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { applyScopeOverride, type ContentOverrideRecord } from '../lib/data/admin-content'
import publishedContent from '../lib/data/published-content.json'

const EDITOR = path.join('app', 'admin', 'AdminContentEditor.tsx')
const editorSource = fs.readFileSync(EDITOR, 'utf8')

/* ─── Parse the editor: scope -> defaults identifier, and its field keys ─── */

/** `import { a, b } from '@/lib/data/x'` -> Map(a -> ../lib/data/x). */
function importedIdentifiers(): Map<string, string> {
  const map = new Map<string, string>()
  for (const m of editorSource.matchAll(/import\s*\{([^}]+)\}\s*from\s*'@\/(lib\/data\/[\w-]+)'/g)) {
    for (const raw of m[1].split(',')) {
      const name = raw.replace(/\btype\b/, '').trim().split(/\s+as\s+/)[0]
      if (name) map.set(name, `../${m[2]}`)
    }
  }
  return map
}

/** Root segment of a field key: 'downloads.0.href' and `downloads.${i}.href` -> 'downloads'. */
function fieldRoot(key: string): string {
  return key.split('.')[0].split('${')[0].replace(/[`'"]/g, '').trim()
}

/** Named field-list constants (COMMON_CARD_FIELDS etc.) -> their root segments. */
function fieldConstants(): Map<string, string[]> {
  const consts = new Map<string, string[]>()
  for (const m of editorSource.matchAll(
    /const (\w*FIELDS)\s*:\s*EditableField\[\]\s*=\s*([\s\S]*?)\n(?=const |\/\*\*|\/\* )/g,
  )) {
    const roots = [...m[2].matchAll(/key:\s*[`'"]([^`'"]+)[`'"]/g)].map((k) => fieldRoot(k[1]))
    consts.set(m[1], [...new Set(roots)])
  }
  return consts
}

interface ParsedScope { scope: string; defaultsIdent: string; fieldRoots: string[] }

function parseScopes(): ParsedScope[] {
  const consts = fieldConstants()
  const body = editorSource.slice(editorSource.indexOf('const EDITABLE_SCOPE_DEFINITIONS'))
  const out: ParsedScope[] = []
  // Each definition block runs from `scope: '...'` to the next one (or the end
  // of the array literal); parsing per-block keeps fields attached to their scope.
  const starts = [...body.matchAll(/\n\s*scope:\s*'([^']+)'/g)]
  for (let i = 0; i < starts.length; i++) {
    const block = body.slice(starts[i].index!, starts[i + 1]?.index ?? body.length)
    const defaultsIdent = block.match(/defaults:\s*(\w+)/)?.[1]
    if (!defaultsIdent) continue
    const fieldsText = block.slice(block.indexOf('fields:'))
    const roots = [
      ...[...fieldsText.matchAll(/key:\s*[`'"]([^`'"]+)[`'"]/g)].map((m) => fieldRoot(m[1])),
      ...[...fieldsText.matchAll(/(\w*_?FIELDS)\b/g)].flatMap((m) => consts.get(m[1]) ?? []),
    ]
    out.push({ scope: starts[i][1], defaultsIdent, fieldRoots: [...new Set(roots)] })
  }
  return out
}

async function resolveDefaults(ident: string): Promise<Array<{ id: string }> | null> {
  const modulePath = importedIdentifiers().get(ident)
  if (!modulePath) return null
  const mod = (await import(modulePath)) as Record<string, unknown>
  const value = (mod[ident] ?? (mod.default as Record<string, unknown> | undefined)?.[ident]) as unknown
  return Array.isArray(value) ? (value as Array<{ id: string }>) : null
}

const SCOPES = parseScopes()

/* ─── The tests ──────────────────────────────────────────────────────────── */

test('the editor exposes every scope it claims, each bound to a real card array', async () => {
  assert.ok(SCOPES.length >= 30, `expected 30+ editable scopes, parsed ${SCOPES.length}`)
  const unresolved: string[] = []
  for (const s of SCOPES) {
    if (!(await resolveDefaults(s.defaultsIdent))) unresolved.push(`${s.scope} -> ${s.defaultsIdent}`)
  }
  assert.deepEqual(unresolved, [], `editor scopes whose defaults array could not be resolved:\n${unresolved.join('\n')}`)
})

test('every PUBLISHED override still matches a real card id — no orphans, no phantoms', async () => {
  // The load-bearing test. A conversion that renames/splits/removes a card id
  // orphans its published patch: the admin's edit stops applying and the page
  // silently loses it. Fix the source id (or migrate the patch key) — never
  // just delete this assertion.
  const published = publishedContent as unknown as Record<string, ContentOverrideRecord>
  const orphans: string[] = []
  let checkedScopes = 0

  for (const [scope, record] of Object.entries(published)) {
    const parsed = SCOPES.find((s) => s.scope === scope)
    if (!parsed) continue // route-images and other non-card scopes have their own test
    const defaults = await resolveDefaults(parsed.defaultsIdent)
    if (!defaults) continue
    checkedScopes += 1

    const ids = new Set(defaults.map((c) => c.id))
    const patchMap = (record?.value ?? {}) as Record<string, Record<string, unknown>>
    for (const [key, patch] of Object.entries(patchMap)) {
      if (ids.has(key)) continue
      // An admin-ADDED card is legitimate and carries a title; anything else is
      // a fragment left behind by a source-side id change.
      const title = patch?.title
      if (typeof title === 'string' && title.trim()) continue
      orphans.push(`${scope}: patch "${key}" matches no card id (ids: ${[...ids].join(', ')})`)
    }
  }

  assert.ok(checkedScopes > 0, 'no published card scopes were checked — the parser or the snapshot changed shape')
  assert.deepEqual(orphans, [], `orphaned published overrides:\n${orphans.join('\n')}`)
})

test('every published override actually changes what renders', async () => {
  // A patch that matches an id but merges to a no-op means the admin's edit was
  // lost some other way (field renamed, or the value is already the default).
  const published = publishedContent as unknown as Record<string, ContentOverrideRecord>
  const inert: string[] = []

  for (const [scope, record] of Object.entries(published)) {
    const parsed = SCOPES.find((s) => s.scope === scope)
    if (!parsed) continue
    const defaults = await resolveDefaults(parsed.defaultsIdent)
    if (!defaults) continue
    const merged = applyScopeOverride(defaults, record)
    if (JSON.stringify(merged) === JSON.stringify(defaults)) inert.push(scope)
  }

  assert.deepEqual(inert, [], `published overrides that merge to a no-op:\n${inert.join('\n')}`)
})

/** Every .tsx under app/ (minus admin) and components/, as source text. */
function siteComponentSources(): Map<string, string> {
  const out = new Map<string, string>()
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) { if (full !== path.join('app', 'admin')) walk(full) }
      else if (full.endsWith('.tsx') || full.endsWith('.ts')) out.set(full, fs.readFileSync(full, 'utf8'))
    }
  }
  walk('app'); walk('components')
  return out
}
const SITE_SOURCES = siteComponentSources()

test('every editable field the admin is offered addresses something a page can render', async () => {
  // An offered field must either exist on a card today, or be read by a
  // component (optional-but-rendered, e.g. ssmsReleaseCards.notesHref, which
  // SSMSReleaseTable renders when present). A field matching neither is inert:
  // the sysadmin fills it in, the save succeeds, the page never changes.
  const ALWAYS_ADDITIVE = new Set(['itemCount', 'tags', 'logo', 'description', 'title'])
  const dead: string[] = []

  for (const s of SCOPES) {
    const defaults = await resolveDefaults(s.defaultsIdent)
    if (!defaults || defaults.length === 0) continue
    for (const root of s.fieldRoots) {
      if (!root || ALWAYS_ADDITIVE.has(root)) continue
      const onACard = defaults.some((card) => (card as Record<string, unknown>)[root] !== undefined)
      const readByAComponent = [...SITE_SOURCES.values()].some((src) => src.includes(`.${root}`))
      if (!onACard && !readByAComponent) {
        dead.push(`${s.scope}: field "${root}" is on none of its ${defaults.length} cards and no component reads it`)
      }
    }
  }

  assert.deepEqual(dead, [], `admin editor fields that address nothing:\n${dead.join('\n')}`)
})

test('every editable scope reaches a component a visitor can actually load', () => {
  // The repos/deb + repos/rpm failure mode, made permanent. Both scopes edited
  // arrays no live page rendered — repos/deb's only consumer was an orphaned
  // component nothing imported, repos/rpm's had no consumer at all — so a
  // sysadmin's edits vanished. Presence of the scope STRING is not enough: the
  // file holding it must be reachable from a page.tsx through real imports.
  const resolveImport = (spec: string, from: string): string | null => {
    const base = spec.startsWith('@/') ? spec.slice(2)
      : spec.startsWith('.') ? path.normalize(path.join(path.dirname(from), spec))
      : null
    if (!base) return null
    for (const cand of [`${base}.tsx`, `${base}.ts`, path.join(base, 'index.tsx'), path.join(base, 'index.ts')]) {
      if (SITE_SOURCES.has(cand) || fs.existsSync(cand)) return cand
    }
    return null
  }

  const reachable = new Set<string>()
  const stack = [...SITE_SOURCES.keys()].filter((f) => /(?:^|\/)(?:page|layout)\.tsx$/.test(f))
  assert.ok(stack.length > 50, `expected the app router's pages, found ${stack.length}`)
  while (stack.length) {
    const file = stack.pop()!
    if (reachable.has(file)) continue
    reachable.add(file)
    const src = SITE_SOURCES.get(file) ?? (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '')
    for (const m of src.matchAll(/from\s+'([^']+)'/g)) {
      const target = resolveImport(m[1], file)
      if (target && !reachable.has(target)) stack.push(target)
    }
  }

  // Where is each scope string used AS a scope (not as a lookalike route)?
  const usedIn = new Map<string, string[]>()
  for (const [file, src] of SITE_SOURCES) {
    for (const m of src.matchAll(/useCardOverrides<?[^>(]*>?\(\s*'([^']+)'|scope=["']([^"']+)["']|scope:\s*'([^']+)'/g)) {
      const scope = m[1] ?? m[2] ?? m[3]
      if (scope) usedIn.set(scope, [...(usedIn.get(scope) ?? []), file])
    }
  }

  const dead = SCOPES
    .filter((s) => !(usedIn.get(s.scope) ?? []).some((f) => reachable.has(f)))
    .map((s) => `${s.scope} -> ${(usedIn.get(s.scope) ?? ['used nowhere']).join(', ')}`)

  assert.deepEqual(dead, [], `admin scopes whose edits reach no live page:\n${dead.join('\n')}`)
})

/* ─── The orphan guard itself ────────────────────────────────────────────── */

interface DemoCard { id: string; title: string; downloads?: { label?: string; href: string }[] }
const demoDefaults: DemoCard[] = [
  { id: 'alpha', title: 'Alpha', downloads: [{ label: 'A', href: '/a.iso' }] },
  { id: 'beta', title: 'Beta' },
]
const rec = (value: unknown): ContentOverrideRecord =>
  ({ value, updatedAt: '2026-01-01T00:00:00.000Z', updatedBy: 'test' })

test('a sparse patch whose card id no longer exists is dropped, not appended as a phantom', () => {
  const merged = applyScopeOverride(demoDefaults, rec({
    alpha: { title: 'Alpha renamed' },
    'gamma-was-removed': { downloads: [{ href: '/orphan.iso' }] }, // no title -> orphan
  }))
  assert.deepEqual(merged.map((c) => c.id), ['alpha', 'beta'], 'the orphan must not reach the page')
  assert.equal(merged[0].title, 'Alpha renamed', 'the matching patch must still apply')
})

test('an admin-added card (always titled) is still appended', () => {
  const merged = applyScopeOverride(demoDefaults, rec({
    'new-upload': { title: 'New Upload', downloads: [{ label: 'ISO', href: '/new.iso' }] },
  }))
  assert.deepEqual(merged.map((c) => c.id), ['alpha', 'beta', 'new-upload'])
  assert.equal(merged[2].title, 'New Upload')
})

test('a patch that renames an id is applied once, never duplicated', () => {
  const merged = applyScopeOverride(demoDefaults, rec({ alpha: { id: 'alpha-2', title: 'Alpha Two' } }))
  assert.deepEqual(merged.map((c) => c.id), ['alpha-2', 'beta'])
})

test('a sparse row patch still merges without deleting the other rows', () => {
  const base: DemoCard[] = [{ id: 'alpha', title: 'Alpha', downloads: [
    { label: 'One', href: '/1.iso' },
    { label: 'Two', href: '/2.iso' },
  ] }]
  const merged = applyScopeOverride(base, rec({ alpha: { downloads: [null, { href: '/2b.iso' }] } }))
  assert.deepEqual(merged[0].downloads, [
    { label: 'One', href: '/1.iso' },
    { label: 'Two', href: '/2b.iso' },
  ])
})

test('a tombstoned ROW is removed, and the rows after it do not shift under later edits', () => {
  // The admin editor writes a list WHOLE and BASE-INDEXED: removing row 1 keeps
  // its slot as {__deleted:true} so row 2's patch still lands on row 2. Splicing
  // the tombstone out of the patch instead would slide every later edit up one.
  const base: DemoCard[] = [{ id: 'alpha', title: 'Alpha', downloads: [
    { label: 'One', href: '/1.iso' },
    { label: 'Two', href: '/2.iso' },
    { label: 'Three', href: '/3.iso' },
  ] }]

  const removedMiddle = applyScopeOverride(base, rec({ alpha: { downloads: [
    null,
    { __deleted: true },
    null,
  ] } }))
  assert.deepEqual(removedMiddle[0].downloads, [
    { label: 'One', href: '/1.iso' },
    { label: 'Three', href: '/3.iso' },
  ], 'the tombstoned row is gone and the survivors keep their own values')

  // Same removal, plus an edit to the row AFTER it and a brand-new row.
  const alsoEdited = applyScopeOverride(base, rec({ alpha: { downloads: [
    null,
    { __deleted: true },
    { href: '/3b.iso' },
    { label: 'Four', href: '/4.iso' },
  ] } }))
  assert.deepEqual(alsoEdited[0].downloads, [
    { label: 'One', href: '/1.iso' },
    { label: 'Three', href: '/3b.iso' },
    { label: 'Four', href: '/4.iso' },
  ], 'the edit landed on row 2 (Three), not on the row that took its place')

  // Every row removed is an empty list, not the source list surviving.
  const allGone = applyScopeOverride(base, rec({ alpha: { downloads: [
    { __deleted: true }, { __deleted: true }, { __deleted: true },
  ] } }))
  assert.deepEqual(allGone[0].downloads, [])
})

test('__deleted still removes a card, and locked fields are still refused', () => {
  assert.deepEqual(
    applyScopeOverride(demoDefaults, rec({ beta: { __deleted: true } })).map((c) => c.id),
    ['alpha'],
  )
  const locked = applyScopeOverride(
    [{ id: 'alpha', title: 'Alpha', logo: '/logos/real/a.svg' }],
    rec({ alpha: { logo: '/evil.svg', title: 'Renamed' } }),
    ['logo'],
  )
  assert.equal(locked[0].logo, '/logos/real/a.svg')
  assert.equal(locked[0].title, 'Renamed')
})
