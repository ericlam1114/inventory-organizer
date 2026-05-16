-- items live under a location (any depth, leaf or non-leaf)
create table public.items (
  id              uuid primary key default gen_random_uuid(),
  location_id     uuid not null references public.locations(id) on delete restrict,
  title           text not null,
  description     text,
  metadata        jsonb not null default '{}'::jsonb,
  status          text not null default 'active'
                  check (status in ('active','donated','archived')),
  cover_photo_id  uuid,  -- FK added after item_photos exists, see below
  created_at      timestamptz not null default now()
);
create index items_location_idx on public.items(location_id);

-- item_photos belong to one item; the cover is denoted by items.cover_photo_id
create table public.item_photos (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references public.items(id) on delete cascade,
  storage_path  text not null,
  uploaded_by   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index item_photos_item_idx on public.item_photos(item_id);

-- Now add the items.cover_photo_id FK (circular dep avoided by adding it after)
alter table public.items
  add constraint items_cover_photo_fk
  foreign key (cover_photo_id) references public.item_photos(id) on delete set null;

-- audit_log — append-only history of mutations. Triggers (slice 03+) populate it.
create table public.audit_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id),
  client_id    uuid not null references public.clients(id),
  target_type  text not null,  -- 'item' | 'comment' | 'share' (location never written in v1)
  target_id    uuid not null,
  action       text not null,
  before       jsonb,
  after        jsonb,
  created_at   timestamptz not null default now()
);
create index audit_client_created_idx on public.audit_log(client_id, created_at desc);
create index audit_target_idx on public.audit_log(target_type, target_id);
