-- Whole-client shares + guest comments from share recipients.
--
-- 1. shares.root_location_id becomes nullable: null = the entire client
--    (every active location). Clients have multiple top-level locations
--    with no common parent, so a single subtree root can't express "all".
-- 2. share_comments: comments left on items through a share link. Guests
--    (share recipients) have no auth.users row, so they're identified by
--    the email they authenticated with. Team members reply from the app
--    with author_id set. Guest inserts happen server-side via service role.

-- ============================================================
-- 1. Whole-client shares
-- ============================================================

alter table public.shares alter column root_location_id drop not null;

-- ============================================================
-- 2. share_comments
-- ============================================================

create table public.share_comments (
  id            uuid primary key default gen_random_uuid(),
  share_id      uuid not null references public.shares(id) on delete cascade,
  item_id       uuid not null references public.items(id) on delete cascade,
  author_email  text,
  author_id     uuid references auth.users(id),
  body          text not null check (length(btrim(body)) between 1 and 4000),
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  constraint share_comments_one_author check (
    (author_email is not null) <> (author_id is not null)
  )
);
create index share_comments_item_idx on public.share_comments(item_id, created_at);
create index share_comments_share_idx on public.share_comments(share_id);

alter table public.share_comments enable row level security;

-- Team can read share comments on items for clients they can create shares for
-- (same visibility as the shares dashboard; client_team excluded).
create policy share_comments_select on public.share_comments for select
  using (public.can_create_shares_for(public.client_for_item(item_id)));

-- Team replies: must be the author, and the share must belong to the item's client.
create policy share_comments_insert on public.share_comments for insert
  with check (
    author_id = auth.uid()
    and author_email is null
    and deleted_at is null
    and exists (
      select 1 from public.shares s
      where s.id = share_comments.share_id
        and s.client_id = public.client_for_item(share_comments.item_id)
        and public.can_create_shares_for(s.client_id)
    )
  );

-- Soft-delete (hide) any share comment for clients you manage shares for.
create policy share_comments_update on public.share_comments for update
  using (public.can_create_shares_for(public.client_for_item(item_id)))
  with check (public.can_create_shares_for(public.client_for_item(item_id)));

-- No DELETE policy: soft-delete only. Guest inserts go through service role.
