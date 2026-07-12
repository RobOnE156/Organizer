#!/usr/bin/env bash
# Run the RLS pgTAP suite against a throwaway database.
# Local:  sudo -u postgres bash tests/rls/run.sh
# CI:     provide a superuser connection via standard PG* env vars.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DB="${RLS_TEST_DB:-benni_rls_test}"

echo "==> (re)creating database $DB"
dropdb --if-exists "$DB"
createdb "$DB"

echo "==> installing pgTAP (test dependency only)"
psql -v ON_ERROR_STOP=1 -q -d "$DB" -c "create extension if not exists pgtap;"

echo "==> loading Supabase test shim (auth schema, roles)"
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$ROOT/supabase/tests/harness/00_supabase_shim.sql"

echo "==> applying migrations"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "    - $(basename "$f")"
  psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$f"
done

echo "==> running pgTAP RLS suite"
pg_prove --failures -d "$DB" "$ROOT/supabase/tests/rls_test.sql"

echo "==> dropping $DB"
dropdb "$DB"
