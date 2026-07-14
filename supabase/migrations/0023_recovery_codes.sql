-- 0023_recovery_codes.sql
-- ---------------------------------------------------------------------
-- Account recovery codes — a printable backup so a parent who loses their
-- authenticator app is never permanently locked out of the 18-year archive
-- (plan priority: the lockout / recovery problem).
--
-- Only the SHA-256 hash of each code is stored, never the code itself. Both
-- generation and redemption go through SECURITY DEFINER RPCs scoped to
-- auth.uid(); there is no direct INSERT/UPDATE policy on the table. Redeeming
-- a valid code marks it used (one-time); the app then removes the user's lost
-- TOTP factor via the admin API, dropping the session to AAL1 so they can log
-- in and enrol a fresh authenticator.
-- ---------------------------------------------------------------------

create table recovery_codes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  code_hash  text not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index on recovery_codes (user_id) where used_at is null;

alter table recovery_codes enable row level security;
grant select on recovery_codes to authenticated;

-- A user may see the status of their OWN codes (count / used), never a raw
-- code (only hashes are stored). Writes happen solely via the definer RPCs.
create policy recovery_codes_select on recovery_codes for select to authenticated
  using (user_id = auth.uid());

-- Generate a fresh set of 10 one-time codes, replacing any previous set.
-- Returns the raw codes exactly once; only their hashes are persisted.
create or replace function public.generate_recovery_codes()
returns text[] language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_codes text[] := '{}'; v_code text; i int;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  delete from public.recovery_codes where user_id = v_uid;   -- replace the old set
  for i in 1..10 loop
    v_code := lower(encode(extensions.gen_random_bytes(5), 'hex'));   -- 10 hex chars
    insert into public.recovery_codes (user_id, code_hash)
      values (v_uid, encode(extensions.digest(v_code, 'sha256'), 'hex'));
    v_codes := array_append(v_codes, v_code);
  end loop;
  return v_codes;
end $$;
revoke all on function public.generate_recovery_codes() from public, anon;
grant execute on function public.generate_recovery_codes() to authenticated;

-- Redeem a code for the current user: validates its hash against an unused
-- code, marks it used (one-time), and reports success. Input is normalised
-- (spaces/dashes stripped, lower-cased) so formatting on the printout is
-- forgiving. Never reveals which codes exist.
create or replace function public.redeem_recovery_code(p_code text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_norm text;
begin
  if v_uid is null then return false; end if;
  v_norm := lower(regexp_replace(coalesce(p_code, ''), '[^a-zA-Z0-9]', '', 'g'));
  if v_norm = '' then return false; end if;
  select id into v_id from public.recovery_codes
    where user_id = v_uid
      and used_at is null
      and code_hash = encode(extensions.digest(v_norm, 'sha256'), 'hex')
    limit 1;
  if v_id is null then return false; end if;
  update public.recovery_codes set used_at = now() where id = v_id;
  return true;
end $$;
revoke all on function public.redeem_recovery_code(text) from public, anon;
grant execute on function public.redeem_recovery_code(text) to authenticated;
