# Restricted APEN Support Site — Next.js Port

This project (`restricted-nextjs/`) is the **restricted-enclave port** of the new
Next.js APEN Support Site. It is a copy of the `live/` project, re-pointed at the
restricted network and extended with the apps that only exist on the restricted
site. The goal: the restricted site gets the exact modern look and behavior of the
live site, while keeping all of its own content and services.

It is **not** a from-scratch rewrite — it inherits the live site's framework,
components, design system, shared product pages (VMware, ISOs, Repos, Microsoft,
PDQ, Evaluate-STIG, Trellix, Certificate Services, etc.), backends, and build
pipeline unchanged. This document describes only the **delta** from `live/`.

---

## What changed vs. the live site

### 1. Secrets — NOT scrubbed in this working copy
⚠️ Earlier revisions of this file claimed `.env.local` had been scrubbed to
`__SET_ON_RESTRICTED_HOST__` placeholders. **That is not true of this folder**,
which is the live production checkout: `VOLTRON_API_KEY`, `ADMIN_API_TOKEN` and
`LDAP_REALMS` hold real credentials, and `.env.local.bak-*` holds the same ones.

`.env.local` therefore **never ships**. Author it on the restricted host from
`.env.example`, minting a fresh `ADMIN_API_TOKEN` (`openssl rand -hex 24`) and
that enclave's own `LDAP_REALMS`. `scripts/make-airgap-bundle.sh` excludes both
files and aborts the pack if a secret pattern reaches the staging directory;
`deploy/INSTALL.sh` writes the far-side `.env.local` from `enclave.env`.
Backends mirror the live server (see "Backends" below).

### 2. Restricted service portals (`lib/data/constants.ts`)
Added `RESTRICTED_SERVICE_URLS` — the `.blcse.mil` service hostnames from the
legacy restricted `index.html` (SharePoint, OWA, osTicket, Voltron, QSpace,
Tenable/ACAS, JupyterHub, Cert Services, GitLab, Trellix ePO, RStudio,
FacilitatePro). These are already-published hostnames, so they are linked
directly. The WAN Show board (a raw RFC-1918 IP) stays behind the
`/api/external/wan-show` redirector so the IP never lands in the static bundle —
**set `EXTERNAL_URL_WAN_SHOW` on the host** (or drop that tile).

### 3. New "Applications" section (`lib/data/restricted-apps.ts`)
Single source of truth for the restricted-only content:
- `restrictedServiceLinks` → the lean `/home` **Operational Services** grid
  (the four enclave tiles that mirror the live site: ticketing, Speed Test,
  Tenable, Voltron).
- `restrictedServicePortals` → the `/home` **Service Portals** grid, its own
  section between Operational Services and Quick Reference (the extra
  on-network portals the live home page doesn't carry — SharePoint, OWA,
  QSpace, JupyterHub, AD Cert Services, GitLab, Trellix ePO, RStudio,
  FacilitatePro).
- `restrictedAppCards` → the `/applications` hub app grid.

### 4. Home page (`lib/data/homepage.ts`)
Home keeps the live site's lean Operational Services / Quick Reference rows and
adds a dedicated Service Portals section in between:
- **Operational Services** = local Service Catalog + the four restricted
  operational tiles (5 cards, matching the live home page).
