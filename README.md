# APEN Services & Support — Next.js Rebuild

A full redesign of the APEN Support Site built with **Next.js 16**, **Tailwind CSS**, and **TypeScript**.
Modern dark mode with a sleek tech aesthetic — deep navy background, cyan (`#00d4ff`) and indigo (`#6366f1`) accents.

---

## Project Structure

```
APEN_Support_NextJS/
├── .env.example                ← Template for local proxy/server environment variables
├── app/
│   ├── layout.tsx              ← Root layout (Navbar, StarfallBackground aurora, global spotlight)
│   ├── page.tsx                ← Home — announcements + service/support grids
│   ├── not-found.tsx           ← Custom 404 page with quick links
│   ├── globals.css             ← Design system (Tailwind + fluid typography + custom animations)
│   ├── support/                
│   │   ├── page.tsx            ← Service Catalog (Main Dashboard)
│   │   ├── ticket/page.tsx     ← Help Desk Ticket Submission Form
│   │   ├── status/page.tsx     ← Dynamic Active Requests Tracker (User-specific)
│   │   ├── knowledge-base/     
│   │   │   └── page.tsx        ← Searchable Knowledge Base hub. Features interactive GlowCards for self-service categories (Network, Hardware, etc.).
│   │   └── password-reset/     
│   │       └── page.tsx        ← Active Directory SSPR portal. Guides users to securely unlock accounts or reset passwords.
│   ├── docs/
│   │   ├── page.tsx            ← Docs hub (EL / Ubuntu / FacPro cards)
│   │   ├── el/page.tsx         ← Enterprise Linux docs (AD via Realmd, certs, etc.)
│   │   ├── ub/page.tsx         ← Ubuntu docs (fstab, storage mounts)
│   │   └── facpro/page.tsx     ← FacilitatePro docs & FAQs
│   ├── vmware/page.tsx         ← VMware 7/8/9 installers & patch tables
│   ├── evaluate-stig/page.tsx  ← Evaluate-STIG + STIG Viewer downloads
│   ├── trellix/page.tsx        ← Trellix CUI agent install guides
│   ├── repos/
│   │   ├── page.tsx            ← Repos hub (RPM / DEB / pip cards)
│   │   ├── rpm/page.tsx        ← Enterprise Linux repo guide
│   │   ├── deb/page.tsx        ← Ubuntu repo guide
│   │   └── pip/page.tsx        ← Python pip mirror guide
│   ├── isos/page.tsx           ← Software & ISO downloads (EL / Ubuntu / Windows)
│   ├── certsrv/                
│   │   ├── page.tsx            ← Certificate Services hub. Provides instructions and access to the internal CA for requesting/renewing PKI certs.
│   │   └── csr/page.tsx        ← CSR Generation Wizard
│   ├── mssoftware/page.tsx     ← Microsoft Office 2019 + Store AppX
│   ├── VisualStudio/page.tsx   ← VS 2022 E/P/C + SSMS
│   ├── PDQ/page.tsx            ← PDQ Deploy & Inventory
│   ├── videos/
│   │   ├── page.tsx            ← Video guide hub
│   │   └── facpro/page.tsx     ← FacilitatePro video player + playlist
│   ├── speedtest/page.tsx      ← APEN Speed Test (iframe embed)
│   └── color-picker/page.tsx   ← HEX Color Picker (native React, no iframe)
├── components/
│   ├── ui/                     
│   │   ├── button.tsx          ← Reusable Button component using Radix UI and Class Variance Authority (CVA) for consistent styling variants (ghost, outline, destructive).
│   │   ├── card.tsx            ← Standard frosted-glass cards
│   │   ├── dropdown-menu.tsx   ← Accessible, keyboard-friendly dropdown menu primitive built on Radix UI (powers the complex Navbar menus).
│   │   ├── spotlight-card.tsx  ← GlowCard with mouse-tracking aurora effect
│   │   ├── APEN-chat-assistant.tsx ← Floating AI Assistant (calls same-origin Voltron proxy)
│   │   └── google-drive-uploader-toast.tsx ← File download/upload tracker
│   ├── Navbar.tsx              ← Sticky nav with dropdowns
│   ├── StarfallBackground.tsx  ← Three.js WebGL aurora canvas
│   ├── SpotlightProvider.tsx   ← Global mouse tracker for GlowCards
│   ├── GoBackButton.tsx        ← Client-side routing back button
│   ├── ThemedLogo.tsx          ← Auto-sizing logo renderer for SVGs/PNGs
│   └── PageHeader.tsx          ← PageHeader, SectionTitle, Callout
├── lib/
│   ├── announcements.ts        ← Activity feed database and automatic "NEW" badge logic
│   ├── logos.ts                ← Central registry for all image/logo asset paths
│   └── utils.ts                ← Tailwind merge utility (cn)
├── hooks/
│   └── use-click-outside.ts    ← Custom React hook for dropdowns/modals
├── proxy/
│   ├── voltron-proxy.mjs       ← Internal Node proxy that owns Voltron URL, model, prompt, and API key
│   ├── site-stats.mjs          ← Site stats, feedback, service health, and live announcements API
│   └── live-announcements-core.mjs ← Filesystem scanner for live upload announcements
├── package.json                ← Project manifest. Defines npm scripts (dev, build, proxy:voltron, stats) and project dependencies.
├── next.config.js              ← Next.js configuration
├── tailwind.config.ts          ← Tailwind theme overrides & custom colors
├── postcss.config.js           ← PostCSS configuration file. Required by Tailwind CSS to parse and compile your utility classes into standard browser CSS.
└── tsconfig.json               ← TypeScript compiler options

```

