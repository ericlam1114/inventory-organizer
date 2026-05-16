-- Enable RLS on every public table
alter table public.profiles            enable row level security;
alter table public.clients             enable row level security;
alter table public.locations           enable row level security;
alter table public.items               enable row level security;
alter table public.item_photos         enable row level security;
alter table public.org_roles           enable row level security;
alter table public.client_memberships  enable row level security;
alter table public.audit_log           enable row level security;

-- profiles: every authenticated user can read all profiles (display names
-- need to be visible across the app); update only own row.
create policy profiles_select on public.profiles for select
  using (auth.uid() is not null);
create policy profiles_update_own on public.profiles for update
  using (auth.uid() = id);

-- clients: visible per can_access_client; only super_admin can write.
create policy clients_select on public.clients for select
  using (public.can_access_client(id));
create policy clients_insert on public.clients for insert
  with check (exists (select 1 from public.org_roles
                      where user_id = auth.uid() and role = 'super_admin'));
create policy clients_update on public.clients for update
  using (exists (select 1 from public.org_roles
                 where user_id = auth.uid() and role = 'super_admin'));
create policy clients_delete on public.clients for delete
  using (exists (select 1 from public.org_roles
                 where user_id = auth.uid() and role = 'super_admin'));

-- locations: SELECT and all-writes gated by can_access_client on the location's client_id.
-- (Write permissions are further enforced at the app layer by role; the DB
-- guarantees at minimum that you must have access to the client.)
create policy locations_select on public.locations for select
  using (public.can_access_client(client_id));
create policy locations_write on public.locations for all
  using (public.can_access_client(client_id))
  with check (public.can_access_client(client_id));

-- items: gated via client_for_item → location.client_id.
create policy items_select on public.items for select
  using (public.can_access_client(public.client_for_item(id)));
create policy items_write on public.items for all
  using (public.can_access_client(public.client_for_item(id)))
  with check (
    exists (
      select 1 from public.locations l
      where l.id = location_id
        and public.can_access_client(l.client_id)
    )
  );

-- item_photos: gated via item → location.client_id.
create policy item_photos_select on public.item_photos for select
  using (public.can_access_client(public.client_for_item(item_id)));
create policy item_photos_write on public.item_photos for all
  using (public.can_access_client(public.client_for_item(item_id)))
  with check (public.can_access_client(public.client_for_item(item_id)));

-- org_roles: only super_admin can read or write.
-- Note: this policy reads from org_roles itself; Postgres evaluates the
-- USING expression against each row individually, so the self-referential
-- lookup on the executing user's own row is safe.
create policy org_roles_super_admin_only on public.org_roles for all
  using (exists (select 1 from public.org_roles r
                 where r.user_id = auth.uid() and r.role = 'super_admin'));

-- client_memberships: visible to anyone with access to that client;
-- writes only by super_admin OR a client_admin acting on their own client.
create policy memberships_select on public.client_memberships for select
  using (public.can_access_client(client_id));
create policy memberships_write on public.client_memberships for all
  using (
    exists (select 1 from public.org_roles
            where user_id = auth.uid() and role = 'super_admin')
    or exists (select 1 from public.client_memberships m
               where m.user_id = auth.uid()
                 and m.client_id = client_memberships.client_id
                 and m.role = 'client_admin')
  );

-- audit_log: SELECT per can_access_client.
-- NO INSERT / UPDATE / DELETE policies → default-deny for authenticated users.
-- Triggers run as SECURITY DEFINER and bypass RLS — that is the only path
-- by which rows enter this table (beginning in slice 03).
create policy audit_log_select on public.audit_log for select
  using (public.can_access_client(client_id));
