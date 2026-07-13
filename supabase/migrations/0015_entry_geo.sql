-- 0015_entry_geo.sql
-- ---------------------------------------------------------------------
-- Geo-coordinates per entry, read client-side from photo EXIF (exifr) when
-- an entry is created/edited. Powers the private "Weltkarte" (visited
-- countries). Nullable — most entries won't carry GPS.
--
-- Privacy: coordinates are treated as private data (GPS ≈ home address).
-- They are covered by the existing entries RLS (author-only edit, household
-- read), never included in share/export output, and only surfaced on the
-- map to the two parents. No new policy is needed — these are just columns
-- on entries.
-- ---------------------------------------------------------------------

alter table entries add column if not exists lat double precision;
alter table entries add column if not exists lng double precision;
