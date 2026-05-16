-- The items_write WITH CHECK uses an inline EXISTS subquery against locations.
-- Whatever the exact reason (RLS-on-subquery interaction, evaluation order,
-- something subtle in PG's policy planner), super_admin INSERTs into items
-- fail with "new row violates row-level security policy for table items"
-- even though all the underlying checks (can_access_client, locations select,
-- is_super_admin) all return TRUE when queried directly.
--
-- Solution: drop the subquery in favor of a SECURITY DEFINER helper that does
-- the lookup in elevated context. Same security model — we're still gating
-- on can_access_client(client_id) — just via a function call instead of an
-- inline subquery.

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
        and public.can_access_client(l.client_id)
    );
$$;

-- Replace items_write to use the helper
drop policy if exists items_write on public.items;

create policy items_write on public.items for all
  using (public.can_access_client(public.client_for_item(id)))
  with check (public.can_access_location(location_id));
