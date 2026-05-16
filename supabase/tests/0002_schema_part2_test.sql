begin;
select plan(7);

select has_table('public', 'items', 'items table exists');
select has_table('public', 'item_photos', 'item_photos table exists');
select has_table('public', 'audit_log', 'audit_log table exists');

select col_is_fk('public', 'items', 'cover_photo_id',
                 'items.cover_photo_id is a foreign key');
select col_is_fk('public', 'items', 'location_id',
                 'items.location_id is a foreign key');

select col_has_check('public', 'items', 'status',
                     'items.status has a CHECK constraint');

select col_type_is('public', 'items', 'metadata', 'jsonb',
                   'items.metadata is jsonb');

select * from finish();
rollback;
