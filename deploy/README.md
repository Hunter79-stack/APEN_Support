# Offline mirror bundle — build, carry, install

One tarball takes this site to an air-gapped enclave. Nothing is fetched from a
network on the far side: the static export, all source, `node_modules`, the
nginx config, both Node backends and a vendored pm2 all travel inside it.

## What crosses, what does not

| Carried | Left behind (already on the target host, same paths) |
|---|---|
| `out/` — the built static export | `/mnt/storage/repos` — 5.6T of rpm/deb/pip/cran mirrors |
| all source (`app/ components/ lib/ config/ public/ scripts/`) | `/mnt/storage/{isos,vmware,PDQ,vs2022*}` |
| `node_modules/` — so nothing needs a registry | `/var/www/html/{updates,msstore,videos,…}` package payloads |
| `proxy/` backends + admin-authored config JSON | `.env.local` — authored fresh on the far side |
| `nginx/` server.conf and every include | PII runtime JSON (chat, sessions, auth events, feedback, audit) |
| `customsh/` maintenance scripts | `.next/` build cache |
| `vendor/pm2` for a host that has none | |

Those exclusions are the point of the design, not an oversight: the package
payloads are maintained on each host by their own rsync jobs, and secrets or
user data must never ride between enclaves. `--with-legacy-payloads` adds the
78G `/var/www/html` payload trees if you do want them on the drive.

## Build (on this host)

```bash
npm run build                          # the bundler refuses a stale out/
bash scripts/make-airgap-bundle.sh     # --out /media/usb to write straight to the drive
```

It stages, runs a secret scan (a hit aborts the pack), writes `MANIFEST.txt`
and `BUNDLE-INFO.txt`, then produces `apen-airgap-<date>.tar.gz` plus a
`.sha256`. Verify that checksum on the far side before extracting.

## Transfer: rsync or WinSCP (no tarball)

`--no-tar` leaves the staged directory in place instead of packing it, for a
direct sync:

```bash
npm run build
bash scripts/make-airgap-bundle.sh --out /home/dod_admin --no-tar
```

Then either:

```bash
# rsync — preserves symlinks and permissions, so nothing needs repairing after
rsync -aH --delete --info=progress2 \
  /home/dod_admin/apen-airgap-<date>/ user@enclave-host:/opt/apen-bundle/
```

**WinSCP** — Synchronize, direction Remote, mode *Mirror files*; in Transfer
settings choose **Binary** and **Preserve timestamps**. Two caveats, both
repairable on arrival:

* It moves ~35,000 files, nearly all of them tiny `node_modules` entries. SFTP
  pays a round trip per file, so this is far slower than the 335 MB tarball —
  the tarball is still the faster crossing if you have somewhere to unpack it.
* SFTP clients commonly **flatten symlinks** (the link arrives as a copy of the
  file it pointed at) and Windows has no executable bit. Everything in
  `node_modules/.bin` is a symlink, and `npm run build` — which the admin
  Publish button spawns — resolves the toolchain through them.

So on the enclave host, **before** `INSTALL.sh`:

```bash
cd /opt/apen-bundle
bash CHECK-TRANSFER.sh        # --check to report without changing anything
```

It re-creates any flattened symlink from `SYMLINKS.txt`, restores `+x` from
`EXECBITS.txt`, and verifies every file against `SHA256SUMS` — so a truncated
or partial sync is caught there rather than as a mystery failure later. It
names the files that did not match; re-sync just those and run it again. A
clean run takes a few seconds.

`INSTALL.sh` reads the bundle directory it sits in and installs to `SITE_ROOT`,
so the bundle can live anywhere (`/opt/apen-bundle`, a mounted drive, a home
directory) — it does not have to be unpacked into the web root.

## Install (on the enclave host)

```bash
tar -xzf apen-airgap-<date>.tar.gz && cd apen-airgap-<date>   # or cd into the synced directory
bash CHECK-TRANSFER.sh            # required after a file-by-file sync; harmless after a tarball
cp enclave.env.example enclave.env && $EDITOR enclave.env
sudo ./INSTALL.sh --dry-run       # prints every action, changes nothing
sudo ./INSTALL.sh
```

`INSTALL.sh` detects whether `/var/www/apen_support_nextjs` already exists:

- **fresh** — full host prep, seeds the runtime JSON, installs the vendored pm2
  if the host has none, enables boot-start.
- **update** — backs up the current `out/`, `.env.local`, `proxy/` and the
  installed nginx config to `/var/backups/apen-support/<timestamp>/`, then swaps
  in the new build while **keeping** this enclave's `.env.local`, node list,
  content overrides and custom pages. `--reset-content` overwrites them with the
  bundle's copies instead.

It never runs `npm install`, and it refuses to start while any required value in
`enclave.env` is still `CHANGE_ME`. `VERIFY.sh` runs at the end and can be
re-run any time.

## What differs per enclave — all of it in `enclave.env`

| Setting | Why it differs |
|---|---|
| `VOLTRON_UI_URL`, `VOLTRON_API_URLS`, `VOLTRON_API_KEY` | the on-prem Voltron is at a different address here |
| `ADMIN_WORKSTATIONS` | different workstation names and IPs. The `<ip> <HOSTNAME> <user>` comment is **parsed for admin audit-log attribution** — a wrong name mislabels the audit trail, it is not decoration |
| `LDAP_REALMS` | same AD realm and same usernames, different Domain Controller addresses. Pin each DC by IP and give `servername` so TLS verifies against the DC's certificate hostname |
| `ADMIN_API_TOKEN` | leave at `GENERATE`; a fresh one is minted and synced into the nginx include. Never reuse the other enclave's |
| `NETDIAG_UPSTREAM`, `WINGET_REPO_HOST` | backend services that may live elsewhere or not exist. Blank `WINGET_REPO_HOST` drops the WinGet proxy locations and its monitor tile |
| `TLS_CERT_PATH` / `TLS_KEY_PATH` | cert filenames as they exist on this host |
| `EXTERNAL_URL_*` | destinations for the `/api/external/<key>` redirector, which keeps internal addresses out of the static bundle. Blank one out rather than pointing it at the other enclave |

`SITE_FQDN` stays `apensupport.blcse.mil` on both sides, so `server_name`, the
probe targets and every self-referencing URL need no change.

## Node and pm2

Node ≥ 24.22.1 must already be installed (`package.json` engines). It is not in
the bundle — install it from the enclave's own apt/dnf mirror, which the site
itself serves. pm2 **is** bundled (`vendor/pm2`) and installed automatically if
missing.

## Infrastructure-node probing — the one rule

Probe by FQDN, never by IP. A bare-IP target sends `Host: <ip>`, and nginx
matches that against `server_name` like any other host: on the source host
`172.16.2.19` belongs to the *netsupport* vhost, so IP-targeted probes reported
green for the wrong server and 404 for repo paths that were serving fine.
`INSTALL.sh` rewrites the node targets from `SITE_FQDN`, and `VERIFY.sh` fails
the run if any node is not green.

## Rollback

```bash
sudo -H -u dod_admin pm2 stop apen-stats-api voltron-proxy
sudo rsync -a --delete /var/backups/apen-support/<timestamp>/out/ /var/www/apen_support_nextjs/out/
sudo cp -a /var/backups/apen-support/<timestamp>/nginx-conf.d/. /etc/nginx/conf.d/apen_support/
sudo nginx -t && sudo systemctl reload nginx
sudo -H -u dod_admin pm2 restart apen-stats-api voltron-proxy
```
