#!/usr/bin/env bash
#
# INSTALL.sh — stand up (or update) the APEN Support site from an offline
# bundle, on a host with no internet access.
#
#   1. Copy enclave.env.example -> enclave.env and fill it in.
#   2. sudo ./INSTALL.sh            (add --dry-run first to see the plan)
#
# Handles BOTH cases:
#   fresh   — $SITE_ROOT does not exist yet. Full host prep, seeds runtime state.
#   update  — $SITE_ROOT already has a site. Backs up the current build and the
#             admin-authored runtime JSON, swaps in the new one, keeps the
#             enclave's own .env.local, node list, overrides and custom pages
#             unless --reset-content is given.
#
# Never runs npm install: node_modules ships inside the bundle.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRY_RUN=0
RESET_CONTENT=0
SKIP_NGINX=0

for arg in "$@"; do
  case "$arg" in
    --dry-run)        DRY_RUN=1 ;;
    --reset-content)  RESET_CONTENT=1 ;;
    --skip-nginx)     SKIP_NGINX=1 ;;
    -h|--help)
      sed -n '2,20p' "${BASH_SOURCE[0]}" | sed 's/^# \?//'
      echo
      echo "Options:"
      echo "  --dry-run         print every action, change nothing"
      echo "  --reset-content   overwrite admin-authored runtime JSON with the bundle's copy"
      echo "  --skip-nginx      install files and services, leave nginx config alone"
      exit 0 ;;
    *) echo "unknown option: $arg (try --help)" >&2; exit 2 ;;
  esac
done

