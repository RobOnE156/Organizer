-- 0006_fix_entries_select_softdelete.sql
-- ---------------------------------------------------------------------
-- Fix: soft-delete (setting deleted_at) failed with
--   "new row violates row-level security policy for table entries".
--
-- Root cause: the original entries_select policy required
--   deleted_at is null
-- in its USING clause. An UPDATE is checked against SELECT visibility of
-- the *resulting* row; setting deleted_at made the new row invisible, so
-- PostgreSQL rejected the UPDATE — the author could never delete.
--
-- Fix: let an author still SEE their own soft-deleted rows. Co-parents
-- still cannot see deleted entries, and the app's timeline query keeps
-- filtering `deleted_at is null`, so nothing changes visually. As a bonus
-- this enables a future trash/restore ("Papierkorb") view for the author.
-- ---------------------------------------------------------------------

drop policy entries_select on entries;
create policy entries_select on entries for select to authenticated
  using (app.is_member(household_id)
         and (deleted_at is null or author_id = auth.uid())
         and (not is_private or author_id = auth.uid()));
