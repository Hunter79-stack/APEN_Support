# APEN Support site — backup & migration guide

How to stand this project up on a new server from the backup archive
(`apen_support_nextjs-backup-<date>.tar.gz`).

## What the backup contains
- All project source (`app/`, `components/`, `lib/`, `proxy/`, `nginx/`, `scripts/`, `config/`, `public/`, configs).
- **`.env.local`** — secrets (ADMIN_API_TOKEN, LDAP, EXTERNAL_URL_*). ⚠️ Sensitive.
- **`proxy/*.json`** — live runtime state (admin content overrides, custom pages,
  infrastructure nodes, feedback history, acknowledged/dismissed alerts,
  old-site manifest). These are git-ignored, so they only exist in this backup.
- `out/` — the last static build (lets the site serve immediately, pre-rebuild).

## What is intentionally excluded (regenerated on the new server)
- `node_modules/` — reinstall with `npm install`.
- `.next/` — Next build cache.
- `_unused-logos-review/` — unused review assets.
- `*.tsbuildinfo`, `speedtest/logs/`, `__pycache__/`.
- The compiled VTS nginx module (`.so`) — it is version/arch-specific and **must be
  rebuilt** on the new server (see `proxy/NGINX_VTS_RUNBOOK.md`).

## Prerequisites on the new server
- Node.js **≥ 24**, npm **≥ 11** (see `package.json` engines).
- nginx (open-source) — same major as the source if you want the VTS module.
- PM2 (`sudo npm i -g pm2`).

## Restore steps
1. **Extract** to the web root:
   ```bash
   sudo mkdir -p /var/www/apen_support_nextjs
   sudo tar -xzf apen_support_nextjs-backup-<date>.tar.gz -C /var/www
   sudo chown -R "$USER":"$USER" /var/www/apen_support_nextjs   # adjust to your run user
   cd /var/www/apen_support_nextjs
   ```
2. **Review `.env.local`** — update for the new host: `ADMIN_API_TOKEN`, LDAP_* ,
   `EXTERNAL_URL_*`, any hostnames/IPs, and the `NGINX_*_URL` status endpoints.
3. **Install + build:**
   ```bash
   npm install
   npm run build      # regenerates out/ (no new deps were added beyond package.json)
   ```
4. **Backends (PM2):**
   ```bash
   pm2 start ecosystem.config.js    # apen-stats-api :8788, voltron-proxy :8787 — sets NODE_EXTRA_CA_CERTS
   pm2 save && pm2 startup          # run the printed command to enable boot-start
   ```
5. **nginx:**
   ```bash
   sudo mkdir -p /etc/nginx/conf.d/apen_support
   sudo cp nginx/server.conf nginx/admin-acl.inc nginx/blocked-hosts.inc nginx/proxy-headers.inc \
           nginx/security-headers.inc nginx/login-redirect.inc /etc/nginx/conf.d/apen_support/
   # (same list as customsh/siteupdate.sh — server.conf includes every one of them)
   # ensure /etc/nginx/nginx.conf includes conf.d/*.conf (or add the loader.conf include)
   ./proxy/sync-nginx-admin-token.sh    # regenerates admin-token.inc from .env.local
   sudo nginx -t && sudo systemctl reload nginx
   ```
   - Update `admin-acl.inc` with the new site's admin workstation IP allowlist, and
     `server_name` / upstream targets in `server.conf` for the new host.
6. **NGINX live-status module (optional):** rebuild VTS and add the `load_module` +
   `vhost_traffic_status_zone` + the loopback `:8099` status server per
   `proxy/NGINX_VTS_RUNBOOK.md`. Until then the /admin NGINX tab shows "not detected".

## Not included (separate services this site only proxies to)
These run as their own units and must be provisioned separately, then pointed at via
`server.conf` / `.env.local`:
- Speedtest + netdiag FastAPI (`:8085`), CRAN/PIP/ISO mirror panels (`:8080–8082`),
  the WinGet REST source, and any LDAP/AD and external (Tenable/TrackIt/Voltron) endpoints.

## Security
`.env.local` and the generated `admin-token.inc` hold secrets — keep the archive
private (it is written `chmod 600`), rotate `ADMIN_API_TOKEN` if it may have been exposed.
