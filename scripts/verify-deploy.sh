#!/bin/bash
# scripts/verify-deploy.sh — prove the live static export (out/) is the tree
# the last $SITEUPDATE built, byte for byte. Manifests are written by
# customsh/siteupdate.sh into /mnt/storage/logs/apen-deploy-manifests/.
# Exit 0 = match, 1 = drift, 2 = no manifest.
# Usage: scripts/verify-deploy.sh [manifest]      (default: latest.sha256)
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2
MDIR=/mnt/storage/logs/apen-deploy-manifests
M="${1:-$MDIR/latest.sha256}"
[[ -r $M ]] || { echo "no manifest at $M — run \$SITEUPDATE once to create one" >&2; exit 2; }
rc=0
changed=$(cd out && sha256sum -c --quiet "$M" 2>&1 | grep -v ': OK$' || true)
if [[ -n $changed ]]; then echo "MODIFIED or MISSING:"; sed 's/^/  /' <<< "$changed"; rc=1; fi
extra=$(comm -13 <(cut -c67- "$M" | sort) <(cd out && find . -type f -printf '%P\n' | sort))
if [[ -n $extra ]]; then echo "ADDED (not produced by the build):"; sed 's/^/  /' <<< "$extra"; rc=1; fi
(( rc == 0 )) && echo "OK: out/ matches $(readlink -f "$M") ($(wc -l < "$M") files)"
exit $rc
