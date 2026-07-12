-- =====================================================================
-- LOCAL/CI TEST HARNESS ONLY — do NOT run against real Supabase.
-- Recreates the tiny slice of Supabase the migrations depend on:
--   * roles anon / authenticated / service_role
--   * schema auth with users, uid(), role(), jwt()
-- Real Supabase provides all of this already, so it lives under tests/,
-- never under migrations/.
-- =====================================================================

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text
);

-- Reads the JWT claims that Supabase injects per request as a GUC.
create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$$;

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid;
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select auth.jwt() ->> 'role';
$$;

-- ---------------------------------------------------------------------
-- storage slice (test only) — mirrors the parts of Supabase Storage that
-- migration 0004 depends on: buckets, objects, and storage.foldername().
-- ---------------------------------------------------------------------
create schema if not exists storage;
grant usage on schema storage to anon, authenticated, service_role;

create table if not exists storage.buckets (
  id         text primary key,
  name       text,
  public     boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets(id),
  name       text not null,
  owner      uuid,
  created_at timestamptz default now()
);
grant select, insert, update, delete on storage.objects to authenticated;

-- Supabase-compatible: the folder segments of a path (everything but the file).
create or replace function storage.foldername(p_name text) returns text[]
language sql immutable as $$
  select case
    when array_length(string_to_array(p_name, '/'), 1) > 1
      then (string_to_array(p_name, '/'))[1 : array_length(string_to_array(p_name, '/'), 1) - 1]
    else array[]::text[]
  end;
$$;
