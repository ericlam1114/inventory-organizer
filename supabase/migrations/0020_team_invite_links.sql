-- Invite links: Janelle creates a single-use link and texts it; the person opens it,
-- picks an email + password, and gets the role baked into the invite. No email sent.
-- Redemption runs server-side with the service role (the invitee has no account yet).

create table public.team_invites (
  id          uuid primary key default gen_random_uuid(),
  token       text not null unique,
  role        text not null check (role in ('org_team_all','org_team_per_client','client_admin','client_team')),
  client_ids  uuid[] not null default '{}',
  label       text,                      -- who it's for, e.g. "Sia's assistant"
  created_by  uuid not null references auth.users(id),
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  used_at     timestamptz,
  used_by     uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  constraint team_invites_clients check (
    (role = 'org_team_all' and cardinality(client_ids) = 0)
    or (role <> 'org_team_all' and cardinality(client_ids) >= 1)
  )
);

alter table public.team_invites enable row level security;

create policy team_invites_select on public.team_invites for select
  using (public.is_super_admin());

create policy team_invites_insert on public.team_invites for insert
  with check (public.is_super_admin() and created_by = auth.uid());

create policy team_invites_update on public.team_invites for update
  using (public.is_super_admin())
  with check (public.is_super_admin());
