#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT="${1:-/var/www/apen_support_nextjs}"
LIVE_NGINX_DIR="${2:-/etc/nginx/conf.d/apen_support}"
BACKUP="${3:-$(find "$PROJECT_ROOT/.apen-backups" -maxdepth 1 -type d -name 'site-hardening-*' -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -1 | cut -d' ' -f2-)}"
CREATED_MANIFEST="$BACKUP/created-files.txt"
BACKED_UP_MANIFEST="$BACKUP/backed-up-files.txt"

[[ -d "$BACKUP" ]] || { echo "No hardening backup found" >&2; exit 1; }

if [[ -f "$CREATED_MANIFEST" ]]; then
  while IFS= read -r relative; do
    [[ -n "$relative" ]] && rm -f -- "$PROJECT_ROOT/$relative"
  done < "$CREATED_MANIFEST"
fi

if [[ -f "$BACKED_UP_MANIFEST" ]]; then
  while IFS= read -r relative; do
    [[ -n "$relative" ]] || continue
    mkdir -p "$PROJECT_ROOT/$(dirname -- "$relative")"
    cp -a -- "$BACKUP/$relative" "$PROJECT_ROOT/$relative"
  done < "$BACKED_UP_MANIFEST"
fi

if [[ -f "$BACKUP/components/common/SiteInspectionGuard.tsx" ]]; then
  mkdir -p "$PROJECT_ROOT/components/common"
  cp -a -- "$BACKUP/components/common/SiteInspectionGuard.tsx" "$PROJECT_ROOT/components/common/SiteInspectionGuard.tsx"
fi

if [[ -d "$BACKUP/live-nginx" ]]; then
  if [[ -w "$LIVE_NGINX_DIR" ]]; then
    if [[ -f "$BACKUP/live-nginx-created.txt" ]]; then
      while IFS= read -r relative; do
        [[ -n "$relative" ]] && rm -f -- "$LIVE_NGINX_DIR/$relative"
      done < "$BACKUP/live-nginx-created.txt"
    fi

    for relative in server.conf security-headers.inc; do
      [[ -f "$BACKUP/live-nginx/$relative" ]] && cp -a -- "$BACKUP/live-nginx/$relative" "$LIVE_NGINX_DIR/$relative"
    done
    nginx -t
  else
    echo "Live nginx directory is not writable. Restore files from $BACKUP/live-nginx with sudo." >&2
  fi
fi

cd "$PROJECT_ROOT"
npm run build

echo "Restored project from $BACKUP"
