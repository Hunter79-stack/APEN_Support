# NGINX live-status runbook — enabling the `/admin/` "NGINX status" tab

The admin **NGINX status** tab and the **Real-Time Traffic** summary widget render
live, normalized nginx metrics served by `proxy/site-stats.mjs` at
`GET /api/admin/nginx-stats`. The **application code is already in place and
ships graceful "not detected" states** — this runbook is the one remaining,
privileged piece: making nginx actually expose those metrics.

Open-source nginx (what this box runs: **nginx 1.30.3**, built only with
`--with-http_stub_status_module`) exposes just 7 global counters. The per-zone /
per-upstream / cache / resolver tables require **one** of:

| Option | What you get | Cost |
| --- | --- | --- |
| **A. `nginx-module-vts`** (recommended) | Full per-zone/upstream/cache + HTML+JSON dashboard, keeps your exact nginx | Build a dynamic module, `load_module`, reload |
| **B. `stub_status` only** | Connection summary only (no tables) | Trivial; good interim step |

Both feed the **same** UI — `site-stats.mjs` auto-detects the format.

> ⚠️ **Change-control / blast radius.** This nginx fronts the speedtest backend,
> the CRAN/PIP/ISO/WinGet mirror panels, the voltron LLM proxy, and the static
> site. Treat A as a scheduled change with a tested rollback. **Never add
> the `vhost_traffic_status_*` directives before the module is loaded** — stock
> nginx doesn't know them, so `nginx -t` fails and the reload is refused.

---

## Option A — `nginx-module-vts` as a dynamic module (recommended)

### A1. Build the module against the running nginx version

`--with-compat` lets a module built against the matching nginx **source version**
load into your packaged nginx without matching every `./configure` flag.

```bash
# Confirm the exact version you must match:
nginx -v        # -> nginx/1.30.3   (build the SAME version below)

sudo apt-get update
sudo apt-get install -y build-essential libpcre2-dev zlib1g-dev libssl-dev wget git

cd /usr/local/src
sudo git clone https://github.com/vozlt/nginx-module-vts.git
# NOTE: vozlt's module historically lags new nginx releases. If `make` fails
# against 1.30.3, use a maintained fork that has the newer-nginx patches, e.g.
#   sudo git clone https://github.com/dvershinin/nginx-module-vts.git
# (verify the fork in your supply-chain review before using it).

sudo wget https://nginx.org/download/nginx-1.30.3.tar.gz
sudo tar xf nginx-1.30.3.tar.gz
cd nginx-1.30.3

# Build ONLY the dynamic module (no install of nginx itself):
sudo ./configure --with-compat \
  --add-dynamic-module=/usr/local/src/nginx-module-vts
sudo make modules

# Install the .so where nginx loads modules from:
sudo cp objs/ngx_http_vhost_traffic_status_module.so /usr/lib/nginx/modules/
# (if you also want TCP/UDP zones and built --with-stream, also copy
#  objs/ngx_stream_vhost_traffic_status_module.so)
```

### A2. Wire it into nginx config

See `nginx/vts-status.conf.example` for the exact blocks. In order:

1. **Main context** — top of `/etc/nginx/nginx.conf` (before `events {`):
   ```nginx
   load_module modules/ngx_http_vhost_traffic_status_module.so;
   ```
2. **http context** — in `nginx.conf`'s `http { }`, or at the top of
   `/etc/nginx/conf.d/apen_support/server.conf` next to the existing
   `limit_req_zone` lines (also http-context):
   ```nginx
   vhost_traffic_status_zone shared:vhost_traffic_status:32m;
   vhost_traffic_status_filter_by_host on;   # split metrics per vhost
   ```
3. **Loopback JSON location** — in the **port-80** server block (the one with
   `location / { return 301 ... }`), so the backend reads it over plain
   loopback and the exact-match wins over the 301:
   ```nginx
   location = /status/format/json {
       vhost_traffic_status_display;
       vhost_traffic_status_display_format json;
       allow 127.0.0.1;
       deny all;
       access_log off;
   }
   ```
   (Optional admin-gated HTML dashboard at `= /status/` — see the example file.)

### A3. Validate + reload (the moment of truth)

```bash
sudo nginx -t          # MUST pass. If it errors on vhost_traffic_status_*,
                       # the module didn't load — fix A1/A2 before reloading.
sudo systemctl reload nginx
curl -s http://127.0.0.1/status/format/json | head -c 300   # expect JSON
```

Default backend URL already matches this (`NGINX_VTS_JSON_URL=http://127.0.0.1/status/format/json`),
so no `.env.local` change is needed unless you used a different path/port.

---

## Getting closer to the /test/ mock on VTS (SANCTIONED — no vendor change)

