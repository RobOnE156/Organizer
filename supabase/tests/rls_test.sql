-- =====================================================================
-- pgTAP: proves the RLS invariants (run in CI on every push).
-- Fixtures are created as superuser (RLS bypassed), then we switch into
-- the anon / authenticated roles with a mocked JWT to assert real access.
-- =====================================================================
begin;
select plan(28);

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

reset role;
select * from finish();
rollback;
