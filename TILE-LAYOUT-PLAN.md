# Tile Layout Rollout — Site-Wide Comparison & Plan

> ## OUTCOME — all phases executed
>
> `npm run validate` green: **0 lint errors · 95/95 tests · 149 assets/67 routes · 72 links/0 broken · 108 pages indexed.**
>
> **Override safety (the hard requirement).** Two layers, both new:
> 1. **Runtime guard** in `applyScopeOverride` — a patch whose card id no longer exists is
>    appended ONLY if it is a complete card (has a title). Admin-added cards always carry one
>    (`AdminContentEditor.tsx:1712` refuses an empty title), so real additions survive and sparse
>    orphans are dropped instead of rendering as title-less phantoms.
> 2. **`tests/card-overrides.test.ts`** — data-driven off the real editor source: every published
>    patch key must match a live card id, every patch must actually change output, every offered
>    field must address something a page renders, and **every scope must reach a component
>    reachable from a page**. All 5 live published overrides re-verified in the exported HTML.
>
> **Ids and scope strings were frozen everywhere.** Nothing was renamed or split.
>
> **Deviations from the plan, with evidence:**
> - **`/docs/vmware` NOT converted.** `DocumentationCards` renders its links *inline* — it never
>   hid the 11 PDFs, so the survey over-scored it. It also carries a live published override.
>   No defect to fix; churn refused.
> - **The 4 `/mssoftware` Office files were NOT published.** Lifting them into `lib/data` put them
>   in front of the link auditor for the first time and **all four came back BROKEN** — the files
>   exist nowhere under `/var/www`. That page had been serving dead links precisely because inline
>   hrefs are invisible to the audit. Upload the files, then add the cards back.
> - **The 3 VisualStudio edition routes were kept**, not folded into the parent. Deleting routes is
>   an IA decision, not a defect fix. Their real bugs were fixed instead.
> - **Two dead admin scopes deleted** (`repos/deb`, `repos/rpm`): both edited arrays no live page
>   rendered — `repos/deb`'s only consumer was an orphaned component nothing imported. A control
>   that silently does nothing is worse than no control.
>
> **Also fixed:** the reference tile's a11y violation, `vVS 2022 (offline layout)`, an `.html`
> guide labelled `.exe`, a hand-rolled duplicate of the download row in `SSMSReleaseTable`, an
> inert `notesHref` field, and a pre-existing lint error that blocked `npm run validate`.
>
> **Still to do (yours):** deploy via the full build + `siteupdate.sh`, and the two manual checks
> in §6 (admin draft-overlay round trip, keyboard pass).

Status: original plan below — **written before execution.** Survey covered all 107 routes (8 parallel inventory
agents + 3 analysis agents, read-only). Reference implementation is the shipped
`/downloads/microsoft-products/store` tile layout.

---

## 1. Verdict summary

| Verdict | Routes | Meaning |
|---|---|---|
| **TILE** | 8 | Convert to sectioned compact tiles |
| **HYBRID** | 7 | Flatten the pointless expand; not a full tile grid |
| **KEEP** | 45 | Existing cards are the correct affordance |
| **N/A** | 47 | Redirect stubs, forms, tools, prose, tables |

**Only 9 routes want the Store treatment, and one of them is the Store itself.** Multi-select
"app pack" is justified on **exactly one route** site-wide — the Store page, the only place with a
single scriptable install channel (winget + registered source).

## 2. Site-wide comparison — ranked

### Convert (TILE)

