-- =====================================================================
-- pgTAP: proves the RLS invariants (run in CI on every push).
-- Fixtures are created as superuser (RLS bypassed), then we switch into
-- the anon / authenticated roles with a mocked JWT to assert real access.
-- =====================================================================
begin;
select plan(194);

-- ---- fixtures (as superuser) ---------------------------------------
-- Users
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111','alice@example.com'),
  ('22222222-2222-2222-2222-222222222222','bob@example.com'),
  ('33333333-3333-3333-3333-333333333333','carol@example.com'),
  ('44444444-4444-4444-4444-444444444444','dave@example.com'),
  ('55555555-5555-5555-5555-555555555555','eve@example.com');

-- Household 1: alice (owner) + bob (parent). Household 2: carol (owner).
insert into households (id, name) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Family One'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','Family Two');
insert into memberships (household_id, user_id, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','owner'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222','parent'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','33333333-3333-3333-3333-333333333333','owner');

insert into children (id, household_id, name, created_by) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Kiddo One','11111111-1111-1111-1111-111111111111'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','Kiddo Two','33333333-3333-3333-3333-333333333333');

-- Entries: e1 public (alice), e2 private (alice), e3 public (carol)
insert into entries (id, household_id, author_id, kind, title, is_private, created_by) values
  ('e1111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','text','Public one',   false,'11111111-1111-1111-1111-111111111111'),
  ('e2222222-2222-2222-2222-222222222222','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','text','Private one',  true, '11111111-1111-1111-1111-111111111111'),
  ('e3333333-3333-3333-3333-333333333333','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','33333333-3333-3333-3333-333333333333','text','Carol public', false,'33333333-3333-3333-3333-333333333333');

-- Profiles (display name + author colour; colour column added in 0016)
insert into profiles (user_id, display_name, color) values
  ('11111111-1111-1111-1111-111111111111','Alice','#0072B2'),
  ('22222222-2222-2222-2222-222222222222','Bob','#009E73');

-- =====================================================================
-- anonymous: no table privileges at all
-- =====================================================================
reset role; select set_config('request.jwt.claims','',true); set local role anon;
select throws_ok($$ select 1 from households $$, '42501', null, 'anon cannot read households');
select throws_ok($$ select 1 from entries $$,    '42501', null, 'anon cannot read entries');
select throws_ok($$ select public.create_household('x') $$, '42501', null, 'anon cannot call create_household');

-- =====================================================================
-- alice (owner, household 1, author of e1/e2)
-- =====================================================================
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from households)::int, 1, 'alice sees exactly her own household');
select is((select count(*) from households where id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')::int, 0, 'alice cannot see the other household');
select is((select count(*) from entries)::int, 2, 'alice sees both her entries (incl. her private one)');

-- =====================================================================
-- bob (parent, household 1, NOT author of the private entry)
-- =====================================================================
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from entries)::int, 1, 'bob sees only the shared entry, not the private one');
select is((select count(*) from entries where id='e2222222-2222-2222-2222-222222222222')::int, 0, 'bob cannot see co-parent private entry');
select is((select count(*) from households)::int, 1, 'bob sees his household');

-- =====================================================================
-- carol (household 2) — full isolation from household 1
-- =====================================================================
reset role; select set_config('request.jwt.claims', json_build_object('sub','33333333-3333-3333-3333-333333333333','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from entries)::int, 1, 'carol sees only her own household entry');
select is((select count(*) from entries where household_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::int, 0, 'carol cannot read household 1 entries');
select is((select count(*) from children where household_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::int, 0, 'carol cannot read household 1 children');

-- =====================================================================
-- write invariants
-- =====================================================================
-- alice may insert into her household as herself
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ insert into entries (household_id, author_id, kind, title, created_by)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','text','new by alice','11111111-1111-1111-1111-111111111111') $$,
  'alice can insert into her own household');
-- alice may NOT insert into another household
select throws_ok($$ insert into entries (household_id, author_id, kind, title, created_by)
  values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','11111111-1111-1111-1111-111111111111','text','sneaky','11111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'alice cannot insert into another household (RLS)');
-- alice may NOT forge authorship (author_id = bob)
select throws_ok($$ insert into entries (household_id, author_id, kind, title, created_by)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222','text','forged','11111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'alice cannot insert an entry authored by someone else (WITH CHECK)');
-- alice may edit her own entry
select lives_ok($$ update entries set title='edited by alice' where id='e1111111-1111-1111-1111-111111111111' $$,
  'alice can edit her own entry');

-- bob may NOT edit alice's entry (author-only): the UPDATE is a silent no-op
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ update entries set title='hacked by bob' where id='e1111111-1111-1111-1111-111111111111' $$,
  'bob''s update of a co-parent entry raises no error but touches no row');
select is((select title from entries where id='e1111111-1111-1111-1111-111111111111'), 'edited by alice',
  'the co-parent entry is unchanged after bob''s attempt');

-- =====================================================================
-- soft-delete: an author can soft-delete their own entry (0006 fix).
-- Setting deleted_at must not trip the SELECT policy. The author keeps
-- visibility of the row (future trash/restore), the co-parent loses it,
-- and the timeline query (deleted_at is null) drops it.
-- =====================================================================
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
insert into entries (id, household_id, author_id, kind, title, created_by)
  values ('e4444444-4444-4444-4444-444444444444','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','text','to be deleted','11111111-1111-1111-1111-111111111111');
select lives_ok($$ update entries set deleted_at = now() where id='e4444444-4444-4444-4444-444444444444' $$,
  'author can soft-delete their own entry (deleted_at update passes RLS)');
select is((select count(*) from entries where id='e4444444-4444-4444-4444-444444444444')::int, 1,
  'author still sees their own soft-deleted entry (enables trash/restore)');
select is((select count(*) from entries where id='e4444444-4444-4444-4444-444444444444' and deleted_at is null)::int, 0,
  'the timeline query (deleted_at is null) excludes the deleted entry');

-- the co-parent can no longer see the soft-deleted entry
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from entries where id='e4444444-4444-4444-4444-444444444444')::int, 0,
  'co-parent cannot see a soft-deleted entry');