- **Service Portals** = the nine enclave-only on-network portals (their own
  section, so the operational row stays as lean as the live site's).
- **Quick Reference** = the core product download families ISO, VMware,
  Microsoft, PDQ, Evaluate-STIG (5 cards, matching the live home page). Linux
  Repositories and the restricted app cards are surfaced on `/downloads`,
  `/docs/repos`, and `/applications` instead of the home grid.
- Glow-color counts sized to each grid (5 / 9 / 5).

### 5. Navigation (`lib/data/navigation.ts`)
Added an **Applications** dropdown (Ansible, AtomEngine, Openfire, VASSAL,
Network Analysis, AFSIM, NVIDIA CUDA) plus nav-logo mappings for each route.

### 6. Announcements (`lib/data/announcements.ts`)
Added restricted-specific items (redesign, Ansible bundle) and bumped
Evaluate-STIG to 1.2604.2 to match the restricted site.

### 7. Logos (`lib/data/logos.ts` + `public/logos/restricted/`)
Registered the restricted app/service marks (ported from the legacy `logos/`
folder) under a new `RES = /logos/restricted` group. `cuda` points at
`/cuda/nvidia.png` (served from the host mount).

### New pages (`app/…/page.tsx`) — rebuilt in the new design
| Route | Content |
|---|---|
| `/applications` | Hub grid of all restricted apps |
| `/ansible` | Offline wheel-bundle install guide (EL/Ubuntu) |
| `/atomengine` | User manual + intro/demo videos |
| `/openfire` | Spark/Pidgin install + config guides, installers |
| `/vassal` | Client install, connection settings, user guide, OWS/HMI/public module downloads |
| `/network-analysis` | Speed Test + NetDiag console launcher |
| `/afsim` | AFSIM distribution downloads |
| `/cuda` | NVIDIA CUDA 12.9 (Windows 11) toolkit |

Plus new-style **sub-guides**, all rendered from `lib/data/chat-guides.ts` via
`components/common/InstallGuide.tsx`:
`/openfire/{spark,pidgin}-{enterprise-linux,ubuntu}`,
`/openfire/{cesc,vassal}-{spark,pidgin}`, and
`/vassal/install-{enterprise-linux,ubuntu}`.

> **msstore** was intentionally **not** ported as a legacy page — per direction it
> is served through the live site's Microsoft/Winget approach
> (`/microsoft-products`, `/mssoftware`, `lib/data/winget-catalog.ts`), which the
> restricted site inherits from the live project unchanged.

---

## Server-side assets (NOT in this project — keep on the host)

The Next.js build produces a static `out/` folder. The large payloads and the
legacy sub-guide HTML stay on the web server and are served by nginx alongside
`out/` (exactly as the live site serves the legacy `/var/www/html` tree). Do **not**
copy these into the repo:

- **Download payloads:** `/ansible/*.whl`, `/openfire/installers/*`,
  `/vassal/{installers,ows_modules,hmi_modules,pub_modules}/*`, `/atomengine/*.mp4`
  + `.pdf`.
- **Storage mounts (symlinks → `/mnt/storage/…`):** `isos`, `vmware`, `PDQ`,
  `afsim`, `cuda`, `fod`, `cran`, `trivy`, `vs2022*`, `vs_ssms`.
- **Openfire login screenshots:** `/openfire/images/cescchat-login*.png` are
  referenced by the CESC Chat Spark guide. (The legacy `/openfire/*.html` and
  `/vassal/*_install_linux.html` guides are now fully ported to new-style routes
  and are no longer linked — the source `.html` files can be retired.)
- **Network Analysis service:** the combined Speed Test + NetDiag FastAPI app
  (Docker, port 8085) must be running and reverse-proxied at `/speedtest/` and
  `/netdiag/` for the `/network-analysis` launcher to work.

---

## Build & deploy

### Prerequisites
- **Node.js ≥ 24.22.1, npm ≥ 12.2.1** (see `package.json` engines). Next 16 will not build
  on older Node — note: this repo's build was verified structurally on Node 22 in
  the authoring sandbox, so **run the actual build on a Node 24+ host.**

### Build
```bash
cd restricted-nextjs
npm install
npm run build        # produces the static out/ folder
```

### Serve
Point nginx at `out/` and reverse-proxy the API paths to the Node backends, and
keep serving the legacy content directories above. See the inherited `README.md`
(Deployment section) and `nginx/` for the full server config — update
`server_name`, the admin IP allowlist, and upstreams for the restricted host.

### Backends (mirror the live server)
Node/PM2 are being installed on the restricted host to mirror live:
```bash
pm2 start proxy/site-stats.mjs    --name apen-stats-api   # :8788
pm2 start proxy/voltron-proxy.mjs --name voltron-proxy    # :8787
pm2 save
```
Then set the real `VOLTRON_*`, `ADMIN_API_TOKEN`, LDAP, and `EXTERNAL_URL_*`
values in `.env.local` and run `proxy/sync-nginx-admin-token.sh`.

---

## Confirm / follow-ups
1. **Host base URL** — `APENSUPPORT_BASE` in `lib/data/constants.ts` still points
   at `apensupport2.blcse.mil` (inherited). Confirm the correct download host for
   the restricted server; the new restricted pages use **relative** paths so they
   resolve on whatever host serves the site.
2. **`EXTERNAL_URL_WAN_SHOW`** — set it, or remove the WAN Show service tile.
3. **Openfire / VASSAL sub-guides** — ✅ Done. All 10 client install/config
   guides are ported to new-style routes (`lib/data/chat-guides.ts` +
   `components/common/InstallGuide.tsx`).
4. **RStudio / JupyterHub / GitLab / etc.** are external service tiles only (no
   local page), matching the legacy site.
5. Run `npm run build` on a Node 24+ host and smoke-test the nav, `/applications`,
   and each new page.