| Score | Route | Items today | Current | What changes |
|---|---|---|---|---|
| 100 | `/downloads/microsoft-products/store` | 46 live pkgs | tiles | *Reference.* Fix a11y + admin scope only (§3) |
| 86 | `/mssoftware` | 15 (4 Office + 11 AppX, **inline arrays**) | legacy sidebar rows | Migrate & delete: Office 4 → `/office`, AppX 11 → already on store page |
| 82 | `/trellix/reference` | 9 commands in 3 group cards | GlowCard | 9 tiles in 3 sections; copy-button replaces download button; no icon column |
| 78 | `/downloads/iso/linux/ubuntu` | 6 | GlowCard → **1 DownloadRow each** | Purest waste of expand on the site. Sections: 22.04 / 24.04 / 26.04 |
| 76 | `/downloads/iso/linux/enterprise` | 5 | same, near-duplicate file | Sections from `tags[0]`: AlmaLinux / CentOS / RockyLinux |
| 72 | `/docs/facpro/faq` | 22 | 22 × p-8 GlowCard, identical logo | Largest homogeneous set on site. **Prose payload → compact disclosure row, not a download tile** |
| 70 | `/docs/vmware` | 5 cards hiding **11 PDFs** | DocumentationCards | Flatten to 11 tiles under existing card titles |
| 68 | `/downloads/microsoft-products/office` | 1 card / 3 .exe | GlowCard alone in a 3-col grid | 3 tiles + 4 rescued from `/mssoftware` = 7 |

### Flatten only (HYBRID)

| Score | Route | Why not a full tile grid |
|---|---|---|
| 66 | `/docs/evaluate-stig/documents` | 5 cards / 9 files, but STIG Viewer has 4 files and library 2 → needs the multi-download expander |
| 62 | `/downloads/iso/windows` | Only 3 items, all share `LOGOS.windows` → icon column shows 3 identical marks. Convert for sibling consistency, not merit |
| 50 | `/docs/evaluate-stig` | Two grids; only the 3-item bottom grid is a candidate — marginal |
| 45 | `/…/VisualStudio/{community,professional,enterprise}` | **1 release, 1 link, 1 route each.** Fix = fold into parent as 3 tiles, stub the children |
| 42 | `/downloads/microsoft-products/sqltools` | 1 card / 1 link in a 3-col grid. Drop the expand, render one tile |

### Keep as-is (45) — representative reasons

- **Navigation hubs (2–6 links to sub-pages):** `/downloads`, `/docs`, `/downloads/vmware`,
  `/downloads/iso`, `/security`, `/support`, `/trellix`, `/dren`, `/certsrv`, all `/docs/*` hubs.
  Big hover-reveal cards are the right affordance for a 4-way fork.
- **`/downloads/vmware/v7`, `/v8`, `/v9`:** the payload is the nested `PatchList` (9 and 4 patches,
  Notes+Patch link pairs, "show older" toggle). `TileItem` has no place for it. **Explicitly not
  converting.**
- **`/downloads/vmware/tools`:** 2 cards / 5 files — below the useful threshold.
- **CodeBlock walkthroughs** (`/docs/repos/*`, `/docs/el/*`, `/docs/ub/*`): the expanded body *is*
  the deliverable.
- **`/home`, `/videos/facpro`, `/support/knowledge-base`, `/PDQ`, `/applications`:** mixed shapes,
  prose, or embedded tools.

---

## 3. Phase 0 — BLOCKING prerequisites (fix the reference before copying it)

The survey found four defects in what would be copied 27 times. **None of the conversions in §5
start until these land.**

### 0.1 Accessibility — the reference violates the repo's own codified rule 🔴

`MSStoreAppxCards.tsx:288-341` renders a `div role="checkbox"` **containing** an `<a>` download
link and a real `<input type="checkbox">`. ARIA treats a widget role's children as presentational,
so the link and checkbox are unreachable/mis-announced; one item announces two checkboxes.
`tests/ui-behavior.test.ts:742` already bans exactly this shape for `CustomPageView` — the site
decided the correct pattern and my tile is the regression.

**Fix:** tile becomes a `<label>` wrapping one native `<input type="checkbox">`; the download `<a>`
is a **sibling outside** the label. Use `aria-disabled` + disabled input instead of
`tabIndex={canDownload ? 0 : -1}` (which makes every tile keyboard-unreachable whenever the winget
proxy is down). Disclosure-style tiles use `<button type="button" aria-expanded aria-controls>`.

### 0.2 Reuse `DownloadRow`, don't replace it 🔴

`tests/ui-behavior.test.ts:1163` hard-codes **10 component paths** that must each contain
`<DownloadRow ` — five of them are prime conversion candidates. My bespoke icon-button would turn
`npm test` red, which fails `npm run validate` **and** the `/admin` Publish rebuild
(`proxy/site-stats.mjs:594`).

