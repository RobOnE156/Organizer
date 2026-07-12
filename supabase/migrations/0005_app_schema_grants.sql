-- =====================================================================
-- Let the API roles use the internal `app` schema.
-- The public tables use enum types defined in `app` (entries.kind,
-- media.kind, memberships.role, growth.metric, …). To insert/select those
-- values, the anon/authenticated roles need USAGE on the schema. Supabase
-- enforces this strictly (local Postgres is more permissive), so without it
-- saving an entry fails with "permission denied for schema app".
-- =====================================================================

grant usage on schema app to anon, authenticated;
grant execute on all functions in schema app to anon, authenticated;
