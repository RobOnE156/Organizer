-- 0014_highlights.sql
-- ---------------------------------------------------------------------
-- Highlights / favourites — a shared "best-of" reel curated by both
-- parents. A highlight is one row per entry (unique entry_id), so marking
-- is a toggle: insert to star, delete to unstar. Either parent may curate
-- an entry they can see; visibility is scoped through app.can_see_entry so
-- a highlighted *private* entry never leaks to the co-parent.
-- ---------------------------------------------------------------------

create table highlights (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  entry_id     uuid not null references entries(id) on delete cascade,
  created_by   uuid not null references auth.users(id),
  created_at   timestamptz not null default now(),
  unique (entry_id)
);
create index on highlights (household_id);

alter table highlights enable row level security;
grant select, insert, delete on highlights to authenticated;

-- Only highlights on entries the user may see (member + shared-or-own).
create policy highlights_select on highlights for select to authenticated
  using (app.can_see_entry(entry_id));
create policy highlights_insert on highlights for insert to authenticated
  with check (app.is_member(household_id) and created_by = auth.uid() and app.can_see_entry(entry_id));
-- Either parent may unstar a visible entry (shared curation), not just the
-- one who starred it.
create policy highlights_delete on highlights for delete to authenticated
  using (app.can_see_entry(entry_id));
