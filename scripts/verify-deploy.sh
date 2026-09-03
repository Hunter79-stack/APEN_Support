#!/bin/bash
# scripts/verify-deploy.sh — prove the live static export (out/) is the tree
# the last $SITEUPDATE built, byte for byte. Manifests are root-owned files
# written by customsh/siteupdate.sh into /mnt/storage/logs/apen-deploy-manifests/.
# Exit 0 = match, 1 = drift, 2 = cannot check.
# Usage: scripts/verify-deploy.sh [manifest]      (default: latest.sha256)
set -uo pipefail
MDIR=/mnt/storage/logs/apen-deploy-manifests
M=$(readlink -f "${1:-$MDIR/latest.sha256}" 2>/dev/null || true)
cd "$(dirname "$0")/.." || exit 2
[[ -n $M && -r $M ]] || { echo "no readable manifest at ${1:-$MDIR/latest.sha256} — run \$SITEUPDATE once to create one" >&2; exit 2; }
[[ -d out ]] || { echo "out/ is missing — nothing is being served from the build tree" >&2; exit 1; }
rc=0
changed=$(cd out && sha256sum -c --quiet "$M" 2>&1 | grep -v ': OK$' || true)
if [[ -n $changed ]]; then echo "MODIFIED or MISSING:"; sed 's/^/  /' <<< "$changed"; rc=1; fi
# Anything that is not a directory and not in the manifest: added files, and
# symlinks (nginx follows them; the build never produces any).
extra=$(comm -13 <(sed 's/^[0-9a-f]\{64\} [ *]//' "$M" | sort) <(cd out && find . ! -type d -printf '%P\n' | sort))
if [[ -n $extra ]]; then echo "ADDED (not produced by the build):"; sed 's/^/  /' <<< "$extra"; rc=1; fi
links=$(find out -type l -printf '%P -> %l\n')
if [[ -n $links ]]; then echo "SYMLINKS (never produced by the build):"; sed 's/^/  /' <<< "$links"; rc=1; fi
(( rc == 0 )) && echo "OK: out/ matches $M ($(wc -l < "$M") files)"
exit $rc
