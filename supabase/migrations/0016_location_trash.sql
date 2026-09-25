-- Keep deleted locations available for restore while hiding them from normal browsing.
alter table public.locations
  add column deleted_at timestamptz,
  add column deleted_group_id uuid;

alter table public.locations
  add constraint locations_trash_pair check ((deleted_at is null) = (deleted_group_id is null));

create index locations_trashed_idx on public.locations(client_id, deleted_at)
  where deleted_at is not null;

-- A single call moves a location and its active descendants together.
create function public.trash_location(p_client_id uuid, p_location_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.can_access_client(p_client_id) then
    raise exception 'not authorized';
  end if;
  if not exists (
    select 1 from public.locations
    where id = p_location_id and client_id = p_client_id and deleted_at is null
  ) then
    raise exception 'active location not found';
  end if;

  with recursive subtree as (
    select id from public.locations where id = p_location_id and client_id = p_client_id
    union all
    select child.id from public.locations child
    join subtree parent on child.parent_location_id = parent.id
    where child.client_id = p_client_id and child.deleted_at is null
  )
  update public.locations
  set deleted_at = now(), deleted_group_id = p_location_id
  where id in (select id from subtree) and deleted_at is null;
end;
$$;

-- Restore precisely the locations moved by that trash operation. Descendants
-- that were already in Trash before the parent was moved stay in Trash.
create function public.restore_location(p_client_id uuid, p_location_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_parent_id uuid;
begin
  if auth.uid() is null or not public.can_access_client(p_client_id) then
    raise exception 'not authorized';
  end if;
  select parent_location_id into v_parent_id from public.locations
  where id = p_location_id and client_id = p_client_id
    and deleted_at is not null and deleted_group_id = p_location_id;
  if not found then
    raise exception 'location not found in Trash';
  end if;
  if v_parent_id is not null and not exists (
    select 1 from public.locations
    where id = v_parent_id and client_id = p_client_id and deleted_at is null
  ) then
    raise exception 'restore the parent location first';
  end if;

  update public.locations
  set deleted_at = null, deleted_group_id = null
  where client_id = p_client_id and deleted_group_id = p_location_id;
end;
$$;

revoke all on function public.trash_location(uuid, uuid) from public;
revoke all on function public.restore_location(uuid, uuid) from public;
grant execute on function public.trash_location(uuid, uuid) to authenticated;
grant execute on function public.restore_location(uuid, uuid) to authenticated;

-- Item creation, including the create_item RPC, now rejects trashed locations.
create or replace function public.can_access_location(target_location_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select target_location_id is not null
    and exists (
      select 1 from public.locations l
      where l.id = target_location_id
        and l.deleted_at is null
        and public.can_access_client(l.client_id)
    );
$$;
