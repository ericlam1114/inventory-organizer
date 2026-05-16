-- memberships_write (FOR ALL) policy contained an inline subquery against
-- client_memberships in its USING clause to check "is the caller a client_admin
-- for this client?". Since FOR ALL also covers SELECT, that subquery triggers
-- another SELECT on client_memberships → infinite recursion when the planner
-- tries to evaluate it.
--
-- Same pattern as migration 0007's org_roles fix: extract the lookup into a
-- SECURITY DEFINER helper that bypasses RLS. Apply the same upgrade to
-- can_create_shares_for() and can_access_location() so future policies
-- composing them don't accidentally recurse.

create or replace function public.is_client_admin_for(target_client_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select target_client_id is not null
    and exists (
      select 1 from public.client_memberships
      where user_id = auth.uid()
        and client_id = target_client_id
        and role = 'client_admin'
    );
$$;

create or replace function public.is_org_team_per_client_for(target_client_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select target_client_id is not null
    and exists (
      select 1 from public.client_memberships
      where user_id = auth.uid()
        and client_id = target_client_id
        and role = 'org_team_per_client'
    );
$$;

-- Rewrite memberships_write to use the helpers (no inline subquery → no recursion)
drop policy if exists memberships_write on public.client_memberships;

create policy memberships_write on public.client_memberships for all
  using (
    public.is_super_admin()
    or public.is_client_admin_for(client_id)
  )
  with check (
    public.is_super_admin()
    or public.is_client_admin_for(client_id)
  );

-- Upgrade can_create_shares_for to use the helpers too
create or replace function public.can_create_shares_for(target_client_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select public.is_super_admin()
    or exists (select 1 from public.org_roles where user_id = auth.uid() and role = 'org_team_all')
    or public.is_org_team_per_client_for(target_client_id)
    or public.is_client_admin_for(target_client_id);
$$;
