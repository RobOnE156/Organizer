-- 0007_entry_place.sql
-- ---------------------------------------------------------------------
-- Add a free-text place ("Ort") to entries, e.g. "Berlin, Omas Wohnung".
--
-- This is the manual location field. Precise GPS coordinates
-- (lat/lng/country_code) will later be derived automatically from photo
-- EXIF for the planned world map; this text field is what a parent types.
--
-- The place is versioned like the rest of an entry's text: it is added to
-- entry_revisions and to the revision trigger's change detection, so an
-- edit to the location is never silently lost. Existing entries policies
-- already cover the new column (it lives on the entries row).
-- ---------------------------------------------------------------------

alter table entries          add column place_name text;
alter table entry_revisions  add column place_name text;

create or replace function app.capture_entry_revision() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.title is distinct from old.title
      or new.body is distinct from old.body
      or new.event_date is distinct from old.event_date
      or new.is_private is distinct from old.is_private
      or new.place_name is distinct from old.place_name) then
    insert into public.entry_revisions (entry_id, editor_id, title, body, event_date, is_private, place_name)
    values (old.id, coalesce(new.updated_by, old.author_id), old.title, old.body, old.event_date, old.is_private, old.place_name);
  end if;
  return new;
end $$;