---

## Quick Start

### Prerequisites

- **Node.js** v24.22.1 or later (`engines` in `package.json` requires Node >=24.22.1, npm >=12.2.1)

---

### 1 — Install dependencies

Open a terminal in the project folder and run:

```bash
cd /var/www/apen_support_nextjs
npm install
```

This will download Next.js, React, Tailwind CSS, Lucide icons, and all other dependencies
into a `node_modules/` folder (~300 MB, normal).

---

### 2 — Static assets

`public/` already contains the logos, speedtest, color-picker, ansible, and
trellix assets migrated from the legacy site (`/var/www/html`). On a fresh
checkout, copy those folders from the legacy site root into `public/`.

All page and card artwork is selected in `lib/data/logos.ts`:

- Edit `LOGOS` to change a physical image location everywhere it is used.
  Every public image path is declared there exactly once, using a semantic name
  that remains valid when the file type or folder changes.
- Page images are grouped to match the route tree: `DOCS_PAGE_LOGOS`,
  `DOWNLOADS_PAGE_LOGOS`, `TOOLS_PAGE_LOGOS`, and the other labeled sections.
  Each route is beside its semantic `LOGOS` key. Cards, page headers, and
  navigation all read that same route entry. For example, the `/downloads/`
  image is `LOGOS.documents` in `DOWNLOADS_PAGE_LOGOS`.
- `PAGE_LOGOS` is the combined compatibility map generated from those sections.
- These maps are source defaults. An authenticated admin can use **Admin →
  Content → Registered route images** to save a live route image without
  logging into the server. One route choice is resolved across its page header,
  linked cards, navigation icon, and route-specific artwork.
- Catalog choices persist a semantic `LOGOS` key—not a copied file path. New
  PNG/JPEG/WebP/GIF files can be uploaded from that panel; the dynamic registry
  stores the uploaded path once and routes reference its asset id. **Publish &
  rebuild** snapshots the live registry into `published-content.json`.
- To move an asset into `/logos/no_backgrounds`, update only its `LOGOS` entry;
  do not change `docs.ts`, a page component, or the navigation map.
- `BACKGROUNDS` and `GUIDE_IMAGES` are contextual maps that also reference the
  canonical `LOGOS` catalog.
