#!/usr/bin/env bash
# Installs the nightly ROLT backup on the Dokploy host (idempotent) and runs it once.
#   scripts/supabase/install-backup.sh [alert email]
# The alert address defaults to the one already used for backup alerts on the host
# (/root/.zene-health.env ALERT_TO); the Resend key comes from .env.server.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST=${ROLT_HOST:-13.140.142.248}
RESEND=$(grep -E '^RESEND_API_KEY=' "$ROOT/.env.server" | cut -d= -f2-)
ALERT=${1:-}
scp -q "$ROOT/scripts/supabase/server/backup.sh" "$HOST:/root/rolt-backup.sh.new"
ssh -o BatchMode=yes "$HOST" bash -s -- "$RESEND" "$ALERT" <<'REMOTE'
set -euo pipefail
RESEND=${1:-} ALERT=${2:-}
DIR=/root/backups/rolt
mkdir -p -m 700 "$DIR"
install -m 700 /root/rolt-backup.sh.new "$DIR/backup.sh" && rm -f /root/rolt-backup.sh.new
if [ -z "$ALERT" ] && [ -f /root/.zene-health.env ]; then
  ALERT=$(grep -E '^ALERT_TO=' /root/.zene-health.env | cut -d= -f2- | tr -d '"')
fi
printf 'RESEND_API_KEY=%s\nALERT_TO=%s\n' "$RESEND" "$ALERT" > "$DIR/.env" && chmod 600 "$DIR/.env"
LINE="25 3 * * * $DIR/backup.sh >> $DIR/cron.log 2>&1"
( crontab -l 2>/dev/null | grep -v "$DIR/backup.sh" ; echo "$LINE" ) | crontab -
NO_MAIL=1 "$DIR/backup.sh"
cat "$DIR/last-status.txt"
ls -la "$DIR" | grep -v "^total"
echo "alert: ${ALERT:+set}"
REMOTE
