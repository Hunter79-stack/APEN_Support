#!/usr/bin/env bash
# Removes the redundant apen-voltron-proxy systemd unit.
#
# Both proxies (voltron-proxy on :8787, apen-stats-api on :8788) are managed
# by PM2 under dod_admin, with boot persistence via pm2-dod_admin.service.
# The apen-voltron-proxy.service system unit duplicates the PM2 app and
# crash-loops every 5s with EADDRINUSE because PM2 already owns the port.
#
# Run as root: sudo bash proxy/remove-stray-voltron-unit.sh
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "This script must run as root (sudo)." >&2
  exit 1
fi

systemctl disable --now apen-voltron-proxy.service
rm -f /etc/systemd/system/apen-voltron-proxy.service
systemctl daemon-reload
systemctl reset-failed

echo "Stray unit removed. PM2 remains the supervisor for both proxies:"
sudo -u dod_admin PM2_HOME=/home/dod_admin/.pm2 pm2 list
