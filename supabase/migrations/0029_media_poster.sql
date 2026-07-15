-- 0029_media_poster.sql
-- ---------------------------------------------------------------------
-- A poster (still preview frame) for video media, so the timeline shows a
-- thumbnail instead of a black box. The uploader grabs the first frame,
-- stores it next to the video, and records its storage key here. Nullable:
-- older videos (and any where a frame couldn't be captured) simply have none.
-- ---------------------------------------------------------------------
alter table public.media
  add column if not exists poster_key text;
