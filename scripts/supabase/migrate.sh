#!/usr/bin/env bash
# Applies supabase/migrations/*.sql to the self-hosted ROLT database, in order, once each.
# Runs psql as `postgres` inside the db container on the Dokploy host (so Supabase's default
# grants apply). Applied files are recorded in private.schema_migrations.
#   scripts/supabase/migrate.sh            apply pending migrations
#   scripts/supabase/migrate.sh --status   list applied / pending
set -euo pipefail
HOST=${ROLT_HOST:-13.140.142.248}
DB=${ROLT_DB_CONTAINER:-rolt-supabase-a0xf6c-db-1}
DIR="$(cd "$(dirname "$0")/../../supabase/migrations" && pwd)"
psql_remote() { ssh -o BatchMode=yes "$HOST" "docker exec -i $DB psql -U postgres -d postgres -X -q -v ON_ERROR_STOP=1 $*"; }

psql_remote -At <<'SQL'
create schema if not exists private;
create table if not exists private.schema_migrations (name text primary key, applied_at timestamptz not null default now());
SQL
applied=$(psql_remote -At -c "'select name from private.schema_migrations'")

for file in "$DIR"/*.sql; do
  name=$(basename "$file")
  if grep -qx "$name" <<<"$applied"; then
    [ "${1:-}" = --status ] && echo "applied  $name"
    continue
  fi
  if [ "${1:-}" = --status ]; then echo "pending  $name"; continue; fi
  echo "applying $name"
  { echo 'begin;'; cat "$file"; echo; echo "insert into private.schema_migrations (name) values ('$name');"; echo 'commit;'; } | psql_remote
done
