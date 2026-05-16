-- Slice 02 schema additions:
--   1. custom_field_definitions — per-client dynamic metadata field schema
--   2. items_with_status view   — items enriched with needs_metadata flag

-- ============================================================
-- 1. custom_field_definitions
-- ============================================================

create table public.custom_field_definitions (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  name        text not null,                                        -- "Designer" (display label)
  key         text not null,                                        -- "designer" (snake_case)
  type        text not null check (type in ('text','date','select')),
  options     jsonb,                                                 -- for type='select': array of strings
  required    boolean not null default false,
  position    int not null,                                         -- display order, 0-indexed
  created_at  timestamptz not null default now(),
  unique(client_id, key)
);

create index custom_field_definitions_client_idx on public.custom_field_definitions(client_id);

alter table public.custom_field_definitions enable row level security;

-- SELECT: anyone with access to the client (client_admin, client_team, org roles)
create policy custom_fields_select on public.custom_field_definitions for select
  using (public.can_access_client(client_id));

-- INSERT / UPDATE / DELETE: org-side roles only (super_admin, org_team_all, org_team_per_client)
create policy custom_fields_write on public.custom_field_definitions for all
  using (
    public.is_super_admin()
    or exists (select 1 from public.org_roles where user_id = auth.uid() and role = 'org_team_all')
    or exists (select 1 from public.client_memberships
               where user_id = auth.uid()
                 and client_id = custom_field_definitions.client_id
                 and role = 'org_team_per_client')
  )
  with check (
    public.is_super_admin()
    or exists (select 1 from public.org_roles where user_id = auth.uid() and role = 'org_team_all')
    or exists (select 1 from public.client_memberships
               where user_id = auth.uid()
                 and client_id = custom_field_definitions.client_id
                 and role = 'org_team_per_client')
  );

-- ============================================================
-- 2. items_with_status view
-- ============================================================
-- security_invoker = true: the view runs under the calling user's
-- identity, so items RLS is enforced automatically.

create or replace view public.items_with_status
with (security_invoker = true) as
select
  i.*,
  exists (
    select 1 from public.custom_field_definitions d
    where d.client_id = (select client_id from public.locations where id = i.location_id)
      and d.required = true
      and (i.metadata ->> d.key is null or i.metadata ->> d.key = '')
  ) as needs_metadata
from public.items i;
