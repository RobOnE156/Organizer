-- 0013_entry_link.sql
-- ---------------------------------------------------------------------
-- A link with a preview card on an entry (Spotify/YouTube/article). Stored
-- as JSON: { url, title, description, provider, thumbnail_key }. The
-- thumbnail is self-hosted in the media bucket (thumbnail_key) so viewing
-- the card makes no third-party request. Covered by the existing entries
-- policies (it's a column on the entries row; only the author edits it).
-- ---------------------------------------------------------------------

alter table entries add column link jsonb;