> **STATUS 2026-07-07: APPLIED to `nginx/server.conf`** (repo copy — `$SITEUPDATE`
> syncs it to `/etc/nginx/conf.d/apen_support/`). Validated with a real
> `nginx -t` (VTS module loaded) = *test is successful*. **Not yet live** — takes
> effect on the next `$SITEUPDATE` (or `sudo nginx -t && systemctl reload nginx`),
> which re-runs `nginx -t` as a safety net. **After reload, validate every
> backend** (static site, /speedtest/, /api/ voltron+stats, /winget/ SNI, the
> three mirror-control panels incl. SSE). The admin dashboard's Workers /
> Resolvers / Shared Zones tabs were removed (VTS can't fill them).

VTS (vozlt, South Korea, BSD-2 — already live) can reproduce most of the mock's tables. Three config-only levers on the current nginx binary; the app
side is already wired. **Levers 1 & 2 are now in `nginx/server.conf`** — the
`$apen_zone` map + server-level `vhost_traffic_status_filter_by_set_key`, and the
`stats_backend`/`voltron_llm`/`speedtest_py` upstreams with `proxy_pass`
repointed to them.

**App side — already shipped, inert until you add the config below:**
- `site-stats.mjs` `normalizeVts()` now reads VTS **`filterZones`**: if a filter
  group named **`apen`** exists it becomes the HTTP "server zones" (per-path
  rows); otherwise it falls back to today's host-based zones. Override the group
  name with `NGINX_VTS_ZONE_FILTER_GROUP` in `.env.local` (`''` = always host
  zones).
- `HTTP_ZONE_ANNOTATIONS` (`lib/data/nginx-stats.ts`) maps the filter keys
  `main`/`speedtest`/`api`/`winget`/`mirrors` → the mock's name + sub-line.

### Lever 1 — per-path HTTP zones via VTS filters (matches the mock's Zones tab)
Add a `filter_by_set_key <key> apen` to the server block (catch-all `main`) and
override it per location. A location's own `filter_by_set_key` **replaces** the
inherited one (VTS doesn't merge them), so each request lands in exactly one
bucket — verify with the JSON after reload.
```nginx
# main server { listen 443 ssl; server_name apensupport2.blcse.mil; … }
vhost_traffic_status_filter_by_set_key main apen;                 # → "main"

location /speedtest/          { vhost_traffic_status_filter_by_set_key speedtest apen; … }
location = /speedtest/api/download { vhost_traffic_status_filter_by_set_key speedtest apen; … }
location = /speedtest/api/upload   { vhost_traffic_status_filter_by_set_key speedtest apen; … }
location ^~ /api/             { vhost_traffic_status_filter_by_set_key api    apen; … }  # incl. voltron+stats
location ^~ /winget/          { vhost_traffic_status_filter_by_set_key winget apen; … }
location /cran-control/       { vhost_traffic_status_filter_by_set_key mirrors apen; … }
location /pip-control/        { vhost_traffic_status_filter_by_set_key mirrors apen; … }
location /iso-control/        { vhost_traffic_status_filter_by_set_key mirrors apen; … }
```
The keys MUST equal the `HTTP_ZONE_ANNOTATIONS` keys. After reload, confirm
`curl -s http://127.0.0.1/status/format/json | jq '.filterZones.apen'` shows the
five buckets.

### Lever 2 — named upstreams (matches the mock's grouped Upstreams tab)
Replace bare `proxy_pass http://127.0.0.1:8788;` targets with named `upstream{}`
groups (VTS then shows them by name instead of one `direct proxy_pass` group).
No `zone` directive required on VTS.
```nginx
upstream stats_backend { server 127.0.0.1:8788; }
upstream voltron_llm   { server 127.0.0.1:8787; }
upstream speedtest_py  { server 127.0.0.1:8085; }
upstream mirror_ctl    { server 127.0.0.1:8080; server 127.0.0.1:8081; server 127.0.0.1:8082; }
#   e.g. /api/voltron-chat  → proxy_pass http://voltron_llm/api/voltron-chat;
#        the other /api/*    → proxy_pass http://stats_backend/…;
#        /speedtest/*        → proxy_pass http://speedtest_py/…;
#        /cran|pip|iso-control → proxy_pass http://mirror_ctl/… (or keep discrete)
```

### Lever 3 — caches (Caches tab)
Any `proxy_cache` zone shows automatically (VTS `cacheZones`). We run
`proxy_cache off` today, so this stays empty unless caching is introduced.

### What VTS still can't do (leave as honest-empty tabs)
Per-**worker** breakdown, **resolver** query stats, and `limit_req`/`limit_conn`
**shared-zone** usage — VTS doesn’t expose these. Not worth chasing for three
minor tabs.

> Every directive above is valid on the current open-source nginx + VTS, so
> `nginx -t` passes. Still a change-controlled edit: it rewrites `proxy_pass`
> targets and adds filters across every location — schedule it, validate each
> backend (speedtest, voltron+stats, winget SNI, the three mirror panels incl.
> their SSE long-poll), and keep the pre-change `server.conf` for rollback.

---

## Admin-managed Zones & Upstreams (the `/admin#nginx` editor)

Sysadmins can add NEW proxied paths from **/admin#nginx → "Manage Zones &
Upstreams"** without hand-editing config. Each entry (key, path, label,
description, backends) becomes a live VTS **zone** + a named **upstream** on the
dashboard. **Publish & Reload NGINX** mirrors the content "Publish & Rebuild".

**How it works (no source deploy needed):**
- The registry is `proxy/nginx-managed.json`. On Publish, `proxy/nginx-managed.mjs`
  renders two fragments into the nginx conf dir:
  `managed-http.conf` (the `upstream{}` blocks) and `managed-loc.conf` (the
  `location{}` blocks, each with a `vhost_traffic_status_filter_by_set_key`).
- `server.conf` pulls them in via **wildcard** includes
  (`include …/managed-http*.conf;` at http context, `…/managed-loc*.conf;` inside
  the 443 server) — absent file = no-op, so the base config is always valid.
- The stats proxy runs as **dod_admin, which owns the conf dir**, so it writes
  the fragments with **no root**. Input is strictly validated (key = slug, path =
  URL-safe prefix not overlapping a core location, backends = host:port) to
  prevent config injection. On an `nginx -t` rejection the fragments are reverted.

**Enable the one-click reload (privileged — one-time ops step).** The proxy can
write the config but needs a narrow sudoers grant to *reload* nginx. Until it's
added, Publish reports **"reload pending"** and the change applies on the next
`$SITEUPDATE`. To enable immediate reload, add (via `sudo visudo -f`):
```
# /etc/sudoers.d/apen-nginx-managed   (mode 0440, root:root)
dod_admin ALL=(root) NOPASSWD: /usr/sbin/nginx -t, /usr/bin/systemctl reload nginx
```
Both commands are argument-locked (only `nginx -t` and `systemctl reload nginx`,
nothing else), and dod_admin can already write these config files, so this grants
no capability it doesn't effectively have — it just lets the button apply it.
Verify the paths match this box (`command -v nginx systemctl`); override in
`.env.local` with `NGINX_BIN` / `SYSTEMCTL_BIN` if they differ. Set
`NGINX_MANAGED_RELOAD=0` to disable the reload attempt entirely (write-only).

> ⚠️ These managed entries add real reverse-proxy routes. `nginx -t` gates every
> apply (and `$SITEUPDATE` re-checks), so a bad entry can't take the site down —
> but a live backend that's down will 502 for that path. Validate the backend
> before publishing.

---

## Option B — interim `stub_status` (summary only, no tables)

Gets the **connection summary** live today with zero binary change. Add to the
port-80 server:
```nginx
location = /nginx_status { stub_status; allow 127.0.0.1; deny all; access_log off; }
```
`sudo nginx -t && sudo systemctl reload nginx`. The default
`NGINX_STUB_STATUS_URL=http://127.0.0.1/nginx_status` already matches; the UI
shows the summary and an honest "install VTS for the tables" banner.

---

## Final wiring (all options)

```bash
# 1) (only if you changed any NGINX_*_URL) edit .env.local, then:
pm2 restart apen-stats-api && pm2 save

# 2) Verify the normalized payload (loopback; token shown for completeness —
#    allowlisted IPs get it injected by nginx automatically):
curl -s -H "x-admin-token: $ADMIN_API_TOKEN" http://127.0.0.1:8788/api/admin/nginx-stats \
  | head -c 400        # expect {"available":true,"source":"vts",...}

# 3) Rebuild the static site so the new admin UI ships (NO npm install — no new
#    deps were added; node_modules is root-owned and install would EACCES):
npm run build
# ...or use the admin Console → Edit pages & cards → Publish button.
```

Then load `/admin/`, open **NGINX status**, and confirm live tables.

### Tunables (`.env.local`, all optional)
```
NGINX_VTS_JSON_URL=http://127.0.0.1/status/format/json
NGINX_STUB_STATUS_URL=http://127.0.0.1/nginx_status
NGINX_STATUS_CACHE_MS=4000       # backend cache TTL
NGINX_STATUS_TIMEOUT_MS=2500     # per-fetch timeout
```

## Rollback
- **VTS:** remove the three config blocks (or the include), `sudo nginx -t && sudo systemctl reload nginx`. The module `.so` can stay; without the directives it's inert. The admin tab reverts to "not detected" — no app change needed.
- The frontend/backend code is safe to leave in place in all cases — it degrades to the honest "not detected" state when no status endpoint answers.

## Maintenance note
A dynamic VTS module must be **rebuilt after every nginx upgrade** (the version
must match). Pin nginx or add this rebuild to your nginx-upgrade procedure.
