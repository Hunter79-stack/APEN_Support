# Admin Console IA — Tab Badges, Status Tokens, Density

Status: **PLAN ONLY — no code changed.** Survey covered the tab shell and every panel on
monitor / nginx / content (67 panels inventoried) plus a full risk + test audit. Same treatment as
`TILE-LAYOUT-PLAN.md`: plan, approve, then phased execution with gates.

> **Survey caveat, stated plainly.** The survey workflow lost agents to `Connection refused` twice.
> The shell/monitor/nginx/content inventories and the risk audit completed; the `files-misc`
> inventory and the two design passes did not, so the badge and token designs below are mine,
> written against the completed inventories. Every file:line claim here I verified by hand.

---

## 0. Two corrections to what I told you earlier

1. **The admin does NOT colour cards by index.** I said it used `getCardGlowColor(index)`
   decoratively. Verified: **0 occurrences in `app/admin/`**, versus 40 files on the public pages.
   The admin is already partly semantic (e.g. `tone={activeAlertCount > 0 ? 'amber' : 'emerald'}`,
   `AdminDashboard.tsx:661`). So the token work is **scoped to `app/admin/` only** and must not
   touch `lib/data/card-colors.ts` or `spotlight-card.tsx` — doing so changes ~25 public pages and
   fails `ui-behavior.test.ts:623`, which pins the exact 22-family palette.
2. **The tabs are not a tab strip.** They are a 4-up grid of 7 `GlowCard` buttons
   ("Console Sections", `AdminDashboard.tsx:711-735`). Badges attach there, not to a strip.

## 1. The real defect behind "Sensors Clear"

Not a bug — 15 events, all dismissed by `JWebber.ou`, correctly hidden. But **three counters
already disagree about the same feed**, and a badge would be a fourth:

| Consumer | Hides acknowledged? | Hides dismissed? | file |
|---|---|---|---|
| Navbar cog badge | **yes** | yes | `Navbar.tsx:150-170` |
| `activeAlertCount` stat tile | **no** | yes | `AdminDashboard.tsx:624` |
| AlertsPanel default filter | **no** | yes | `AdminDashboard.tsx:215-222` |

Today every id is in both sets (16 dismissed / 16 acknowledged, **zero divergence**), so this is
**latent, not visible**. Acknowledge one item without dismissing it and the cog and the tile
disagree. Fixing this is Phase 0 and it is the highest-value change in this plan.

## 2. Badge signals — one per tab, all from existing fetches

**Principle: OK is silent.** No badge means healthy. A badge only ever means *something is wrong or
waiting for you*. Counts that are not problems (pages, transcripts) never badge — the stat tiles
already show those.

| Tab | Badge | Severity rule | Source (already fetched) |
|---|---|---|---|
| **monitor** | unresolved alerts | any `type==='critical'` → critical · else count>0 → warn · else silent | `/api/site-stats`, 15s, `AdminDashboard.tsx:504-528` |
| **monitor** | + nodes down | any service `offline` → critical · `degraded` → warn | `data.services`, same response, held at `:421-424` |
| **content** | unpublished drafts | `buildStatus.state==='error'` → critical · unpublished>0 → warn | `fetchAll()` at `:483-495` — **already called, response discarded** |
| **nginx** | degraded / unresolved self-heal | `!available` or unresolved self-heal → critical · `isStub` or 5xx>1% → warn | `/api/admin/nginx-stats` (see §2.1) |
| chips, wizard, pages, transcripts | **none** | no failure state exists | — |

### 2.1 The one genuine cost: the nginx badge

Tab bodies unmount when inactive (`{tab === 'nginx' && …}`, `:795`), so `useNginxStatus` (5s poll)
only runs while monitor or nginx is open. A badge visible from *every* tab needs it hoisted.

**Decision: hoist the existing single instance into the shell, but at the 15s stats cadence, not
5s.** The nginx tab keeps its 5s refresh while mounted. Net new pollers: **zero** — it replaces the
existing instance rather than adding one. This is the only badge that costs anything, and it is the
one that would have caught the 10-day-red Self-Heal card.

### 2.2 How panels publish health without prop-drilling 1900 lines

They don't. **The shell derives every verdict itself**, from responses it already holds, via one
pure module. No context, no callbacks, no child→parent plumbing:

```ts
// lib/data/admin-health.ts — pure, no React, unit-testable
export function visibleAlerts(alerts, { acknowledged, dismissed })   // the ONE predicate
export function monitorHealth(alerts, services, acknowledged, dismissed)
export function contentHealth(overrides, published, buildStatus, pendingUploads)
export function nginxHealth(nginxData, selfHealEvents)
export type AdminTone = 'critical' | 'warn' | 'ok'
```

This mirrors `resolveActivityChartData` (the repo's one example of pure derivation exported from a
component file and unit-tested directly) and `summarizeSelfHeal`.

> **It must live in a new module, not in `AdminDashboard.tsx`.** `ui-behavior.test.ts:491` has
> *negative* assertions forbidding `filterAcknowledgedAlerts`, `unreadSystemEventCount`,
> `unreadFeedbackCount` and `NotificationSummary` from appearing in that file. The obvious
> implementation fails the suite on the first run, via a `doesNotMatch` buried in a 60-assertion
> test.

### 2.3 Badge spec

Dot + count, `ml-auto` in the existing icon/label flex row (`:723-727`). Critical = red dot +
count; warn = amber; ok = nothing rendered. Glyph is `aria-hidden`; state goes in the **button's**
`aria-label` ("Monitoring — 3 alerts need attention"), copying `getAdminNotificationLabel`
(`Navbar.tsx:185`). Add `aria-current="page"` to the active tab — it has none today.