-- carol may NOT insert into household 1
reset role; select set_config('request.jwt.claims', json_build_object('sub','33333333-3333-3333-3333-333333333333','role','authenticated')::text, true); set local role authenticated;
select throws_ok($$ insert into entries (household_id, author_id, kind, title, created_by)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','33333333-3333-3333-3333-333333333333','text','cross','33333333-3333-3333-3333-333333333333') $$,
  '42501', null, 'carol cannot insert into household 1 (RLS)');

-- =====================================================================
-- bootstrap RPC: a brand-new user creates a household and becomes owner
-- =====================================================================
reset role; select set_config('request.jwt.claims', json_build_object('sub','44444444-4444-4444-4444-444444444444','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ select public.create_household('Dave Family') $$, 'new user can bootstrap a household');
select is((select count(*) from households)::int, 1, 'the new owner immediately sees their household');

-- =====================================================================
-- household invites: owner-only creation, redemption joins the household
-- =====================================================================
-- bob (parent, not owner) cannot create an invite
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select throws_ok($$ select public.create_household_invite('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  null, null, 'a non-owner cannot create a household invite');

-- alice (owner) mints an invite code
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select public.create_household_invite('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') as invite_code \gset

-- eve redeems it and joins household 1
reset role; select set_config('request.jwt.claims', json_build_object('sub','55555555-5555-5555-5555-555555555555','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from households)::int, 0, 'eve sees no household before redeeming');
select lives_ok(format($f$ select public.redeem_household_invite(%L) $f$, :'invite_code'),
  'eve can redeem a valid invite code');
select is((select count(*) from households where id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::int, 1,
  'eve is now a member of household 1');

-- =====================================================================
-- storage: media objects are scoped to the household in their path
-- (the 'media' bucket is created by migration 0004)
-- =====================================================================
-- alice may upload under her own household's path
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ insert into storage.objects (bucket_id, name, owner)
  values ('media','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/e1111111-1111-1111-1111-111111111111/1-a.jpg','11111111-1111-1111-1111-111111111111') $$,
  'alice can upload a media object under her own household path');
-- alice may NOT upload into another household's path
select throws_ok($$ insert into storage.objects (bucket_id, name, owner)
  values ('media','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/x/2-b.jpg','11111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'alice cannot upload into another household path (storage RLS)');

-- carol (household 2) cannot see household 1's objects
reset role; select set_config('request.jwt.claims', json_build_object('sub','33333333-3333-3333-3333-333333333333','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from storage.objects where name like 'aaaaaaaa-%')::int, 0,
  'carol cannot see household 1 media objects');

-- =====================================================================
-- media delete: only the author may remove a media item (0008)
-- =====================================================================
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
insert into media (household_id, entry_id, author_id, store, storage_key, kind, mime, bytes, position)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','e1111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','supabase','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/e1111111-1111-1111-1111-111111111111/0-a.jpg','image','image/jpeg',1000,0);

-- bob (co-parent) may SEE the media but NOT delete it (author-only)
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from media where entry_id='e1111111-1111-1111-1111-111111111111')::int, 1, 'co-parent can see media on a shared entry');
select lives_ok($$ delete from media where entry_id='e1111111-1111-1111-1111-111111111111' $$, 'co-parent delete raises no error but removes nothing');
select is((select count(*) from media where entry_id='e1111111-1111-1111-1111-111111111111')::int, 1, 'co-parent could not delete the media row');

-- alice (author) can delete her own media
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ delete from media where entry_id='e1111111-1111-1111-1111-111111111111' $$, 'author can delete her own media');
select is((select count(*) from media where entry_id='e1111111-1111-1111-1111-111111111111')::int, 0, 'the media row is gone after the author deletes it');

-- =====================================================================
-- growth measurements: only the author may delete one (0009)
-- =====================================================================
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
insert into growth_measurements (household_id, child_id, metric, value_num, unit, author_id)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','cccccccc-cccc-cccc-cccc-cccccccccccc','weight',7.4,'kg','11111111-1111-1111-1111-111111111111');

-- bob (co-parent) sees it but cannot delete it
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from growth_measurements where child_id='cccccccc-cccc-cccc-cccc-cccccccccccc')::int, 1, 'co-parent sees a growth measurement');
select lives_ok($$ delete from growth_measurements where child_id='cccccccc-cccc-cccc-cccc-cccccccccccc' $$, 'co-parent delete of a measurement is a no-op');
select is((select count(*) from growth_measurements where child_id='cccccccc-cccc-cccc-cccc-cccccccccccc')::int, 1, 'co-parent could not delete the measurement');

-- alice (author) can delete her own measurement
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ delete from growth_measurements where child_id='cccccccc-cccc-cccc-cccc-cccccccccccc' $$, 'author can delete her own measurement');
select is((select count(*) from growth_measurements where child_id='cccccccc-cccc-cccc-cccc-cccccccccccc')::int, 0, 'the measurement is gone after the author deletes it');

-- =====================================================================
-- child cover: EITHER parent may set/replace it, regardless of who set it
-- last (children_update is member-based, not author-based) — 0010
-- =====================================================================
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ update children set cover_key='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/cover/x1.jpg' where id='cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
  'a parent can set the child cover');

-- bob (the OTHER parent, did not set it) can change it
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ update children set cover_key='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/cover/x2.jpg' where id='cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
  'the co-parent can change a cover the other parent set');
select is((select cover_key from children where id='cccccccc-cccc-cccc-cccc-cccccccccccc'),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/cover/x2.jpg', 'the co-parent''s cover change took effect');

-- carol (other household) cannot touch it
reset role; select set_config('request.jwt.claims', json_build_object('sub','33333333-3333-3333-3333-333333333333','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ update children set cover_key='hacked' where id='cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
  'a cross-household cover update raises no error but changes nothing');
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select is((select cover_key from children where id='cccccccc-cccc-cccc-cccc-cccccccccccc'),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/cover/x2.jpg', 'a cross-household user could not change the cover');

-- =====================================================================
-- snapshots: household-visible, author-only edit/delete (0011)
-- =====================================================================
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
insert into snapshots (household_id, child_id, author_id, answers)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','cccccccc-cccc-cccc-cccc-cccccccccccc','11111111-1111-1111-1111-111111111111','{"food":"Nudeln"}'::jsonb);

-- bob (co-parent) sees it but cannot delete it
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from snapshots where child_id='cccccccc-cccc-cccc-cccc-cccccccccccc')::int, 1, 'co-parent sees a snapshot');
select lives_ok($$ delete from snapshots where child_id='cccccccc-cccc-cccc-cccc-cccccccccccc' $$, 'co-parent delete of a snapshot is a no-op');
select is((select count(*) from snapshots where child_id='cccccccc-cccc-cccc-cccc-cccccccccccc')::int, 1, 'co-parent could not delete the snapshot');

-- carol (other household) cannot see it
reset role; select set_config('request.jwt.claims', json_build_object('sub','33333333-3333-3333-3333-333333333333','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from snapshots where child_id='cccccccc-cccc-cccc-cccc-cccccccccccc')::int, 0, 'a cross-household user cannot see the snapshot');

-- alice (author) can delete her own
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ delete from snapshots where child_id='cccccccc-cccc-cccc-cccc-cccccccccccc' $$, 'author can delete her own snapshot');

-- =====================================================================
-- comments: any member may comment on a visible entry; author-only delete
-- (0012); a cross-household user is denied
-- =====================================================================
-- bob (co-parent) comments on alice's public entry e1
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ insert into comments (household_id, entry_id, author_id, body)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','e1111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','Schön!') $$,
  'co-parent can comment on a visible entry');

-- alice sees it but cannot delete the co-parent's comment
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from comments where entry_id='e1111111-1111-1111-1111-111111111111')::int, 1, 'author sees the co-parent comment');
select lives_ok($$ delete from comments where entry_id='e1111111-1111-1111-1111-111111111111' $$, 'non-author delete of a comment is a no-op');
select is((select count(*) from comments where entry_id='e1111111-1111-1111-1111-111111111111')::int, 1, 'the comment survived the non-author delete');

