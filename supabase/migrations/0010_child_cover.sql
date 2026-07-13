-- 0010_child_cover.sql
-- ---------------------------------------------------------------------
-- A cover photo per child for the timeline hero header. Stores the
-- object key of an image in the private media bucket, under the
-- household path (<household_id>/cover/<child_id>-<ts>) so the existing
-- storage RLS already scopes read/write to household members. The
-- children_update policy already lets any member set it — no new policy.
-- ---------------------------------------------------------------------

alter table children add column cover_key text;
