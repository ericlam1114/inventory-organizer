-- Per-client comment feed: every comment on a client's items in one place, with an
-- unread marker per user (so plain comments like "donate" are findable without @mentions).

-- ──────────────────────────────────────────────────────────────────
-- 1. Last-seen marker per (user, client)
-- ──────────────────────────────────────────────────────────────────
create table public.comment_feed_reads (
  user_id       uuid not null references auth.users(id) on delete cascade,
  client_id     uuid not null references public.clients(id) on delete cascade,
  last_seen_at  timestamptz not null default now(),
  primary key (user_id, client_id)
);

alter table public.comment_feed_reads enable row level security;

create policy comment_feed_reads_select on public.comment_feed_reads for select
  using (user_id = auth.uid());

create policy comment_feed_reads_insert on public.comment_feed_reads for insert
  with check (user_id = auth.uid() and public.can_access_client(client_id));

create policy comment_feed_reads_update on public.comment_feed_reads for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.can_access_client(client_id));

create index comments_created_idx on public.comments(created_at desc) where deleted_at is null;

-- Per-item "seen" marker: opening an item clears its new-comment flag.
create table public.item_comment_reads (
  user_id       uuid not null references auth.users(id) on delete cascade,
  item_id       uuid not null references public.items(id) on delete cascade,
  last_seen_at  timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.item_comment_reads enable row level security;

create policy item_comment_reads_select on public.item_comment_reads for select
  using (user_id = auth.uid());

create policy item_comment_reads_insert on public.item_comment_reads for insert
  with check (user_id = auth.uid() and public.can_access_client(public.client_for_item(item_id)));

create policy item_comment_reads_update on public.item_comment_reads for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.can_access_client(public.client_for_item(item_id)));

-- A comment is "new" for the caller when someone else wrote it after both the
-- caller's last feed visit for the client and their last visit to that item.
create function public.comment_is_new(p_comment public.comments, p_client_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select p_comment.author_id <> auth.uid()
    and p_comment.created_at > coalesce(
      (select last_seen_at from public.comment_feed_reads r
        where r.user_id = auth.uid() and r.client_id = p_client_id), '-infinity'::timestamptz)
    and p_comment.created_at > coalesce(
      (select last_seen_at from public.item_comment_reads r
        where r.user_id = auth.uid() and r.item_id = p_comment.item_id), '-infinity'::timestamptz);
$$;

-- ──────────────────────────────────────────────────────────────────
-- 2. Feed RPC (security invoker — RLS on comments/items/locations still applies)
-- ──────────────────────────────────────────────────────────────────
create function public.client_comment_feed(
  p_client_id uuid,
  p_query     text default null,
  p_limit     int  default 100
)
returns table (
  comment_id      uuid,
  body            text,
  author_id       uuid,
  created_at      timestamptz,
  item_id         uuid,
  item_title      text,
  item_status     text,
  cover_photo_id  uuid,
  location_id     uuid,
  location_name   text,
  is_new          boolean
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select c.id, c.body, c.author_id, c.created_at,
         i.id, i.title, i.status, i.cover_photo_id,
         l.id, l.name,
         public.comment_is_new(c, p_client_id)
  from public.comments c
  join public.items i     on i.id = c.item_id
  join public.locations l on l.id = i.location_id
  where l.client_id = p_client_id
    and l.deleted_at is null
    and c.deleted_at is null
    and (coalesce(p_query, '') = '' or c.body ilike '%' || p_query || '%' or i.title ilike '%' || p_query || '%')
  order by c.created_at desc
  limit least(greatest(p_limit, 1), 500);
$$;

-- Unread count for the nav badge
create function public.client_comment_unread_count(p_client_id uuid)
returns int
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select count(*)::int
  from public.comments c
  join public.items i     on i.id = c.item_id
  join public.locations l on l.id = i.location_id
  where l.client_id = p_client_id
    and l.deleted_at is null
    and c.deleted_at is null
    and public.comment_is_new(c, p_client_id);
$$;

-- Comment counts per item (for grid badges)
create function public.item_comment_counts(p_client_id uuid, p_item_ids uuid[])
returns table (item_id uuid, comment_count int, new_count int)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select c.item_id,
         count(*)::int,
         count(*) filter (where public.comment_is_new(c, p_client_id))::int
  from public.comments c
  where c.item_id = any(p_item_ids) and c.deleted_at is null
  group by c.item_id;
$$;

grant execute on function public.client_comment_feed(uuid, text, int) to authenticated;
grant execute on function public.client_comment_unread_count(uuid) to authenticated;
grant execute on function public.item_comment_counts(uuid, uuid[]) to authenticated;
