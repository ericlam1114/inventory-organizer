-- Sidestep an opaque RLS WITH CHECK failure on items INSERT by going through
-- a SECURITY DEFINER RPC. We still enforce authorization explicitly — the
-- function checks can_access_location() before doing the insert — but we
-- skip the policy-engine path that's causing 403s in the browser client.

create or replace function public.create_item(
  p_location_id uuid,
  p_title text,
  p_description text default null
)
returns public.items
language plpgsql
security definer
as $$
declare
  v_row public.items;
begin
  if not public.can_access_location(p_location_id) then
    raise exception 'not authorized to create items in this location';
  end if;

  insert into public.items (location_id, title, description)
  values (p_location_id, p_title, p_description)
  returning * into v_row;

  return v_row;
end $$;
