#!/bin/bash

# Ensure this matches the FEEDBACK_FILE variable in your site-stats.mjs
SOURCE_FILE="/var/www/apen_support_nextjs/proxy/feedback-history.json"
BACKUP_DIR="/var/www/apen_support_feedback-history_backups"
BACKUP_FILE="$BACKUP_DIR/feedback-history.json.bak"

mkdir -p "$BACKUP_DIR"

case "$1" in
  backup)
    if [ -f "$SOURCE_FILE" ]; then
      cp "$SOURCE_FILE" "$BACKUP_FILE"
      echo "[BACKUP] Feedback history secured to $BACKUP_FILE"
    else
      # Silent skip if no data exists yet
      echo "[BACKUP] No feedback file found. If this is a new install, this is normal."
    fi
    ;;
  restore)
    if [ -f "$BACKUP_FILE" ]; then
      cp "$BACKUP_FILE" "$SOURCE_FILE"
      echo "[RESTORE] Feedback history restored."
    fi
    ;;
esac
