#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT="${1:-/var/www/apen_support_nextjs}"
LIVE_NGINX_DIR="${2:-/etc/nginx/conf.d/apen_support}"
PACKAGE_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$PROJECT_ROOT/.apen-backups/site-hardening-$STAMP"
CREATED_MANIFEST="$BACKUP/created-files.txt"
BACKED_UP_MANIFEST="$BACKUP/backed-up-files.txt"

# These are the files delivered by the integrated hardening package. The
# overlapping Navbar and landing files are copied from this reconciled tree,
# so their route-image integrations are retained.
files=(
  INTEGRATION-MANIFEST.md
  package.json
  eslint.config.mjs
  app/layout.tsx
  app/page.tsx
  app/home/page.tsx
  app/search/SearchClient.tsx
  components/layout/Navbar.tsx
  components/common/StaticLink.tsx
  components/common/CustomPageView.tsx
  components/ui/APEN-chat-assistant.tsx
  components/landing/LegacyIntro.tsx
  components/assistant/AssistantPrivacyNotice.tsx
  components/assistant/FormattedMessage.tsx
  lib/utils/static-link.ts
  lib/assistant/types.ts
  lib/assistant/storage.ts
  lib/assistant/policy.ts
  scripts/install-hardening-upgrade.sh
  scripts/rollback-hardening-upgrade.sh
  scripts/register-test-loader.mjs
  scripts/typescript-test-loader.mjs
  scripts/verify-nginx-headers.sh
  tests/ui-behavior.test.ts
  nginx/server.conf
  nginx/security-headers.inc
)

# The hardening installer is deliberately layered on top of the newer Admin
# route-image system. It verifies these files but never replaces them.
protected_route_image_files=(
  app/admin/AdminContentEditor.tsx
  components/common/RouteImage.tsx
  components/common/RouteThemedLogo.tsx
  lib/data/admin-content.ts
  lib/data/logos.ts
  lib/data/route-images.ts
  lib/hooks/useRouteImage.ts
)

[[ -d "$PROJECT_ROOT" ]] || { echo "Project root not found: $PROJECT_ROOT" >&2; exit 1; }
[[ "$PACKAGE_ROOT" != "$(cd -- "$PROJECT_ROOT" && pwd)" ]] || {
  echo "Run this installer from a staged package outside the live project root." >&2
  exit 1
}

for relative in "${files[@]}"; do
  [[ -f "$PACKAGE_ROOT/$relative" ]] || {
    echo "Upgrade package is missing $relative" >&2
    exit 1
  }
done

for relative in "${protected_route_image_files[@]}"; do
  [[ -f "$PROJECT_ROOT/$relative" ]] || {
    echo "The current Admin route-image base is missing $relative; refusing to overwrite a partial deployment." >&2
    exit 1
  }
done

mkdir -p "$BACKUP"
: > "$CREATED_MANIFEST"
: > "$BACKED_UP_MANIFEST"

for relative in "${files[@]}"; do
  if [[ -e "$PROJECT_ROOT/$relative" ]]; then
    mkdir -p "$BACKUP/$(dirname -- "$relative")"
    cp -a -- "$PROJECT_ROOT/$relative" "$BACKUP/$relative"
    printf '%s\n' "$relative" >> "$BACKED_UP_MANIFEST"
  else
    printf '%s\n' "$relative" >> "$CREATED_MANIFEST"
  fi

  mkdir -p "$PROJECT_ROOT/$(dirname -- "$relative")"
  cp -a -- "$PACKAGE_ROOT/$relative" "$PROJECT_ROOT/$relative"
done

if [[ -e "$PROJECT_ROOT/components/common/SiteInspectionGuard.tsx" ]]; then
  mkdir -p "$BACKUP/components/common"
  cp -a -- "$PROJECT_ROOT/components/common/SiteInspectionGuard.tsx" "$BACKUP/components/common/SiteInspectionGuard.tsx"
  rm -f -- "$PROJECT_ROOT/components/common/SiteInspectionGuard.tsx"
fi

chmod +x \
  "$PROJECT_ROOT/scripts/install-hardening-upgrade.sh" \
  "$PROJECT_ROOT/scripts/rollback-hardening-upgrade.sh" \
  "$PROJECT_ROOT/scripts/verify-nginx-headers.sh"

restore_project() {
  while IFS= read -r relative; do
    [[ -n "$relative" ]] && rm -f -- "$PROJECT_ROOT/$relative"
  done < "$CREATED_MANIFEST"

  while IFS= read -r relative; do
    [[ -n "$relative" ]] || continue
    mkdir -p "$PROJECT_ROOT/$(dirname -- "$relative")"
    cp -a -- "$BACKUP/$relative" "$PROJECT_ROOT/$relative"
  done < "$BACKED_UP_MANIFEST"

  if [[ -f "$BACKUP/components/common/SiteInspectionGuard.tsx" ]]; then
    mkdir -p "$PROJECT_ROOT/components/common"
    cp -a -- "$BACKUP/components/common/SiteInspectionGuard.tsx" "$PROJECT_ROOT/components/common/SiteInspectionGuard.tsx"
  fi
}

restore_live_nginx() {
  [[ -d "$BACKUP/live-nginx" ]] || return 0

  if [[ -f "$BACKUP/live-nginx-created.txt" ]]; then
    while IFS= read -r relative; do
      [[ -n "$relative" ]] && rm -f -- "$LIVE_NGINX_DIR/$relative"
    done < "$BACKUP/live-nginx-created.txt"
  fi

  for relative in server.conf security-headers.inc admin-acl.inc blocked-hosts.inc; do
    [[ -f "$BACKUP/live-nginx/$relative" ]] && cp -a -- "$BACKUP/live-nginx/$relative" "$LIVE_NGINX_DIR/$relative"
  done
}

on_error() {
  trap - ERR
  echo "Validation failed. Restoring project files from $BACKUP" >&2
  restore_project
  restore_live_nginx
}
trap on_error ERR

cd "$PROJECT_ROOT"
npm run validate

if [[ -d "$LIVE_NGINX_DIR" && -w "$LIVE_NGINX_DIR" ]]; then
  mkdir -p "$BACKUP/live-nginx"
  : > "$BACKUP/live-nginx-created.txt"

  for relative in server.conf security-headers.inc admin-acl.inc blocked-hosts.inc; do
    if [[ -f "$LIVE_NGINX_DIR/$relative" ]]; then
      cp -a -- "$LIVE_NGINX_DIR/$relative" "$BACKUP/live-nginx/$relative"
    else
      printf '%s\n' "$relative" >> "$BACKUP/live-nginx-created.txt"
    fi
  done

  # server.conf and admin-acl.inc both include blocked-hosts.inc; copy the
  # whole set or nginx -t fails on the missing include.
  for relative in server.conf security-headers.inc admin-acl.inc blocked-hosts.inc; do
    cp -a -- "$PROJECT_ROOT/nginx/$relative" "$LIVE_NGINX_DIR/$relative"
  done
  nginx -t
else
  echo "Live nginx directory is not writable. Project nginx files were updated; copy them with sudo during deployment."
fi

trap - ERR
echo "Upgrade installed. Backup: $BACKUP"
