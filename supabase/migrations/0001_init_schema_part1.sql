-- profiles extends auth.users with display name, avatar, and a mirrored email
-- (email is denormalized so cron jobs don't have to JOIN auth.users)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  display_name text not null,
  avatar_url   text,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now()
);

-- profiles.email is set at app-layer insert time (e.g. in the invite flow:
-- inviteUserByEmail → upsert profiles row with email + display_name).
-- We don't mirror auth.users.email automatically because Supabase doesn't allow
-- public-schema triggers on auth.users. If an email change is needed, update
-- profiles.email manually or via an app-level RPC.

-- clients = the celebrity/household entity
create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- locations = self-referential tree under a client
create table public.locations (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null references public.clients(id) on delete cascade,
  parent_location_id  uuid references public.locations(id) on delete cascade,
  name                text not null,
  created_at          timestamptz not null default now()
);

create index locations_client_idx on public.locations(client_id);
create index locations_parent_idx on public.locations(parent_location_id);
