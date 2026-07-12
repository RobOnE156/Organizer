-- =====================================================================
-- Row-Level Security — the security backbone
-- =====================================================================
-- Invariants proven by the pgTAP suite (supabase/tests/rls_test.sql):
--   * anonymous access is denied everywhere;
--   * a member of household A can never see or touch household B;
--   * INSERTs must target your own household as yourself (WITH CHECK);
--   * an entry's free text is editable only by its author;
--   * private entries are hidden from co-members (revealed only to the author);
--   * no hard DELETE of content — removal is a soft-delete (deleted_at).
--
-- Helper functions are SECURITY DEFINER + STABLE with an empty search_path
-- and fully-qualified names, so they read membership without recursing into
-- the policies that call them, and are not hijackable via search_path.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Membership helpers (definer: bypass RLS on memberships to avoid recursion)
-- ---------------------------------------------------------------------
create or replace function app.is_member(p_household uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.household_id = p_household and m.user_id = auth.uid()
  );
$$;

create or replace function app.is_owner(p_household uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.household_id = p_household and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

-- True if the given user shares at least one household with the caller.
create or replace function app.is_co_member(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.memberships me
    join public.memberships other using (household_id)
    where me.user_id = auth.uid() and other.user_id = p_user
  );
$$;

-- True if the caller may currently see the given entry (household + privacy).
create or replace function app.can_see_entry(p_entry uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.entries e
    where e.id = p_entry
      and e.deleted_at is null
      and app.is_member(e.household_id)
      and (not e.is_private or e.author_id = auth.uid())
  );
$$;

-- ---------------------------------------------------------------------
-- Privilege baseline: default-deny.
-- anon receives NO table privileges; authenticated gets DML, RLS gates rows.
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
-- audit_log uses an identity column; allow authenticated to use its sequence for nothing (no direct insert policy anyway).

-- Enable RLS on every table.
alter table households          enable row level security;
alter table profiles            enable row level security;
alter table memberships         enable row level security;
alter table children            enable row level security;
alter table entries             enable row level security;
alter table entry_children      enable row level security;
alter table entry_revisions     enable row level security;
alter table media               enable row level security;
alter table comments            enable row level security;
alter table reactions           enable row level security;
alter table growth_measurements enable row level security;
alter table milestones          enable row level security;
alter table letters             enable row level security;
alter table guest_invites       enable row level security;
alter table guest_contributions enable row level security;
alter table audit_log           enable row level security;

-- ---------------------------------------------------------------------
-- households
-- ---------------------------------------------------------------------
create policy households_select on households for select to authenticated
  using (app.is_member(id));
create policy households_update on households for update to authenticated
  using (app.is_owner(id)) with check (app.is_owner(id));
-- INSERT only via public.create_household() (SECURITY DEFINER) — no direct policy.

-- ---------------------------------------------------------------------
-- profiles (own profile + profiles of people you share a household with)
-- ---------------------------------------------------------------------
create policy profiles_select on profiles for select to authenticated
  using (user_id = auth.uid() or app.is_co_member(user_id));
create policy profiles_insert on profiles for insert to authenticated
  with check (user_id = auth.uid());
create policy profiles_update on profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- memberships (members can see the roster; only owners change it)
-- ---------------------------------------------------------------------
create policy memberships_select on memberships for select to authenticated
  using (app.is_member(household_id));
create policy memberships_insert on memberships for insert to authenticated
  with check (app.is_owner(household_id));
create policy memberships_update on memberships for update to authenticated
  using (app.is_owner(household_id)) with check (app.is_owner(household_id));
create policy memberships_delete on memberships for delete to authenticated
  using (app.is_owner(household_id));

-- ---------------------------------------------------------------------
-- children
-- ---------------------------------------------------------------------
create policy children_select on children for select to authenticated
  using (app.is_member(household_id) and deleted_at is null);
create policy children_insert on children for insert to authenticated
  with check (app.is_member(household_id) and created_by = auth.uid());
create policy children_update on children for update to authenticated
  using (app.is_member(household_id)) with check (app.is_member(household_id));

-- ---------------------------------------------------------------------
-- entries — private entries hidden from co-members; only author edits
-- ---------------------------------------------------------------------
create policy entries_select on entries for select to authenticated
  using (app.is_member(household_id) and deleted_at is null
         and (not is_private or author_id = auth.uid()));
create policy entries_insert on entries for insert to authenticated
  with check (app.is_member(household_id) and author_id = auth.uid() and created_by = auth.uid());
create policy entries_update on entries for update to authenticated
  using (app.is_member(household_id) and author_id = auth.uid())
  with check (app.is_member(household_id) and author_id = auth.uid());
-- no DELETE policy → hard delete denied; removal is deleted_at via UPDATE.

-- ---------------------------------------------------------------------
-- entry_children (link table — managed by the entry's author)
-- ---------------------------------------------------------------------
create policy entry_children_select on entry_children for select to authenticated
  using (app.can_see_entry(entry_id));
create policy entry_children_insert on entry_children for insert to authenticated
  with check (exists (select 1 from entries e
    where e.id = entry_id and e.author_id = auth.uid() and app.is_member(e.household_id)));
create policy entry_children_delete on entry_children for delete to authenticated
  using (exists (select 1 from entries e
    where e.id = entry_id and e.author_id = auth.uid() and app.is_member(e.household_id)));

-- ---------------------------------------------------------------------
-- entry_revisions (history; written by the definer trigger)
-- ---------------------------------------------------------------------
create policy entry_revisions_select on entry_revisions for select to authenticated
  using (app.can_see_entry(entry_id));

-- ---------------------------------------------------------------------
-- media (visibility follows the parent entry)
-- ---------------------------------------------------------------------
create policy media_select on media for select to authenticated
  using (deleted_at is null and app.can_see_entry(entry_id));
create policy media_insert on media for insert to authenticated
  with check (app.is_member(household_id) and author_id = auth.uid()
              and exists (select 1 from entries e where e.id = entry_id and e.author_id = auth.uid()));
create policy media_update on media for update to authenticated
  using (app.is_member(household_id) and author_id = auth.uid())
  with check (app.is_member(household_id) and author_id = auth.uid());

-- ---------------------------------------------------------------------
-- comments (any member may comment on a visible entry; only author edits)
-- ---------------------------------------------------------------------
create policy comments_select on comments for select to authenticated
  using (deleted_at is null and app.can_see_entry(entry_id));
create policy comments_insert on comments for insert to authenticated
  with check (app.is_member(household_id) and author_id = auth.uid() and app.can_see_entry(entry_id));
create policy comments_update on comments for update to authenticated
  using (author_id = auth.uid() and app.is_member(household_id))
  with check (author_id = auth.uid() and app.is_member(household_id));

-- ---------------------------------------------------------------------
-- reactions
-- ---------------------------------------------------------------------
create policy reactions_select on reactions for select to authenticated
  using (app.is_member(household_id));
create policy reactions_insert on reactions for insert to authenticated
  with check (app.is_member(household_id) and author_id = auth.uid());
create policy reactions_delete on reactions for delete to authenticated
  using (app.is_member(household_id) and author_id = auth.uid());

-- ---------------------------------------------------------------------
-- growth_measurements & milestones
-- ---------------------------------------------------------------------
create policy growth_select on growth_measurements for select to authenticated
  using (app.is_member(household_id) and deleted_at is null);
create policy growth_insert on growth_measurements for insert to authenticated
  with check (app.is_member(household_id) and author_id = auth.uid());
create policy growth_update on growth_measurements for update to authenticated
  using (app.is_member(household_id) and author_id = auth.uid())
  with check (app.is_member(household_id) and author_id = auth.uid());

create policy milestones_select on milestones for select to authenticated
  using (app.is_member(household_id) and deleted_at is null);
create policy milestones_insert on milestones for insert to authenticated
  with check (app.is_member(household_id) and author_id = auth.uid());
create policy milestones_update on milestones for update to authenticated
  using (app.is_member(household_id) and author_id = auth.uid())
  with check (app.is_member(household_id) and author_id = auth.uid());

-- ---------------------------------------------------------------------
-- letters (shared between parents; sealed-until-unlock enforced app-side)
-- ---------------------------------------------------------------------
create policy letters_select on letters for select to authenticated
  using (app.is_member(household_id) and deleted_at is null);
create policy letters_insert on letters for insert to authenticated
  with check (app.is_member(household_id) and author_id = auth.uid());
create policy letters_update on letters for update to authenticated
  using (app.is_member(household_id) and author_id = auth.uid())
  with check (app.is_member(household_id) and author_id = auth.uid());

-- ---------------------------------------------------------------------
-- guest invites & contributions (guests submit via a definer RPC, never
-- touching tables directly; members see/moderate within their household)
-- ---------------------------------------------------------------------
create policy guest_invites_select on guest_invites for select to authenticated
  using (app.is_member(household_id));
create policy guest_invites_insert on guest_invites for insert to authenticated
  with check (app.is_member(household_id) and created_by = auth.uid());
create policy guest_invites_update on guest_invites for update to authenticated
  using (app.is_member(household_id)) with check (app.is_member(household_id));

create policy guest_contrib_select on guest_contributions for select to authenticated
  using (app.is_member(household_id));
create policy guest_contrib_update on guest_contributions for update to authenticated
  using (app.is_member(household_id)) with check (app.is_member(household_id));

-- ---------------------------------------------------------------------
-- audit_log (readable by members; written only by definer helpers)
-- ---------------------------------------------------------------------
create policy audit_select on audit_log for select to authenticated
  using (app.is_member(household_id));

-- ---------------------------------------------------------------------
-- Sanctioned RPCs (SECURITY DEFINER)
-- ---------------------------------------------------------------------

-- Create a household and make the caller its owner, atomically.
create or replace function public.create_household(p_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  insert into public.households (name) values (coalesce(nullif(p_name,''),'Family')) returning id into v_id;
  insert into public.memberships (household_id, user_id, role) values (v_id, auth.uid(), 'owner');
  return v_id;
end $$;
revoke all on function public.create_household(text) from public, anon;
grant execute on function public.create_household(text) to authenticated;

-- Account-less guest submission: validated by the token's SHA-256 hash.
create or replace function public.submit_guest_contribution(
  p_token text, p_guest_name text, p_title text, p_body text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_invite public.guest_invites; v_id uuid;
begin
  select * into v_invite from public.guest_invites
    where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    limit 1;
  if v_invite.id is null then raise exception 'invalid invite'; end if;
  if v_invite.revoked_at is not null then raise exception 'invite revoked'; end if;
  if v_invite.expires_at < now() then raise exception 'invite expired'; end if;
  if coalesce(trim(p_guest_name),'') = '' then raise exception 'name required'; end if;

  insert into public.guest_contributions (household_id, invite_id, guest_name, title, body, status)
  values (v_invite.household_id, v_invite.id, p_guest_name, p_title, p_body, 'pending')
  returning id into v_id;
  update public.guest_invites set used_at = now() where id = v_invite.id;
  return v_id;
end $$;
revoke all on function public.submit_guest_contribution(text,text,text,text) from public;
grant execute on function public.submit_guest_contribution(text,text,text,text) to anon, authenticated;
