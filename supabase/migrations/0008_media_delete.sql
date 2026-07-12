-- 0008_media_delete.sql
-- ---------------------------------------------------------------------
-- Allow the author to remove a single media item from their own entry.
--
-- The media table had no DELETE policy (default-deny), so removing a
-- photo/video was impossible. Soft-delete via UPDATE deleted_at would
-- hit the same trap as entries did (media_select requires
-- deleted_at is null, so the updated row becomes invisible and the
-- UPDATE is rejected). A real DELETE is also the honest, DSGVO-friendly
-- behaviour: the storage object is removed alongside the row, so a
-- deliberately removed photo is actually gone.
--
-- Author-only, household-scoped — mirrors media_update.
-- ---------------------------------------------------------------------

create policy media_delete on media for delete to authenticated
  using (app.is_member(household_id) and author_id = auth.uid());
