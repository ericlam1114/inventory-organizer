-- Slice 04: comments + mentions + notifications schema + log_comment_change trigger + RPCs

-- ──────────────────────────────────────────────────────────────────
-- 1. Profiles addition
-- ──────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists email_notifications_enabled boolean not null default true;

-- ──────────────────────────────────────────────────────────────────
-- 2. Three new tables
-- ──────────────────────────────────────────────────────────────────

-- comments
create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references public.items(id) on delete cascade,
  author_id   uuid not null references auth.users(id),
  body        text not null,
  edited_at   timestamptz,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index comments_item_idx on public.comments(item_id);

-- comment_mentions (derived from body at write time)
create table public.comment_mentions (
  comment_id         uuid not null references public.comments(id) on delete cascade,
  mentioned_user_id  uuid not null references auth.users(id),
  primary key (comment_id, mentioned_user_id)
);

-- notifications
create table public.notifications (
  id                 uuid primary key default gen_random_uuid(),
  recipient_id       uuid not null references auth.users(id),
  kind               text not null check (kind in ('mention')),
  client_id          uuid not null references public.clients(id),
  source_comment_id  uuid not null references public.comments(id) on delete cascade,
  source_item_id     uuid not null references public.items(id) on delete cascade,
  read_at            timestamptz,
  email_sent_at      timestamptz,
  created_at         timestamptz not null default now()
);
create index notifications_recipient_unread_idx on public.notifications(recipient_id, read_at) where read_at is null;
create index notifications_for_cron_idx on public.notifications(created_at) where read_at is null and email_sent_at is null;

-- ──────────────────────────────────────────────────────────────────
-- 3. RLS
-- ──────────────────────────────────────────────────────────────────
alter table public.comments enable row level security;
alter table public.comment_mentions enable row level security;
alter table public.notifications enable row level security;

-- comments: SELECT
create policy comments_select on public.comments for select
  using (public.can_access_client(public.client_for_item(item_id)));

-- comments: INSERT
create policy comments_insert on public.comments for insert
  with check (
    author_id = auth.uid()
    and deleted_at is null
    and public.can_access_client(public.client_for_item(item_id))
  );

-- comments: UPDATE (edit body — author only, within 5 min, not yet deleted)
create policy comments_update_edit on public.comments for update
  using (author_id = auth.uid() and created_at > now() - interval '5 minutes' and deleted_at is null)
  with check (author_id = auth.uid() and deleted_at is null);

-- comments: UPDATE (soft-delete — author OR org-team OR super_admin)
create policy comments_update_softdelete on public.comments for update
  using (
    author_id = auth.uid()
    or public.is_super_admin()
    or exists (select 1 from public.org_roles where user_id = auth.uid() and role = 'org_team_all')
    or exists (select 1 from public.client_memberships m
               where m.user_id = auth.uid()
                 and m.client_id = public.client_for_item(comments.item_id)
                 and m.role = 'org_team_per_client')
  )
  with check (
    author_id = auth.uid()
    or public.is_super_admin()
    or exists (select 1 from public.org_roles where user_id = auth.uid() and role = 'org_team_all')
    or exists (select 1 from public.client_memberships m
               where m.user_id = auth.uid()
                 and m.client_id = public.client_for_item(comments.item_id)
                 and m.role = 'org_team_per_client')
  );

-- No DELETE policy on comments = hard deletes are denied for everyone

-- comment_mentions: SELECT (readable to anyone with client access via the parent comment)
create policy comment_mentions_select on public.comment_mentions for select
  using (
    exists (
      select 1 from public.comments c
      where c.id = comment_mentions.comment_id
        and public.can_access_client(public.client_for_item(c.item_id))
    )
  );
-- All writes to comment_mentions go through the log_comment_change trigger (security definer)
-- No INSERT/UPDATE/DELETE policies needed for user-facing writes

-- notifications: SELECT (own rows only)
create policy notifications_select on public.notifications for select
  using (recipient_id = auth.uid());

-- notifications: INSERT denied to users — trigger only (no policy = denied)

