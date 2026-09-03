# /etc/nginx/conf.d/apen_support/proxy-headers.inc
#
# Common proxy headers + no-store cache policy shared by every /api/*
# location that forwards to the site-stats or voltron-proxy Node services.
# Included by each `proxy_pass` location block in apen_support/server.conf
# so the boilerplate lives in exactly one place. Locations may layer extras
# on top (rate limits, longer proxy_read_timeout, x-admin-token injection,
# proxy_intercept_errors, etc.).

proxy_http_version 1.1;
proxy_set_header Host              $host;
proxy_set_header X-Real-IP         $remote_addr;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
add_header       Cache-Control     "no-store, no-cache" always;
