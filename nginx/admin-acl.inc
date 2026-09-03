# /etc/nginx/conf.d/apen_support/admin-acl.inc
#
# Workstation IP allowlist for every admin-only route. Included by each
# protected `location` block in apen_support/server.conf so the list
# lives in exactly one place. Ends with `deny all;` so the include is a
# self-contained allowlist regardless of any outer-scope ACL.
#
# To add or remove an admin workstation:
#   1. Edit /var/www/apen_support_nextjs/nginx/admin-acl.inc.
#   2. Re-deploy via $SITEUPDATE, or one-shot:
#        sudo cp /var/www/apen_support_nextjs/nginx/admin-acl.inc \
#                /etc/nginx/conf.d/apen_support/admin-acl.inc \
#          && sudo nginx -t && sudo systemctl reload nginx
#
# Pair with `error_page 403 =404 /404.html;` in the location so non-
# allowlisted clients get a 404 instead of a 403 (doesn't advertise the
# route exists).

# Barred workstations first: nothing below can readmit them.
include /etc/nginx/conf.d/apen_support/blocked-hosts.inc;

allow 140.32.70.49; # CESCDREN13 (JDelong.ou)
allow 140.32.70.39; # CESCDREN01 (csones.ou)
allow 140.32.70.41; # CESCDREN14 (JWebber.ou)
allow 140.32.70.60; # CESCDREN06 (wtuck.ou)
allow 127.0.0.1;
deny all;
