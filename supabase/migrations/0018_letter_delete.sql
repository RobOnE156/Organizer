-- 0018_letter_delete.sql
-- ---------------------------------------------------------------------
-- The letters table (0001) has no DELETE policy, and soft-deleting via
-- UPDATE trips the soft-delete SELECT trap (setting deleted_at makes the row
-- fail letters_select's "deleted_at is null", so the UPDATE is rejected). Add
-- a real author-only DELETE policy so a parent can remove their own letter —
-- the same fix pattern as 0006/0008 for other tables.
-- ---------------------------------------------------------------------

create policy letters_delete on letters for delete to authenticated
  using (app.is_member(household_id) and author_id = auth.uid());