-- notifications: UPDATE (mark read — own rows only)
create policy notifications_update_read on public.notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- notifications: DELETE (own rows only — user can clear their bell)
create policy notifications_delete on public.notifications for delete
  using (recipient_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────
-- 4. log_comment_change trigger
-- ──────────────────────────────────────────────────────────────────
create or replace function public.log_comment_change()
returns trigger language plpgsql security definer as $$
declare
  v_client  uuid;
  v_old_body text;
  v_new_body text;
  v_old_mentions uuid[];
  v_new_mentions uuid[];
  v_added   uuid[];
  v_removed uuid[];
  uid       uuid;
begin
  if TG_OP = 'DELETE' then
    return OLD;
  end if;

  v_client := public.client_for_item(NEW.item_id);

  -- Audit row for create / edit / soft-delete
  if TG_OP = 'INSERT' then
    insert into public.audit_log (user_id, client_id, target_type, target_id, action, before, after)
    values (auth.uid(), v_client, 'comment', NEW.id, 'comment', null, jsonb_build_object('body', NEW.body));

  elsif TG_OP = 'UPDATE' and NEW.deleted_at is not null and OLD.deleted_at is null then
    insert into public.audit_log (user_id, client_id, target_type, target_id, action, before, after)
    values (auth.uid(), v_client, 'comment', NEW.id, 'comment_delete', jsonb_build_object('body', OLD.body), null);

  elsif TG_OP = 'UPDATE' and NEW.body is distinct from OLD.body then
    insert into public.audit_log (user_id, client_id, target_type, target_id, action, before, after)
    values (auth.uid(), v_client, 'comment', NEW.id, 'comment_edit', jsonb_build_object('body', OLD.body), jsonb_build_object('body', NEW.body));
  end if;

  -- Mention diff (only on INSERT or body-changing UPDATE that isn't a soft-delete)
  if TG_OP = 'INSERT' or (TG_OP = 'UPDATE' and NEW.body is distinct from OLD.body and NEW.deleted_at is null) then
    v_new_body := NEW.body;
    v_old_body := case when TG_OP = 'UPDATE' then OLD.body else '' end;

    -- Parse @[Name](uuid) from new body
    select coalesce(array_agg(distinct (m[1])::uuid), '{}')
    into v_new_mentions
    from regexp_matches(v_new_body, '@\[[^\]]+\]\(([0-9a-f-]{36})\)', 'g') as m;

    if TG_OP = 'UPDATE' then
      select coalesce(array_agg(distinct (m[1])::uuid), '{}')
      into v_old_mentions
      from regexp_matches(v_old_body, '@\[[^\]]+\]\(([0-9a-f-]{36})\)', 'g') as m;
    else
      v_old_mentions := '{}';
    end if;

    -- added = new - old
    select coalesce(array_agg(x), '{}') into v_added from (
      select unnest(v_new_mentions) as x except select unnest(v_old_mentions)
    ) s;

    -- removed = old - new
    select coalesce(array_agg(x), '{}') into v_removed from (
      select unnest(v_old_mentions) as x except select unnest(v_new_mentions)
    ) s;

    -- Delete removed mention rows
    if array_length(v_removed, 1) is not null then
      delete from public.comment_mentions
        where comment_id = NEW.id and mentioned_user_id = any(v_removed);
    end if;

    -- Insert added mention rows + notifications (skip self-mentions)
    if array_length(v_added, 1) is not null then
      foreach uid in array v_added loop
        if uid <> NEW.author_id then
          insert into public.comment_mentions (comment_id, mentioned_user_id)
            values (NEW.id, uid)
            on conflict do nothing;
          insert into public.notifications (recipient_id, kind, client_id, source_comment_id, source_item_id)
            values (uid, 'mention', v_client, NEW.id, NEW.item_id);
        end if;
      end loop;
    end if;
  end if;

  return NEW;
end $$;

drop trigger if exists comments_audit on public.comments;
create trigger comments_audit
  after insert or update on public.comments
  for each row execute function public.log_comment_change();

-- ──────────────────────────────────────────────────────────────────
-- 5. RPC functions
-- ──────────────────────────────────────────────────────────────────

-- edit_comment: update body + bump edited_at; trigger handles mention diff + notifications
create or replace function public.edit_comment(p_comment_id uuid, p_new_body text)
returns public.comments language plpgsql security invoker as $$
declare
  v_row public.comments;
begin
  update public.comments
    set body = p_new_body, edited_at = now()
    where id = p_comment_id
    returning * into v_row;
  return v_row;
end $$;

-- delete_comment: soft-delete; trigger logs the action
create or replace function public.delete_comment(p_comment_id uuid)
returns public.comments language plpgsql security invoker as $$
declare
  v_row public.comments;
begin
  update public.comments
    set deleted_at = now()
    where id = p_comment_id
    returning * into v_row;
  return v_row;
end $$;
