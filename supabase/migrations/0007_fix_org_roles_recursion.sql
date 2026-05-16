-- Fix: org_roles RLS policies were recursive — the policy queried org_roles
-- to determine if the caller was super_admin, but reading org_roles required
-- already being a visible super_admin. Janelle could not read her own row.
--
-- Solution: SECURITY DEFINER helper that bypasses RLS to check super_admin,
-- mirroring the pattern already used by can_access_client().
--
-- Also fixes the same latent issue in clients_* policies (they queried
-- org_roles directly with the caller's RLS context).

-- Helper: is the current user a super_admin? Bypasses RLS via security definer.
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.org_roles
    where user_id = auth.uid() and role = 'super_admin'
  );
$$;

-- Replace the recursive org_roles policy with split policies:
--   • SELECT — own row always; super_admins see all rows
--   • Writes — super_admin only (via is_super_admin)
drop policy if exists org_roles_super_admin_only on public.org_roles;

create policy org_roles_select on public.org_roles for select
  using (user_id = auth.uid() or public.is_super_admin());

create policy org_roles_insert on public.org_roles for insert
  with check (public.is_super_admin());

create policy org_roles_update on public.org_roles for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy org_roles_delete on public.org_roles for delete
  using (public.is_super_admin());

-- Rewrite clients_* policies to use is_super_admin() instead of an inline
-- subquery against org_roles (which would now still work due to the new
-- self-select policy, but the helper is clearer and bypass-safe).
drop policy if exists clients_insert on public.clients;
drop policy if exists clients_update on public.clients;
drop policy if exists clients_delete on public.clients;

create policy clients_insert on public.clients for insert
  with check (public.is_super_admin());
create policy clients_update on public.clients for update
  using (public.is_super_admin());
create policy clients_delete on public.clients for delete
  using (public.is_super_admin());

-- memberships_write: same pattern, use is_super_admin() for the super_admin branch.
-- client_admin branch still queries client_memberships, which is fine because
-- memberships_select allows reading rows for any client you have access to.
drop policy if exists memberships_write on public.client_memberships;

create policy memberships_write on public.client_memberships for all
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.client_memberships m
      where m.user_id = auth.uid()
        and m.client_id = client_memberships.client_id
        and m.role = 'client_admin'
    )
  )
  with check (
    public.is_super_admin()
    or exists (
      select 1 from public.client_memberships m
      where m.user_id = auth.uid()
        and m.client_id = client_memberships.client_id
        and m.role = 'client_admin'
    )
  );
