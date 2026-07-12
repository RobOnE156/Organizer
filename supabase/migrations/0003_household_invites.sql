-- =====================================================================
-- Household invites — add the second parent without email plumbing.
-- The owner generates a one-time code; the invitee redeems it after signing
-- up and becomes a member. Only the SHA-256 hash of the code is stored.
-- =====================================================================

create table household_invites (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  code_hash    text not null unique,
  role         app.member_role not null default 'parent',
  created_by   uuid not null references auth.users(id),
  expires_at   timestamptz not null,
  redeemed_by  uuid references auth.users(id),
  redeemed_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index on household_invites (household_id);

alter table household_invites enable row level security;
grant select, insert, update, delete on household_invites to authenticated;

-- Members can see their household's invites (to show/revoke pending ones).
create policy household_invites_select on household_invites for select to authenticated
  using (app.is_member(household_id));
-- An owner may revoke (soft) an invite; creation/redemption go through RPCs.
create policy household_invites_update on household_invites for update to authenticated
  using (app.is_owner(household_id)) with check (app.is_owner(household_id));

-- Owner-only: mint a one-time invite code (returned once, stored only hashed).
create or replace function public.create_household_invite(
  p_household uuid, p_role app.member_role default 'parent')
returns text language plpgsql security definer set search_path = '' as $$
declare v_code text;
begin
  if not app.is_owner(p_household) then
    raise exception 'only a household owner can create invites';
  end if;
  v_code := encode(extensions.gen_random_bytes(9), 'hex');   -- 18 hex chars
  insert into public.household_invites (household_id, code_hash, role, created_by, expires_at)
  values (p_household,
          encode(extensions.digest(v_code, 'sha256'), 'hex'),
          p_role, auth.uid(), now() + interval '14 days');
  return v_code;
end $$;
revoke all on function public.create_household_invite(uuid, app.member_role) from public, anon;
grant execute on function public.create_household_invite(uuid, app.member_role) to authenticated;

-- Redeem a code: the caller joins the household. Idempotent for existing members.
create or replace function public.redeem_household_invite(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_invite public.household_invites;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select * into v_invite from public.household_invites
    where code_hash = encode(extensions.digest(p_code, 'sha256'), 'hex')
      and redeemed_at is null
      and expires_at > now()
    limit 1;
  if v_invite.id is null then raise exception 'invalid or expired invite code'; end if;

  insert into public.memberships (household_id, user_id, role)
  values (v_invite.household_id, auth.uid(), v_invite.role)
  on conflict (household_id, user_id) do nothing;

  update public.household_invites
    set redeemed_by = auth.uid(), redeemed_at = now()
    where id = v_invite.id;

  return v_invite.household_id;
end $$;
revoke all on function public.redeem_household_invite(text) from public, anon;
grant execute on function public.redeem_household_invite(text) to authenticated;