**Fix:** add a `compact` variant to `components/cards/DownloadRow.tsx`; every listed consumer keeps
importing it; update the test to accept the compact markup. One shared row keeps the allowlist
meaningful.

### 0.3 Search index — don't put content in `title=` 🟠

Measured in the current `out/search-index.json`:

| Route | Indexed chars | App names indexed |
|---|---|---|
| `/downloads/microsoft-products/store/` | **345** | **zero** |
| `/downloads/iso/linux/ubuntu/` | 1268 | yes |
| `/docs/facpro/faq/` | 1600 (cap) | yes |

The store gap is **pre-existing** (that page has always rendered from a client fetch behind a
"Loading…" placeholder) — not introduced by the tile change. But the tile puts each item's
description in `title={app.description}` only, and `build-search-index.mjs` strips attributes. If
that pattern lands on static pages it deletes card descriptions from site search **and** the AI
assistant's knowledge.

**Fix:** static pages render tiles server-side from static data — no fetch-gated placeholder.
Title, vendor, version and filename stay visible text nodes. Never let `title=`/`aria-label=` be a
description's only home.

### 0.4 Store admin overrides are fallback-only 🟠

Scope `microsoft/store/appx` edits the 33-entry static `microsoftAppxCards` keyed by slug, while
the page renders 46 live packages keyed by `PackageIdentifier`. Override matching is by id → **a
sysadmin's edit applies only when the catalog is offline.** Either re-key the override map to
`PackageIdentifier` or document the scope as fallback-only in `AdminContentEditor`.

---

## 4. Phase 1 — the shared component (one new file)

`components/cards/TileGrid.tsx` (`'use client'`, ~130 lines). Exports `TileGrid`, `TileIcon`, and
types `TileItem` / `TileDownload` / `TileGridProps`.

**Owns:** category `<section>` headings, the responsive grid, the 48px icon | title/subtitle/version
| action tile, selection ring, keyboard/ARIA (per 0.1), icon `onError` fallback, one `useState` for
which tile's multi-download list is open.
**Owns nothing else:** no data fetching, no search box, no toolbar, no sticky pack panel — those
stay on the Store page.

```ts
export interface TileItem {
  id: string                    // MUST equal the source card id — overrides match on it
  title: string
  subtitle?: string             // publisher / vendor / distro / filename
  version?: string              // rendered VERBATIM (kills the "vVS 2022" bug)
  icon?: string
  category?: string             // omit on all items → one ungrouped grid
  description?: string
  downloads?: TileDownload[]    // 0 → dimmed  |  1 → icon-button  |  2+ → expander
}
export interface TileGridProps {
  items: TileItem[]; categoryOrder?: readonly string[]; showCounts?: boolean
  selectedIds?: ReadonlySet<string>; onToggle?: (id: string) => void
  gridCols?: string; fallbackIcon?: string; emptyMessage?: string
}
```

**Five behaviours, zero variant flags** — each falls out of a prop being present or absent:
selection (`onToggle` supplied or not), version/subtitle (field present or not), single download
(icon-button), multi-download (chevron → `DownloadRow` list), disabled (`downloads` empty).

**Must reuse:** `DownloadRow` (+ its `downloadExtension`), `useCardOverrides` (stays in the *page
wrapper*, called before the `.map()` to `TileItem`), the `LOGOS` registry, `cn`.
**Must not use:** `GlowCard` — it injects global spotlight CSS, runs `getGpuTier`, randomises a hue
and attaches per-card pointermove handlers; 46 of those is the cost tiles exist to avoid.

Adoption on any page is a 5-line `.map()` **after** that page's existing `useCardOverrides` call.
No adapter layer, no registry, no per-page tile component.

---

## 5. Phased rollout

**Phase 0** — reference fixes 0.1–0.4 + `DownloadRow` compact variant. *Gate: `npm run validate`.*

**Phase 1** — `TileGrid.tsx`; refactor the Store page onto it (deletes its inline `AppIcon` +
`sections` memo). *Gate: store page renders identically, `npm run validate`.*

