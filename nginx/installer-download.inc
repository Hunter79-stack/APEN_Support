# /etc/nginx/conf.d/apen_support/installer-download.inc
#
# Shared body of the installer-download locations in server.conf: the
# Evaluate-STIG archives, /trellix/installer/, /dren/trellix/installer/ and the
# two Trellix bundles. Those files are fetched by the curl/wget commands the
# guides print, and a bare curl carries no session cookie — behind the
# site-wide auth_request gate those commands only ever downloaded the login
# page (200, text/html), from every workstation.
#
# satisfy any: access is granted by EITHER the site-wide session check
# (auth_request, inherited from the server block) OR an `allow` line below.
# With no allow lines the trees stay login-only, exactly like the rest of the
# site. Barred workstations are denied first and nothing below readmits them.
#
# To open the trees to an enclave: add `allow <subnet>;  # label` lines, then
# $SITEUPDATE — or one-shot:
#   sudo cp /var/www/apen_support_nextjs/nginx/installer-download.inc \
#           /etc/nginx/conf.d/apen_support/installer-download.inc \
#     && sudo nginx -t && sudo systemctl reload nginx
satisfy any;
include /etc/nginx/conf.d/apen_support/blocked-hosts.inc;
# allow 10.0.0.0/24;    # example: replace with the enclave subnets
deny all;

# A logged-out browser still lands on the login page (a curl from outside the
# allowed subnets gets that same 200 HTML — hence the guides' on-network note).
include /etc/nginx/conf.d/apen_support/login-redirect.inc;

root /var/www/html;
autoindex off;
try_files $uri =404;
