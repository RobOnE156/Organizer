-- 0025_profile_theme.sql
-- ---------------------------------------------------------------------
-- Per-user colour scheme (applied only to that user's own view, like the
-- language + accessibility preferences). Stored on the profile; the layout
-- turns it into a `theme-<name>` class on <html>. 'default' = the base scheme.
-- ---------------------------------------------------------------------

alter table profiles add column theme text not null default 'default';
