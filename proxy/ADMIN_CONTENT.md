# Admin content management

The admin console at **/admin** has two new tabs:

- **Edit pages & cards** — patches existing pages without rebuilding.
- **New page wizard** — a 4-step form that publishes a brand-new page to
  `/custom-pages/?slug=…` with validation at every step.

Both tabs talk to the `site-stats` proxy (`proxy/site-stats.mjs`) on port 8788.
No changes to source files are required — admins update images, descriptions,
download URLs, and page layouts entirely through the UI.

---

## How it works

### Live overrides for existing cards

Each editable card array has a stable scope key, e.g. `vmware/v9/products`.
Card components consume their data through `useCardOverrides(scope, defaults)`
(see `lib/data/admin-content.ts`). The hook starts from the **published**
baseline (baked into the build, see Publish below), then on mount fetches
`/api/content-overrides` and applies the latest **draft** patches on top.

When an admin saves an edit:

1. The editor builds a per-card patch (only the fields that differ from defaults).
2. The patch is written to `proxy/content-overrides.json` via
   `POST /api/admin/content-overrides`. This is a **draft** — it shows instantly
   via the runtime overlay but is not yet baked into the build.
3. Visitors see the new values without a rebuild. The current Admin tab updates
   immediately; other open tabs revalidate the shared live map periodically.

If the proxy is down, every page falls back to the **published** baseline, and
if nothing is published, to the static source defaults.

### Registered route images

Page artwork has one reserved override scope: `site/route-images`. Its value is
a versioned registry with two maps:

- `routes` maps only a registered `PAGE_LOGOS` route to either a semantic
  `LOGOS` catalog key or a dynamic asset id.
- `assets` owns each Admin-added physical path once. Multiple routes reference
  its id instead of repeating the path.

`PAGE_LOGOS` in `lib/data/logos.ts` remains the source fallback. The effective
saved/live registry is resolved by route in `PageHeader`, linked cards, Navbar,
and explicit route artwork, so an Admin change cannot make those surfaces
disagree. Catalog choices survive later file moves because they store the
semantic `LogoKey`, not its current path.

The proxy validates and bounds this reserved schema separately from ordinary
card JSON. Reverting a route removes its reference and immediately restores the
`PAGE_LOGOS` default; publishing makes that revert durable.

### Making edits permanent (Publish)

Saves are drafts. To make them permanent — so they become the baked-in defaults
and survive `$SITEUPDATE` without anyone editing source — an admin clicks
**Publish & rebuild** in the *Edit pages & cards* tab. That calls
`POST /api/admin/publish`, which:

1. Snapshots the current draft overrides into `lib/data/published-content.json`
   — a **git-tracked** file that `useCardOverrides` imports statically, so its
   values are baked into the static export at build time (visible to no-JS / SEO
   crawlers, not just the runtime overlay).
2. Runs `npm run build` so the static HTML in `out/` is regenerated with the
   published values. Build progress is reported via `GET /api/admin/publish`,
   which the dashboard polls.

Because `published-content.json` lives in the source tree (not `.next`,
`node_modules`, or `out/`), `$SITEUPDATE` never wipes it and every build bakes it
in. Commit it to git for version history and offsite durability. Set
`PUBLISH_BUILD=0` on the proxy to write the snapshot without auto-rebuilding
(rebuild later via `$SITEUPDATE`).

Precedence at runtime, newest first:

```
draft overlay    proxy/content-overrides.json   fetched at runtime — newest, unpublished saves
published        lib/data/published-content.json baked at build    — permanent; an air-gap update keeps it unless --reset-content
source defaults  lib/data/*.ts                                      — shipped fallback
```

### Custom pages from the wizard

Each published page is stored as one entry in `proxy/custom-pages.json` with:

- `slug` — appears in the URL as `/custom-pages/?slug=<slug>`
- `title`, `subtitle`, `badge`, `backHref`, `backColor`, `logo`
- `cards[]` — every card has title/description/tags/logo plus optional downloads

`/custom-pages/page.tsx` is a single static route that reads the slug from the
query string and renders the matching record at runtime. With static export,
this is the only way to give admins genuine per-page URLs without a redeploy.

If the URL has no `?slug=`, the route renders a directory of every published
custom page so users can discover them.

---

## Files added or modified

```
proxy/
  site-stats.mjs                 — added /api/admin/* and /api/content-overrides routes
  content-overrides.json         — JSON store (auto-created if missing)
  custom-pages.json              — JSON store
  content-audit.json             — last 500 admin actions
  ADMIN_CONTENT.md               — this file

lib/data/
  admin-content.ts               — hook + types + admin client
  runtime.ts                     — new endpoints registered

app/admin/
  AdminContentEditor.tsx         — edit existing card scopes
  AdminPageWizard.tsx            — 4-step new-page wizard
  AdminDashboard.tsx             — wired both into a tab nav

app/custom-pages/
  page.tsx                       — entry route
  CustomPageRenderer.tsx         — runtime renderer

app/vmware/...                   — VMwareProductCards, VMware7/8/9, ToolsCards
                                   now consume defaults via useCardOverrides()
nginx.conf                       — proxies /api/content-overrides + /api/admin/
.env.example                     — documents ADMIN_API_TOKEN
```

