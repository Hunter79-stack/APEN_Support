# /etc/nginx/conf.d/apen_support/blocked-hosts.inc
#
# Workstations barred from EVERY change path on this platform. Included first
# by admin-acl.inc (so no later `allow` can readmit them) and directly by the
# mirror control-panel locations in server.conf (/cran-control/, /pip-control/,
# /iso-control/). proxy/site-stats.mjs parses the `deny` lines below and
# refuses admin API calls from the same addresses; customsh/lockdown mirrors
# them into sshd (DenyUsers) and nftables (tcp 22, 8080-8082, 8085).
#
# Format is fixed: one `deny <ip>; # <HOSTNAME> (<ad-username>) <mac>` per
# line. The comment is parsed for audit attribution. MACs are recorded for the
# switch/router ACL only: this host is one router hop away and never sees them.
#
# To change: edit /var/www/apen_support_nextjs/nginx/blocked-hosts.inc, then
#   sudo /var/www/customsh/lockdown/apply-lockdown.sh
# (copies to /etc/nginx, nginx -t, reload; regenerates sshd + nftables rules).

deny 140.32.70.46; # CESCDREN15 (SAnderson.ou) B4:E9:B8:45:2F:DE
deny 140.32.70.38; # CESCDREN04 (jbridges.ou) B4:E9:B8:45:31:3D
deny 140.32.70.43; # CESCDREN02B (rshoop.ou) C8:F7:50:73:56:7C
