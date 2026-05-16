begin;
select plan(5);

select has_table('public', 'org_roles', 'org_roles table exists');
select has_table('public', 'client_memberships', 'client_memberships exists');

select has_function('public', 'can_access_client', array['uuid'],
                    'can_access_client(uuid) function exists');
select has_function('public', 'client_for_item', array['uuid'],
                    'client_for_item(uuid) function exists');

select col_has_check('public', 'org_roles', 'role',
                     'org_roles.role has a CHECK constraint');

select * from finish();
rollback;
