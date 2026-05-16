begin;
select plan(8);

-- Setup: two users, two clients
-- janelle = super_admin (sees both clients)
-- dom = org_team_per_client for client_a only (sees only A)

\set janelle_id '00000000-0000-0000-0000-000000000001'
\set dom_id     '00000000-0000-0000-0000-000000000002'
\set client_a   '00000000-0000-0000-0000-0000000000aa'
\set client_b   '00000000-0000-0000-0000-0000000000bb'

-- Insert auth users (minimal required columns for Supabase auth.users)
insert into auth.users (id, instance_id, email, aud, role, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data)
values
  (:'janelle_id'::uuid, '00000000-0000-0000-0000-000000000000',
   'janelle@test', 'authenticated', 'authenticated', '',
   now(), now(), now(), '{}', '{}'),
  (:'dom_id'::uuid, '00000000-0000-0000-0000-000000000000',
   'dom@test', 'authenticated', 'authenticated', '',
   now(), now(), now(), '{}', '{}');

insert into public.profiles (id, email, display_name) values
  (:'janelle_id'::uuid, 'janelle@test', 'Janelle'),
  (:'dom_id'::uuid,     'dom@test',     'Dom');

insert into public.org_roles (user_id, role)
  values (:'janelle_id'::uuid, 'super_admin');

insert into public.clients (id, name) values
  (:'client_a'::uuid, 'Client A'),
  (:'client_b'::uuid, 'Client B');

insert into public.client_memberships (user_id, client_id, role) values
  (:'dom_id'::uuid, :'client_a'::uuid, 'org_team_per_client');

-- Pre-populate audit_log as superuser (no RLS on superuser role)
-- This row is used to test UPDATE/DELETE denials below.
insert into public.audit_log (client_id, target_type, target_id, action)
  values (:'client_a'::uuid, 'item', gen_random_uuid(), 'create');

-- ─── Tests begin ───────────────────────────────────────────────────────────

-- Test 1: super_admin sees both clients
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000001"}';

select results_eq(
  'select count(*)::bigint from public.clients',
  ARRAY[2::bigint],
  'super_admin sees both clients'
);

-- Test 2 & 3: dom (per-client A only) sees only A
set local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000002"}';

select results_eq(
  'select count(*)::bigint from public.clients',
  ARRAY[1::bigint],
  'org_team_per_client sees only assigned client'
);

select results_eq(
  'select id from public.clients',
  $$ select '00000000-0000-0000-0000-0000000000aa'::uuid $$,
  'org_team_per_client sees client A specifically'
);

-- Test 4: dom cannot INSERT a new client (super_admin only)
prepare dom_insert as insert into public.clients (name) values ('rogue');
select throws_ok(
  'execute dom_insert',
  NULL,
  NULL,
  'org_team_per_client cannot create clients'
);

-- Switch back to janelle for audit_log tests
set local "request.jwt.claims" to '{"sub": "00000000-0000-0000-0000-000000000001"}';

-- Test 5: even super_admin cannot UPDATE audit_log
prepare janelle_update_audit as
  update public.audit_log set action = 'evil' where target_type = 'item';
select throws_ok(
  'execute janelle_update_audit',
  NULL,
  NULL,
  'even super_admin cannot UPDATE audit_log'
);

-- Test 6: even super_admin cannot DELETE audit_log
prepare janelle_delete_audit as
  delete from public.audit_log where target_type = 'item';
select throws_ok(
  'execute janelle_delete_audit',
  NULL,
  NULL,
  'even super_admin cannot DELETE audit_log'
);

-- Test 7: authenticated user cannot INSERT audit_log directly
prepare janelle_insert_audit as
  insert into public.audit_log (client_id, target_type, target_id, action)
  values (:'client_a'::uuid, 'item', gen_random_uuid(), 'fake');
select throws_ok(
  'execute janelle_insert_audit',
  NULL,
  NULL,
  'authenticated user cannot INSERT audit_log directly'
);

-- Test 8: super_admin can SELECT audit_log rows (SELECT policy exists)
select results_eq(
  'select count(*)::bigint from public.audit_log',
  ARRAY[1::bigint],
  'super_admin can SELECT audit_log rows'
);

select * from finish();
rollback;
