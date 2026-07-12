-- =====================================================================
-- Media storage — one private bucket, household-scoped access.
-- Object path convention:  <household_id>/<entry_id>/<n>-<filename>
-- so the first folder segment identifies the owning household and RLS can
-- scope on it exactly like every other table.
-- (In real Supabase the storage schema already exists; locally it is
--  provided by supabase/tests/harness/00_supabase_shim.sql.)
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

alter table storage.objects enable row level security;

-- Read: any member of the household in the object's path.
create policy media_read on storage.objects for select to authenticated
  using (
    bucket_id = 'media'
    and app.is_member(((storage.foldername(name))[1])::uuid)
  );

-- Write: you may only upload into your own household path, as yourself.
create policy media_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and owner = auth.uid()
    and app.is_member(((storage.foldername(name))[1])::uuid)
  );

create policy media_update on storage.objects for update to authenticated
  using (
    bucket_id = 'media'
    and owner = auth.uid()
    and app.is_member(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'media'
    and owner = auth.uid()
    and app.is_member(((storage.foldername(name))[1])::uuid)
  );

create policy media_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'media'
    and owner = auth.uid()
    and app.is_member(((storage.foldername(name))[1])::uuid)
  );
