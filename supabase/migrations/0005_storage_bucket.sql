-- Create the private bucket for inventory photos.
-- Path format enforced by the application: clients/{client_id}/items/{item_id}/{uuid}.{ext}
-- On conflict: idempotent re-runs are safe.
insert into storage.buckets (id, name, public)
values ('inventory-photos', 'inventory-photos', false)
on conflict (id) do nothing;

-- Storage RLS: gate every operation via can_access_client.
-- The client_id is the 2nd path segment: split_part(name, '/', 2).
-- If the path is malformed (e.g. 'clients//items/...'), split_part returns ''
-- which fails the ::uuid cast → exception → policy denies. Correct behavior.

create policy "inventory-photos read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'inventory-photos'
    and public.can_access_client((split_part(name, '/', 2))::uuid)
  );

create policy "inventory-photos write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'inventory-photos'
    and public.can_access_client((split_part(name, '/', 2))::uuid)
  );

create policy "inventory-photos update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'inventory-photos'
    and public.can_access_client((split_part(name, '/', 2))::uuid)
  );

create policy "inventory-photos delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'inventory-photos'
    and public.can_access_client((split_part(name, '/', 2))::uuid)
  );
