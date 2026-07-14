-- 0027_share_links.sql
-- ---------------------------------------------------------------------
-- Read-only family sharing: an account-less, revocable, optionally
-- expiring link that lets grandparents / family VIEW the diary (whole
-- timeline) or a single memory. This is the counterpart to guest_invites
-- (0019), which let guests *contribute* — a share link only lets someone
-- *view*, and never exposes private entries or precise location.
--
-- The link's data + signed media are served by an authorising server route
-- (app/share/[token]) using the service role, so an anonymous viewer never
-- queries these tables directly. Members mint links via a definer RPC (the
-- raw token is returned once; only its SHA-256 hash is stored) and manage
-- them under member-only RLS.
-- ---------------------------------------------------------------------

create table if not exists public.share_links (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households(id) on delete cascade,
  created_by     uuid not null default auth.uid(),
  token_hash     text not null unique,
  scope          text not null check (scope in ('timeline', 'entry')),
  entry_id       uuid references public.entries(id) on delete cascade,
  child_id       uuid references public.children(id) on delete cascade,
  label          text,
  language       text not null default 'de',
  expires_at     timestamptz,          -- null = no expiry (handover / gift mode)
  revoked_at     timestamptz,
  last_viewed_at timestamptz,
  created_at     timestamptz not null default now(),
  constraint share_entry_needs_id check (scope <> 'entry' or entry_id is not null)
);
create index if not exists share_links_household_idx on public.share_links(household_id);

alter table public.share_links enable row level security;

-- This table is created after 0002's bulk grant, so grant the member
-- privileges explicitly (no insert — links are minted via the definer RPC;
-- no delete — revoking is a soft update). anon gets nothing: the /share view
-- route reads through the service role, never as anon.
grant select, update on public.share_links to authenticated;

-- Members can see + revoke their own household's links. There is deliberately
-- no INSERT policy: links are minted only through create_share_link so the raw
-- token is hashed before it is stored.
drop policy if exists share_links_select on public.share_links;
create policy share_links_select on public.share_links
  for select using (app.is_member(household_id));

drop policy if exists share_links_update on public.share_links;
create policy share_links_update on public.share_links
  for update using (app.is_member(household_id)) with check (app.is_member(household_id));

-- Mint a read-only link. Returns the raw token exactly once; the table stores
-- only encode(digest(token,'sha256'),'hex'). Runs as the (superuser) migration
-- owner, so the insert bypasses RLS — the is_member check is the real gate.
-- p_days <= 0 (or null) means "no expiry" (handover / gift mode).
create or replace function public.create_share_link(
  p_household uuid,
  p_scope     text,
  p_entry     uuid,
  p_child     uuid,
  p_label     text,
  p_language  text,
  p_days      int)
returns text language plpgsql security definer set search_path = '' as $$
declare v_token text; v_expires timestamptz;
begin
  if not app.is_member(p_household) then
    raise exception 'only a household member can create share links';
  end if;
  if p_scope not in ('timeline', 'entry') then
    raise exception 'invalid scope';
  end if;
  if p_scope = 'entry' then
    if p_entry is null then
      raise exception 'entry scope needs an entry';
    end if;
    if not exists (
      select 1 from public.entries e
      where e.id = p_entry and e.household_id = p_household
    ) then
      raise exception 'entry not in household';
    end if;
  end if;
  v_expires := case
    when coalesce(p_days, 0) > 0 then now() + make_interval(days => least(p_days, 3650))
    else null
  end;
  v_token := encode(extensions.gen_random_bytes(18), 'hex');   -- 36 hex chars
  insert into public.share_links
    (household_id, scope, entry_id, child_id, created_by, token_hash, label, language, expires_at)
  values (
    p_household,
    p_scope,
    case when p_scope = 'entry' then p_entry else null end,
    p_child,
    auth.uid(),
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    nullif(btrim(coalesce(p_label, '')), ''),
    coalesce(nullif(btrim(coalesce(p_language, '')), ''), 'de'),
    v_expires);
  return v_token;
end $$;
revoke all on function public.create_share_link(uuid, text, uuid, uuid, text, text, int) from public, anon;
grant execute on function public.create_share_link(uuid, text, uuid, uuid, text, text, int) to authenticated;