**Phase 2 — the pure wins (lowest risk, no data migration):**
- `/downloads/iso/linux/ubuntu` (6) and `/downloads/iso/linux/enterprise` (5) — one shared
  component replaces two near-duplicate files. **No multi-select on any ISO page** (multi-GB).
  Keep scope strings verbatim: `isos/ubuntu`, **`isos/enterprise-linux`** (does *not* match the route).
- `/trellix/reference` (9 commands / 3 sections) — copy-button tiles; replaces the fragile
  `.some(f => c.cmd.includes(f))` grouping with explicit category tags.
- `/downloads/microsoft-products/sqltools` (1) — drop the expand.

**Phase 3 — data migration required:**
- `/mssoftware` → lift the 4 inline Office entries into `lib/data/microsoft.ts` under scope
  `microsoft/office` (they are the **only** exposure of the Office ISOs + ODT + config.xml), then
  reduce `/mssoftware` to a redirect stub. Delete the 11 stale AppX entries (subset of the 46 live).
  Fixes the visible `.appx.iso` / `.appx.exe` label bug for free.
- `/downloads/microsoft-products/office` → 3 + 4 = 7 tiles. Needs `msProject` / `msVisio` LOGOS
  keys + assets (this box has internet; visitors do not).
- `/downloads/iso/windows` (3) — needs `windowsServer` mark, or drop the icon column and let
  Client/Server headings carry it.
- VisualStudio: fold 3 edition routes into 3 tiles on the parent, stub children; add a
  `visual-studio/releases` scope (those pages have **no** admin wiring today).

**Phase 4 — `/docs` pages, blocked on a validator decision:**
`validate-image-registry.mjs` **SELECTION** rule forbids `LOGOS.` anywhere under `app/docs/**` or
`lib/data/docs.ts`, forcing those pages onto `DOCS_PAGE_LOGOS` — keyed by **route**, one image per
page, not per item. So `/docs/facpro/faq` (22) and `/docs/evaluate-stig/documents` (5/9) **cannot
carry per-item icons** without changing the validator. Recommendation: drop the icon column for
`/docs` tiles (single-brand pages — the icon adds nothing), which needs no validator change.
`/docs/vmware` (11 PDFs) uses the file-kind glyph `DocLinkRow` already renders.

---

## 6. Functionality test plan

### Baseline first (capture before touching anything)
Current green signals: **78/78 tests**, `tsc` clean, **149 assets / 67 routes**,
**72 links / 0 broken**, **108 indexed pages**, 5 live override scopes.

```bash
npm test && npx tsc --noEmit && npm run validate:images \
  && node --import ./scripts/register-test-loader.mjs scripts/audit-download-links.mjs
```

### New tests to write (in the same commits as the conversions)

1. **`tests/card-overrides.test.ts`** — *highest value; nothing covers this today.*
   - Every top-level patch key in every scope of `published-content.json` matches an existing card
     id in that scope's defaults, and applying the patch actually changes the merged output.
   - Every `EDITABLE_SCOPE_DEFINITIONS` field key path (`downloads.0.href`, …) resolves against at
     least one card in that scope's defaults.
   - Every `app/**/*Cards.tsx` that imports a `lib/data` card array calls `useCardOverrides` with a
     registered scope, and the `/docs` hubs still pass `REGISTRY_MANAGED_FIELDS`.
2. **`tests/tile-a11y.test.ts`** — sweep `app/**/*Cards.tsx` + `*ReleaseTable.tsx`: no widget role
   containing a nested `<a>`/`<button>`/`<input>`; disclosures use native `<button aria-expanded
   aria-controls>`; no `tabIndex={cond ? 0 : -1}`. **Include `MSStoreAppxCards.tsx` in the sweep.**
3. **`tests/search-index.test.ts`** — per converted route, indexed `text` ≥ 600 chars and contains
   N known item titles + ≥1 filename; total page count ≥ 108.

### Per-conversion gates

