#!/usr/bin/env bash
#
# make-airgap-bundle.sh — build the offline mirror image of this site.
#
#   bash scripts/make-airgap-bundle.sh [--out DIR] [--with-legacy-payloads] [--no-tar]
#
# Produces apen-airgap-<date>.tar.gz containing everything needed to stand the
# site up on a host with NO internet: the built static export, all source,
# node_modules (so nothing is ever fetched from a registry), the nginx config,
# the two Node backends, the maintenance scripts, a vendored pm2, and the
# INSTALL/VERIFY pair.
#
# What is deliberately NOT carried, and why:
#   /mnt/storage/**   the 6.0T package mirrors, ISOs, VMware, PDQ trees. Already
#                     established at the same paths on the target host and kept
#                     current by their own customsh rsync jobs.
#   .env.local        real credentials. INSTALL.sh authors a fresh one on the
#                     far side from enclave.env — secrets never cross.
#   PII runtime JSON  chat transcripts, sessions, auth events, feedback, audit
#                     log. Per-site history; carrying it would leak this
#                     enclave's users into the other one.
#   .next/            build cache, regenerated on demand.
#   legacy payloads   /var/www/html/{updates,msstore,...} — 78G of package
#                     payloads, same story as /mnt/storage. Pass
#                     --with-legacy-payloads to include them anyway.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${TMPDIR:-/tmp}"
WITH_LEGACY_PAYLOADS=0
MAKE_TAR=1
LEGACY_WEBROOT=/var/www/html
CUSTOMSH=/var/www/customsh

while [[ $# -gt 0 ]]; do
  case "$1" in
    --out) OUT_DIR="$2"; shift 2 ;;
    --with-legacy-payloads) WITH_LEGACY_PAYLOADS=1; shift ;;
    --no-tar) MAKE_TAR=0; shift ;;
    -h|--help) sed -n '2,30p' "${BASH_SOURCE[0]}" | sed 's/^# \?//'; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

STAMP="$(date +%Y%m%d)"
NAME="apen-airgap-$STAMP"
STAGE="$OUT_DIR/$NAME"

say() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
die() { printf '\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

# ── 1. Refuse to build from a stale export ───────────────────────────────────
say "Checking the build is current"
[[ -f "$REPO/out/index.html" ]] || die "no out/index.html — run 'npm run build' first."
newest_src="$(find "$REPO/app" "$REPO/components" "$REPO/lib" "$REPO/config" -type f \
              -newer "$REPO/out/index.html" -print -quit 2>/dev/null || true)"
if [[ -n "$newest_src" ]]; then
  die "out/ is older than $newest_src — run 'npm run build' so the bundle ships what the source says."
fi
echo "    out/ has $(find "$REPO/out" -name '*.html' | wc -l) pages, built $(date -r "$REPO/out/index.html" '+%Y-%m-%d %H:%M')"

say "Staging into $STAGE"
rm -rf "$STAGE"
mkdir -p "$STAGE/site" "$STAGE/vendor"

# ── 2. The project itself ────────────────────────────────────────────────────
# node_modules IS carried: the far side has no registry, LDAP login needs
# ldapts at runtime, and the admin Publish button shells out to `npm run build`.
rsync -a \
  --exclude '.next/' \
  --exclude '.git/' \
  --exclude 'tsconfig.tsbuildinfo' \
  --exclude '.env.local' \
  --exclude '.env.local.*' \
  --exclude 'speedtest/logs/' \
  --exclude '**/__pycache__/' \
  --exclude 'proxy/*.corrupt-*' \
  --exclude 'proxy/*.tmp-*' \
  --exclude 'proxy/chat-history.json' \
  --exclude 'proxy/admin-sessions.json' \
  --exclude 'proxy/general-sessions.json' \
  --exclude 'proxy/auth-events.json' \
  --exclude 'proxy/feedback-history.json' \
  --exclude 'proxy/content-audit.json' \
  --exclude 'proxy/dismissed-alerts.json' \
  --exclude 'proxy/acknowledged-alerts.json' \
  --exclude 'proxy/notification-outbox.json' \
  "$REPO/" "$STAGE/site/"

# ── 3. Maintenance scripts and the small legacy assets ───────────────────────
[[ -d "$CUSTOMSH" ]] && rsync -a --exclude '*.log' --exclude 'logs/' "$CUSTOMSH/" "$STAGE/customsh/"

# Server key material lives in /var/www/html/certs (voltron.key, gitlab.key,
# the .pfx bundles). Public CA certs there ARE downloadable site content and
# should travel; private keys must not. Extension filters alone are not enough
# — the purge below is content-based, so a key with any name is caught.
purge_private_keys() { # purge_private_keys <dir>
  local removed=0 f
  while IFS= read -r -d '' f; do
    rm -f "$f"; removed=$((removed + 1))
  done < <(grep -rlZ 'PRIVATE KEY' "$1" 2>/dev/null || true)
  while IFS= read -r -d '' f; do
    rm -f "$f"; removed=$((removed + 1))
  done < <(find "$1" \( -name '*.pfx' -o -name '*.p12' -o -name '*.key' \) -print0 2>/dev/null)
  echo "    dropped $removed private-key file(s) from $(basename "$1")"
}

if [[ -d "$LEGACY_WEBROOT" ]]; then
  mkdir -p "$STAGE/legacy-webroot"
  if [[ $WITH_LEGACY_PAYLOADS == 1 ]]; then
    # Still never follow the symlinks into /mnt/storage.
    rsync -a --no-links --exclude 'gitclones/' "$LEGACY_WEBROOT/" "$STAGE/legacy-webroot/"
  else
    # Site-referenced assets only. The big package payloads (updates/, msstore/)
    # are the /mnt/storage story again: already on the target host.
    for d in logos docs certs speedtest; do
      [[ -d "$LEGACY_WEBROOT/$d" ]] && rsync -a "$LEGACY_WEBROOT/$d/" "$STAGE/legacy-webroot/$d/"
    done
    find "$LEGACY_WEBROOT" -maxdepth 1 -type f -name '*.html' -exec cp {} "$STAGE/legacy-webroot/" \; 2>/dev/null || true
  fi
  purge_private_keys "$STAGE/legacy-webroot"
fi

# ── 3b. Scrub the source enclave's admin allowlist ───────────────────────────
# INSTALL.sh regenerates this file from enclave.env, so the shipped copy only
# needs to be a valid, empty-but-safe include. It must not carry the source
# enclave's workstation IPs, hostnames and AD usernames across.
cat > "$STAGE/site/nginx/admin-acl.inc" <<'ACLEOF'
# admin-acl.inc — PLACEHOLDER. Regenerated by INSTALL.sh from enclave.env.
#
# Workstation IP allowlist for every admin-only route. One `allow <ip>;` per
# admin workstation. The trailing comment is parsed by proxy/site-stats.mjs for
# admin audit-log attribution, so keep '<HOSTNAME> (<ad-username>)' accurate:
#
#   allow 10.0.0.10; # WORKSTATION01 (firstuser.ou)
#
# As shipped this allows loopback only — no workstation can reach /admin until
# enclave.env is filled in and INSTALL.sh has run.
allow 127.0.0.1;
deny all;
ACLEOF

# Same for the barred-workstation list: it names this enclave's hosts and users.
cat > "$STAGE/site/nginx/blocked-hosts.inc" <<'BLKEOF'
# blocked-hosts.inc — PLACEHOLDER (empty). Workstations barred from every
# change path, one `deny <ip>; # <HOSTNAME> (<ad-username>)` per line.
# Included first by admin-acl.inc and by the mirror control-panel locations.
# Apply with: sudo /var/www/customsh/lockdown/apply-lockdown.sh
BLKEOF

# ── 4. Vendored pm2, so a fresh host needs no npm install ────────────────────
if [[ -d /usr/lib/node_modules/pm2 ]]; then
  rsync -a /usr/lib/node_modules/pm2/ "$STAGE/vendor/pm2/"
fi

# ── 5. The installer set ─────────────────────────────────────────────────────
cp "$REPO/deploy/INSTALL.sh" "$REPO/deploy/VERIFY.sh" "$REPO/deploy/CHECK-TRANSFER.sh" \
   "$REPO/deploy/enclave.env.example" "$STAGE/"
[[ -f "$REPO/deploy/README.md" ]] && cp "$REPO/deploy/README.md" "$STAGE/"
chmod +x "$STAGE/INSTALL.sh" "$STAGE/VERIFY.sh" "$STAGE/CHECK-TRANSFER.sh"

# ── 6. Secret scan — the last gate before anything leaves this network ───────
say "Secret scan"
LEAKS=0
scan() { # scan <pattern> <description>
  local hits
  # The bundler itself is excluded: it necessarily contains every pattern below.
  hits="$(grep -rlEI "$1" "$STAGE" --exclude-dir=node_modules --exclude-dir=out \
            --exclude 'make-airgap-bundle.sh' 2>/dev/null || true)"
  if [[ -n "$hits" ]]; then
    printf '\033[1;31m    %s:\033[0m\n' "$2"
    printf '      %s\n' $hits
    LEAKS=1
  fi
}
[[ -e "$STAGE/site/.env.local" ]] && { echo "    .env.local made it into the stage"; LEAKS=1; }
scan 'sk-[A-Za-z0-9]{20,}'            'OpenAI-style API key'
scan 'ADMIN_API_TOKEN=[0-9a-f]{24,}'  'concrete admin token'
scan '"csrfToken" *: *"[0-9a-f]{16,}"' 'live session/CSRF token'
scan 'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY' 'private key'
if [[ $LEAKS == 1 ]]; then
  die "secrets found in the staged bundle (listed above). Nothing was packed. Fix, then re-run."
fi
echo "    clean"

# ── 7. Manifest ──────────────────────────────────────────────────────────────
say "Manifest"
{
  echo "APEN Support — offline mirror bundle"
  echo "built:      $(date -Is)"
  echo "built on:   $(hostname) ($(node -v), npm $(npm -v 2>/dev/null))"
  echo "git:        $(git -C "$REPO" describe --tags --always --dirty 2>/dev/null || echo 'no repository')"
  echo "commit:     $(git -C "$REPO" rev-parse HEAD 2>/dev/null || echo 'n/a')"
  echo "pages:      $(find "$STAGE/site/out" -name '*.html' | wc -l)"
  echo "legacy payloads included: $([[ $WITH_LEGACY_PAYLOADS == 1 ]] && echo yes || echo 'no (already on the target host)')"
  echo
  echo "NOT carried, expected to already exist on the target host at the same paths:"
  echo "  /mnt/storage/repos    package mirrors (rpm, deb, pip, cran)"
  echo "  /mnt/storage/isos /mnt/storage/vmware /mnt/storage/PDQ /mnt/storage/vs2022*"
  [[ $WITH_LEGACY_PAYLOADS == 0 ]] && echo "  /var/www/html/{updates,msstore,videos,dren,trellix,rstudio,evaluate-stig,ansible}"
  echo
  echo "Top-level sizes:"
  du -sh "$STAGE"/* | sed "s|$STAGE/|  |"
} > "$STAGE/BUNDLE-INFO.txt"
cat "$STAGE/BUNDLE-INFO.txt"

# Provenance: which commit this bundle is, so the far side can tie a running
# site back to a git tag. Written before MANIFEST.txt and SHA256SUMS so both cover it.
{
  git -C "$REPO" describe --tags --always --dirty 2>/dev/null || echo "no-git"
  echo "commit=$(git -C "$REPO" rev-parse HEAD 2>/dev/null || echo n/a)"
  echo "built=$(date -Is)"
  echo "host=$(hostname)"
} > "$STAGE/VERSION"

(cd "$STAGE" && find . -type f -printf '%P\n' | sort > MANIFEST.txt)
echo "    $(wc -l < "$STAGE/MANIFEST.txt") files"

# A file-by-file transfer (rsync, WinSCP) can lose two things a tarball keeps:
# symbolic links (all 28 are node_modules/.bin entries the build toolchain
# resolves through) and the executable bit. Record both so CHECK-TRANSFER.sh
# can restore them on the far side without a second crossing.
(cd "$STAGE" && find . -type l -printf '%P\t%l\n' | sort > SYMLINKS.txt)
(cd "$STAGE" && find . -type f -perm -u+x -printf '%P\n' | sort > EXECBITS.txt)
echo "    $(wc -l < "$STAGE/SYMLINKS.txt") symlinks, $(wc -l < "$STAGE/EXECBITS.txt") executable files recorded"

# Per-file checksums, so a partial or corrupted sync is caught on arrival
# rather than at 3am. Symlinks are excluded: their content is the target path.
echo "    checksumming (this takes a moment over $(wc -l < "$STAGE/MANIFEST.txt") files)..."
(cd "$STAGE" && find . -type f \
    ! -name SHA256SUMS ! -name MANIFEST.txt ! -name SYMLINKS.txt ! -name EXECBITS.txt \
    -printf '%P\0' | sort -z | xargs -0 sha256sum > SHA256SUMS)

# ── 8. Pack ──────────────────────────────────────────────────────────────────
if [[ $MAKE_TAR == 1 ]]; then
  say "Packing"
  tar -czf "$OUT_DIR/$NAME.tar.gz" -C "$OUT_DIR" "$NAME"
  sha256sum "$OUT_DIR/$NAME.tar.gz" > "$OUT_DIR/$NAME.tar.gz.sha256"
  rm -rf "$STAGE"
  echo "    $OUT_DIR/$NAME.tar.gz  ($(du -h "$OUT_DIR/$NAME.tar.gz" | cut -f1))"
  echo "    $(cat "$OUT_DIR/$NAME.tar.gz.sha256")"
  echo
  echo "On the target host:"
  echo "  tar -xzf $NAME.tar.gz && cd $NAME"
  echo "  cp enclave.env.example enclave.env && \$EDITOR enclave.env"
  echo "  sudo ./INSTALL.sh --dry-run     # review"
  echo "  sudo ./INSTALL.sh"
else
  say "Staged (not packed): $STAGE"
  echo
  echo "Sync this directory to the enclave host, then ON THAT HOST:"
  echo "  bash CHECK-TRANSFER.sh          # repairs symlinks + exec bits, verifies checksums"
  echo "  cp enclave.env.example enclave.env && \$EDITOR enclave.env"
  echo "  sudo ./INSTALL.sh --dry-run"
  echo "  sudo ./INSTALL.sh"
  echo
  echo "rsync (preserves symlinks and permissions — nothing to repair afterwards):"
  echo "  rsync -aH --delete --info=progress2 $STAGE/ user@enclave-host:/opt/apen-bundle/"
  echo
  echo "WinSCP: use Synchronize (Remote, Mirror files), and in Transfer settings"
  echo "  set Binary mode and Preserve timestamps. It transfers $(wc -l < "$STAGE/MANIFEST.txt") files —"
  echo "  most of them tiny node_modules entries — so expect it to be slow, and run"
  echo "  CHECK-TRANSFER.sh afterwards: SFTP clients commonly flatten symlinks."
fi