- Run `npm run hooks:install` once after cloning: it installs a `pre-push` hook that runs
  lint, typecheck and tests.
  `npm run lint` fails above its `--max-warnings` ceiling in package.json: lower the
  number as warnings are cleared, never raise it. `npm run validate` is the full gate (those three plus the build)
  and is what `siteupdate.sh` and the admin Publish button run.
- Keep local URLs root-relative (`/logos/...`) and run `npm run validate:images`
  after a swap. It catches paths declared outside the catalog, duplicate paths,
  misleading format-specific keys, missing files, and filename-case drift; the
  same validation runs automatically before every build.

---

### 3 — Start the development server

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.
Hot-reloading is enabled — any saved file change updates instantly.

---

### 4 — Start the Voltron proxy

The static frontend calls `POST /api/voltron-chat`. Because this project uses
`output: 'export'`, that API path must be served by the standalone internal proxy,
not by a Next.js route handler.

Create a local env file from the template and set a rotated Voltron key:

```bash
cp .env.example .env.local
```

Required proxy variables:

```env
VOLTRON_PROXY_HOST=127.0.0.1
VOLTRON_PROXY_PORT=8787
VOLTRON_API_URLS=http://140.32.71.122:8000/v1,http://140.32.71.122:8001/v1,http://140.32.71.106:8001/v1,http://140.32.71.106:8002/v1,http://140.32.71.120:8642/v1
VOLTRON_API_KEY=<your-rotated-voltron-key>   # real value lives only in .env.local — never commit it
VOLTRON_MODEL=voltron-v3
VOLTRON_MAX_TOKENS=1000
VOLTRON_TIMEOUT_MS=60000   # per-upstream deadline (1000–300000); failover moves on after it
```

`VOLTRON_API_URLS` is tried in order. OpenAI-compatible base URLs ending in `/v1`
are expanded to `/v1/chat/completions`; full `/chat/completions` URLs are also
accepted. For Ollama OpenAI-compatible endpoints, use `http://host:11434` or
`http://host:11434/v1` and set `VOLTRON_MODEL` to a model available on that host.
If an internal upstream does not require auth, leave `VOLTRON_API_KEY` empty.

Start the proxy. It reads `.env.local` automatically, while real environment variables still take precedence:

```bash
npm run proxy:voltron
```

Smoke-test invalid input:

```bash
curl -i -X POST http://127.0.0.1:8787/api/voltron-chat -H "Content-Type: application/json" -d "{\"messages\":[]}"
```

Expected result: HTTP `400` with a JSON error.

---

### 5 — Start the site API

The home page calls `GET /api/live-announcements` so it can show files uploaded
directly to the deployed web server after the static site was built. That path is
served by `proxy/site-stats.mjs`, alongside site stats and feedback.

Configure the upload roots in `.env.local`:

```env
LIVE_ANNOUNCEMENT_PATHS=Site Uploads|Site Update|/var/www/html/uploads|/uploads/;Cisco Repository|Software|/mnt/storage/cisco|/cisco/
LIVE_ANNOUNCEMENT_CACHE_SECONDS=10
LIVE_ANNOUNCEMENT_MAX_ITEMS=30
```

Each root uses this format:

```text
Label|Category|filesystem path|public URL prefix
```

Start the API server:

```bash
npm run stats
```

Smoke-test the live announcements endpoint:

```bash
curl -i http://127.0.0.1:8788/api/live-announcements
```

Expected result: HTTP `200` with a JSON object containing `announcements`.

---

### 6 — Build for production (static export)

```bash
npm run build
```

This generates a fully static site in the **`out/`** folder.
The `out/` directory is a drop-in replacement for the old site —
deploy it to any web server (Apache, nginx, IIS, etc.) by copying the contents.

```bash
# Example: preview the build locally
npx serve out
```

---

## Deployment

Because `next.config.js` uses `output: 'export'`, the build produces plain HTML/CSS/JS.
Serve the `out/` directory and reverse proxy API paths to the local Node services:
`/api/voltron-chat` to `proxy/voltron-proxy.mjs`, and `/api/live-announcements`,
`/api/site-feedback`, and `/api/site-stats` to `proxy/site-stats.mjs`.

