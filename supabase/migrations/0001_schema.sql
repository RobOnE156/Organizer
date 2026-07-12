-- =====================================================================
-- Benni-Tagebuch — core schema (v0 foundation)
-- =====================================================================
-- Design principles (see docs/architecture.md and the project plan):
--   * Multi-tenant from day 1: every row carries household_id.
--   * Append-friendly + soft-delete: nothing is ever hard-deleted by users;
--     deleted_at drives a trash/retention window.
--   * Author attribution everywhere: created_by / updated_by.
--   * Three dates on entries: event_date (timeline), created_at/updated_at
--     (audit). Media additionally keep EXIF capture time.
--   * Storage-agnostic media: a row can point at Supabase Storage OR an
--     Immich asset, so the media backend can be chosen/changed later.
-- This migration only defines structure. RLS lives in 0002_rls.sql.
-- In real Supabase the `auth` schema, auth.users and auth.uid() already
-- exist; locally they are provided by supabase/tests/harness/00_supabase_shim.sql.
-- =====================================================================

-- pgcrypto (for digest()/sha256) lives in a dedicated schema to match
-- Supabase, where it is preinstalled as extensions.*. gen_random_uuid()
-- is core Postgres (>=13) and needs no extension.
create schema if not exists extensions;
create extension if not exists "pgcrypto" with schema extensions;

-- Internal helper schema (never exposed through the API).
create schema if not exists app;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type app.member_role   as enum ('owner', 'parent', 'guardian');       -- guardian = read-only relative
create type app.entry_kind    as enum ('photo','text','voice','video','link','growth','milestone','snapshot');
create type app.media_kind    as enum ('image','video','audio');
create type app.media_store    as enum ('supabase','immich');
create type app.metric_kind   as enum ('weight','height','head');            -- WHO growth metrics
create type app.unlock_mode   as enum ('date','age');
create type app.contrib_status as enum ('pending','approved','rejected');
create type app.react_target  as enum ('entry','comment');

