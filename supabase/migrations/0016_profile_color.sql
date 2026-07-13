-- 0016_profile_color.sql
-- ---------------------------------------------------------------------
-- Move the author colour onto the profile so each user can edit their own
-- name AND colour. It used to live on memberships, whose UPDATE policy is
-- owner-only — which meant the invited second parent couldn't change their
-- own colour. profiles_update is own-row, so a colour on profiles is fully
-- self-editable. memberships.color stays (harmless) for backward compat.
-- ---------------------------------------------------------------------

alter table profiles add column if not exists color text not null default '#c98fb0';

-- Carry over each user's existing membership colour so nothing visibly changes.
update profiles p
   set color = m.color
  from memberships m
 where m.user_id = p.user_id;
