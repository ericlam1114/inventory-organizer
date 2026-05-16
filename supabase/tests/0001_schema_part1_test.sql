begin;
select plan(6);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'clients', 'clients table exists');
select has_table('public', 'locations', 'locations table exists');

select has_column('public', 'profiles', 'email', 'profiles has email');
select has_column('public', 'profiles', 'deleted_at', 'profiles has deleted_at');

select col_is_fk('public', 'locations', 'parent_location_id',
                 'locations.parent_location_id is a foreign key');

select * from finish();
rollback;