---

## Configuration

Set on the proxy (e.g. in `.env.local`):

```ini
# Required in production unless LDAP sessions are configured. The proxy fails
# closed when this is blank; local development must explicitly opt out with
# ADMIN_AUTH_DISABLED=1.
ADMIN_API_TOKEN=replace-with-a-long-random-string
```

The legacy token flow stores the value in per-tab `sessionStorage`; every admin
write request sends it as `x-admin-token`. LDAP sessions use an HttpOnly cookie
plus the CSRF token returned at login.

`nginx.conf` additionally restricts `/api/admin/*` by source IP.

### Admin logo upload

`POST /api/admin/logo-upload` accepts raw PNG, JPEG, WebP, or GIF bytes for the
route-image editor. It uses the same admin authentication as the other write
endpoints: an LDAP session must include its `x-csrf-token`, while legacy
automation may use the configured `x-admin-token`. Send the original filename
in `x-file-name`; it is sanitized and used only as the readable portion of a
unique versioned filename. The proxy determines the saved extension from the
file's magic bytes rather than trusting either header.

Uploads are limited to 6 MiB. A successful response includes a reusable,
root-relative `src`, for example:

```json
{
  "success": true,
  "src": "/logos/no_backgrounds/admin/ubuntu-v20260714153000-a1b2c3d4e5f6.png",
  "filename": "ubuntu-v20260714153000-a1b2c3d4e5f6.png",
  "contentType": "image/png",
  "bytes": 245761
}
```

Set `ADMIN_LOGO_UPLOAD_DIR` when the production asset directory differs from
`/var/www/html/logos/no_backgrounds/admin`. On Windows it defaults to the
project's `public/logos/no_backgrounds/admin` directory. The destination must
be writable by the proxy service account.

The proxy enforces the 6 MiB application limit, but nginx applies its own body
limit before proxying. The `/api/admin/` nginx location must therefore set
`client_max_body_size 6m;` (or a slightly larger transport allowance) for files
over nginx's default 1 MiB limit to reach this endpoint.

---

## Sections currently editable through `/admin`

Grouped by product family in the dropdown:

- **VMware** — landing categories, V9 / V8 / V7 product cards, Tools / VMRC / Upgrade Guide
- **Trellix** — landing categories
- **ISOs** — landing groups, Enterprise Linux ISOs, Ubuntu ISOs, Windows ISOs / Admin Center
- **Microsoft** — landing categories, Office downloads, Store / AppX packages
- **Visual Studio** — edition cards (Enterprise / Pro / Community)
- **SQL Tools** — SSMS release cards
- **PDQ** — Deploy / Inventory / Repository
- **DREN** — admin tool cards
- **Evaluate-STIG** — landing categories, document & viewer downloads (PDFs, MSIs, ZIPs)
- **Documentation** — landing categories, Enterprise Linux sub-categories, Ubuntu sub-categories

Procedural guides (Trellix install steps, DREN Trellix walkthroughs, individual
docs/el/* and docs/ub/* how-to pages) intentionally aren't in the editor —
those pages render JSX with code blocks rather than simple cards, so editing
them via field forms wouldn't be useful. Update them in source as before.

## Infrastructure nodes (live monitoring)

The Admin Console's **Monitoring → Infrastructure Nodes** section is backed by
real probes — every entry in `proxy/infrastructure-nodes.json` is pinged on a
30-second cadence by the site-stats proxy.

Each node has:
- `id` — stable internal id (lowercase, hyphenated)
- `name` — display label
- `kind` — `http` (fetch the URL) or `tcp` (open a socket)
- `target` — full URL or `host:port`
- `description` — shown when admins expand the card
- `timeoutMs` — probe timeout (default 5000)
- `expectedStatus` — optional, http only — anything outside the list is reported as **degraded**

The `/api/admin/infrastructure-nodes` endpoints (GET / POST / DELETE) and
`/api/admin/infrastructure-nodes/probe` (force-refresh now) are gated by the
same `ADMIN_API_TOKEN` as the rest of the admin API. Admins manage nodes
through the dashboard UI — there's an Add button at the top of the panel and
inline Edit / Remove buttons on each expanded card. Changes persist to
`infrastructure-nodes.json` and survive proxy restarts.

The probe sweep interval can be tuned per environment with
`NODE_POLL_INTERVAL_MS=30000` in `.env.local`. Floor is 10 seconds.

## Adding a new editable scope

If you want a card array that isn't in the editor yet to be admin-editable:

1. Move the static array into `lib/data/<area>.ts` (most are already there).
2. In the card component, replace `const cards = staticDefaults` with
   `const cards = useCardOverrides('<area>/<scope>', staticDefaults)`.
3. Add an entry to `EDITABLE_SCOPES` in `app/admin/AdminContentEditor.tsx`
   pointing at the same scope key and listing the fields the editor exposes.

That's the whole pattern — one hook line + one editor entry.

---

## Adding a new wizard template

In `lib/data/admin-content.ts`, append to `PAGE_TEMPLATES`. Each template
controls which card fields the wizard surfaces in step 3.