**nginx example:**
```nginx
server {
    listen 80;
    server_name apensupport.blcse.mil;
    root /var/www/apen-support/out;
    index index.html;

    location /api/voltron-chat {
        proxy_pass http://127.0.0.1:8787/api/voltron-chat;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/live-announcements {
        proxy_pass http://127.0.0.1:8788/api/live-announcements;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        add_header Cache-Control "no-store, no-cache" always;
    }

    try_files $uri $uri/ $uri.html /index.html;
}
```

The included `nginx.conf` and `apensupport.conf` examples both include same-origin
proxy locations for the chat and live announcements APIs:

```nginx
location = /api/voltron-chat {
    proxy_pass http://127.0.0.1:8787/api/voltron-chat;
}

location = /api/live-announcements {
    proxy_pass http://127.0.0.1:8788/api/live-announcements;
}
```

**IIS:** Point the site root at the `out/` directory. Add a URL Rewrite reverse proxy
rule for `/api/voltron-chat` to `http://127.0.0.1:8787/api/voltron-chat` and keep
the proxy process running as a Windows service or scheduled task.

Manage OpenAI API Connections

http://140.32.71.122:8000/v1
http://140.32.71.122:8001/v1
http://140.32.71.106:8001/v1
http://140.32.71.106:8002/v1
http://140.32.71.120:8642/v1

Manage Ollama API Connections

http://140.32.71.121:11434
http://140.32.70.103:11434

The Voltron bearer key must only live in the proxy process environment. Do not add
it to client code, `NEXT_PUBLIC_*` variables, or the static `out/` folder.

---

## Admin API Token

`/api/admin/*` endpoints (used by the `/admin/` Monitoring tab to add, edit, and
probe infrastructure nodes) are gated by an `x-admin-token` header that must
match `ADMIN_API_TOKEN` from `.env.local`. The browser never sees the token —
nginx injects it from a server-side include file on every `/api/admin/*` request,
and the proxy validates it. The nginx IP allowlist on `/api/admin/*` is the
primary auth boundary; the token is defense-in-depth so anything reaching the
proxy on port 8788 directly (i.e., bypassing nginx) still gets rejected.

Files involved:

| Path | Role |
|---|---|
| `.env.local` (`ADMIN_API_TOKEN=…`) | Single source of truth. |
| `/etc/nginx/conf.d/admin-token.inc` | Generated nginx include containing `set $admin_api_token "…";`. Perms `640`, never world-readable. |
| `/etc/nginx/conf.d/nginx.conf` | `include`s the file above and injects the value via `proxy_set_header x-admin-token $admin_api_token;`. |
| `proxy/sync-nginx-admin-token.sh` | Regenerates the include from `.env.local`. |
| `proxy/site-stats.mjs` | Reads `ADMIN_API_TOKEN` from `.env.local` at startup and validates incoming requests. |

### Rotating `ADMIN_API_TOKEN`

1. Edit `.env.local` and replace `ADMIN_API_TOKEN=…` with the new value.
2. Regenerate the nginx include and reload nginx so it picks up the new value:

   ```bash
   bash proxy/sync-nginx-admin-token.sh
   sudo nginx -t              # validate
   sudo systemctl reload nginx
   ```

3. Restart the site-stats proxy so it picks up the new env value:

   ```bash
   # Both proxies run under PM2 (see "Operating this server" below):
   pm2 restart apen-stats-api --update-env
   ```

If the token, the nginx include, and the running proxy disagree, the Monitoring
tab will return 401 and the inline-token form (dev fallback) appears. Resync the
include and restart the proxy to clear it.

### Setting up the admin token on a fresh deployment

1. Add `ADMIN_API_TOKEN=<random-hex-string>` to `.env.local` (e.g.
   `openssl rand -hex 32`).
2. Run `bash proxy/sync-nginx-admin-token.sh` to generate
   `/etc/nginx/conf.d/admin-token.inc`.