-- alice (non-author) cannot edit the co-parent's comment
select lives_ok($$ update comments set body='hacked' where entry_id='e1111111-1111-1111-1111-111111111111' $$, 'non-author edit of a comment is a no-op');
select is((select body from comments where entry_id='e1111111-1111-1111-1111-111111111111'), 'Schön!', 'the comment text is unchanged after the non-author edit');

-- bob (author) can edit his own comment
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ update comments set body='Sehr schön!' where entry_id='e1111111-1111-1111-1111-111111111111' $$, 'author can edit his own comment');
select is((select body from comments where entry_id='e1111111-1111-1111-1111-111111111111'), 'Sehr schön!', 'the author edit took effect');

-- carol (other household) cannot comment on e1
reset role; select set_config('request.jwt.claims', json_build_object('sub','33333333-3333-3333-3333-333333333333','role','authenticated')::text, true); set local role authenticated;
select throws_ok($$ insert into comments (household_id, entry_id, author_id, body)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','e1111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','sneaky') $$,
  '42501', null, 'a cross-household user cannot comment');

-- bob deletes his own comment
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ delete from comments where entry_id='e1111111-1111-1111-1111-111111111111' $$, 'author can delete his own comment');
select is((select count(*) from comments where entry_id='e1111111-1111-1111-1111-111111111111')::int, 0, 'the comment is gone after the author deletes it');

-- =====================================================================
-- reactions: any member may react on a visible entry; author-only delete;
-- (target_type,target_id,author_id,emoji) is unique; cross-household denied
-- =====================================================================
-- bob (co-parent) reacts to alice's public entry e1
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ insert into reactions (household_id, target_type, target_id, author_id, emoji)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','entry','e1111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','❤️') $$,
  'co-parent can react to a visible entry');

-- the same author cannot add the same emoji twice (unique constraint)
select throws_ok($$ insert into reactions (household_id, target_type, target_id, author_id, emoji)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','entry','e1111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','❤️') $$,
  '23505', null, 'the same author cannot add the same emoji twice (unique)');

-- alice (co-parent) sees bob's reaction
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from reactions where target_id='e1111111-1111-1111-1111-111111111111')::int, 1, 'co-parent sees the reaction');

-- alice (non-author) cannot delete bob's reaction
select lives_ok($$ delete from reactions where target_id='e1111111-1111-1111-1111-111111111111' $$, 'non-author delete of a reaction is a no-op');
select is((select count(*) from reactions where target_id='e1111111-1111-1111-1111-111111111111')::int, 1, 'the reaction survived the non-author delete');

-- carol (other household) cannot react on e1
reset role; select set_config('request.jwt.claims', json_build_object('sub','33333333-3333-3333-3333-333333333333','role','authenticated')::text, true); set local role authenticated;
select throws_ok($$ insert into reactions (household_id, target_type, target_id, author_id, emoji)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','entry','e1111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','❤️') $$,
  '42501', null, 'a cross-household user cannot react');

