-- 0012_comment_delete.sql
-- ---------------------------------------------------------------------
-- Let the author delete their own comment. comments had select/insert/
-- update but no delete policy (default-deny). Author-only, household-
-- scoped — mirrors the other content tables; a real DELETE avoids the
-- soft-delete SELECT trap.
-- ---------------------------------------------------------------------

create policy comments_delete on comments for delete to authenticated
  using (app.is_member(household_id) and author_id = auth.uid());
