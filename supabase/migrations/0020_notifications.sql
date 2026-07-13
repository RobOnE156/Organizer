-- 0020_notifications.sql
-- ---------------------------------------------------------------------
-- In-app notifications ("Glocke"): when the OTHER parent adds a new entry,
-- comments on an entry you wrote, or reacts to an entry you wrote, a
-- notification row is created for you. Rows are created ONLY by the AFTER
-- INSERT triggers below (SECURITY DEFINER), never by clients directly — so
-- there is deliberately no INSERT policy on notifications.
--
-- notification_prefs holds a per-user opt-in matrix. Column names carry an
-- "_inapp" suffix so the e-mail / web-push channels can be added later as
-- "_email" / "_push" columns without a rename. Preferences gate creation of
-- the in-app row at trigger time; the delivery step for future channels will
-- re-check its own columns.
-- ---------------------------------------------------------------------

create type app.notification_kind as enum ('entry', 'comment', 'reaction');

create table notifications (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id     uuid not null references auth.users(id) on delete cascade,
  kind         app.notification_kind not null,
  entry_id     uuid references entries(id) on delete cascade,
  comment_id   uuid references comments(id) on delete cascade,
  emoji        text,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index on notifications (recipient_id, created_at desc);
create index on notifications (recipient_id) where read_at is null;

create table notification_prefs (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  entry_inapp    boolean not null default true,
  comment_inapp  boolean not null default true,
  reaction_inapp boolean not null default true,
  muted          boolean not null default false,
  updated_at     timestamptz not null default now()
);

alter table notifications      enable row level security;
alter table notification_prefs enable row level security;
grant select, update, delete on notifications      to authenticated;
grant select, insert, update on notification_prefs to authenticated;

-- You only ever see / touch your own notifications.
create policy notifications_select on notifications for select to authenticated
  using (recipient_id = auth.uid());
create policy notifications_update on notifications for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy notifications_delete on notifications for delete to authenticated
  using (recipient_id = auth.uid());
-- (no INSERT policy — rows are created solely by the definer triggers below)

create policy notif_prefs_select on notification_prefs for select to authenticated
  using (user_id = auth.uid());
create policy notif_prefs_insert on notification_prefs for insert to authenticated
  with check (user_id = auth.uid());
create policy notif_prefs_update on notification_prefs for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Trigger functions (definer): create notifications for the right people,
-- respecting each recipient's opt-in matrix and skipping the actor.
-- ---------------------------------------------------------------------

-- New shared entry -> notify every other household member who wants it.
-- Private ("only for me") entries never notify anyone (the co-parent can't
-- even see them under RLS).
create or replace function app.notify_on_entry() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.is_private then return new; end if;
  insert into public.notifications (household_id, recipient_id, actor_id, kind, entry_id)
  select new.household_id, m.user_id, new.author_id, 'entry', new.id
  from public.memberships m
  left join public.notification_prefs p on p.user_id = m.user_id
  where m.household_id = new.household_id
    and m.user_id <> new.author_id
    and coalesce(p.entry_inapp, true)
    and not coalesce(p.muted, false);
  return new;
end $$;

-- Comment -> notify the entry's author (unless they commented themselves).
create or replace function app.notify_on_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_author uuid; v_household uuid;
begin
  select e.author_id, e.household_id into v_author, v_household
    from public.entries e where e.id = new.entry_id;
  if v_author is null or v_author = new.author_id then return new; end if;
  -- recipient opted out?
  perform 1 from public.notification_prefs p
    where p.user_id = v_author and (not p.comment_inapp or p.muted);
  if found then return new; end if;
  insert into public.notifications (household_id, recipient_id, actor_id, kind, entry_id, comment_id)
    values (v_household, v_author, new.author_id, 'comment', new.entry_id, new.id);
  return new;
end $$;

-- Reaction on an entry -> notify the entry's author (unless it's their own).
-- Comment reactions are out of scope for now (the entry author is the target).
create or replace function app.notify_on_reaction() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_author uuid; v_household uuid;
begin
  if new.target_type <> 'entry' then return new; end if;
  select e.author_id, e.household_id into v_author, v_household
    from public.entries e where e.id = new.target_id;
  if v_author is null or v_author = new.author_id then return new; end if;
  perform 1 from public.notification_prefs p
    where p.user_id = v_author and (not p.reaction_inapp or p.muted);
  if found then return new; end if;
  insert into public.notifications (household_id, recipient_id, actor_id, kind, entry_id, emoji)
    values (v_household, v_author, new.author_id, 'reaction', new.target_id, new.emoji);
  return new;
end $$;

create trigger trg_notify_entry    after insert on entries  for each row execute function app.notify_on_entry();
create trigger trg_notify_comment  after insert on comments  for each row execute function app.notify_on_comment();
create trigger trg_notify_reaction after insert on reactions for each row execute function app.notify_on_reaction();