-- bob deletes his own reaction
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ delete from reactions where target_id='e1111111-1111-1111-1111-111111111111' $$, 'author can delete his own reaction');
select is((select count(*) from reactions where target_id='e1111111-1111-1111-1111-111111111111')::int, 0, 'the reaction is gone after the author deletes it');

-- =====================================================================
-- reactions on comments: same table with target_type='comment'; a member
-- may react on a visible comment, only the reaction's author may remove it,
-- and a cross-household user is denied
-- =====================================================================
-- alice leaves a comment to react to (fixture)
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
insert into comments (id, household_id, entry_id, author_id, body)
  values ('c1111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','e1111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','Reagier mal');

-- bob (co-parent) reacts to alice's comment
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ insert into reactions (household_id, target_type, target_id, author_id, emoji)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','comment','c1111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','👏') $$,
  'co-parent can react to a comment');
select is((select count(*) from reactions where target_type='comment' and target_id='c1111111-1111-1111-1111-111111111111')::int, 1, 'the comment reaction is stored');

-- carol (other household) cannot react to that comment
reset role; select set_config('request.jwt.claims', json_build_object('sub','33333333-3333-3333-3333-333333333333','role','authenticated')::text, true); set local role authenticated;
select throws_ok($$ insert into reactions (household_id, target_type, target_id, author_id, emoji)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','comment','c1111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','👏') $$,
  '42501', null, 'a cross-household user cannot react to a comment');

-- alice (not the reaction's author) cannot delete bob's comment reaction
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ delete from reactions where target_type='comment' and target_id='c1111111-1111-1111-1111-111111111111' $$, 'non-author delete of a comment reaction is a no-op');
select is((select count(*) from reactions where target_type='comment' and target_id='c1111111-1111-1111-1111-111111111111')::int, 1, 'the comment reaction survived the non-author delete');

-- bob deletes his own comment reaction
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ delete from reactions where target_type='comment' and target_id='c1111111-1111-1111-1111-111111111111' $$, 'author can delete his own comment reaction');
select is((select count(*) from reactions where target_type='comment' and target_id='c1111111-1111-1111-1111-111111111111')::int, 0, 'the comment reaction is gone after the author deletes it');

-- =====================================================================
-- highlights: a shared per-entry "best-of" mark. Either parent may star a
-- visible entry (unique entry_id), a private entry can't be starred by the
-- co-parent (can_see_entry), and cross-household is denied (0014).
-- =====================================================================
-- bob (co-parent) stars the shared entry e1
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ insert into highlights (household_id, entry_id, created_by)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','e1111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222') $$,
  'a parent can star a shared entry');

-- alice sees the highlight
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from highlights where entry_id='e1111111-1111-1111-1111-111111111111')::int, 1, 'the co-parent sees the highlight');

-- a second star on the same entry violates the unique(entry_id) constraint
select throws_ok($$ insert into highlights (household_id, entry_id, created_by)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','e1111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111') $$,
  '23505', null, 'an entry can only be highlighted once (unique entry_id)');

-- bob cannot star alice's PRIVATE entry e2 (he can't see it)
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select throws_ok($$ insert into highlights (household_id, entry_id, created_by)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','e2222222-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222') $$,
  '42501', null, 'the co-parent cannot highlight a private entry he cannot see');

-- carol (other household) cannot star e1
reset role; select set_config('request.jwt.claims', json_build_object('sub','33333333-3333-3333-3333-333333333333','role','authenticated')::text, true); set local role authenticated;
select throws_ok($$ insert into highlights (household_id, entry_id, created_by)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','e1111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333') $$,
  '42501', null, 'a cross-household user cannot highlight an entry');
select is((select count(*) from highlights where entry_id='e1111111-1111-1111-1111-111111111111')::int, 0, 'a cross-household user cannot even see the highlight');

-- alice (the other parent, did not star it) can unstar the shared entry
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ delete from highlights where entry_id='e1111111-1111-1111-1111-111111111111' $$, 'either parent can unstar a shared entry');
select is((select count(*) from highlights where entry_id='e1111111-1111-1111-1111-111111111111')::int, 0, 'the highlight is gone after unstarring');

-- =====================================================================
-- search: searchDiary is just an ILIKE read under the caller's session, so
-- RLS scopes it. A co-parent's private entry must never surface via search,
-- even when its text matches the query.
-- =====================================================================
-- bob cannot find alice's private entry e2 ("Private one") by its title
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from entries where deleted_at is null and title ilike '%Private one%')::int, 0,
  'search (ILIKE) does not surface a co-parent private entry');

-- alice finds her own private entry via the same search
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from entries where deleted_at is null and title ilike '%Private one%')::int, 1,
  'the author finds her own private entry via search');

-- =====================================================================
-- profiles: a user edits their OWN name + author colour (colour on profiles
-- since 0016); nobody can edit anyone else's profile
-- =====================================================================
-- alice edits her own profile
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ update profiles set display_name='Mama', color='#CC79A7' where user_id='11111111-1111-1111-1111-111111111111' $$,
  'a user can edit their own profile (name + colour)');
select is((select color from profiles where user_id='11111111-1111-1111-1111-111111111111'), '#CC79A7',
  'the profile colour change took effect');

-- bob (co-member) can SEE alice but cannot edit her profile — silent no-op
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from profiles where user_id='11111111-1111-1111-1111-111111111111')::int, 1, 'a co-member can see the other profile');
select lives_ok($$ update profiles set display_name='hacked', color='#000000' where user_id='11111111-1111-1111-1111-111111111111' $$,
  'a cross-user profile update raises no error but changes nothing');

-- alice confirms her profile is untouched
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select is((select display_name from profiles where user_id='11111111-1111-1111-1111-111111111111'), 'Mama',
  'the profile is unchanged after another user''s attempt');

