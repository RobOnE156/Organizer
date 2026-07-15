-- 0028_media_location_clean.sql
-- ---------------------------------------------------------------------
-- Track whether a media file is known to be free of location metadata, so
-- read-only share links can serve videos/audio (via signed URL) only when we
-- have positively scrubbed them. Set by the uploader: images are always served
-- through the EXIF-stripping share proxy, videos are scrubbed of their
-- ISO-6709 location atom client-side before upload, and clips we can't fully
-- verify stay false. Existing rows default to false (shown as "view in the
-- diary" in a share) — the safe default.
-- ---------------------------------------------------------------------
alter table public.media
  add column if not exists location_clean boolean not null default false;