## 3. Status tokens (scoped to `app/admin/`)

Three layers, per the design-system skill, fitted to the existing theme rather than duplicating it:

```css
/* primitive — existing Tailwind palette, no new hexes */
--admin-red-500 --admin-amber-400 --admin-emerald-400 --admin-slate-700
/* semantic — what a state MEANS */
--admin-status-critical --admin-status-warn --admin-status-ok --admin-status-idle
/* component */
--admin-badge-bg --admin-badge-fg --admin-panel-accent --admin-dot-fill
```

A panel's colour is then derived from `AdminTone`, never from its position. `card-colors.ts` and
`spotlight-card.tsx` are **not touched**.

### 3.1 De-glow rule

`GlowCard` stays **only where a panel is actionable** — something wrong, something to publish.
Steady-state panels become flat bordered divs (the `TileGrid` pattern already adopted site-wide).
Rule: *if it can't demand action, it doesn't glow.* GlowCard costs global CSS injection,
`getGpuTier`, a randomised hue and per-card pointermove handlers — currently paid by every panel.

### 3.2 Density

Compact rows for the long lists (system events, transcripts, audit log) with a comfortable/compact
toggle. **Rendering change only** — `filtered` must stay byte-identical, because those panels feed
`rows={filtered}` straight into `ExportBar` (`:235`) and a sysadmin's export must not change.

## 4. Phases

| Phase | Work | Gate |
|---|---|---|
| **0** | Backup tarball. One `visibleAlerts` predicate adopted by Navbar + stat tiles + AlertsPanel; empty state reads "0 active · 15 dismissed" | `npm run validate`; counters provably agree |
| **1** | `lib/data/admin-health.ts` pure module + unit tests. No UI change | tests green |
| **2** | Badge UI on the tab grid + a11y (`aria-label`, `aria-current`). Wired to monitor only | `npx next build`; badge == panel rows |
| **3** | content badge (keep `fetchAll` response), nginx badge (hoist hook at 15s) | no new intervals; 401 → neutral |
| **4** | Status tokens + de-glow steady-state panels | visual pass |
| **5** | Compact rows + density toggle | export snapshot identical |

Phase 0 alone fixes what you reported. Each phase is independently shippable.

## 5. Risks

| Sev | Risk | Mitigation |
|---|---|---|
| 🔴 | **Blast radius.** The Publish button runs `npm run build` server-side (`site-stats.mjs:578`); a broken tab shell means sysadmins cannot publish **at all**. There is no git in this tree — no `git revert` | `tar czf /tmp/admin-pre-redesign.tgz app/admin out/admin lib/data/admin*.ts` first; `npx next build` before anything nears a Publish click |
| 🔴 | **Hydration.** `out/admin/index.html` is prerendered (95 KB, already contains "Sensors Clear"). Any `Date.now()`/`localStorage` read during render breaks the build or mismatches | Neutral lazy initial state, filled in `useEffect` — the existing pattern at `:505`, `:429`, `NginxServerStatusPanel.tsx:89` |
| 🔴 | **Test tripwires.** Banned identifiers (§2.2); `card-overrides.test.ts` parses `AdminContentEditor.tsx` with formatting-sensitive regexes and needs `SCOPES.length >= 30` | New module for derivation; treat `EDITABLE_SCOPE_DEFINITIONS` as frozen; `npm test` after every edit |
| 🟠 | **Auth.** `/admin` renders for a non-admin (nginx gates on site login + IP allowlist; the LDAP gate lives *inside the content tab*). Badge fetches could 401-loop or leak counts | Gate badge fetching on `whoami.admin` (already fetched, `:472-481`); on 401 render neutral and clear the interval |
| 🟠 | **A11y is uncovered.** `tile-a11y.test.ts` explicitly skips `app/admin`; tab buttons have no `aria-current`/`aria-label` | New admin a11y test in Phase 2 |
| 🟡 | **Deep links.** Tab ids are a public contract — URL hashes, Navbar submenu (`navigation.ts:100`), `openSection` anchors pinned by `ui-behavior.test.ts:1045` | Never rename an id or drop an anchor; add badge metadata alongside |

## 6. Tests to add

1. **`tests/admin-health.test.ts`** — the pure module: acknowledged-but-not-dismissed counts once;
   critical outranks warn; a resolved/dismissed item never badges; empty → `ok`.
2. **Counter-agreement invariant** — badge count === rows AlertsPanel renders under its default
   filter, across all four consumers. This is the regression that made you think it was broken.
3. **`tests/admin-a11y.test.ts`** — tab buttons carry `aria-current` and a state-bearing
   `aria-label`; badge glyph is `aria-hidden`.
4. **Build-artifact assertion** — `out/admin/index.html` tab grid renders the neutral state with no
   digits (proves nothing leaks into the prerender).
5. **No-new-pollers assertion** — count `setInterval` sites in `app/admin/**`; must not increase.

## 7. Explicitly out of scope
- No changes to `card-colors.ts`, `spotlight-card.tsx`, or any public page.
- No tab renames, no anchor removals, no reordering `ADMIN_SECTIONS`.
- No change to what `filtered` contains (exports must be byte-identical).
- No new API fields; no `pm2` restart required (the self-heal verdict is derived client-side from
  data already returned — `summarizeSelfHeal` currently has zero callers and stays that way).