-- =====================================================================
-- letters (time capsule): household-shared (both parents see the row); only
-- the author may edit/delete. The "sealed until unlock" behaviour is applied
-- app-side, so RLS just proves household isolation + author-only writes.
-- =====================================================================
-- alice writes a letter to the child
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ insert into letters (id, household_id, child_id, author_id, body, unlock_mode, unlock_date)
  values ('f1111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','cccccccc-cccc-cccc-cccc-cccccccccccc','11111111-1111-1111-1111-111111111111','Lieber Schatz','date','2999-01-01') $$,
  'author can write a letter to the child');

-- bob (co-parent) can see the letter row (household-shared)
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from letters where id='f1111111-1111-1111-1111-111111111111')::int, 1,
  'a co-parent can see the letter row (household-shared)');

-- carol (other household) cannot write a letter into household 1
reset role; select set_config('request.jwt.claims', json_build_object('sub','33333333-3333-3333-3333-333333333333','role','authenticated')::text, true); set local role authenticated;
select throws_ok($$ insert into letters (household_id, child_id, author_id, body, unlock_mode, unlock_date)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','cccccccc-cccc-cccc-cccc-cccccccccccc','33333333-3333-3333-3333-333333333333','x','date','2999-01-01') $$,
  '42501', null, 'a cross-household user cannot write a letter');
select is((select count(*) from letters where id='f1111111-1111-1111-1111-111111111111')::int, 0,
  'a cross-household user cannot see the letter either');

-- bob (co-parent) cannot edit or delete alice's letter (author-only)
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ update letters set body='hacked' where id='f1111111-1111-1111-1111-111111111111' $$,
  'a co-parent edit of a letter raises no error but changes nothing');
select lives_ok($$ delete from letters where id='f1111111-1111-1111-1111-111111111111' $$,
  'a co-parent delete of a letter is a no-op');
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select is((select body from letters where id='f1111111-1111-1111-1111-111111111111'), 'Lieber Schatz',
  'the letter is unchanged and still present after the co-parent attempts');

-- alice deletes her own letter (real DELETE, 0018)
select lives_ok($$ delete from letters where id='f1111111-1111-1111-1111-111111111111' $$,
  'author can delete her own letter');
select is((select count(*) from letters where id='f1111111-1111-1111-1111-111111111111')::int, 0,
  'the letter is gone after the author deletes it');

-- =====================================================================
-- notifications (in-app "Glocke"): AFTER INSERT triggers create rows for the
-- right recipient (co-parent for a new shared entry; the entry author for a
-- comment/reaction), skip the actor + private entries, and respect each
-- recipient's opt-in matrix. Rows are readable/updatable only by their
-- recipient. We assert on the SPECIFIC ids we create, since other tests'
-- inserts fire the same triggers.
-- =====================================================================
reset role;
-- alice adds a SHARED entry -> the co-parent (bob) is notified, alice is not
insert into entries (id, household_id, author_id, kind, title, is_private, created_by) values
  ('a0000001-0000-0000-0000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','text','Shared A', false,'11111111-1111-1111-1111-111111111111');
select is((select count(*) from notifications where entry_id='a0000001-0000-0000-0000-000000000001' and recipient_id='22222222-2222-2222-2222-222222222222' and kind='entry')::int, 1,
  'a new shared entry notifies the co-parent');
select is((select count(*) from notifications where entry_id='a0000001-0000-0000-0000-000000000001' and recipient_id='11111111-1111-1111-1111-111111111111')::int, 0,
  'the author is never notified of their own entry');

-- alice adds a PRIVATE entry -> nobody is notified
insert into entries (id, household_id, author_id, kind, title, is_private, created_by) values
  ('a0000002-0000-0000-0000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','text','Private A', true,'11111111-1111-1111-1111-111111111111');
select is((select count(*) from notifications where entry_id='a0000002-0000-0000-0000-000000000002')::int, 0,
  'a private entry notifies nobody');

-- bob comments on alice's shared entry -> alice is notified
insert into comments (id, household_id, entry_id, author_id, body) values
  ('c0000001-0000-0000-0000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','a0000001-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','Nice!');
select is((select count(*) from notifications where comment_id='c0000001-0000-0000-0000-000000000001' and recipient_id='11111111-1111-1111-1111-111111111111' and kind='comment')::int, 1,
  'a comment notifies the entry author');

-- alice comments on her OWN entry -> no notification
insert into comments (id, household_id, entry_id, author_id, body) values
  ('c0000002-0000-0000-0000-000000000002','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','a0000001-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','my own');
select is((select count(*) from notifications where comment_id='c0000002-0000-0000-0000-000000000002')::int, 0,
  'commenting on your own entry notifies nobody');

-- bob reacts to alice's shared entry -> alice is notified
insert into reactions (household_id, target_type, target_id, author_id, emoji) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','entry','a0000001-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','❤️');
select is((select count(*) from notifications where entry_id='a0000001-0000-0000-0000-000000000001' and recipient_id='11111111-1111-1111-1111-111111111111' and kind='reaction')::int, 1,
  'a reaction notifies the entry author');

-- bob opts out of new-entry notifications; a later shared entry skips him
insert into notification_prefs (user_id, entry_inapp) values ('22222222-2222-2222-2222-222222222222', false);
insert into entries (id, household_id, author_id, kind, title, is_private, created_by) values
  ('a0000003-0000-0000-0000-000000000003','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','text','Shared B', false,'11111111-1111-1111-1111-111111111111');
select is((select count(*) from notifications where entry_id='a0000003-0000-0000-0000-000000000003' and recipient_id='22222222-2222-2222-2222-222222222222')::int, 0,
  'a recipient who opted out of entry notifications is not notified');

