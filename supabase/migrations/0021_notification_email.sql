-- 0021_notification_email.sql
-- ---------------------------------------------------------------------
-- E-mail notifications (channel #2), layered onto the in-app engine (0020).
-- Each event gains its own "_email" opt-in, independent of the "_inapp" one,
-- so a user can pick channels per event. Defaults are OFF — e-mail is
-- explicit opt-in (no surprise mail), toggled in the settings matrix.
--
-- notification_email_targets is a definer RPC the app calls right after a
-- write to learn WHO wants an e-mail for this event, with their address, UI
-- language and the actor's name. The addresses are used server-side only (the
-- app sends via Resend) and never reach the browser. Gating mirrors the in-app
-- triggers: skip the actor, skip private entries, honour the global mute.
-- ---------------------------------------------------------------------

alter table notification_prefs
  add column entry_email    boolean not null default false,
  add column comment_email  boolean not null default false,
  add column reaction_email boolean not null default false;

create or replace function public.notification_email_targets(
  p_kind app.notification_kind, p_entry_id uuid)
returns table (email text, language text, actor_name text)
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_household uuid; v_entry_author uuid; v_private boolean; v_actor_name text;
begin
  if v_actor is null or p_entry_id is null then return; end if;
  select e.household_id, e.author_id, e.is_private
    into v_household, v_entry_author, v_private
    from public.entries e where e.id = p_entry_id;
  if v_household is null then return; end if;

  select coalesce(nullif(btrim(pr.display_name), ''), '') into v_actor_name
    from public.profiles pr where pr.user_id = v_actor;

  if p_kind = 'entry' then
    if v_private then return; end if;
    -- a new shared entry -> every other household member who opted into e-mail
    return query
      select u.email::text,
             coalesce(nullif(pr.ui_language, ''), 'en'),
             coalesce(v_actor_name, '')
      from public.memberships m
      join auth.users u on u.id = m.user_id
      left join public.profiles pr on pr.user_id = m.user_id
      left join public.notification_prefs np on np.user_id = m.user_id
      where m.household_id = v_household
        and m.user_id <> v_actor
        and u.email is not null
        and coalesce(np.entry_email, false)
        and not coalesce(np.muted, false);
  else
    -- comment / reaction -> the entry's author, unless that's the actor
    if v_entry_author is null or v_entry_author = v_actor then return; end if;
    return query
      select u.email::text,
             coalesce(nullif(pr.ui_language, ''), 'en'),
             coalesce(v_actor_name, '')
      from auth.users u
      left join public.profiles pr on pr.user_id = u.id
      left join public.notification_prefs np on np.user_id = u.id
      where u.id = v_entry_author
        and u.email is not null
        and coalesce(case when p_kind = 'comment' then np.comment_email else np.reaction_email end, false)
        and not coalesce(np.muted, false);
  end if;
end $$;
revoke all on function public.notification_email_targets(app.notification_kind, uuid) from public, anon;
grant execute on function public.notification_email_targets(app.notification_kind, uuid) to authenticated;