3. Make sure `nginx.conf` includes it at server scope and uses
   `$admin_api_token` on the `/api/admin/*` location (already present in the
   repo's `nginx.conf`).
4. `sudo nginx -t && sudo systemctl reload nginx`.
5. Start (or restart) the site-stats proxy so it loads the new env.

---

## Adding / Updating Content

| What to update | Where |
|---|---|
| Announcements on home page | `app/page.tsx` → `announcements` array |
| VMware patch versions | `app/vmware/page.tsx` → `vcenter8`, `esxi8`, etc. objects |
| Evaluate-STIG version | `app/evaluate-stig/page.tsx` → download links + description |
| New EL doc guide | `app/docs/el/page.tsx` → add to `sections` + `contentMap` |
| New Ubuntu doc guide | `app/docs/ub/page.tsx` → same pattern |
| New ISO | `app/isos/page.tsx` → `groups` array |
| New VS release | `app/VisualStudio/page.tsx` → `editionData[id].releases` |
| New SSMS release | `app/VisualStudio/page.tsx` → `ssmsReleases` array |
| New video | `app/videos/facpro/page.tsx` → `videos` array |
| Nav links | `components/Navbar.tsx` → `navItems` array |
| Color theme | `tailwind.config.js` + `app/globals.css` |

---

## Operating this server (production)

The deployed site runs on `apensupport.blcse.mil` as three pieces:

| Piece | What | Managed by |
|---|---|---|
| Static site | `out/` served by nginx (`/etc/nginx/conf.d/apen_support/`) | nginx |
| Chat proxy | `proxy/voltron-proxy.mjs` on `127.0.0.1:8787` | PM2 app `voltron-proxy` |
| Site API | `proxy/site-stats.mjs` on `127.0.0.1:8788` | PM2 app `apen-stats-api` |
| Speed test | frontend: `speedtest/frontend/` served statically by nginx at `/speedtest/`; API: shared FastAPI container on `:8083` (same instance the legacy apensupport site uses) | nginx + the legacy container |

PM2 runs as `dod_admin` and is resurrected at boot by the
`pm2-dod_admin.service` systemd unit. Day-to-day commands:

```bash
pm2 list                                  # status of both proxies
pm2 restart voltron-proxy --update-env    # pick up .env.local changes
pm2 restart apen-stats-api --update-env
pm2 logs apen-stats-api --lines 100
pm2 save                                  # persist the process list for reboot
```

Do **not** create separate systemd units for the proxies — a stray
`apen-voltron-proxy.service` once crash-looped with `EADDRINUSE` because PM2
already owned port 8787 (`proxy/remove-stray-voltron-unit.sh` removes it).

Deploys: `/var/www/customsh/siteupdate.sh` builds the static export and
restarts the PM2 apps. Repo mirrors under `/var/www/html/repos/` are synced by
the `/var/www/customsh/*rsync.sh` scripts via root cron (see
`/var/www/customsh/1-crontab_jobs`).

---

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| Next.js | 16.2 | Framework, routing, static export |
| React | 19.2 | UI components |
| TypeScript | 6 | Type safety |
| Tailwind CSS | 4 | Styling |
| Lucide React | 1.x | Icons |

---

## Original Site Mapping

| Old URL | New URL |
|---|---|
| `/` | `/` |
| `/docs/el/el-ad-management.html` | `/docs/el` → select "Active Directory" |
| `/vmware/vcenter8.html` | `/vmware` → select "vCenter Server 8" |
| `/evaluate-stig/evaluate-stig-for-alma9.html` | `/evaluate-stig` → select "AlmaLinux 9" |
| `/trellix` (CUI) | `/trellix` |
| `/dren/trellix` (DREN) | `/dren/trellix` |
| `/repos/rpm` | `/repos/rpm` |
| `/isos` | `/isos` |
| `/mssoftware` | `/mssoftware` |
| `/VisualStudio` | `/VisualStudio` |
| `/PDQ` | `/PDQ` |
| `/videos/facpro` | `/videos/facpro` |
| `/speedtest` | `/speedtest` |
| `/color-picker` | `/color-picker` |