-- anon: no access to either table
reset role; select set_config('request.jwt.claims','',true); set local role anon;
select throws_ok($$ select 1 from notifications $$,      '42501', null, 'anon cannot read notifications');
select throws_ok($$ select 1 from notification_prefs $$, '42501', null, 'anon cannot read notification prefs');

-- alice: sees only her own notifications, and cannot touch bob's
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from notifications where recipient_id='22222222-2222-2222-2222-222222222222')::int, 0,
  'alice cannot see notifications addressed to bob');
select is((select count(*) from notifications where entry_id='a0000001-0000-0000-0000-000000000001' and kind='entry')::int, 0,
  'alice cannot see the entry notification addressed to bob');
select is((select count(*) from notifications where comment_id='c0000001-0000-0000-0000-000000000001')::int, 1,
  'alice sees the comment notification addressed to her');
select lives_ok($$ update notifications set read_at=now() where entry_id='a0000001-0000-0000-0000-000000000001' and kind='entry' $$,
  'a cross-user read-mark raises no error but changes nothing');

-- the co-parent's notification is still unread after alice's attempt
reset role;
select is((select count(*) from notifications where entry_id='a0000001-0000-0000-0000-000000000001' and kind='entry' and recipient_id='22222222-2222-2222-2222-222222222222' and read_at is null)::int, 1,
  'bob''s notification stays unread after a cross-user attempt');

-- bob: sees his notification, can mark it read
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from notifications where entry_id='a0000001-0000-0000-0000-000000000001' and kind='entry')::int, 1,
  'bob sees the entry notification addressed to him');
select lives_ok($$ update notifications set read_at=now() where entry_id='a0000001-0000-0000-0000-000000000001' and kind='entry' $$,
  'a recipient can mark their own notification read');
select is((select count(*) from notifications where entry_id='a0000001-0000-0000-0000-000000000001' and kind='entry' and read_at is not null)::int, 1,
  'the notification is read after the recipient marks it');
select is((select count(*) from notification_prefs where user_id='22222222-2222-2222-2222-222222222222')::int, 1,
  'bob can see his own notification preferences');

-- notification_prefs isolation: alice cannot see bob's, manages her own
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from notification_prefs where user_id='22222222-2222-2222-2222-222222222222')::int, 0,
  'alice cannot see bob''s notification preferences');
select lives_ok($$ insert into notification_prefs (user_id, muted) values ('11111111-1111-1111-1111-111111111111', true) $$,
  'a user can set their own notification preferences');

-- =====================================================================
-- e-mail notification targets (definer RPC): e-mail is opt-in (default off),
-- returns recipients + addresses server-side, gated by *_email + mute, skips
-- the actor and private entries. (Reuses alice's shared entry a0000001.)
-- =====================================================================
-- anon cannot call it
reset role; select set_config('request.jwt.claims','',true); set local role anon;
select throws_ok($$ select public.notification_email_targets('entry','a0000001-0000-0000-0000-000000000001') $$,
  '42501', null, 'anon cannot call notification_email_targets');

-- with e-mail off by default, a new entry yields no targets
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from public.notification_email_targets('entry','a0000001-0000-0000-0000-000000000001'))::int, 0,
  'no e-mail targets while e-mail is off by default');

-- bob opts into entry e-mails -> alice's entry now targets bob's address
reset role; update notification_prefs set entry_email=true, muted=false where user_id='22222222-2222-2222-2222-222222222222';
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from public.notification_email_targets('entry','a0000001-0000-0000-0000-000000000001'))::int, 1,
  'an opted-in co-parent is an e-mail target for a new entry');
select is((select email from public.notification_email_targets('entry','a0000001-0000-0000-0000-000000000001') limit 1), 'bob@example.com',
  'the e-mail target carries the recipient address');

-- a private entry never yields e-mail targets, even when opted in
select is((select count(*) from public.notification_email_targets('entry','a0000002-0000-0000-0000-000000000002'))::int, 0,
  'a private entry yields no e-mail targets');

-- a muted recipient is skipped even when opted in
reset role; update notification_prefs set muted=true where user_id='22222222-2222-2222-2222-222222222222';
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from public.notification_email_targets('entry','a0000001-0000-0000-0000-000000000001'))::int, 0,
  'a muted recipient is not an e-mail target');

-- comment e-mails target the entry author who opted in (bob is the actor)
reset role; update notification_prefs set comment_email=true, muted=false where user_id='11111111-1111-1111-1111-111111111111';
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from public.notification_email_targets('comment','a0000001-0000-0000-0000-000000000001'))::int, 1,
  'a comment e-mail targets the entry author who opted in');
select is((select email from public.notification_email_targets('comment','a0000001-0000-0000-0000-000000000001') limit 1), 'alice@example.com',
  'the comment e-mail target is the entry author');

-- the author is never e-mailed about their own entry (actor == author)
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from public.notification_email_targets('reaction','a0000001-0000-0000-0000-000000000001'))::int, 0,
  'the entry author is never an e-mail target for their own entry');

-- =====================================================================
-- activity log + Papierkorb (trash): AFTER triggers record create / edit /
-- delete / restore into audit_log (members-only read); a soft-deleted entry
-- stays visible to its author (restorable) but is hidden from the co-parent.
-- =====================================================================
-- alice creates, edits, trashes, restores a fresh entry
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ insert into entries (id, household_id, author_id, kind, title, is_private, created_by)
  values ('b0000001-0000-0000-0000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','text','Original', false,'11111111-1111-1111-1111-111111111111') $$,
  'alice creates an entry');
select is((select count(*) from audit_log where target_id='b0000001-0000-0000-0000-000000000001' and action='entry.create')::int, 1,
  'entry creation is logged');

select lives_ok($$ update entries set title='Edited', updated_by='11111111-1111-1111-1111-111111111111' where id='b0000001-0000-0000-0000-000000000001' $$,
  'alice edits the entry');
