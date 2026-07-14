-- 0022_activity_log.sql
-- ---------------------------------------------------------------------
-- Transparency / activity log ("wer hat was getan") + the write side of the
-- Papierkorb. The audit_log table and its member-read policy already exist
-- (0001/0002); this adds the SECURITY DEFINER triggers that populate it, so
-- rows are written only by these helpers (there is deliberately no INSERT
-- policy on audit_log).
--
-- Entries are soft-deleted (deleted_at, since 0006), so the entry trigger
-- distinguishes create / edit / delete(->trash) / restore. Comments are hard
-- deleted, so we log their create + delete. The short title/excerpt is copied
-- into detail so the log stays readable even after the target is gone.
-- ---------------------------------------------------------------------

create or replace function app.audit_entry() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_action text; v_actor uuid;
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (household_id, actor_id, action, target_type, target_id, detail)
    values (new.household_id, coalesce(new.created_by, auth.uid()), 'entry.create', 'entry', new.id,
            jsonb_build_object('title', left(coalesce(nullif(new.title, ''), new.body, ''), 80)));
    return new;
  end if;

  -- UPDATE: classify by the deleted_at transition
  if old.deleted_at is null and new.deleted_at is not null then
    v_action := 'entry.delete';
  elsif old.deleted_at is not null and new.deleted_at is null then
    v_action := 'entry.restore';
  elsif old.deleted_at is not null and new.deleted_at is not null then
    return new;                       -- edit of an already-trashed row: ignore
  else
    v_action := 'entry.edit';
  end if;
  v_actor := coalesce(new.updated_by, auth.uid());
  insert into public.audit_log (household_id, actor_id, action, target_type, target_id, detail)
  values (new.household_id, v_actor, v_action, 'entry', new.id,
          jsonb_build_object('title', left(coalesce(nullif(new.title, ''), new.body, ''), 80)));
  return new;
end $$;

create or replace function app.audit_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (household_id, actor_id, action, target_type, target_id, detail)
    values (new.household_id, coalesce(new.author_id, auth.uid()), 'comment.create', 'comment', new.id,
            jsonb_build_object('entry_id', new.entry_id, 'excerpt', left(coalesce(new.body, ''), 80)));
    return new;
  else
    insert into public.audit_log (household_id, actor_id, action, target_type, target_id, detail)
    values (old.household_id, auth.uid(), 'comment.delete', 'comment', old.id,
            jsonb_build_object('entry_id', old.entry_id, 'excerpt', left(coalesce(old.body, ''), 80)));
    return old;
  end if;
end $$;

create trigger trg_audit_entry   after insert or update on entries
  for each row execute function app.audit_entry();
create trigger trg_audit_comment after insert or delete on comments
  for each row execute function app.audit_comment();
