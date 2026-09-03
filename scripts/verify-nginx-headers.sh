#!/usr/bin/env bash
set -Eeuo pipefail
BASE_URL="${1:-https://apensupport.blcse.mil}"
paths=("/" "/home/" "/search/" "/search-index.json" "/logos/brands/VOLTRON.webp")
required=("strict-transport-security" "content-security-policy" "x-content-type-options" "x-frame-options" "referrer-policy")
failed=0
for path in "${paths[@]}"; do
  echo "=== ${BASE_URL}${path} ==="
  headers="$(curl -skI "${BASE_URL}${path}")"
  printf '%s\n' "$headers" | grep -Ei 'strict-transport|content-security|x-content-type|x-frame|referrer-policy|cache-control' || true
  lower="$(printf '%s' "$headers" | tr '[:upper:]' '[:lower:]')"
  for header in "${required[@]}"; do
    if ! grep -q "^${header}:" <<<"$lower"; then
      echo "MISSING: ${header}" >&2
      failed=1
    fi
  done
done
exit "$failed"