select is((select count(*) from audit_log where target_id='b0000001-0000-0000-0000-000000000001' and action='entry.edit')::int, 1,
  'entry edit is logged');

select lives_ok($$ update entries set deleted_at=now(), updated_by='11111111-1111-1111-1111-111111111111' where id='b0000001-0000-0000-0000-000000000001' $$,
  'alice moves the entry to the trash');
select is((select count(*) from audit_log where target_id='b0000001-0000-0000-0000-000000000001' and action='entry.delete')::int, 1,
  'soft-delete is logged as entry.delete');
select is((select count(*) from entries where id='b0000001-0000-0000-0000-000000000001' and deleted_at is not null)::int, 1,
  'the author still sees her own trashed entry (Papierkorb)');

-- bob (co-parent) cannot see the trashed entry
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from entries where id='b0000001-0000-0000-0000-000000000001')::int, 0,
  'a co-parent cannot see a trashed entry');

-- alice restores it
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ update entries set deleted_at=null, updated_by='11111111-1111-1111-1111-111111111111' where id='b0000001-0000-0000-0000-000000000001' $$,
  'alice restores the entry');
select is((select count(*) from audit_log where target_id='b0000001-0000-0000-0000-000000000001' and action='entry.restore')::int, 1,
  'restore is logged as entry.restore');

-- bob now sees the restored (shared) entry and can comment on it
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from entries where id='b0000001-0000-0000-0000-000000000001')::int, 1,
  'the restored entry is visible to the co-parent again');
select lives_ok($$ insert into comments (id, household_id, entry_id, author_id, body)
  values ('d0000001-0000-0000-0000-000000000001','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','b0000001-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','Nice') $$,
  'bob comments on the restored entry');
select is((select count(*) from audit_log where target_id='d0000001-0000-0000-0000-000000000001' and action='comment.create')::int, 1,
  'comment creation is logged');
select lives_ok($$ delete from comments where id='d0000001-0000-0000-0000-000000000001' $$,
  'bob deletes his own comment');
select is((select count(*) from audit_log where target_id='d0000001-0000-0000-0000-000000000001' and action='comment.delete')::int, 1,
  'comment deletion is logged');
select is((select count(*) from audit_log where target_id='b0000001-0000-0000-0000-000000000001')::int, 4,
  'a member sees the full audit trail (create/edit/delete/restore)');

-- cross-household isolation + anon lockout on the activity log
reset role; select set_config('request.jwt.claims', json_build_object('sub','33333333-3333-3333-3333-333333333333','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from audit_log where household_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::int, 0,
  'a cross-household user cannot read the activity log');
reset role; select set_config('request.jwt.claims','',true); set local role anon;
select throws_ok($$ select 1 from audit_log $$, '42501', null, 'anon cannot read the activity log');

-- =====================================================================
-- account recovery codes: printable one-time backups. Generation + redemption
-- are definer RPCs scoped to auth.uid(); only hashes are stored; a code works
-- once and only for its owner.
-- =====================================================================
-- anon cannot touch any of it
reset role; select set_config('request.jwt.claims','',true); set local role anon;
select throws_ok($$ select 1 from recovery_codes $$, '42501', null, 'anon cannot read recovery_codes');
select throws_ok($$ select public.generate_recovery_codes() $$, '42501', null, 'anon cannot generate recovery codes');
select throws_ok($$ select public.redeem_recovery_code('x') $$, '42501', null, 'anon cannot redeem a recovery code');

-- alice generates a set of 10
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select is(array_length(public.generate_recovery_codes(), 1)::int, 10, 'generation returns 10 codes');
select is((select count(*) from recovery_codes)::int, 10, 'ten codes are stored (hashed) for the user');

-- regenerate and capture one code to redeem
select (public.generate_recovery_codes())[1] as rc \gset
select is((select count(*) from recovery_codes)::int, 10, 'regenerating replaces the previous set (still 10)');
select is(public.redeem_recovery_code(:'rc'), true, 'a valid code redeems successfully');
select is(public.redeem_recovery_code(:'rc'), false, 'a code cannot be redeemed twice (one-time)');
select is((select count(*) from recovery_codes where used_at is not null)::int, 1, 'the redeemed code is marked used');

-- isolation: bob sees none of alice's codes and cannot redeem hers
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from recovery_codes)::int, 0, 'a user cannot see another user''s recovery codes');
select is(public.redeem_recovery_code(:'rc'), false, 'a user cannot redeem another user''s code');

-- =====================================================================
-- backups + backup_settings: household-shared log + reminder cadence.
-- =====================================================================
-- anon has no access to either
reset role; select set_config('request.jwt.claims','',true); set local role anon;
select throws_ok($$ select 1 from backups $$,         '42501', null, 'anon cannot read backups');
select throws_ok($$ select 1 from backup_settings $$, '42501', null, 'anon cannot read backup_settings');

-- alice logs a backup for her household
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ insert into backups (household_id, actor_id, kind) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','11111111-1111-1111-1111-111111111111','export') $$,
  'a member can log a backup');
select lives_ok($$ insert into backup_settings (household_id, interval_days) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 90) $$,
  'a member can set the reminder cadence');

-- bob (co-parent) sees the shared backup + settings
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from backups where household_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::int, 1,
  'a co-parent sees the household backup log');
