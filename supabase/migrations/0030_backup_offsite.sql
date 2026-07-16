-- 0030_backup_offsite.sql
-- ---------------------------------------------------------------------
-- Automatic off-site backup (plan priority #1: never silently lose the
-- archive). A scheduled job (Vercel Cron -> /api/backup-sync) copies media +
-- a full metadata snapshot to an S3-compatible bucket, incrementally.
--   * backup_runs    — one row per sync run (for the status UI + dead-man's
--                      switch: "last off-site backup N days ago").
--   * backup_objects — which media keys are already off-site, so each run only
--                      uploads what's new. Written by the service role only.
-- Both are written by the cron via the service role (which bypasses RLS);
-- members may read their own household's run log for the status display.
-- ---------------------------------------------------------------------

create table backup_runs (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  status        text not null default 'ok',        -- 'ok' | 'partial' | 'error'
  files_new     int not null default 0,            -- media uploaded this run
  files_total   int not null default 0,            -- media off-site in total
  bytes_new     bigint not null default 0,
  bytes_total   bigint not null default 0,
  note          text,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz
);
create index on backup_runs (household_id, finished_at desc nulls last);

alter table backup_runs enable row level security;
grant select on backup_runs to authenticated;
create policy backup_runs_select on backup_runs for select to authenticated
  using (app.is_member(household_id));
-- inserts/updates happen only via the service role, which bypasses RLS.

create table backup_objects (
  household_id  uuid not null references households(id) on delete cascade,
  storage_key   text not null,
  bytes         bigint not null default 0,
  backed_up_at  timestamptz not null default now(),
  primary key (household_id, storage_key)
);
create index on backup_objects (household_id);

-- Service-role only: RLS on with no policies for authenticated => default deny.
alter table backup_objects enable row level security;
