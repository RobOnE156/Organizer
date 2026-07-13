-- 0017_profile_a11y.sql
-- ---------------------------------------------------------------------
-- Per-profile accessibility preferences: larger text, higher contrast and
-- reduced motion. Applied globally in the root layout as classes on <html>.
-- Own-row editable via the existing profiles_update policy.
-- ---------------------------------------------------------------------

alter table profiles add column if not exists text_size     text    not null default 'normal';
alter table profiles add column if not exists high_contrast boolean not null default false;
alter table profiles add column if not exists reduce_motion boolean not null default false;
