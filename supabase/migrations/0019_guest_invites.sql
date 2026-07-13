-- 0019_guest_invites.sql
-- ---------------------------------------------------------------------
-- Guest contributions via expiring, account-less links (moderated).
-- The tables (guest_invites, guest_contributions), their RLS, and the
-- account-less submit RPC (public.submit_guest_contribution) already exist
-- from 0001/0002. This adds the two definer RPCs the app layer needs:
--
--   * create_guest_invite — a household member mints a link. The raw token
--     is returned exactly once; only its SHA-256 hash is persisted. Mirrors
--     create_household_invite (0003) so no client-side crypto is required.
--   * guest_invite_info    — an account-less guest's browser validates a
--     token and personalises the write page (child's first name, the host's
--     note, the language) BEFORE submitting, without ever touching a table
--     directly. Returns only what the token holder is meant to see.
-- ---------------------------------------------------------------------

-- A household member mints a guest link. Returns the raw token once; the
-- table stores only encode(digest(token,'sha256'),'hex'). The definer runs
-- as the (superuser) migration owner, so the insert bypasses RLS just like
-- create_household_invite — the is_member check is the real gate.
create or replace function public.create_guest_invite(
  p_household uuid,
  p_child     uuid,
  p_label     text,
  p_message   text,
  p_language  text,
  p_days      int)
returns text language plpgsql security definer set search_path = '' as $$
declare v_token text;
begin
  if not app.is_member(p_household) then
    raise exception 'only a household member can create guest links';
  end if;
  v_token := encode(extensions.gen_random_bytes(18), 'hex');   -- 36 hex chars
  insert into public.guest_invites
    (household_id, child_id, created_by, token_hash, label, message, language, expires_at)
  values (
    p_household,
    p_child,
    auth.uid(),
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    nullif(btrim(coalesce(p_label, '')),   ''),
    nullif(btrim(coalesce(p_message, '')), ''),
    coalesce(nullif(btrim(coalesce(p_language, '')), ''), 'en'),
    now() + make_interval(days => greatest(1, least(coalesce(p_days, 14), 90))));
  return v_token;
end $$;
revoke all on function public.create_guest_invite(uuid, uuid, text, text, text, int) from public, anon;
grant execute on function public.create_guest_invite(uuid, uuid, text, text, text, int) to authenticated;

-- An account-less guest validates a token and gets just enough to personalise
-- the write page. One row: valid + a reason code, plus the host's label, the
-- personal message, the chosen language, the child's first name (only for a
-- live token) and the expiry. Reveals nothing beyond what the link intends.
create or replace function public.guest_invite_info(p_token text)
returns table (
  valid      boolean,
  reason     text,
  label      text,
  message    text,
  language   text,
  child_name text,
  expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_invite public.guest_invites; v_child text;
begin
  select * into v_invite from public.guest_invites
    where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
    limit 1;
  if v_invite.id is null then
    return query select false, 'invalid'::text,
      null::text, null::text, null::text, null::text, null::timestamptz;
    return;
  end if;
  if v_invite.revoked_at is not null then
    return query select false, 'revoked'::text,
      v_invite.label, v_invite.message, v_invite.language, null::text, v_invite.expires_at;
    return;
  end if;
  if v_invite.expires_at < now() then
    return query select false, 'expired'::text,
      v_invite.label, v_invite.message, v_invite.language, null::text, v_invite.expires_at;
    return;
  end if;
  select name into v_child from public.children where id = v_invite.child_id;
  return query select true, 'ok'::text,
    v_invite.label, v_invite.message, v_invite.language, v_child, v_invite.expires_at;
end $$;
revoke all on function public.guest_invite_info(text) from public;
grant execute on function public.guest_invite_info(text) to anon, authenticated;
