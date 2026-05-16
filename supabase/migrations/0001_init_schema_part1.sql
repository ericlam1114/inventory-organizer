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

-- Keep profiles.email in sync with auth.users.email
create or replace function public.sync_profile_email()
returns trigger language plpgsql security definer as $$
begin
  update public.profiles
    set email = NEW.email
    where id = NEW.id;
  return NEW;
end $$;

create trigger sync_profile_email_on_auth_user_update
  after update of email on auth.users
  for each row when (NEW.email is distinct from OLD.email)
  execute function public.sync_profile_email();

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