select is((select interval_days from backup_settings where household_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 90,
  'a co-parent sees the reminder cadence');

-- carol (other household) is fully isolated and cannot write into household 1
reset role; select set_config('request.jwt.claims', json_build_object('sub','33333333-3333-3333-3333-333333333333','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from backups)::int, 0, 'a cross-household user sees no backups');
select is((select count(*) from backup_settings)::int, 0, 'a cross-household user sees no backup settings');
select throws_ok($$ insert into backups (household_id, actor_id, kind) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','33333333-3333-3333-3333-333333333333','export') $$,
  '42501', null, 'a cross-household user cannot log a backup for another household');
select throws_ok($$ insert into backup_settings (household_id, interval_days) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 30) $$,
  '42501', null, 'a cross-household user cannot set another household''s reminder');

-- =====================================================================
-- guest contributions (account-less, expiring links, moderated):
--   * the tables are never touched directly by a guest — anon reaches them
--     only through the definer RPCs submit_guest_contribution /
--     guest_invite_info; minting (create_guest_invite) is member-only.
--   * invites & contributions are household-shared; members moderate.
-- =====================================================================
-- Seed three known-token invites for household 1 (as superuser). We control
-- the tokens so the anon submit/info calls are deterministic.
reset role;
insert into guest_invites (id, household_id, child_id, created_by, token_hash, label, message, language, expires_at) values
  ('91111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','cccccccc-cccc-cccc-cccc-cccccccccccc','11111111-1111-1111-1111-111111111111', encode(extensions.digest('guesttoken-valid','sha256'),'hex'),   'Oma',  'Schreib was Schönes', 'de', now() + interval '7 days'),
  ('92222222-2222-2222-2222-222222222222','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','cccccccc-cccc-cccc-cccc-cccccccccccc','11111111-1111-1111-1111-111111111111', encode(extensions.digest('guesttoken-expired','sha256'),'hex'), 'Opa',  null,                  'de', now() - interval '1 day'),
  ('93333333-3333-3333-3333-333333333333','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','cccccccc-cccc-cccc-cccc-cccccccccccc','11111111-1111-1111-1111-111111111111', encode(extensions.digest('guesttoken-revoked','sha256'),'hex'), 'Tante', null,                 'de', now() + interval '7 days');
update guest_invites set revoked_at = now() where id='93333333-3333-3333-3333-333333333333';

-- anon: no direct table access; reaches guests only via the definer RPCs.
reset role; select set_config('request.jwt.claims','',true); set local role anon;
select throws_ok($$ select 1 from guest_invites $$,       '42501', null, 'anon cannot read guest_invites directly');
select throws_ok($$ select 1 from guest_contributions $$, '42501', null, 'anon cannot read guest_contributions directly');
select throws_ok($$ select public.create_guest_invite('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,'x',null,'de',7) $$,
  '42501', null, 'anon cannot mint a guest link');
select is((select valid from public.guest_invite_info('guesttoken-valid')), true,  'anon can validate a live token');
select is((select valid from public.guest_invite_info('no-such-token')),    false, 'anon gets valid=false for an unknown token');
select lives_ok($$ select public.submit_guest_contribution('guesttoken-valid','Oma Ingrid','Zoo','Ein schöner Tag') $$,
  'anon can submit a contribution with a valid token');
select throws_ok($$ select public.submit_guest_contribution('guesttoken-expired','Opa','x','y') $$, null, null,
  'anon cannot submit with an expired token');
select throws_ok($$ select public.submit_guest_contribution('guesttoken-revoked','Tante','x','y') $$, null, null,
  'anon cannot submit with a revoked token');
select throws_ok($$ select public.submit_guest_contribution('guesttoken-valid','','x','y') $$, null, null,
  'anon cannot submit without a name');

-- the submission landed as exactly one pending contribution (checked as superuser)
reset role;
select is((select count(*) from guest_contributions where household_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::int, 1,
  'the guest submission created exactly one contribution');
select is((select status::text from guest_contributions where household_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' limit 1), 'pending',
  'the guest contribution starts pending');

-- alice (member): sees the household's links and can mint another
reset role; select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from guest_invites)::int, 3, 'alice (member) sees all three household guest links');
select lives_ok($$ select public.create_guest_invite('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,'Nachbarn','Hallo','en',30) $$,
  'alice can mint a guest link for her household');
select is((select count(*) from guest_invites)::int, 4, 'the minted link is visible to the member');
select is((select count(*) from guest_contributions)::int, 1, 'alice can see the guest contribution');

-- carol (other household): full isolation, cannot mint for household 1
reset role; select set_config('request.jwt.claims', json_build_object('sub','33333333-3333-3333-3333-333333333333','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from guest_invites)::int, 0, 'carol sees no guest links from household 1');
select is((select count(*) from guest_contributions)::int, 0, 'carol sees no guest contributions from household 1');
select throws_ok($$ select public.create_guest_invite('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,'x',null,'de',7) $$,
  null, null, 'a non-member cannot mint a link for another household');

-- bob (co-parent): sees household guests and can moderate
reset role; select set_config('request.jwt.claims', json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true); set local role authenticated;
select is((select count(*) from guest_invites)::int, 4, 'bob (co-parent) sees the household guest links');
select is((select count(*) from guest_contributions where status='pending')::int, 1, 'bob sees the pending contribution to moderate');
select lives_ok($$ update guest_contributions set status='approved', reviewed_by='22222222-2222-2222-2222-222222222222', reviewed_at=now() where household_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'bob can approve the pending contribution');
select is((select status::text from guest_contributions where household_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' limit 1), 'approved',
  'the contribution is now approved');

-- carol cannot moderate household 1's contribution (no-op, not an error)
reset role; select set_config('request.jwt.claims', json_build_object('sub','33333333-3333-3333-3333-333333333333','role','authenticated')::text, true); set local role authenticated;
select lives_ok($$ update guest_contributions set status='rejected' where household_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  'a cross-household moderate raises no error but changes nothing');
reset role;
select is((select status::text from guest_contributions where household_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' limit 1), 'approved',
  'the contribution stays approved after a non-member attempt');

reset role;
select * from finish();
rollback;
