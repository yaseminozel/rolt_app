#!/bin/bash
# ROLT self-hosted Supabase nightly backup (root crontab 03:25, installed by
# scripts/supabase/install-backup.sh). Read-only against production: pg_dump / pg_dumpall / tar.
#   db-STAMP.dump        pg_dump -Fc of the postgres database (public, auth, storage, cron, vault…)
#   globals-STAMP.sql    roles — needed to restore into a fresh cluster
#   pgconfig-STAMP.tgz   /etc/postgresql-custom (pgsodium root key: without it Vault can't be read)
#   storage-STAMP.tgz    storage volume (avatars, ride / post / route photos…)
#   stack-STAMP.tgz      compose .env + docker-compose.yml + edge functions + kong.yml
# Each dump is checked with pg_restore --list; 14 days are kept; last-status.txt says how the last
# run went; a failure is mailed (Resend) to ALERT_TO from /root/backups/rolt/.env.
set -euo pipefail
umask 077
DB=rolt-supabase-a0xf6c-db-1
STACK=/etc/dokploy/compose/rolt-supabase-a0xf6c
DIR=/root/backups/rolt
LOG=$DIR/backup.log
STAMP=$(date +%Y%m%d-%H%M%S)
KEEP_DAYS=14
log() { echo "$(date -Is) $*" >> "$LOG"; }
fail() {
  log "FAILED (line $1)"
  echo "FAILED $(date -Is) line $1 (see $LOG)" > "$DIR/last-status.txt"
  [ -n "${NO_MAIL:-}" ] && exit 1
  if [ -f "$DIR/.env" ]; then
    . "$DIR/.env"
    if [ -n "${RESEND_API_KEY:-}" ] && [ -n "${ALERT_TO:-}" ]; then
      curl -s -m 20 -X POST https://api.resend.com/emails -H "Authorization: Bearer $RESEND_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"from\":\"ROLT Backup <noreply@roltapp.com>\",\"to\":[\"$ALERT_TO\"],\"subject\":\"[ROLT] BACKUP FAILED\",\"text\":\"Nightly backup failed at $(date -u) (line $1). See $LOG on $(hostname).\"}" >/dev/null || true
    fi
  fi
  exit 1
}
trap 'fail $LINENO' ERR
mkdir -p "$DIR"
log "START $STAMP"

docker exec "$DB" pg_dumpall -U supabase_admin --globals-only > "$DIR/globals-$STAMP.sql.tmp" 2>> "$LOG"
[ "$(stat -c%s "$DIR/globals-$STAMP.sql.tmp")" -gt 1024 ]
mv "$DIR/globals-$STAMP.sql.tmp" "$DIR/globals-$STAMP.sql"

docker exec "$DB" pg_dump -U supabase_admin -d postgres -Fc -Z 6 > "$DIR/db-$STAMP.dump.tmp" 2>> "$LOG"
DB_BYTES=$(stat -c%s "$DIR/db-$STAMP.dump.tmp")
[ "$DB_BYTES" -gt $((200 * 1024)) ]
mv "$DIR/db-$STAMP.dump.tmp" "$DIR/db-$STAMP.dump"
docker run --rm -v "$DIR":/out postgres:17 pg_restore --list "/out/db-$STAMP.dump" > "$DIR/list.tmp" 2>> "$LOG"
ITEMS=$(grep -c '^[0-9]' "$DIR/list.tmp" || true)
[ "$ITEMS" -gt 300 ]
# The dump must hold the live tables, not just an empty schema.
grep -q 'TABLE DATA auth users' "$DIR/list.tmp"
grep -q 'TABLE DATA public routes' "$DIR/list.tmp"
rm -f "$DIR/list.tmp"

docker exec "$DB" tar -czf - -C / etc/postgresql-custom > "$DIR/pgconfig-$STAMP.tgz" 2>> "$LOG"
tar tzf "$DIR/pgconfig-$STAMP.tgz" | grep -q 'pgsodium_root.key$'
tar -czf "$DIR/storage-$STAMP.tgz" -C "$STACK/files/volumes" storage
tar -czf "$DIR/stack-$STAMP.tgz" -C "$STACK" code/.env code/docker-compose.yml files/volumes/functions files/volumes/api/kong.yml

for pattern in 'db-*.dump' 'globals-*.sql' 'pgconfig-*.tgz' 'storage-*.tgz' 'stack-*.tgz'; do
  find "$DIR" -maxdepth 1 -name "$pattern" -mtime +$KEEP_DAYS -delete
done
log "OK db=${DB_BYTES}B items=$ITEMS"
echo "OK $(date -Is) db-$STAMP.dump ${DB_BYTES}B ${ITEMS} items" > "$DIR/last-status.txt"
