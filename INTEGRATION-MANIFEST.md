# APEN Support Integrated Hardening Upgrade

This repository includes the reconciled hardening package for the APEN Support Next.js site. It keeps the current Admin-managed route-image system intact while applying the Drive release's accessibility, privacy, search, testing, and nginx changes.

## Deployment guarantees

- The installer backs up every project and live nginx file it changes.
- The newer Admin route-image implementation is checked as a prerequisite and is never copied or replaced by the hardening installer.
- The reconciled `nginx/server.conf` retains the 6 MiB `/api/admin/` upload limit.
- `security-headers.inc` is installed alongside `server.conf`; nginx 1.29.3 or newer is required for `add_header_inherit merge` (the target deployment uses nginx 1.30).
- Lint, type checking, tests, image-registry validation, production build, and `nginx -t` must succeed before installation completes.

## Install

Stage this repository outside the live project directory, then run:

```bash
chmod +x scripts/*.sh
sudo ./scripts/install-hardening-upgrade.sh \
  /var/www/apen_support_nextjs \
  /etc/nginx/conf.d/apen_support
```

The installer prints the timestamped backup directory when it succeeds.

## Roll back

Pass that backup directory as the third argument:

```bash
sudo ./scripts/rollback-hardening-upgrade.sh \
  /var/www/apen_support_nextjs \
  /etc/nginx/conf.d/apen_support \
  /var/www/apen_support_nextjs/.apen-backups/site-hardening-YYYYMMDD-HHMMSS
```

If the backup argument is omitted, the rollback script selects the newest hardening backup and rebuilds the restored static export.

## Header verification

After deployment, verify security and cache headers against the live host:

```bash
./scripts/verify-nginx-headers.sh https://apensupport.blcse.mil
```
