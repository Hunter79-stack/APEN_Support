#!/usr/bin/env bash
#
# CHECK-TRANSFER.sh — run this FIRST on the enclave host, in the directory the
# bundle was rsync'd / WinSCP'd into, before ./INSTALL.sh.
#
#   bash CHECK-TRANSFER.sh          # check and repair
#   bash CHECK-TRANSFER.sh --check  # report only, change nothing
#
# A tarball carries symlinks and permission bits for free. A file-by-file
# transfer may not, depending on the client and protocol:
#   * SFTP can create symlinks; SCP and most Windows clients copy the target's
#     CONTENT instead, turning a link into a regular file. Everything in
#     node_modules/.bin is a symlink, and `npm run build` — which the admin
#     Publish button spawns — resolves the toolchain through them.
#   * Windows has no executable bit, so INSTALL.sh and VERIFY.sh usually land
#     non-executable.
# This script repairs both from the lists the bundler recorded, then verifies
# every file against SHA256SUMS so a truncated transfer is caught here.

set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

CHECK_ONLY=0
[[ "${1:-}" == "--check" ]] && CHECK_ONLY=1

pass() { printf '  \033[1;32mPASS\033[0m  %s\n' "$*"; }
fail() { printf '  \033[1;31mFAIL\033[0m  %s\n' "$*"; FAILED=1; }
info() { printf '        %s\n' "$*"; }
head_() { printf '\n\033[1;36m%s\033[0m\n' "$*"; }
FAILED=0

for f in MANIFEST.txt SYMLINKS.txt EXECBITS.txt SHA256SUMS; do
  [[ -r "$f" ]] || { echo "ERROR: $f is missing — this is not a complete bundle directory." >&2; exit 1; }
done

head_ "Completeness"
missing=0
while IFS= read -r rel; do [[ -e "$rel" || -L "$rel" ]] || { missing=$((missing+1)); [[ $missing -le 10 ]] && info "missing: $rel"; }; done < MANIFEST.txt
if [[ $missing -eq 0 ]]; then pass "all $(wc -l < MANIFEST.txt) files present"
else fail "$missing file(s) from MANIFEST.txt did not arrive — re-run the sync"; fi

head_ "Symbolic links"
flat=0 fixed=0
while IFS=$'\t' read -r link target; do
  [[ -z "$link" ]] && continue
  if [[ -L "$link" ]]; then continue; fi
  flat=$((flat+1))
  if [[ $CHECK_ONLY == 0 ]]; then
    mkdir -p "$(dirname "$link")"
    rm -f "$link"
    ln -s "$target" "$link" && fixed=$((fixed+1))
  else
    info "arrived as a regular file: $link -> $target"
  fi
done < SYMLINKS.txt
if [[ $flat -eq 0 ]]; then pass "all $(wc -l < SYMLINKS.txt) symlinks survived the transfer"
elif [[ $CHECK_ONLY == 1 ]]; then fail "$flat symlink(s) were flattened — re-run without --check to repair"
else pass "repaired $fixed of $flat flattened symlink(s)"; fi

head_ "Executable bits"
noexec=0
while IFS= read -r rel; do
  [[ -f "$rel" ]] || continue
  [[ -x "$rel" ]] && continue
  noexec=$((noexec+1))
  [[ $CHECK_ONLY == 0 ]] && chmod +x "$rel"
done < EXECBITS.txt
if [[ $noexec -eq 0 ]]; then pass "executable bits intact"
elif [[ $CHECK_ONLY == 1 ]]; then fail "$noexec file(s) lost +x — re-run without --check to repair"
else pass "restored +x on $noexec file(s)"; fi

head_ "Checksums"
# Symlinks are not in SHA256SUMS, so this runs after the repair above.
if out="$(sha256sum -c --quiet SHA256SUMS 2>&1)"; then
  pass "all $(wc -l < SHA256SUMS) files match"
else
  bad="$(printf '%s\n' "$out" | grep -c 'FAILED' || true)"
  fail "$bad file(s) do not match — the transfer was corrupted or partial"
  printf '%s\n' "$out" | grep 'FAILED' | head -10 | sed 's/^/        /'
  info "re-sync those paths, then run this script again"
fi

head_ "Result"
if [[ $FAILED -eq 0 ]]; then
  printf '\033[1;32mBundle is intact. Next: cp enclave.env.example enclave.env && sudo ./INSTALL.sh --dry-run\033[0m\n'
else
  printf '\033[1;31mDo NOT run INSTALL.sh until the failures above are resolved.\033[0m\n'
fi
exit $FAILED
