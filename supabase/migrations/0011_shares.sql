-- Slice 05 (S5-A): shares + share_recipients + share_auth_attempts
--               + can_create_shares_for helper + RLS + log_share_change trigger

-- ============================================================
-- 1. Tables
-- ============================================================

create table public.shares (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null references public.clients(id) on delete cascade,
  root_location_id    uuid not null references public.locations(id) on delete cascade,
  token               text not null unique,
  created_by          uuid not null references auth.users(id),
  expires_at          timestamptz not null,
  revoked_at          timestamptz,
  note                text,
  created_at          timestamptz not null default now()
);
create index shares_client_idx on public.shares(client_id);

create table public.share_recipients (
  share_id          uuid not null references public.shares(id) on delete cascade,
  email             text not null,
  invited_at        timestamptz not null default now(),
  first_viewed_at   timestamptz,
  last_viewed_at    timestamptz,
  view_count        int not null default 0,
  primary key (share_id, email)
);

create table public.share_auth_attempts (
  id           uuid primary key default gen_random_uuid(),
  token        text not null,
  ip           text not null,
  attempted_at timestamptz not null default now()
);
create index share_auth_attempts_token_ip_idx on public.share_auth_attempts(token, ip, attempted_at);

-- ============================================================
-- 2. Helper: can the current user CREATE shares for a client?
--    Intentionally NOT security definer — runs in caller context.
--    org_roles is readable for own row (migration 0007 org_roles_select).
--    client_memberships is readable via can_access_client (security definer).
-- ============================================================

create or replace function public.can_create_shares_for(target_client_id uuid)
returns boolean language sql stable as $$
  select public.is_super_admin()
    or exists (select 1 from public.org_roles where user_id = auth.uid() and role = 'org_team_all')
    or exists (
      select 1 from public.client_memberships
      where user_id = auth.uid()
        and client_id = target_client_id
        and role in ('org_team_per_client', 'client_admin')
    );
$$;

-- ============================================================
-- 3. RLS
-- ============================================================

alter table public.shares enable row level security;
alter table public.share_recipients enable row level security;
alter table public.share_auth_attempts enable row level security;

-- shares: SELECT only for users who can create them (client_team excluded)
create policy shares_select on public.shares for select
  using (public.can_create_shares_for(client_id));

create policy shares_insert on public.shares for insert
  with check (created_by = auth.uid() and public.can_create_shares_for(client_id));

-- Revoke (UPDATE setting revoked_at): creator OR org-side OR super_admin
create policy shares_update_revoke on public.shares for update
  using (created_by = auth.uid() or public.can_create_shares_for(client_id))
  with check (created_by = auth.uid() or public.can_create_shares_for(client_id));

-- No DELETE policy — shares archived via revoked_at (default-deny for DELETE)

-- share_recipients: same visibility as parent share
create policy share_recipients_select on public.share_recipients for select
  using (
    exists (
      select 1 from public.shares s
      where s.id = share_recipients.share_id
        and public.can_create_shares_for(s.client_id)
    )
  );

create policy share_recipients_insert on public.share_recipients for insert
  with check (
    exists (
      select 1 from public.shares s
      where s.id = share_recipients.share_id
        and public.can_create_shares_for(s.client_id)
    )
  );

-- share_auth_attempts: server-side only via service-role (bypasses RLS).
-- RLS-enabled + no user policies = default-deny for authenticated users.

-- ============================================================
-- 4. log_share_change trigger: audit share_create + share_revoke
-- ============================================================

create or replace function public.log_share_change()
returns trigger language plpgsql security definer as $$
declare
  v_recipients jsonb;
begin
  if TG_OP = 'INSERT' then
    select coalesce(jsonb_agg(email), '[]'::jsonb) into v_recipients
      from public.share_recipients where share_id = NEW.id;
    insert into public.audit_log (user_id, client_id, target_type, target_id, action, before, after)
    values (
      auth.uid(), NEW.client_id, 'share', NEW.id, 'share_create',
      null,
      jsonb_build_object(
        'root_location_id', NEW.root_location_id,
        'expires_at', NEW.expires_at,
        'note', NEW.note,
        'recipients', v_recipients
      )
    );
    return NEW;
  end if;

  if TG_OP = 'UPDATE' and NEW.revoked_at is distinct from OLD.revoked_at and NEW.revoked_at is not null then
    insert into public.audit_log (user_id, client_id, target_type, target_id, action, before, after)
    values (
      auth.uid(), NEW.client_id, 'share', NEW.id, 'share_revoke',
      jsonb_build_object('revoked_at', null),
      jsonb_build_object('revoked_at', NEW.revoked_at)
    );
  end if;

  return NEW;
end $$;

drop trigger if exists shares_audit on public.shares;
create trigger shares_audit
  after insert or update on public.shares
  for each row execute function public.log_share_change();
