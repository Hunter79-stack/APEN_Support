# Redirect a 401 from the site-wide auth_request gate (see server.conf) to
# the login page instead of a bare nginx 401. Included EXPLICITLY in
# page-serving locations only — NOT in any /api/* location, so a mid-session
# 401 from a fetch() call stays a clean, parseable 401 rather than being
# silently rewritten into an HTML login-page body.
#
# error_page does NOT inherit from a parent level into a location that
# already defines its own error_page (unlike auth_request, which is a plain
# scalar and inherits cleanly) — several locations here already have their
# own error_page for admin-acl's 403->404 rewrite, so this can't just be set
# once at server level; it has to be included in every page-serving location.
#
# $uri (decoded path only, no query string) is used for `next` — NOT
# $request_uri, which would produce a second literal `?` whenever the
# original URL already had its own query string (nginx has no URL-encoding
# primitive available here). app/login/page.tsx re-validates `next` as a
# same-origin rooted path before ever navigating to it (mirroring
# sanitizeInternalPath() in proxy/site-stats.mjs) as a defense-in-depth
# open-redirect guard, independent of this being path-only already.
error_page 401 = /login/?next=$uri;
