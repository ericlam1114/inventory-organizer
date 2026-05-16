-- Fix: client_for_item() recursed on items_select RLS because it queries items
-- in caller's RLS context, but items_select itself calls client_for_item — chicken-and-egg.
-- Before migration 0007 added the NULL guard to can_access_client, the recursion silently
-- returned NULL → can_access_client(NULL) returned TRUE for any org-role → "worked" but
-- with the security bug of granting all org users access to all items. With the NULL guard,
-- the recursion returns NULL → can_access_client(NULL) returns FALSE → INSERTs fail with
-- 403 on the SELECT-back.
--
-- Solution: make client_for_item SECURITY DEFINER so it bypasses RLS to do the lookup.
-- The function only returns a UUID; authorization is then enforced by the outer
-- can_access_client(client_id) call in items_select / items_write / item_photos_* / etc.

create or replace function public.client_for_item(target_item_id uuid)
returns uuid
language sql
security definer
stable
as $$
  select l.client_id
  from public.items i
  join public.locations l on l.id = i.location_id
  where i.id = target_item_id;
$$;