say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
info() { printf '    %s\n' "$*"; }
warn() { printf '\033[1;33m    WARNING: %s\033[0m\n' "$*" >&2; }
die()  { printf '\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }
run()  { if [[ $DRY_RUN == 1 ]]; then printf '    [dry-run] %s\n' "$*"; else eval "$@"; fi; }

# ── 1. Load and validate enclave.env ─────────────────────────────────────────
ENV_FILE="$HERE/enclave.env"
[[ -r "$ENV_FILE" ]] || die "no enclave.env next to INSTALL.sh. Copy enclave.env.example to enclave.env and fill it in."
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

REQUIRED=(SITE_FQDN VOLTRON_UI_URL VOLTRON_API_URLS VOLTRON_API_KEY ADMIN_WORKSTATIONS LDAP_REALMS SITE_ROOT)
missing=()
for key in "${REQUIRED[@]}"; do
  val="${!key-}"
  [[ -z "$val" || "$val" == *CHANGE_ME* ]] && missing+=("$key")
done
if (( ${#missing[@]} )); then
  printf '\033[1;31mERROR: enclave.env still has placeholder or empty values:\033[0m\n' >&2
  printf '  %s\n' "${missing[@]}" >&2
  die "fill those in, then re-run. Nothing has been changed."
fi

SITE_ROOT="${SITE_ROOT:-/var/www/apen_support_nextjs}"
SITE_ALT_FQDN="${SITE_ALT_FQDN:-$SITE_FQDN}"
NETDIAG_UPSTREAM="${NETDIAG_UPSTREAM:-127.0.0.1:8085}"
NGINX_CONF_DIR=/etc/nginx/conf.d/apen_support
# Timestamp is captured once so every backup path in this run matches.
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/var/backups/apen-support/$STAMP"

# The user PM2 must run as. pm2 keeps a per-user daemon, so starting the apps
# as root when the site has always run as dod_admin creates a SECOND daemon
# whose processes nobody can see from the usual account.
RUN_USER="${RUN_USER:-$(stat -c %U "$SITE_ROOT" 2>/dev/null || echo "${SUDO_USER:-$USER}")}"
[[ "$RUN_USER" == "root" ]] && RUN_USER="${SUDO_USER:-root}"

# ── 2. Preflight ─────────────────────────────────────────────────────────────
say "Preflight"
[[ $EUID -eq 0 ]] || die "run with sudo — this installs nginx config and system services."
[[ -d "$HERE/site" ]] || die "bundle looks incomplete: no $HERE/site directory."
if [[ -r "$HERE/SHA256SUMS" ]]; then
  (cd "$HERE" && sha256sum -c --quiet SHA256SUMS) || die "bundle integrity check FAILED: files differ from SHA256SUMS. Re-transfer, or run CHECK-TRANSFER.sh for the list."
  info "bundle integrity: all $(wc -l < "$HERE/SHA256SUMS") files match SHA256SUMS $( [[ -r "$HERE/VERSION" ]] && echo "(version $(head -1 "$HERE/VERSION"))")"
else
  warn "no SHA256SUMS in this bundle — integrity NOT verified."
fi

command -v node >/dev/null 2>&1 || die "node is not installed. Install nodejs >= 24.18 from this enclave's own apt/dnf mirror, then re-run."
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
(( NODE_MAJOR >= 24 )) || die "node $(node -v) is too old — need >= 24.18.0 (package.json engines)."
info "node $(node -v)  npm $(npm -v 2>/dev/null || echo 'not found')  as user: $RUN_USER"

command -v nginx >/dev/null 2>&1 || die "nginx is not installed."
[[ -d "$HERE/site/node_modules" ]] || warn "bundle has no node_modules — LDAP login needs ldapts, and the admin Publish button needs the full toolchain."
[[ -r "$TLS_CERT_PATH" ]] || warn "TLS cert $TLS_CERT_PATH not found on this host — nginx -t will fail until it exists."

MODE=update
[[ -d "$SITE_ROOT" ]] || MODE=fresh
info "install mode: $MODE  ->  $SITE_ROOT"
[[ $DRY_RUN == 1 ]] && info "DRY RUN — nothing will be written."

# ── 3. Back up whatever is already there ─────────────────────────────────────
if [[ "$MODE" == update ]]; then
  say "Backing up the current site to $BACKUP_DIR"
  run "mkdir -p '$BACKUP_DIR'"
  for keep in out .env.local proxy nginx; do
    [[ -e "$SITE_ROOT/$keep" ]] && run "cp -a '$SITE_ROOT/$keep' '$BACKUP_DIR/'"
  done
  [[ -d "$NGINX_CONF_DIR" ]] && run "cp -a '$NGINX_CONF_DIR' '$BACKUP_DIR/nginx-conf.d'"
  info "rollback: stop pm2, restore $BACKUP_DIR over $SITE_ROOT, reload nginx"
fi

# ── 4. Copy the payload ──────────────────────────────────────────────────────
# --delete keeps the tree honest, but every path that holds enclave state is
# protected: .env.local (secrets authored here), the admin-authored runtime
# JSON (unless --reset-content), and the pm2 logs.
say "Installing site files"
run "mkdir -p '$SITE_ROOT'"
# Not routed through run()'s eval: these patterns contain globs that must reach
# rsync literally rather than being expanded against the current directory.
RSYNC_PROTECT=(
  --exclude '.env.local'
  --exclude '.env.local.*'
  --exclude 'proxy/*.json'
  --exclude 'speedtest/logs/'
)
if [[ $DRY_RUN == 1 ]]; then
  info "[dry-run] rsync -a --delete ${RSYNC_PROTECT[*]} $HERE/site/ -> $SITE_ROOT/"
else
  rsync -a --delete "${RSYNC_PROTECT[@]}" "$HERE/site/" "$SITE_ROOT/"
fi

# Runtime JSON. The bundle ships only admin-authored CONFIG — session tokens,
# chat transcripts, feedback and audit history are stripped at bundle time, so
# there is nothing here to leak from the source enclave.
say "Runtime state"
for f in "$HERE"/site/proxy/*.json; do
  [[ -e "$f" ]] || continue
  base="$(basename "$f")"
  if [[ -e "$SITE_ROOT/proxy/$base" && $RESET_CONTENT == 0 ]]; then
    info "keeping this enclave's $base (use --reset-content to overwrite)"
  else
    run "install -o '$RUN_USER' -g '$RUN_USER' -m 0644 '$f' '$SITE_ROOT/proxy/$base'"
    info "installed $base"
  fi
done

# Legacy webroot assets (logos, docs pages, certs) — additive, never --delete:
# the enclave's own package payloads live in the same tree.
if [[ -d "$HERE/legacy-webroot" ]]; then
  say "Legacy webroot assets -> ${LEGACY_WEBROOT:=/var/www/html}"
  run "mkdir -p '$LEGACY_WEBROOT'"
  run "rsync -a '$HERE/legacy-webroot/' '$LEGACY_WEBROOT/'"
fi

if [[ -d "$HERE/customsh" ]]; then
  say "Maintenance scripts -> /var/www/customsh"
  run "mkdir -p /var/www/customsh"
  if [[ $DRY_RUN == 1 ]]; then info "[dry-run] rsync customsh -> /var/www/customsh/"
  else rsync -a --exclude '*.log' "$HERE/customsh/" /var/www/customsh/; fi
  run "chown -R '$RUN_USER':'$RUN_USER' /var/www/customsh"
fi

run "chown -R '$RUN_USER':'$RUN_USER' '$SITE_ROOT'"

# ── 5. .env.local ────────────────────────────────────────────────────────────
# Authored HERE from enclave.env — never shipped, so live credentials from the
# other enclave cannot ride along in the bundle.
say "Environment file"
ENV_LOCAL="$SITE_ROOT/.env.local"
if [[ -e "$ENV_LOCAL" && $RESET_CONTENT == 0 ]]; then
  info "keeping this enclave's existing .env.local"
  info "re-check by hand: VOLTRON_API_URLS, LDAP_REALMS, EXTERNAL_URL_*"
else
  if [[ "${ADMIN_API_TOKEN:-GENERATE}" == "GENERATE" ]]; then
    ADMIN_API_TOKEN="$(openssl rand -hex 24)"
    info "minted a fresh ADMIN_API_TOKEN"
  fi
  if [[ $DRY_RUN == 1 ]]; then
    info "[dry-run] would write $ENV_LOCAL"
  else
    umask 077
    cat > "$ENV_LOCAL" <<ENVEOF
# Generated by INSTALL.sh on $(date -Is) from enclave.env.
# Enclave-specific. Never copy this file between enclaves.

SITE_ORIGIN=https://$SITE_FQDN

VOLTRON_PROXY_HOST=127.0.0.1
VOLTRON_PROXY_PORT=8787
VOLTRON_API_URLS=$VOLTRON_API_URLS
VOLTRON_API_KEY=$VOLTRON_API_KEY
VOLTRON_MODEL=${VOLTRON_MODEL:-voltron-v3}
VOLTRON_MAX_TOKENS=${VOLTRON_MAX_TOKENS:-2000}

STATS_HOST=127.0.0.1
STATS_PORT=8788
NGINX_ACCESS_LOG=${NGINX_ACCESS_LOG:-/var/log/nginx/access.log}
STATS_CACHE_SECONDS=30
NODE_POLL_INTERVAL_MS=30000

LDAP_REALMS=$LDAP_REALMS
LDAP_TIMEOUT_MS=5000
ADMIN_SESSION_TTL_HOURS=8
SESSION_COOKIE_NAME=apen_session

ADMIN_API_TOKEN=$ADMIN_API_TOKEN
PUBLISH_BUILD=${PUBLISH_BUILD:-1}

NGINX_MANAGED_CONF_DIR=$NGINX_CONF_DIR
NGINX_VTS_JSON_URL=http://127.0.0.1:8099/status/format/json
NGINX_STUB_STATUS_URL=http://127.0.0.1:8099/stub_status

EXTERNAL_URL_CERTIFICATE_SERVICES=${EXTERNAL_URL_CERTIFICATE_SERVICES:-}
EXTERNAL_URL_TRACK_IT=${EXTERNAL_URL_TRACK_IT:-}
EXTERNAL_URL_TENABLE=${EXTERNAL_URL_TENABLE:-}
EXTERNAL_URL_VOLTRON=${EXTERNAL_URL_VOLTRON:-}
EXTERNAL_URL_WAN_SHOW=${EXTERNAL_URL_WAN_SHOW:-}
EXTERNAL_URL_QPRO=${EXTERNAL_URL_QPRO:-}
EXTERNAL_URL_HPC=${EXTERNAL_URL_HPC:-}
EXTERNAL_URL_HUB=${EXTERNAL_URL_HUB:-}
EXTERNAL_URL_CUI_PORTAL=${EXTERNAL_URL_CUI_PORTAL:-}
ENVEOF
    chown "$RUN_USER":"$RUN_USER" "$ENV_LOCAL"
    chmod 600 "$ENV_LOCAL"
    info "wrote $ENV_LOCAL (0600, owner $RUN_USER)"
  fi
fi

# ── 6. Retarget the enclave-specific values inside the shipped configs ───────
say "Retargeting configs for this enclave"

# 6a. admin workstation allowlist. The comment text is parsed by the proxy to
#     attribute admin audit entries, so hostname and username are not decoration.
ACL="$SITE_ROOT/nginx/admin-acl.inc"
if [[ $DRY_RUN == 1 ]]; then
  info "[dry-run] would regenerate $ACL from ADMIN_WORKSTATIONS"
else
  {
    echo "# $NGINX_CONF_DIR/admin-acl.inc"
    echo "# Generated by INSTALL.sh on $(date -Is) from enclave.env."
    echo "# Workstation IP allowlist for every admin-only route. The trailing"
    echo "# comment on each line is parsed for admin audit-log attribution, so"
    echo "# keep '<HOSTNAME> (<ad-username>)' accurate."
    echo
    echo "# Barred workstations first: nothing below can readmit them."
    echo "include $NGINX_CONF_DIR/blocked-hosts.inc;"
    echo
    while read -r ip host user; do
      [[ -z "${ip:-}" ]] && continue
      echo "allow $ip; # $host ($user)"
    done <<< "$(echo "$ADMIN_WORKSTATIONS" | sed '/^[[:space:]]*$/d')"
    echo "allow 127.0.0.1;"
    echo "deny all;"
  } > "$ACL"
  chown "$RUN_USER":"$RUN_USER" "$ACL"
  info "regenerated $ACL ($(grep -c '^allow' "$ACL") allow rules)"
fi

# 6b. server.conf substitutions. Each is a targeted replace, not a blanket
#     sed of the FQDN — the winget upstream is a DIFFERENT host that happens
#     to share the domain, and a blanket replace would break it.
CONF="$SITE_ROOT/nginx/server.conf"
subst() { # subst <sed-expr> <description>
  if [[ $DRY_RUN == 1 ]]; then info "[dry-run] sed: $2"; else
    before="$(md5sum "$CONF" | cut -d' ' -f1)"
    sed -i "$1" "$CONF"
    after="$(md5sum "$CONF" | cut -d' ' -f1)"
    [[ "$before" != "$after" ]] && info "$2"
  fi
}
subst "s|server_name apensupport.blcse.mil apensupport2.blcse.mil;|server_name $SITE_FQDN $SITE_ALT_FQDN;|g" "server_name -> $SITE_FQDN $SITE_ALT_FQDN"
subst "s|ssl_certificate  *[^;]*;|ssl_certificate     $TLS_CERT_PATH;|g"      "ssl_certificate -> $TLS_CERT_PATH"
subst "s|ssl_certificate_key  *[^;]*;|ssl_certificate_key $TLS_KEY_PATH;|g"   "ssl_certificate_key -> $TLS_KEY_PATH"
subst "s|http://140\.32\.71\.81:8085/netdiag/|http://$NETDIAG_UPSTREAM/netdiag/|g" "netdiag upstream -> $NETDIAG_UPSTREAM"
if [[ -n "${WINGET_REPO_HOST:-}" ]]; then
  subst "s|apenwingetrepo\.blcse\.mil|$WINGET_REPO_HOST|g" "winget repo host -> $WINGET_REPO_HOST"
fi

# 6c. infrastructure nodes — the /admin#monitor tiles. Probe by FQDN, never by
#     IP: a bare-IP target sends Host: <ip>, which nginx can match to a
#     different server block entirely and then reports on the wrong site.
NODES="$SITE_ROOT/proxy/infrastructure-nodes.json"
if [[ -e "$NODES" && $DRY_RUN == 0 ]]; then
  SITE_FQDN="$SITE_FQDN" VOLTRON_UI_URL="$VOLTRON_UI_URL" WINGET_REPO_HOST="${WINGET_REPO_HOST:-}" \
  node -e '
    const fs = require("fs")
    const p = process.argv[1]
    const nodes = JSON.parse(fs.readFileSync(p, "utf8"))
    const site = `https://${process.env.SITE_FQDN}`
    const volt = process.env.VOLTRON_UI_URL.replace(/\/+$/, "") + "/"
    const winget = process.env.WINGET_REPO_HOST
    let n = 0
    for (const node of nodes) {
      for (const field of ["target", "healthCheckUrl"]) {
        const v = node[field]
        if (typeof v !== "string" || !v) continue
        let out = v
        out = out.replace(/^https:\/\/apensupport\.blcse\.mil/, site)
        out = out.replace(/^https:\/\/voltron\.apen\.mil\/?$/, volt)
        out = out.replace(/^https:\/\/voltron\.apen\.mil\//, volt)
        if (winget) out = out.replace(/apenwingetrepo\.blcse\.mil/, winget)
        if (out !== v) { node[field] = out; n++ }
      }
    }
    // Drop the WinGet tile entirely when this enclave has no repo, rather than
    // leaving a node that is permanently red for a service that does not exist.
    const kept = winget ? nodes : nodes.filter((x) => x.id !== "winget-repo")
    fs.writeFileSync(p, JSON.stringify(kept, null, 2) + "\n")
    console.log(`    retargeted ${n} node URL(s); ${kept.length} nodes total`)
  ' "$NODES"
  chown "$RUN_USER":"$RUN_USER" "$NODES"
elif [[ $DRY_RUN == 1 ]]; then
  info "[dry-run] would retarget node URLs in $NODES"
fi

# ── 7. nginx ─────────────────────────────────────────────────────────────────
if [[ $SKIP_NGINX == 0 ]]; then
  say "nginx configuration"
  run "mkdir -p '$NGINX_CONF_DIR'"
  # This list must stay in sync with customsh/siteupdate.sh — server.conf
  # includes every one of these, so a missing file fails `nginx -t` outright.
  for inc in server.conf security-headers.inc admin-acl.inc blocked-hosts.inc proxy-headers.inc login-redirect.inc; do
    # Validate against the BUNDLE (always present, including under --dry-run);
    # copy from SITE_ROOT, which is the retargeted copy.
    [[ -e "$HERE/site/nginx/$inc" ]] || die "bundle is missing nginx/$inc — server.conf includes it and nginx -t would fail."
    run "cp '$SITE_ROOT/nginx/$inc' '$NGINX_CONF_DIR/$inc'"
  done
  run "cp '$SITE_ROOT/nginx/loader.conf' /etc/nginx/conf.d/apen_support.conf"
  run "bash '$SITE_ROOT/proxy/sync-nginx-admin-token.sh'"
  if [[ $DRY_RUN == 0 ]]; then
    if nginx -t; then
      systemctl reload nginx 2>/dev/null || systemctl start nginx
      info "nginx reloaded"
    else
      die "nginx -t failed. The previously loaded config is still serving. Fix the error above and re-run."
    fi
  fi
else
  info "--skip-nginx: left nginx config untouched"
fi

# ── 8. Services ──────────────────────────────────────────────────────────────
say "Backend services (pm2, as $RUN_USER)"
pm2_as() { sudo -H -u "$RUN_USER" pm2 "$@"; }
if ! sudo -H -u "$RUN_USER" pm2 -v >/dev/null 2>&1; then
  if [[ -d "$HERE/vendor/pm2" ]]; then
    info "pm2 not installed — installing the bundled copy (offline)"
    run "mkdir -p /usr/lib/node_modules"
    run "rsync -a '$HERE/vendor/pm2/' /usr/lib/node_modules/pm2/"
    run "ln -sf /usr/lib/node_modules/pm2/bin/pm2 /usr/bin/pm2"
  else
    die "pm2 is not installed and the bundle carries no vendor/pm2 copy."
  fi
fi

if [[ $DRY_RUN == 0 ]]; then
  cd "$SITE_ROOT"
  pm2_as delete apen-stats-api >/dev/null 2>&1 || true
  fuser -k -TERM 8788/tcp 2>/dev/null && sleep 1 || true
  pm2_as start npm --name apen-stats-api -- run stats
  pm2_as restart voltron-proxy --update-env 2>/dev/null \
    || pm2_as start proxy/voltron-proxy.mjs --name voltron-proxy
  pm2_as save
  pm2 startup systemd -u "$RUN_USER" --hp "$(getent passwd "$RUN_USER" | cut -d: -f6)" >/dev/null 2>&1 || \
    warn "could not enable pm2 boot-start automatically — run 'pm2 startup' and follow its instructions."
  sleep 4
fi

# ── 9. Verify ────────────────────────────────────────────────────────────────
if [[ $DRY_RUN == 0 && -x "$HERE/VERIFY.sh" ]]; then
  say "Verifying"
  SITE_FQDN="$SITE_FQDN" SITE_ROOT="$SITE_ROOT" RUN_USER="$RUN_USER" "$HERE/VERIFY.sh" || \
    warn "VERIFY.sh reported problems — see above. The site is installed; fix the findings before handing it over."
fi

say "Done ($MODE install)"
[[ "$MODE" == update ]] && info "backup of the previous site: $BACKUP_DIR"
info "admin dashboard: https://$SITE_FQDN/admin  (monitor tab: /admin#monitor)"
