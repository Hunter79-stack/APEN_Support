# Restricted APEN Support Site — Deploy / rsync Runbook

> **Prefer the bundle.** `deploy/README.md` + `scripts/make-airgap-bundle.sh`
> automate everything below and add a secret scan, a dry run, backups, rollback
> and a verify pass. This file is the manual fallback and the reference for what
> the automation does.

This project is **pre-built and verified**. `out/` is a complete static export
produced with `next build` on Node 24. Rsync, set host-specific values, point
nginx at `out/`, and start the two PM2 backends.

**`node_modules` IS required on the far side**, contrary to what earlier versions
of this file said. Serving `out/` needs only nginx, but:
* LDAP login `await import('ldapts')` at `proxy/site-stats.mjs` — without it,
  every sign-in fails as `not-configured` with one stderr line and no UI clue.
* the admin **Publish** button spawns `npm run build`, which needs next,
  tailwind, the Babel toolchain and typescript.
Ship a populated `node_modules/`, or set `PUBLISH_BUILD=0` and accept that
Publish only writes JSON and LDAP login is dead.

> Build status: `next build` → success (140 static pages); `scripts/build-search-index.mjs`
> → `out/search-index.json` (126 pages). No TypeScript or lint errors.

---

## 1. What to rsync

Ship these to the restricted host (e.g. `/var/www/apen_support_nextjs`):

```
out/                     ← the built static site (served by nginx)
proxy/                   ← Node backends (bare Node, no node_modules)
scripts/                 ← build-search-index.mjs etc. (only needed to rebuild)
nginx/                   ← server.conf + includes
public/                  ← source assets (only needed to rebuild; already baked into out/)
app/ components/ lib/ config/   ← source (only needed to rebuild on the host)
ecosystem.config.js  package.json  next.config.js  tailwind.config.js
tsconfig.json  postcss.config.js  cuica.crt
node_modules/            ← required: ldapts for LDAP login, toolchain for Publish
```

⚠️ **`.env.local` does NOT ship.** On this host it holds a real
`VOLTRON_API_KEY`, a real 64-hex `ADMIN_API_TOKEN` and a real `LDAP_REALMS`
blob — those are live production credentials, not placeholders. Author a fresh
`.env.local` on the restricted host from `.env.example` (§2). The same applies
to `.env.local.bak-*`, which holds the same secrets.

`proxy/` ships **only the admin-authored config**: `infrastructure-nodes.json`,
`content-overrides.json`, `custom-pages.json`, `assistant-prompts.json`,
`file-library-dirs.json`, `nginx-managed.json`. Everything else in that folder is
per-site history and PII — chat transcripts, sessions, auth events with source
IPs, feedback authors, the audit log — and must be excluded.

**Do NOT ship** (regenerated / not needed): `node_modules/`, `.next/`,
`tsconfig.tsbuildinfo`, `_stage/`, `out.tgz`, `_writetest.txt`. (The last three
are scratch files from the build session — delete them from this folder.)

Example (from the workstation that holds this folder):

```bash
rsync -av --delete \
  --exclude .next --exclude '_stage' \
  --exclude 'out.tgz' --exclude '_writetest.txt' --exclude tsconfig.tsbuildinfo \
  --exclude '.env.local*' \
  --exclude 'proxy/chat-history.json'   --exclude 'proxy/admin-sessions.json' \
  --exclude 'proxy/general-sessions.json' --exclude 'proxy/auth-events.json' \
  --exclude 'proxy/feedback-history.json' --exclude 'proxy/content-audit.json' \
  --exclude 'proxy/dismissed-alerts.json' --exclude 'proxy/acknowledged-alerts.json' \
  --exclude 'proxy/notification-outbox.json' \
  ./restricted-nextjs/  dod_admin@<restricted-host>:/var/www/apen_support_nextjs/
```

The `.env.local*` glob (not a bare `.env.local`) is what catches the `.bak-*`
copy sitting beside it. `--delete` does not remove excluded paths on the
destination, so the far side keeps its own `.env.local` and runtime state.

If you only want the servable site (no rebuild capability on the host), ship
`out/`, `proxy/`, `nginx/`, `ecosystem.config.js` and `node_modules/ldapts/`.

---

## 2. Host-specific values to set  ⚠️ (do this on the restricted network)