-- ---------------------------------------------------------------------
-- Tenancy: households, per-user profiles, memberships
-- ---------------------------------------------------------------------
create table households (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  plan         text not null default 'family',                 -- entitlement tier (monetization-ready)
  entitlements jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

-- One global profile per auth user (UI language, display name, avatar).
create table profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url   text,
  ui_language  text not null default 'en',                     -- 'en' | 'de' | 'es'
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- A user belongs to one or more households, with a per-household role + colour.
create table memberships (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         app.member_role not null default 'parent',
  color        text not null default '#c98fb0',                -- author colour (colour-blind-safe set chosen in UI)
  created_at   timestamptz not null default now(),
  unique (household_id, user_id)
);
create index on memberships (user_id);
create index on memberships (household_id);

-- ---------------------------------------------------------------------
-- Subjects: children (supports siblings from day 1)
-- ---------------------------------------------------------------------
create table children (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name         text not null,
  birth_date   date,                                           -- may be null (pre-birth entries allowed)
  sex          text,
  avatar_url   text,
  created_by   uuid not null references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index on children (household_id) where deleted_at is null;

-- ---------------------------------------------------------------------
-- Entries (the heart of the timeline)
-- ---------------------------------------------------------------------
create table entries (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  author_id    uuid not null references auth.users(id),        -- creator; only they may edit the free text
  kind         app.entry_kind not null default 'text',
  title        text,
  body         text,
  event_date   date not null default current_date,             -- drives timeline position (may pre-date birth)
  event_at     timestamptz,                                    -- optional precise time
  is_private   boolean not null default false,                 -- "only for me / for the child later"
  created_by   uuid not null references auth.users(id),
  updated_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index on entries (household_id, event_date desc) where deleted_at is null;
create index on entries (author_id);

-- An entry can belong to one or more children.
create table entry_children (
  entry_id uuid not null references entries(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  primary key (entry_id, child_id)
);
create index on entry_children (child_id);

-- Append-only revision history (author attribution + undo).
create table entry_revisions (
  id         uuid primary key default gen_random_uuid(),
  entry_id   uuid not null references entries(id) on delete cascade,
  editor_id  uuid not null references auth.users(id),
  title      text,
  body       text,
  event_date date,
  is_private boolean,
  created_at timestamptz not null default now()
);
create index on entry_revisions (entry_id, created_at desc);

-- ---------------------------------------------------------------------
-- Media (storage-agnostic: Supabase Storage OR Immich asset)
-- GPS is kept in the private archive but stripped on every outward share.
-- ---------------------------------------------------------------------
create table media (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households(id) on delete cascade,
  entry_id       uuid not null references entries(id) on delete cascade,
  author_id      uuid not null references auth.users(id),
  store          app.media_store not null default 'supabase',
  storage_key    text,                                         -- object key in a private bucket
  immich_asset_id text,                                        -- when store = 'immich'
  kind           app.media_kind not null,
  mime           text,
  width          int,
  height         int,
  duration_ms    int,
  bytes          bigint,
  checksum       text,                                         -- for dedup / integrity
  exif_taken_at  timestamptz,                                  -- EXIF DateTimeOriginal
  lat            double precision,                             -- private only, removed on share/export
  lng            double precision,
  place_name     text,
  country_code   text,
  position       int not null default 0,                       -- order within the entry
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index on media (entry_id, position) where deleted_at is null;
create index on media (household_id) where deleted_at is null;

-- ---------------------------------------------------------------------
-- Comments & reactions
-- ---------------------------------------------------------------------
create table comments (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  entry_id     uuid not null references entries(id) on delete cascade,
  author_id    uuid not null references auth.users(id),
  body         text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index on comments (entry_id, created_at) where deleted_at is null;

create table reactions (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  target_type  app.react_target not null,
  target_id    uuid not null,
  author_id    uuid not null references auth.users(id),
  emoji        text not null,
  created_at   timestamptz not null default now(),
  unique (target_type, target_id, author_id, emoji)
);

-- ---------------------------------------------------------------------
-- Growth measurements & milestones
-- ---------------------------------------------------------------------
create table growth_measurements (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  child_id     uuid not null references children(id) on delete cascade,
  measured_on  date not null default current_date,
  metric       app.metric_kind not null,
  value_num    numeric not null,
  unit         text not null,                                   -- 'kg','cm', ...
  author_id    uuid not null references auth.users(id),
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index on growth_measurements (child_id, metric, measured_on);

create table milestones (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  child_id     uuid not null references children(id) on delete cascade,
  key          text not null,                                   -- 'first_smile','first_word', ...
  title        text not null,
  achieved_on  date,
  entry_id     uuid references entries(id) on delete set null,  -- linked memory
  author_id    uuid not null references auth.users(id),
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index on milestones (child_id) where deleted_at is null;

-- ---------------------------------------------------------------------
-- Letters to the future (time capsule)
-- ---------------------------------------------------------------------
create table letters (
  id               uuid primary key default gen_random_uuid(),
  household_id     uuid not null references households(id) on delete cascade,
  child_id         uuid references children(id) on delete cascade,
  author_id        uuid not null references auth.users(id),
  title            text,
  body             text not null,
  unlock_mode      app.unlock_mode not null default 'age',
  unlock_date      date,
  unlock_age_years int,
  created_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index on letters (child_id) where deleted_at is null;

-- ---------------------------------------------------------------------
-- Guest contributions via expiring, account-less links (moderated)
-- Only the SHA-256 hash of the token is stored, never the token itself.
-- ---------------------------------------------------------------------
create table guest_invites (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  child_id     uuid references children(id) on delete set null,
  created_by   uuid not null references auth.users(id),
  token_hash   text not null unique,
  label        text,                                            -- e.g. "Oma Ingrid"
  message      text,                                            -- personal note to the guest
  language     text not null default 'en',
  expires_at   timestamptz not null,
  used_at      timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);

create table guest_contributions (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  invite_id    uuid not null references guest_invites(id) on delete cascade,
  guest_name   text not null,
  title        text,
  body         text,
  status       app.contrib_status not null default 'pending',
  reviewed_by  uuid references auth.users(id),
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index on guest_contributions (household_id, status);

-- ---------------------------------------------------------------------
-- Transparency / activity log (who did what)
-- ---------------------------------------------------------------------
create table audit_log (
  id           bigint generated always as identity primary key,
  household_id uuid not null references households(id) on delete cascade,
  actor_id     uuid references auth.users(id),
  action       text not null,                                   -- 'entry.create','entry.delete','entry.restore', ...
  target_type  text,
  target_id    uuid,
  detail       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index on audit_log (household_id, created_at desc);

-- ---------------------------------------------------------------------
-- updated_at maintenance + entry revision capture
-- ---------------------------------------------------------------------
create or replace function app.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_touch_children  before update on children  for each row execute function app.touch_updated_at();
create trigger trg_touch_entries   before update on entries   for each row execute function app.touch_updated_at();
create trigger trg_touch_comments  before update on comments  for each row execute function app.touch_updated_at();
create trigger trg_touch_profiles  before update on profiles  for each row execute function app.touch_updated_at();

-- Snapshot an entry's text state into entry_revisions whenever it changes.
-- SECURITY DEFINER so the history insert is not blocked by RLS on the row's editor.
create or replace function app.capture_entry_revision() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.title is distinct from old.title
      or new.body is distinct from old.body
      or new.event_date is distinct from old.event_date
      or new.is_private is distinct from old.is_private) then
    insert into public.entry_revisions (entry_id, editor_id, title, body, event_date, is_private)
    values (old.id, coalesce(new.updated_by, old.author_id), old.title, old.body, old.event_date, old.is_private);
  end if;
  return new;
end $$;

create trigger trg_entry_revision after update on entries
  for each row execute function app.capture_entry_revision();
