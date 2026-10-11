#!/bin/bash
# ROLT health check (root crontab every 5 min, installed by scripts/supabase/install-monitoring.sh).
# Mails ALERT_TO (Resend, /root/backups/rolt/.env) when a check starts failing and when all checks
# pass again; state in /root/backups/rolt/health-state. Read-only.
set -uo pipefail
DIR=/root/backups/rolt
STACK=rolt-supabase-a0xf6c
API=https://supabase.roltapp.com
SITE=https://roltapp.com
. "$DIR/.env"
ANON=$(grep -E '^ANON_KEY=' /etc/dokploy/compose/$STACK/code/.env | cut -d= -f2-)
problems=()
check_http() { # name url expected-code [header]
  local code
  code=$(curl -s -o /dev/null -m 15 -w '%{http_code}' ${4:+-H "$4"} "$2")
  [ "$code" = "$3" ] || problems+=("$1: HTTP $code (expected $3)")
}

check_http "auth" "$API/auth/v1/health" 200 "apikey: $ANON"
check_http "rest" "$API/rest/v1/rpc/rider_id_by_handle?p_handle=rolt" 200 "apikey: $ANON"
check_http "storage" "$API/storage/v1/object/public/public-assets/brand/rolt-wordmark.png" 200
check_http "functions" "$API/functions/v1/auth-link" 200
check_http "website" "$SITE/" 200
check_http "share links" "$SITE/u/rolt" 200

# Containers of the stack: running, and healthy where a healthcheck exists.
while read -r name status; do
  case "$status" in
    *unhealthy*|*Restarting*|*Exited*) problems+=("container $name: $status") ;;
  esac
done < <(docker ps -a --filter "name=$STACK" --format '{{.Names}} {{.Status}}')
docker exec "$STACK-db-1" pg_isready -U postgres -q || problems+=("database: not accepting connections")

# Certificates: at least 14 days left.
for host in supabase.roltapp.com roltapp.com; do
  end=$(echo | timeout 10 openssl s_client -servername "$host" -connect "$host:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
  if [ -z "$end" ]; then
    problems+=("tls $host: no certificate")
  else
    days=$(( ($(date -d "$end" +%s) - $(date +%s)) / 86400 ))
    [ "$days" -ge 14 ] || problems+=("tls $host: expires in $days days")
  fi
done

# Last backup: OK and younger than 26 h.
if [ -f "$DIR/last-status.txt" ]; then
  grep -q '^OK' "$DIR/last-status.txt" || problems+=("backup: $(head -c 120 "$DIR/last-status.txt")")
  age=$(( ($(date +%s) - $(stat -c %Y "$DIR/last-status.txt")) / 3600 ))
  [ "$age" -lt 26 ] || problems+=("backup: last run ${age} h ago")
else
  problems+=("backup: never ran")
fi

# Disk and database-side failures in the last hour (cron jobs, push / email calls).
disk=$(df --output=pcent / | tail -1 | tr -dc '0-9')
[ "$disk" -lt 90 ] || problems+=("disk: ${disk}% used")
read -r cron_failed net_failed < <(docker exec "$STACK-db-1" psql -U postgres -At -F ' ' -c \
  "select (select count(*) from cron.job_run_details where status = 'failed' and start_time > now() - interval '1 hour'),
          (select count(*) from net._http_response where (status_code >= 500 or error_msg is not null) and created > now() - interval '1 hour')" 2>/dev/null)
[ "${cron_failed:-0}" -eq 0 ] || problems+=("cron: $cron_failed failed job runs in the last hour")
[ "${net_failed:-0}" -lt 10 ] || problems+=("edge calls: $net_failed failed push/email calls in the last hour")

mail() {
  [ -n "${RESEND_API_KEY:-}" ] && [ -n "${ALERT_TO:-}" ] || return 0
  local body
  body=$(printf '%s' "$2" | sed 's/\\/\\\\/g; s/"/\\"/g' | awk '{printf "%s\\n", $0}')
  curl -s -m 20 -X POST https://api.resend.com/emails -H "Authorization: Bearer $RESEND_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"from\":\"ROLT Monitor <noreply@roltapp.com>\",\"to\":[\"$ALERT_TO\"],\"subject\":\"$1\",\"text\":\"$body\"}" >/dev/null || true
}

previous=$(cat "$DIR/health-state" 2>/dev/null || echo ok)
if [ ${#problems[@]} -eq 0 ]; then
  echo ok > "$DIR/health-state"
  [ "$previous" = ok ] || mail "[ROLT] All checks OK again" "All ROLT health checks pass again ($(date -u))."
else
  summary=$(printf '%s\n' "${problems[@]}")
  echo "$(date -Is) ${problems[*]}" >> "$DIR/health.log"
  # Mail when it starts failing or the set of problems changes; not every 5 minutes.
  if [ "$previous" != "$summary" ]; then
    mail "[ROLT] Health check failing" "$(date -u)
$summary"
  fi
  printf '%s' "$summary" > "$DIR/health-state"
fi
