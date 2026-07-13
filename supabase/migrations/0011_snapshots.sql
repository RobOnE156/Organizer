-- 0011_snapshots.sql
-- ---------------------------------------------------------------------
-- "Who is <child> right now" snapshots — a recurring little template
-- (favourite food/word, funny sayings, current obsessions …). Answers are
-- stored as JSON so the prompt set can evolve without a migration. Same
-- household-scoped, author-owned RLS as milestones; a real DELETE policy
-- avoids the soft-delete SELECT trap.
-- ---------------------------------------------------------------------

create table snapshots (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  child_id     uuid not null references children(id) on delete cascade,
  author_id    uuid not null references auth.users(id),
  taken_on     date not null default current_date,
  answers      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index on snapshots (child_id, taken_on desc) where deleted_at is null;

alter table snapshots enable row level security;
grant select, insert, update, delete on snapshots to authenticated;

create trigger trg_snapshots_touch before update on snapshots
  for each row execute function app.touch_updated_at();

create policy snapshots_select on snapshots for select to authenticated
  using (app.is_member(household_id) and deleted_at is null);
create policy snapshots_insert on snapshots for insert to authenticated
  with check (app.is_member(household_id) and author_id = auth.uid());
create policy snapshots_update on snapshots for update to authenticated
  using (app.is_member(household_id) and author_id = auth.uid())
  with check (app.is_member(household_id) and author_id = auth.uid());
create policy snapshots_delete on snapshots for delete to authenticated
  using (app.is_member(household_id) and author_id = auth.uid());
