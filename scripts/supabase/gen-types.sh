#!/usr/bin/env bash
# Regenerates src/lib/supabase/database.types.ts from the live schema (postgres-meta on the host).
set -euo pipefail
HOST=${ROLT_HOST:-13.140.142.248}
OUT="$(cd "$(dirname "$0")/../.." && pwd)/src/lib/supabase/database.types.ts"
{
  echo '// Generated from the self-hosted database by scripts/supabase/gen-types.sh — do not edit.'
  ssh -o BatchMode=yes "$HOST" 'docker exec rolt-supabase-a0xf6c-meta-1 node -e "fetch(\"http://localhost:8080/generators/typescript?included_schemas=public\").then(r=>r.text()).then(t=>process.stdout.write(t))"'
} > "$OUT.tmp"
mv "$OUT.tmp" "$OUT"
echo "wrote $OUT"
