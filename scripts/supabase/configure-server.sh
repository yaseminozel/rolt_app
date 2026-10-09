#!/usr/bin/env bash
# Pushes ROLT's Supabase server configuration to the Dokploy host:
#   1. backs up the stack's compose file and env (decrypted) on the host
#   2. patches the compose file (auth hooks, Google / Apple, functions env) — in Dokploy's database
#      AND on disk, so a later "Deploy" in Dokploy keeps it
#   3. writes the auth / email / push keys from .env.server into the stack env (Dokploy + disk)
#   4. deploys supabase/functions/* to the edge runtime volume
#   5. stores the function URLs and the shared secret in the database (private.config)
#   6. recreates the auth and functions containers and checks /auth/v1/settings
# Re-runnable. After filling Google / Apple keys in .env.server, run it again.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST=${ROLT_HOST:-13.140.142.248}
STACK=rolt-supabase-a0xf6c
ENV_FILE="$ROOT/.env.server"
ssh_() { ssh -o BatchMode=yes "$HOST" "$@"; }

# Keys owned by this repo; everything else in the stack env stays as Dokploy has it.
KEYS=(SITE_URL ADDITIONAL_REDIRECT_URLS DISABLE_SIGNUP ENABLE_EMAIL_SIGNUP ENABLE_EMAIL_AUTOCONFIRM
  MAILER_ALLOW_UNVERIFIED_EMAIL_SIGN_INS MAILER_OTP_EXP ENABLE_ANONYMOUS_USERS ENABLE_PHONE_SIGNUP
  ENABLE_PHONE_AUTOCONFIRM SMTP_ADMIN_EMAIL SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_SENDER_NAME
  AUTH_EMAIL_HOOK_SECRET GOOGLE_ENABLED GOOGLE_CLIENT_ID GOOGLE_SECRET APPLE_ENABLED APPLE_CLIENT_ID
  APPLE_SECRET RESEND_API_KEY EMAIL_FROM EMAIL_REPLY_TO INTERNAL_HOOK_SECRET EXPO_ACCESS_TOKEN
  MAPBOX_ACCESS_TOKEN)

value_of() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- || true; }

# --- the values to set, as KEY=VALUE lines (sent over ssh, never echoed) ---
SETTINGS=$(mktemp); trap 'rm -f $SETTINGS' EXIT
for key in "${KEYS[@]}"; do printf '%s=%s\n' "$key" "$(value_of "$key")" >> "$SETTINGS"; done
INTERNAL_SECRET=$(value_of INTERNAL_HOOK_SECRET)

scp -q "$SETTINGS" "$HOST:/root/rolt-settings.env"
scp -q "$ROOT/scripts/supabase/server/patch-compose.js" "$HOST:/root/rolt-patch-compose.js"
scp -q "$ROOT/scripts/supabase/server/merge-env.js" "$HOST:/root/rolt-merge-env.js"

echo "1-3/6 backup, compose patch, env"
ssh_ bash -s -- "$STACK" <<'REMOTE'
set -euo pipefail
STACK=$1
DIR=/etc/dokploy/compose/$STACK
P=$(docker ps --format '{{.Names}}' | grep -E '^dokploy-postgres' | head -1)
D=$(docker ps --format '{{.Names}}' | grep -E '^dokploy\.1' | head -1)
docker exec $D test -f /tmp/zene-dcrypt.js || { echo "decrypt helper missing in $D"; exit 1; }
BK=/root/rolt-backup/$(date +%Y%m%d-%H%M%S); mkdir -p -m 700 $BK
cp $DIR/code/docker-compose.yml $DIR/code/.env $BK/
docker exec $P psql -U dokploy -d dokploy -Atc "select \"composeFile\" from compose where \"appName\"='$STACK'" > $BK/dokploy-compose.yml
docker exec $P psql -U dokploy -d dokploy -Atc "select env from compose where \"appName\"='$STACK'" | docker exec -i $D node /tmp/zene-dcrypt.js dec > $BK/dokploy-env.plain
chmod 600 $BK/*

# Compose: patch Dokploy's copy and the file on disk the same way.
node /root/rolt-patch-compose.js $BK/dokploy-compose.yml
node /root/rolt-patch-compose.js $DIR/code/docker-compose.yml
docker cp $BK/dokploy-compose.yml $P:/tmp/rolt-compose.yml
docker exec -i $P psql -U dokploy -d dokploy -v ON_ERROR_STOP=1 -q <<'SQL'
\set v `cat /tmp/rolt-compose.yml`
update compose set "composeFile" = :'v' where "appName" = 'rolt-supabase-a0xf6c';
SQL
docker exec $P rm -f /tmp/rolt-compose.yml

# Env: merge the repo-owned keys into Dokploy's (encrypted) env and the env file on disk.
cp $BK/dokploy-env.plain /root/rolt-env.plain && chmod 600 /root/rolt-env.plain
node /root/rolt-merge-env.js /root/rolt-env.plain /root/rolt-settings.env
node /root/rolt-merge-env.js $DIR/code/.env /root/rolt-settings.env
docker exec -i $D node /tmp/zene-dcrypt.js enc < /root/rolt-env.plain > /root/rolt-env.enc
docker cp /root/rolt-env.enc $P:/tmp/rolt-env.enc
docker exec -i $P psql -U dokploy -d dokploy -v ON_ERROR_STOP=1 -q <<'SQL'
\set v `cat /tmp/rolt-env.enc`
update compose set env = :'v' where "appName" = 'rolt-supabase-a0xf6c';
SQL
docker exec $P rm -f /tmp/rolt-env.enc
rm -f /root/rolt-env.plain /root/rolt-env.enc /root/rolt-settings.env
echo "backup in $BK"
REMOTE

echo "4/6 edge functions"
FUNCTIONS_DIR=/etc/dokploy/compose/$STACK/files/volumes/functions
for fn in "$ROOT"/supabase/functions/*/; do
  name=$(basename "$fn")
  ssh_ "mkdir -p $FUNCTIONS_DIR/$name"
  scp -q -r "$fn". "$HOST:$FUNCTIONS_DIR/$name/"
done

echo "5/6 database config"
ssh_ "docker exec -i $STACK-db-1 psql -U postgres -d postgres -X -q -v ON_ERROR_STOP=1" <<SQL
insert into private.config (key, value) values
  ('push_url', 'http://functions:9000/push'),
  ('email_url', 'http://functions:9000/email'),
  ('internal_secret', '$INTERNAL_SECRET')
on conflict (key) do update set value = excluded.value;
SQL

echo "6/6 restart auth + functions"
ssh_ "cd /etc/dokploy/compose/$STACK/code && docker compose -p $STACK up -d --no-deps auth functions >/dev/null 2>&1 && docker restart $STACK-functions-1 >/dev/null && sleep 8 && docker ps --filter name=$STACK-auth --filter name=$STACK-functions --format '{{.Names}} {{.Status}}'"
ANON=$(value_of ANON_KEY)
curl -s "https://supabase.roltapp.com/auth/v1/settings" -H "apikey: $ANON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log("external:",JSON.stringify({email:j.external.email,google:j.external.google,apple:j.external.apple}),"autoconfirm:",j.mailer_autoconfirm)})'
