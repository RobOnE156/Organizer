-- 0009_growth_milestone_delete.sql
-- ---------------------------------------------------------------------
-- Let the author remove a growth measurement or milestone they added
-- (e.g. a typo). Both tables had insert/update but no delete policy
-- (default-deny). A real DELETE avoids the soft-delete SELECT trap
-- (their *_select policies require deleted_at is null). Author-only,
-- household-scoped — mirrors media_delete.
-- ---------------------------------------------------------------------

create policy growth_delete on growth_measurements for delete to authenticated
  using (app.is_member(household_id) and author_id = auth.uid());

create policy milestones_delete on milestones for delete to authenticated
  using (app.is_member(household_id) and author_id = auth.uid());
