-- 0024_backup_reminders.sql
-- ---------------------------------------------------------------------
-- Backup discipline (plan priority: never silently lose the archive).
--   * backups         — a log of completed backups (in-app export or an
--                       externally-made one logged by a parent), so the app
--                       can show "last backup N days ago".
--   * backup_settings — per-household reminder cadence + when the last
--                       scheduled reminder e-mail went out (updated by the
--                       cron via the service role).
-- The scheduled e-mail (Vercel Cron -> /api/backup-reminder) carries an
-- automatic JSON snapshot of the diary text and nudges a full media export.
-- ---------------------------------------------------------------------

create table backups (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  actor_id     uuid references auth.users(id),
  kind         text not null default 'export',        -- 'export' (in-app) | 'external'
  note         text,
  created_at   timestamptz not null default now()
);
create index on backups (household_id, created_at desc);

alter table backups enable row level security;
grant select, insert on backups to authenticated;
create policy backups_select on backups for select to authenticated
  using (app.is_member(household_id));
create policy backups_insert on backups for insert to authenticated
  with check (app.is_member(household_id) and (actor_id is null or actor_id = auth.uid()));

create table backup_settings (
  household_id  uuid primary key references households(id) on delete cascade,
  interval_days int not null default 30,               -- 0 = reminders off
  last_sent_at  timestamptz,
  updated_at    timestamptz not null default now()
);

alter table backup_settings enable row level security;
grant select, insert, update on backup_settings to authenticated;
create policy backup_settings_select on backup_settings for select to authenticated
  using (app.is_member(household_id));
create policy backup_settings_insert on backup_settings for insert to authenticated
  with check (app.is_member(household_id));
create policy backup_settings_update on backup_settings for update to authenticated
  using (app.is_member(household_id)) with check (app.is_member(household_id));