```bash
# no-JS proof — hrefs are ABSENT from exported HTML today (cards render {isOpen && <DownloadRow/>})
npm run build && grep -o 'href="[^"]*\.iso"' out/downloads/iso/linux/ubuntu/index.html | sort -u | wc -l

# link audit — MUST use the loader; bare `node scripts/audit-download-links.mjs` silently
# reports "checked 0 / BROKEN: 0". A drop below 72 means hrefs moved out of lib/data.
node --import ./scripts/register-test-loader.mjs scripts/audit-download-links.mjs --json

# published overrides survive, verified in the real static HTML
npm run build \
  && grep -c 'VMware-VMRC-13.1.0_x64.exe' out/downloads/vmware/tools/index.html \
  && grep -c 'VMware Utilities' out/downloads/vmware/index.html

npm run validate:images   # run BEFORE writing any component that adds icons
npm run validate          # exact chain the admin Publish button triggers
```

### Manual (cannot be automated)
- `/admin#content`: edit a converted scope → Save → page reflects it **without a rebuild** → Revert.
  This is the runtime draft-overlay path no static test covers.
- Keyboard pass on one converted page: Tab reaches every tile and every download link in DOM order;
  Space/Enter toggles selection **exactly once**; the offline/fallback state is still tabbable.
- Deploy via the full build + `siteupdate.sh` — editing source or `public/` alone changes nothing
  live, and a partial copy leaves a stale `search-index.json` beside new hashed chunks.

---

## 7. Top risks

| Sev | Risk | Mitigation |
|---|---|---|
| 🔴 | **Silent loss of published sysadmin edits.** 5 live scopes; patches key on the card's original id and deep-merge. `vmware/landing/cards` renames an id (`tools`→`vmware-utilities`); `vmware/tools` patches `downloads[]` slot-by-slot. Renaming ids or splitting a card into per-file tiles makes patches no-ops — and appends the orphan as a **phantom extra card**. No error, no test failure. | Freeze card `id` strings and `downloads[]`/`links[]` shape — add fields, never rename or restructure. Gate with test #1. |
| 🔴 | **Hard build break** via the 10-path `DownloadRow` allowlist. | §0.2 compact variant. |
| 🔴 | **A11y regression copied 27×.** | §0.1, gated by test #2. |
| 🟠 | **Admin editor desyncs from the page** — field lists are hardcoded, not derived. Two dead scopes already exist (`repos/deb`, `repos/rpm` edit arrays no component imports). | Ship the field-list edit in the same commit; test #1. |
| 🟠 | **Content vanishes from search + AI assistant.** | §0.3, gated by test #3. |
| 🟠 | **Link audit goes blind** if hrefs move inline (`/mssoftware` is unaudited today for exactly this reason) or point at extension-less proxy routes (`/winget/get/<id>`). | Keep every href in `lib/data/*.ts`; make the script exit non-zero when zero modules import. |

## 8. Explicitly out of scope
- No multi-select/pack panel anywhere except the Store page.
- No batch download of ISOs, ever.
- No conversion of `/downloads/vmware/v7`, `/v8`, `/v9` — `PatchList` doesn't fit a tile.
- No new fields on `BaseCard` (would touch every data file); vendor/category come from per-page
  `toTile` literals and existing tags.

## 9. Incidental defects found (fix opportunistically, each is 1–2 lines)
- `AdminContentEditor.tsx:522` still describes `vmware/tools` as "Three cards … and the upgrade
  guide PDF" — data has 2, the PDF moved to `vmwareDocCards`.
- Stale hand-written counts: `/videos` says "5 videos" for 24; `/docs/facpro` "10 questions" for 22;
  ISO landing "4 images" for 3; `/security` "3 categories" for 2.
- `/downloads/iso/windows` page copy + landing card promise a "Windows Admin Center" image that
  `windowsISOCards` does not contain.
- `pdq.ts` declares `xmlHref` (Packages.xml) that `PDQDownloadCards.tsx` never renders — the file is
  currently unreachable.
- `VSReleaseTable` renders `vVS 2022 (offline layout)` and labels an `.html` guide as `.exe`.
- Ubuntu ISO id/title drift: ids say `ubuntu25-*`, titles say 26.04.
- `VMwareToolsCards.tsx` imports `Download`/`FileText` and never uses them.
