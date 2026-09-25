# /etc/nginx/conf.d/apen_support/installer-download.inc
#
# Shared body of the installer-download locations in server.conf: the
# Evaluate-STIG archives, /trellix/installer/, the CUI Trellix bundle and the
# two public CUI CA files (/certs/cuica.pem, /certs/cuica.crt) that the
# bundles' install.sh curls first. Those files are fetched by the curl/wget
# commands the guides print, and a bare curl carries no session cookie — behind
# the site-wide auth_request gate those commands only ever downloaded the login
# page (200, text/html), from every workstation. The DREN tree
# (/dren/trellix/) is NOT in this set: it stays login-only by decision
# (2026-09-25); its guide tells users to download in the browser.
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
allow 172.16.2.0/26;    # CUI enclave
allow 140.32.71.0/24;   # CUI enclave
allow 140.32.70.64/26;  # CUI enclave
allow 140.32.70.128/27; # CUI enclave
deny all;

# A logged-out browser still lands on the login page (a curl from outside the
# allowed subnets gets that same 200 HTML — hence the guides' on-network note).
include /etc/nginx/conf.d/apen_support/login-redirect.inc;

root /var/www/html;
autoindex off;
try_files $uri =404;
