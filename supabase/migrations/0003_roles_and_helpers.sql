-- org_roles: org-wide grants (super_admin, org_team_all)
create table public.org_roles (
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('super_admin','org_team_all')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- client_memberships: per-client grants for everyone else
create table public.client_memberships (
  user_id    uuid not null references auth.users(id) on delete cascade,
  client_id  uuid not null references public.clients(id) on delete cascade,
  role       text not null check (role in ('org_team_per_client','client_admin','client_team')),
  created_at timestamptz not null default now(),
  primary key (user_id, client_id)
);
create index memberships_client_idx on public.client_memberships(client_id);

-- can_access_client: the ONE access rule, called by every RLS policy.
-- IMPORTANT: any row in org_roles (super_admin OR org_team_all) grants access
-- to EVERY client. This is intentional — org_team_all is a "spans-all-clients"
-- role (e.g. movers, organizing assistants) who Janelle wants seeing everything.
-- If you later add an org-level role that should be scoped, do NOT add it to
-- org_roles — add it to client_memberships with a per-client row instead.
create or replace function public.can_access_client(target_client_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select target_client_id is not null
    and (
      exists (select 1 from public.org_roles where user_id = auth.uid())
      or exists (select 1 from public.client_memberships
                 where user_id = auth.uid() and client_id = target_client_id)
    );
$$;

-- client_for_item: convenience for policies that need to derive client_id from item_id
create or replace function public.client_for_item(target_item_id uuid)
returns uuid
language sql
stable
as $$
  select l.client_id
  from public.items i
  join public.locations l on l.id = i.location_id
  where i.id = target_item_id;
$$;
