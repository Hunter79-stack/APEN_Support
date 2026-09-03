#!/usr/bin/env bash
#
# VERIFY.sh — post-install checks. Run standalone any time:
#   sudo ./VERIFY.sh
# Exits non-zero if anything FAILs. WARNs do not fail the run.

set -uo pipefail

SITE_ROOT="${SITE_ROOT:-/var/www/apen_support_nextjs}"
SITE_FQDN="${SITE_FQDN:-apensupport.blcse.mil}"
RUN_USER="${RUN_USER:-$(stat -c %U "$SITE_ROOT" 2>/dev/null || echo dod_admin)}"
FAILED=0

pass() { printf '  \033[1;32mPASS\033[0m  %s\n' "$*"; }
fail() { printf '  \033[1;31mFAIL\033[0m  %s\n' "$*"; FAILED=1; }
warn() { printf '  \033[1;33mWARN\033[0m  %s\n' "$*"; }
head_() { printf '\n\033[1;36m%s\033[0m\n' "$*"; }

head_ "Files and secrets"
[[ -f "$SITE_ROOT/out/index.html" ]] && pass "static export present ($(find "$SITE_ROOT/out" -name '*.html' | wc -l) pages)" || fail "no $SITE_ROOT/out/index.html — nginx has nothing to serve"
if [[ -f "$SITE_ROOT/.env.local" ]]; then
  perms="$(stat -c %a "$SITE_ROOT/.env.local")"
  [[ "$perms" == 600 ]] && pass ".env.local perms $perms" || warn ".env.local perms are $perms; expected 600"
  # Only assignments count — a commented-out example line carrying a
  # placeholder is documentation, not an unset value.
  if grep -qE '^[A-Z0-9_]+=.*(CHANGE_ME|__SET_ON_[A-Z_]+__)' "$SITE_ROOT/.env.local"; then
    fail ".env.local still contains placeholder values:"
    grep -nE '^[A-Z0-9_]+=.*(CHANGE_ME|__SET_ON_[A-Z_]+__)' "$SITE_ROOT/.env.local" | cut -d= -f1 | sed 's/^/          /'
  else
    pass ".env.local has no placeholders left"
  fi
  grep -qE '^ADMIN_API_TOKEN=.{20,}' "$SITE_ROOT/.env.local" && pass "ADMIN_API_TOKEN is set" || fail "ADMIN_API_TOKEN missing or too short"
  grep -qE '^LDAP_REALMS=\[' "$SITE_ROOT/.env.local" && pass "LDAP_REALMS looks like a JSON array" || fail "LDAP_REALMS is empty or not a JSON array — every login will 503"
else
  fail "no $SITE_ROOT/.env.local"
fi
[[ -d "$SITE_ROOT/node_modules/ldapts" ]] && pass "ldapts present (LDAP login can work)" || fail "node_modules/ldapts missing — LDAP login returns not-configured"

head_ "No source-enclave values left behind"
# These are the live-enclave literals the bundle must never carry into another
# network. A hit means a substitution in INSTALL.sh was missed.
STALE_PATTERNS='140\.32\.7[01]\.|172\.16\.2\.19|voltron\.apen\.mil'
for f in "$SITE_ROOT/nginx/server.conf" "$SITE_ROOT/nginx/admin-acl.inc" "$SITE_ROOT/proxy/infrastructure-nodes.json" "$SITE_ROOT/.env.local"; do
  [[ -e "$f" ]] || continue
  hits="$(grep -cE "$STALE_PATTERNS" "$f" 2>/dev/null || true)"
  if [[ "${hits:-0}" -gt 0 ]]; then
    warn "$(basename "$f"): $hits reference(s) to source-enclave addresses — confirm each is intentional:"
    grep -nE "$STALE_PATTERNS" "$f" | head -5 | sed 's/^/          /'
  else
    pass "$(basename "$f"): no source-enclave addresses"
  fi
done
for f in chat-history.json admin-sessions.json general-sessions.json auth-events.json feedback-history.json content-audit.json; do
  [[ -e "$SITE_ROOT/proxy/$f" ]] && warn "proxy/$f exists — expected on a host that has been running, but it must NEVER come from a bundle"
done

head_ "Services"
# pm2 keeps a per-user daemon. Call it directly when we already ARE that user —
# `sudo -u <self>` would prompt for a password on a host without a sudoers rule.
pm2_as() { if [[ "$(id -un)" == "$RUN_USER" ]]; then pm2 "$@"; else sudo -H -u "$RUN_USER" pm2 "$@"; fi; }
for svc in apen-stats-api voltron-proxy; do
  state="$(pm2_as jlist 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const a=JSON.parse(s.slice(s.indexOf("[")));const p=a.find(x=>x.name===process.argv[1]);console.log(p?p.pm2_env.status:"missing")}catch{console.log("unknown")}})' "$svc")"
  [[ "$state" == online ]] && pass "pm2 $svc: online" || fail "pm2 $svc: $state"
done
for port in 8787 8788; do
  ss -lnt 2>/dev/null | grep -q ":$port " && pass "listening on 127.0.0.1:$port" || fail "nothing listening on $port"
done

head_ "nginx"
# nginx -t must read the TLS private key, so it only means anything as root.
# Run unprivileged it fails on a permission error that says nothing about the
# config — report that honestly instead of failing the run.
if [[ $EUID -ne 0 ]]; then
  warn "nginx -t skipped (not root) — re-run with sudo to validate the config"
elif nginx -t >/dev/null 2>&1; then
  pass "nginx -t"
else
  fail "nginx -t fails: $(nginx -t 2>&1 | tail -2 | tr '\n' ' ')"
fi
code() { curl -sk -o /dev/null -w '%{http_code}' --max-time 10 "$1" 2>/dev/null || echo 000; }
c="$(code "https://$SITE_FQDN/")"
[[ "$c" =~ ^(200|301|302|401|403)$ ]] && pass "https://$SITE_FQDN/ -> $c" || fail "https://$SITE_FQDN/ -> $c"
c="$(code "https://$SITE_FQDN/api/site-stats")"
[[ "$c" =~ ^(200|401)$ ]] && pass "nginx -> stats upstream -> $c" || fail "https://$SITE_FQDN/api/site-stats -> $c (nginx cannot reach 127.0.0.1:8788)"

head_ "Infrastructure nodes (/admin#monitor)"
# Read the same payload the dashboard reads. A node that is not green here is
# exactly what an admin would see on the monitor tab.
if ! curl -s --max-time 30 http://127.0.0.1:8788/api/site-stats \
  | node -e '
      let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{
        let j; try { j = JSON.parse(s) } catch { console.log("  FAIL  stats API returned no JSON"); process.exit(1) }
        const svc = j.services || []
        if (!svc.length) { console.log("  FAIL  stats API returned no services"); process.exit(1) }
        let bad = 0
        for (const n of svc) {
          const ok = n.status === "online"
          if (!ok) bad++
          const mark = ok ? "\x1b[1;32mPASS\x1b[0m" : "\x1b[1;31mFAIL\x1b[0m"
          console.log(`  ${mark}  ${n.id.padEnd(18)} ${String(n.status).padEnd(9)} http=${n.httpStatus ?? "-"} ${n.error ? "\n           " + n.error : ""}`)
        }
        process.exit(bad ? 1 : 0)
      })'
then FAILED=1; fi

head_ "Result"
if [[ $FAILED -eq 0 ]]; then
  printf '\033[1;32mAll checks passed.\033[0m\n'
else
  printf '\033[1;31mSome checks FAILED — see above.\033[0m\n'
fi
exit $FAILED
