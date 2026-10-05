-- Include guest/share-link comments (share_comments) in the comment feed, unread
-- count, and grid badges. RLS on share_comments still limits who sees them
-- (can_create_shares_for), since every function here is security invoker.

-- "New" check that works for both tables. Guests have no author_id, so compare with
-- IS DISTINCT FROM (a plain <> against null would never count them as new).
create function public.comment_is_new_at(
  p_item_id    uuid,
  p_author_id  uuid,
  p_created_at timestamptz,
  p_client_id  uuid
)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select p_author_id is distinct from auth.uid()
    and p_created_at > coalesce(
      (select last_seen_at from public.comment_feed_reads r
        where r.user_id = auth.uid() and r.client_id = p_client_id), '-infinity'::timestamptz)
    and p_created_at > coalesce(
      (select last_seen_at from public.item_comment_reads r
        where r.user_id = auth.uid() and r.item_id = p_item_id), '-infinity'::timestamptz);
$$;

-- Team comments and share comments as one stream.
create function public.all_item_comments()
returns table (
  comment_id   uuid,
  source       text,
  item_id      uuid,
  author_id    uuid,
  author_email text,
  share_id     uuid,
  body         text,
  created_at   timestamptz
)
language sql
stable
security invoker
-- No SET clause so the planner can inline this into callers (names are fully qualified).
as $$
  select c.id, 'team', c.item_id, c.author_id, null::text, null::uuid, c.body, c.created_at
  from public.comments c
  where c.deleted_at is null
  union all
  select s.id, 'share', s.item_id, s.author_id, s.author_email, s.share_id, s.body, s.created_at
  from public.share_comments s
  where s.deleted_at is null;
$$;

-- Return type changes, so the feed function is dropped and recreated.
drop function public.client_comment_feed(uuid, text, int);

create function public.client_comment_feed(
  p_client_id uuid,
  p_query     text default null,
  p_limit     int  default 100
)
returns table (
  comment_id      uuid,
  source          text,
  body            text,
  author_id       uuid,
  author_email    text,
  share_id        uuid,
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
  select c.comment_id, c.source, c.body, c.author_id, c.author_email, c.share_id, c.created_at,
         i.id, i.title, i.status, i.cover_photo_id,
         l.id, l.name,
         public.comment_is_new_at(c.item_id, c.author_id, c.created_at, p_client_id)
  from public.all_item_comments() c
  join public.items i     on i.id = c.item_id
  join public.locations l on l.id = i.location_id
  where l.client_id = p_client_id
    and l.deleted_at is null
    and (coalesce(p_query, '') = '' or c.body ilike '%' || p_query || '%' or i.title ilike '%' || p_query || '%')
  order by c.created_at desc
  limit least(greatest(p_limit, 1), 500);
$$;

create or replace function public.client_comment_unread_count(p_client_id uuid)
returns int
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select count(*)::int
  from public.all_item_comments() c
  join public.items i     on i.id = c.item_id
  join public.locations l on l.id = i.location_id
  where l.client_id = p_client_id
    and l.deleted_at is null
    and public.comment_is_new_at(c.item_id, c.author_id, c.created_at, p_client_id);
$$;

create or replace function public.item_comment_counts(p_client_id uuid, p_item_ids uuid[])
returns table (item_id uuid, comment_count int, new_count int)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select c.item_id,
         count(*)::int,
         count(*) filter (where public.comment_is_new_at(c.item_id, c.author_id, c.created_at, p_client_id))::int
  from public.all_item_comments() c
  where c.item_id = any(p_item_ids)
  group by c.item_id;
$$;

drop function public.comment_is_new(public.comments, uuid);

grant execute on function public.comment_is_new_at(uuid, uuid, timestamptz, uuid) to authenticated;
grant execute on function public.all_item_comments() to authenticated;
grant execute on function public.client_comment_feed(uuid, text, int) to authenticated;
