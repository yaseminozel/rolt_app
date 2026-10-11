#!/usr/bin/env bash
# Installs the ROLT health check on the Dokploy host (every 5 minutes, idempotent) and runs it once.
# Needs the backup install first (it shares /root/backups/rolt/.env with the alert address).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST=${ROLT_HOST:-13.140.142.248}
scp -q "$ROOT/scripts/supabase/server/healthcheck.sh" "$HOST:/root/rolt-healthcheck.sh.new"
ssh -o BatchMode=yes "$HOST" bash -s <<'REMOTE'
set -euo pipefail
DIR=/root/backups/rolt
test -f "$DIR/.env" || { echo "run scripts/supabase/install-backup.sh first"; exit 1; }
install -m 700 /root/rolt-healthcheck.sh.new "$DIR/healthcheck.sh" && rm -f /root/rolt-healthcheck.sh.new
LINE="*/5 * * * * $DIR/healthcheck.sh >/dev/null 2>&1"
( crontab -l 2>/dev/null | grep -v "$DIR/healthcheck.sh" ; echo "$LINE" ) | crontab -
"$DIR/healthcheck.sh"
echo "state: $(cat $DIR/health-state)"
crontab -l | grep rolt
REMOTE