| Where | What to set |
|---|---|
| `.env.local` | **Author it fresh on the restricted host from `.env.example`** — never copy the live one. Set `VOLTRON_API_URLS`, `VOLTRON_API_KEY`, `VOLTRON_MODEL`; a NEW `ADMIN_API_TOKEN` (`openssl rand -hex 24`); `EXTERNAL_URL_*`; `NGINX_ACCESS_LOG`; and `LDAP_REALMS` — **one JSON-array key, not the old `LDAP_URL`/`LDAP_BASE_DN`/… set, which no code reads.** With `LDAP_REALMS` unset, `/api/auth/*` returns 503 and every login is dead. |
| `nginx/server.conf` | `server_name` (×2) and the `ssl_certificate` / `ssl_certificate_key` paths are set to `apensupport.blcse.mil` — **confirm this matches your restricted FQDN and cert filenames.** |
| `nginx/server.conf` line 550 | NetDiag upstream `http://140.32.71.81:8085/netdiag/` is a live-network IP — point at the restricted NetDiag host, or `127.0.0.1:8085` if co-located (which is what its two sibling `/netdiag/ws/` locations already use). |
| `nginx/server.conf` lines 680/696/713 | Winget repo upstream `https://apenwingetrepo.blcse.mil/…` (also in the three matching `proxy_set_header Host` lines) — set to the restricted Winget repo server, or drop those locations if the enclave has none. |
| `proxy/infrastructure-nodes.json` | The `/admin#monitor` tiles. Every non-loopback target is an address from the source enclave. **Probe by FQDN, never by IP:** a bare-IP target sends `Host: <ip>`, which nginx matches to whichever `server_name` claims it — on the live host `172.16.2.19` belongs to the *netsupport* vhost, so IP probes reported on the wrong server. |
| `nginx/admin-acl.inc` | Replace the admin-workstation allowlist with the restricted network's IPs. Keep the `# HOSTNAME (ad-username)` comment on each line accurate — `proxy/site-stats.mjs` parses it to attribute entries in the admin audit log, so a stale comment mislabels the audit trail rather than merely looking untidy. |
| `nginx/server.conf` `root` | Defaults to `/var/www/apen_support_nextjs/out` — change if you deploy elsewhere. |

Everything else (rate limits, gzip, HTTP/2, caching, security headers, the
`127.0.0.1` API proxy locations, legacy `/var/www/html` fallback) is identical to
the live server, so behavior and performance match.

---

## 3. One-time host prep

```bash
# Node 24 (needed only to run the PM2 backends and to rebuild; NOT to serve out/)
#   install from your internal mirror or a bundled tarball — see nodejs.org/dist/v24.x
node -v            # expect v24+
sudo npm i -g pm2  # from internal registry / offline bundle

sudo mkdir -p /var/www/apen_support_nextjs
# (rsync the project here — see §1)
```

## 4. nginx

```bash
sudo mkdir -p /etc/nginx/conf.d/apen_support
sudo cp nginx/server.conf nginx/security-headers.inc nginx/admin-acl.inc nginx/blocked-hosts.inc \
        nginx/proxy-headers.inc nginx/login-redirect.inc \
        /etc/nginx/conf.d/apen_support/
# login-redirect.inc is included from four places in server.conf — omit it and
# the `nginx -t` two lines down fails on the missing file. Keep this list in
# sync with customsh/siteupdate.sh, which is the authoritative copy.
# ensure /etc/nginx/nginx.conf includes conf.d/*.conf (or use nginx/loader.conf)
sudo cp nginx/loader.conf /etc/nginx/conf.d/apen_support.conf
./proxy/sync-nginx-admin-token.sh      # generates admin-token.inc from .env.local
sudo nginx -t && sudo systemctl reload nginx
```

The optional NGINX live-status (VTS) module is documented in
`proxy/NGINX_VTS_RUNBOOK.md`; until built, the /admin NGINX tab shows "not detected".

## 5. Backends (PM2)

```bash
cd /var/www/apen_support_nextjs
pm2 start ecosystem.config.js     # apen-stats-api :8788, voltron-proxy :8787
pm2 save
pm2 startup                       # run the printed command to enable boot-start
```

Both proxies read `.env.local` at startup. After any
`.env.local` change: `pm2 restart apen-stats-api voltron-proxy --update-env`.

---

## 6. Content payloads (served alongside `out/`)

The app links to download/app trees that live on the host and are served by nginx
(the legacy `/var/www/html` fallback + storage mounts) — **not** bundled in `out/`.
Make sure these exist on the restricted host:

- App content: `/ansible`, `/openfire` (incl. `installers/` + `images/`),
  `/vassal` (incl. `installers/`, `ows_modules/`, `hmi_modules/`, `pub_modules/`),
  `/atomengine`.
- Storage mounts (symlinks → your storage): `/isos`, `/vmware`, `/PDQ`, `/afsim`,
  `/cuda`, `/fod`, `/cran`, `/trivy`, `/repos`, VisualStudio trees.
- `/network-analysis` service (Speed Test + NetDiag, port 8085) running and
  reverse-proxied at `/speedtest/` and `/netdiag/`.

## 7. Verify

```bash
curl -skI https://<restricted-host>/            | head -1     # 200
curl -sk  https://<restricted-host>/applications/ | grep -o '<title>[^<]*'   # Applications hub
curl -sk  https://<restricted-host>/openfire/spark-enterprise-linux/ | grep -c Spark
curl -si  http://127.0.0.1:8788/api/live-announcements | head -1   # 200 (stats API)
curl -i -X POST http://127.0.0.1:8787/api/voltron-chat \
     -H 'Content-Type: application/json' -d '{"messages":[]}'      # 400 (proxy up)
```

Load the site and spot-check: Home service grid + Quick Reference, the
**Applications** nav menu, and each new page (`/ansible`, `/atomengine`,
`/openfire`, `/vassal`, `/network-analysis`, `/afsim`, `/cuda`) plus the Openfire/
VASSAL sub-guides.

---

## 8. Rebuilding on the host (optional)

Only needed if you change source on the restricted box. Requires Node 24 + the
npm dependencies (from an internal registry or a bundled `node_modules`):

```bash
npm install         # needs registry access or vendored node_modules
npm run build       # regenerates out/ (next build + search index)
```

To serve the current shipped build, you do **not** need this step.
