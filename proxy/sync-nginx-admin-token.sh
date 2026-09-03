#!/usr/bin/env bash
# Regenerates /etc/nginx/conf.d/apen_support/admin-token.inc from .env.local
# so nginx can inject x-admin-token on /api/admin/* requests without the
# browser having to handle the token.
#
# Run whenever ADMIN_API_TOKEN in .env.local changes, then reload nginx.
#
# Usage:
#   bash proxy/sync-nginx-admin-token.sh
#   sudo systemctl reload nginx

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.local"
INC_DIR="/etc/nginx/conf.d/apen_support"
INC_FILE="$INC_DIR/admin-token.inc"

# Make sure the destination folder exists. siteupdate.sh creates it too;
# duplicate the mkdir here so running this script standalone still works.
mkdir -p "$INC_DIR"

if [[ ! -r "$ENV_FILE" ]]; then
  echo "error: cannot read $ENV_FILE" >&2
  exit 1
fi

token="$(awk -F= '/^ADMIN_API_TOKEN=/{ sub(/^ADMIN_API_TOKEN=/, ""); print; exit }' "$ENV_FILE")"
token="${token%$'\r'}"
token="${token#\"}"
token="${token%\"}"

if [[ -z "$token" ]]; then
  echo "error: ADMIN_API_TOKEN is missing or blank in $ENV_FILE" >&2
  exit 1
fi

if [[ "$token" == *'"'* ]]; then
  echo "error: ADMIN_API_TOKEN contains a double-quote character, which would break the nginx include syntax" >&2
  exit 1
fi

umask 037
tmp="$(mktemp)"
cat > "$tmp" <<EOF
# Auto-generated from $ENV_FILE — do not edit by hand.
# Regenerate via: $0
# Loaded once at nginx start/reload; held in memory only.
set \$admin_api_token "$token";
EOF
mv "$tmp" "$INC_FILE"
chmod 640 "$INC_FILE"

echo "Wrote $INC_FILE (perms 640)."

if command -v nginx >/dev/null 2>&1; then
  echo "Next steps:"
  echo "  sudo nginx -t            # validate"
  echo "  sudo systemctl reload nginx"
fi
