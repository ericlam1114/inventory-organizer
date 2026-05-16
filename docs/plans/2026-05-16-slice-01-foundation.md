# Slice 01 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the empty Next.js 16 repo to a working Foundation slice: Janelle logs in, creates a client, invites team members + a `client_admin`, RLS enforces who sees what.

**Architecture:** Next.js 16 App Router on Vercel. Supabase Postgres + Auth + Storage. All access enforced by row-level security via a single `can_access_client()` helper. Auth via magic link. shadcn/ui themed against the design tokens in `docs/design-guidelines.md`.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, TypeScript, Supabase (Postgres + Auth + Storage), `@supabase/ssr`, shadcn/ui (Radix), Inter font, lucide-react, Playwright (integration), pgTAP-style SQL tests.

**Reference docs (READ BEFORE CODING — per `AGENTS.md`):**
- `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` — middleware was renamed to proxy in Next.js 16
- `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` — Server Actions
- `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` — App Router conventions
- `docs/specs/01-foundation.md` — the spec this plan implements
- `docs/design-guidelines.md` — visual tokens
- `docs/env-vars.md` — env var contract

---

## Phase 0 — Tooling, theme, brand

### Task 0.1: Install runtime dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Supabase + shadcn deps**

```bash
npm install @supabase/ssr @supabase/supabase-js
npm install class-variance-authority clsx tailwind-merge lucide-react
npm install -D @types/node
```

- [ ] **Step 2: Verify install**

Run: `npm ls @supabase/ssr @supabase/supabase-js lucide-react`
Expected: each package listed at its installed version, no `UNMET DEPENDENCY` warnings.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install Supabase + shadcn runtime deps"
```

### Task 0.2: Initialize shadcn/ui

**Files:**
- Create: `components.json`
- Modify: `src/app/globals.css`
- Create: `src/lib/utils.ts`

- [ ] **Step 1: Run shadcn init**

```bash
npx shadcn@latest init
```

Answer prompts:
- Style: **Default**
- Base color: **Neutral**
- CSS variables: **Yes**
- (other prompts: accept defaults; the CLI will detect Next.js 16 + Tailwind 4)

- [ ] **Step 2: Verify shadcn config landed**

Run: `cat components.json | head -20`
Expected: JSON file showing `tailwind`, `aliases.components: "@/components"`, etc.

Run: `ls src/lib/utils.ts`
Expected: file exists with a `cn` helper.

- [ ] **Step 3: Commit**

```bash
git add components.json src/lib/utils.ts src/app/globals.css
git commit -m "chore: initialize shadcn/ui"
```

### Task 0.3: Apply design tokens to Tailwind config

**Files:**
- Modify: `src/app/globals.css` (Tailwind 4 uses CSS @theme — token block lives here, not in a JS config)

- [ ] **Step 1: Replace the shadcn-injected color variables with our tokens**

Open `src/app/globals.css`. Inside the existing `@theme` block (or add one if shadcn didn't), replace color variables with:

```css
@theme {
  --color-paper: #FAF8F5;
  --color-surface: #FFFFFF;
  --color-ink: #1A1A1A;
  --color-ink2: #4A4A4A;
  --color-ink3: #8A8A8A;
  --color-rule: #E8E4DC;
  --color-sand: #C8B89A;
  --color-sand2: #E8DFCB;
  --color-success: #5B7C5A;
  --color-warning: #C29551;
  --color-danger: #A6433A;
  --color-info: #6B7A88;

  --font-sans: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;

  --radius-sm: 2px;
  --radius-md: 4px;
}

body {
  background-color: var(--color-paper);
  color: var(--color-ink);
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 24px;
}

.tabular-nums {
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 2: Verify Tailwind picks up the tokens**

Edit `src/app/page.tsx` temporarily to add `<div className="bg-paper text-ink p-12">Test</div>`. Run `npm run dev`. Confirm the page background is warm-white and text is charcoal. Revert the temporary edit.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(design): apply brand tokens to Tailwind theme"
```

### Task 0.4: Place brand assets

**Files:**
- Verify exists: `public/logo.svg` (already downloaded earlier this session)
- Create: `public/logo-light.svg` (rename of existing)
- Create: `public/logo-dark.svg` (tinted variant — placeholder)

- [ ] **Step 1: Rename and create the dark variant**

```bash
mv public/logo.svg public/logo-light.svg
sed 's/#ffffff/#1A1A1A/g' public/logo-light.svg > public/logo-dark.svg
```

- [ ] **Step 2: Verify both files exist and differ in fill color**

Run: `grep -o 'fill: #[A-Fa-f0-9]*' public/logo-light.svg public/logo-dark.svg`
Expected: `logo-light.svg:fill: #ffffff` and `logo-dark.svg:fill: #1A1A1A`.

- [ ] **Step 3: Commit**

```bash
git add public/logo-light.svg public/logo-dark.svg
git commit -m "feat(brand): add light + dark logo variants"
```

### Task 0.5: Install Supabase CLI and link the project

**Files:**
- Create: `supabase/config.toml` (created by `supabase init`)

- [ ] **Step 1: Install Supabase CLI (if not already)**

```bash
brew install supabase/tap/supabase || npm install -g supabase
supabase --version
```

- [ ] **Step 2: Initialize Supabase locally**

```bash
supabase init
```

Accept the defaults; this creates `supabase/config.toml` and a `supabase/` directory.

- [ ] **Step 3: Link to the remote project**

```bash
supabase link --project-ref sdljytzqvmaldukwtopt
```

Enter the DB password when prompted (from Supabase dashboard → Project Settings → Database).

- [ ] **Step 4: Verify link**

Run: `supabase projects list`
Expected: the inventory-organizer project shows a checkmark in the Linked column.

- [ ] **Step 5: Commit**

```bash
git add supabase/config.toml supabase/.gitignore
git commit -m "chore: initialize and link Supabase CLI"
```

---

## Phase 1 — Database schema via migrations

> **Pattern note:** every migration is paired with one or more SQL assertion files in `supabase/tests/`. Run `supabase db test` to execute them locally.

### Task 1.1: Migration 0001 — profiles + clients + locations

**Files:**
- Create: `supabase/migrations/0001_init_schema_part1.sql`
- Create: `supabase/tests/0001_schema_part1_test.sql`

- [ ] **Step 1: Write the assertion test first**

Create `supabase/tests/0001_schema_part1_test.sql`:

```sql
begin;
select plan(6);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'clients', 'clients table exists');
select has_table('public', 'locations', 'locations table exists');

select has_column('public', 'profiles', 'email', 'profiles has email');
select has_column('public', 'profiles', 'deleted_at', 'profiles has deleted_at');

select col_is_fk('public', 'locations', 'parent_location_id',
                 'locations.parent_location_id is a foreign key');

select * from finish();
rollback;
```

- [ ] **Step 2: Write the migration**

Create `supabase/migrations/0001_init_schema_part1.sql`:

```sql
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
```

- [ ] **Step 3: Push migration + run test**

```bash
supabase db push
supabase test db
```

Expected: migration applies cleanly, all 6 assertions in `0001_schema_part1_test.sql` pass.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_init_schema_part1.sql supabase/tests/0001_schema_part1_test.sql
git commit -m "feat(db): profiles, clients, locations tables (migration 0001)"
```

### Task 1.2: Migration 0002 — items + item_photos + audit_log

**Files:**
- Create: `supabase/migrations/0002_init_schema_part2.sql`
- Create: `supabase/tests/0002_schema_part2_test.sql`

- [ ] **Step 1: Write the assertion test first**

Create `supabase/tests/0002_schema_part2_test.sql`:

```sql
begin;
select plan(7);

select has_table('public', 'items', 'items table exists');
select has_table('public', 'item_photos', 'item_photos table exists');
select has_table('public', 'audit_log', 'audit_log table exists');

select col_is_fk('public', 'items', 'cover_photo_id',
                 'items.cover_photo_id is a foreign key');
select col_is_fk('public', 'items', 'location_id',
                 'items.location_id is a foreign key');

select col_has_check('public', 'items', 'status',
                     'items.status has a CHECK constraint');

select col_type_is('public', 'items', 'metadata', 'jsonb',
                   'items.metadata is jsonb');

select * from finish();
rollback;
```

- [ ] **Step 2: Write the migration**

Create `supabase/migrations/0002_init_schema_part2.sql`:

```sql
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
  uploaded_by   uuid not null references auth.users(id),
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
```

- [ ] **Step 3: Push + test**

```bash
supabase db push
supabase test db
```

Expected: assertions in `0002_schema_part2_test.sql` all pass.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0002_init_schema_part2.sql supabase/tests/0002_schema_part2_test.sql
git commit -m "feat(db): items, item_photos, audit_log tables (migration 0002)"
```

### Task 1.3: Migration 0003 — role/membership tables + helper functions

**Files:**
- Create: `supabase/migrations/0003_roles_and_helpers.sql`
- Create: `supabase/tests/0003_roles_and_helpers_test.sql`

- [ ] **Step 1: Write the assertion test first**

Create `supabase/tests/0003_roles_and_helpers_test.sql`:

```sql
begin;
select plan(5);

select has_table('public', 'org_roles', 'org_roles table exists');
select has_table('public', 'client_memberships', 'client_memberships exists');

select has_function('public', 'can_access_client', array['uuid'],
                    'can_access_client(uuid) function exists');
select has_function('public', 'client_for_item', array['uuid'],
                    'client_for_item(uuid) function exists');

select col_has_check('public', 'org_roles', 'role',
                     'org_roles.role has a CHECK constraint');

select * from finish();
rollback;
```

- [ ] **Step 2: Write the migration**

Create `supabase/migrations/0003_roles_and_helpers.sql`:

```sql
-- org_roles: org-wide grants (super_admin, org_team_all)
create table public.org_roles (
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('super_admin','org_team_all')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- client_memberships: per-client grants for everyone else
create table public.client_memberships (
  user_id    uuid not null references auth.users(id) on delete cascade,
  client_id  uuid not null references public.clients(id) on delete cascade,
  role       text not null check (role in ('org_team_per_client','client_admin','client_team')),
  created_at timestamptz not null default now(),
  primary key (user_id, client_id)
);
create index memberships_client_idx on public.client_memberships(client_id);

-- can_access_client: the ONE access rule, called by every RLS policy
create or replace function public.can_access_client(target_client_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.org_roles where user_id = auth.uid()
  ) or exists (
    select 1 from public.client_memberships
    where user_id = auth.uid() and client_id = target_client_id
  );
$$;

-- client_for_item: convenience for policies that need to derive client_id from item_id
create or replace function public.client_for_item(target_item_id uuid)
returns uuid
language sql
stable
as $$
  select l.client_id
  from public.items i
  join public.locations l on l.id = i.location_id
  where i.id = target_item_id;
$$;
```

- [ ] **Step 3: Push + test**

```bash
supabase db push
supabase test db
```

Expected: assertions pass.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0003_roles_and_helpers.sql supabase/tests/0003_roles_and_helpers_test.sql
git commit -m "feat(db): org_roles, client_memberships, access helpers (migration 0003)"
```

### Task 1.4: Migration 0004 — RLS policies on every table

**Files:**
- Create: `supabase/migrations/0004_rls_policies.sql`
- Create: `supabase/tests/0004_rls_test.sql`

- [ ] **Step 1: Write the RLS test first (the load-bearing test of the project)**

Create `supabase/tests/0004_rls_test.sql`:

```sql
begin;
select plan(8);

-- Setup: two users, two clients, two locations, two items
-- janelle = super_admin (sees both clients)
-- dom = org_team_per_client for client_a only (sees only A)
-- See helper at end of file for user-creation pattern

-- (helper: create a user with role)
\set janelle_id '\'00000000-0000-0000-0000-000000000001\''
\set dom_id     '\'00000000-0000-0000-0000-000000000002\''
\set client_a   '\'00000000-0000-0000-0000-0000000000aa\''
\set client_b   '\'00000000-0000-0000-0000-0000000000bb\''

-- Insert auth users (using direct insert into auth.users for tests)
insert into auth.users (id, email, role) values
  (:janelle_id::uuid, 'janelle@test', 'authenticated'),
  (:dom_id::uuid,     'dom@test',     'authenticated');

insert into public.profiles (id, email, display_name) values
  (:janelle_id::uuid, 'janelle@test', 'Janelle'),
  (:dom_id::uuid,     'dom@test',     'Dom');

insert into public.org_roles (user_id, role) values (:janelle_id::uuid, 'super_admin');

insert into public.clients (id, name) values
  (:client_a::uuid, 'Client A'),
  (:client_b::uuid, 'Client B');

insert into public.client_memberships (user_id, client_id, role) values
  (:dom_id::uuid, :client_a::uuid, 'org_team_per_client');

-- Test as janelle (super_admin): can see both clients
set local role authenticated;
set local request.jwt.claims = json_build_object('sub', :janelle_id::text)::text;
select results_eq(
  'select count(*) from public.clients',
  array[2::bigint],
  'super_admin sees both clients'
);

-- Test as dom (per-client A only): sees only A
set local request.jwt.claims = json_build_object('sub', :dom_id::text)::text;
select results_eq(
  'select count(*) from public.clients',
  array[1::bigint],
  'org_team_per_client sees only assigned client'
);

select results_eq(
  format('select id from public.clients'),
  format('select %L::uuid', :client_a),
  'org_team_per_client sees client A specifically'
);

-- Dom cannot INSERT a new client (super_admin only)
prepare dom_insert as insert into public.clients (name) values ('rogue');
select throws_ok('execute dom_insert', NULL, NULL,
                 'org_team_per_client cannot create clients');

-- audit_log: no role can UPDATE or DELETE rows
insert into public.audit_log (client_id, target_type, target_id, action)
  values (:client_a::uuid, 'item', gen_random_uuid(), 'create');

set local request.jwt.claims = json_build_object('sub', :janelle_id::text)::text;
prepare janelle_update_audit as
  update public.audit_log set action = 'evil' where target_type = 'item';
select throws_ok('execute janelle_update_audit', NULL, NULL,
                 'even super_admin cannot UPDATE audit_log');

prepare janelle_delete_audit as
  delete from public.audit_log where target_type = 'item';
select throws_ok('execute janelle_delete_audit', NULL, NULL,
                 'even super_admin cannot DELETE audit_log');

-- Direct INSERT into audit_log denied (only triggers via security definer)
prepare janelle_insert_audit as
  insert into public.audit_log (client_id, target_type, target_id, action)
  values (:client_a::uuid, 'item', gen_random_uuid(), 'fake');
select throws_ok('execute janelle_insert_audit', NULL, NULL,
                 'authenticated user cannot INSERT audit_log directly');

select * from finish();
rollback;
```

- [ ] **Step 2: Run the test — expect it to FAIL (no policies yet)**

```bash
supabase test db
```

Expected: assertions fail because RLS isn't enabled / no policies defined.

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/0004_rls_policies.sql`:

```sql
-- Enable RLS on every public table
alter table public.profiles            enable row level security;
alter table public.clients             enable row level security;
alter table public.locations           enable row level security;
alter table public.items               enable row level security;
alter table public.item_photos         enable row level security;
alter table public.org_roles           enable row level security;
alter table public.client_memberships  enable row level security;
alter table public.audit_log           enable row level security;

-- profiles: every authenticated user can read all profiles (display names),
-- update only their own.
create policy profiles_select on public.profiles for select
  using (auth.uid() is not null);
create policy profiles_update_own on public.profiles for update
  using (auth.uid() = id);

-- clients: visible per can_access_client; only super_admin can write
create policy clients_select on public.clients for select
  using (public.can_access_client(id));
create policy clients_insert on public.clients for insert
  with check (exists (select 1 from public.org_roles
                      where user_id = auth.uid() and role = 'super_admin'));
create policy clients_update on public.clients for update
  using (exists (select 1 from public.org_roles
                 where user_id = auth.uid() and role = 'super_admin'));
create policy clients_delete on public.clients for delete
  using (exists (select 1 from public.org_roles
                 where user_id = auth.uid() and role = 'super_admin'));

-- locations: SELECT/INSERT/UPDATE/DELETE gated by can_access_client.
-- Write permissions further filtered to org_* roles in app layer (or add CHECK on role later).
create policy locations_select on public.locations for select
  using (public.can_access_client(client_id));
create policy locations_write on public.locations for all
  using (public.can_access_client(client_id))
  with check (public.can_access_client(client_id));

-- items: same pattern, gated via location's client_id
create policy items_select on public.items for select
  using (public.can_access_client(public.client_for_item(id)));
create policy items_write on public.items for all
  using (public.can_access_client(public.client_for_item(id)))
  with check (public.can_access_client(public.client_for_item(id)));

-- item_photos: same pattern, gated via item
create policy item_photos_select on public.item_photos for select
  using (public.can_access_client(public.client_for_item(item_id)));
create policy item_photos_write on public.item_photos for all
  using (public.can_access_client(public.client_for_item(item_id)))
  with check (public.can_access_client(public.client_for_item(item_id)));

-- org_roles: only super_admin can read/write
create policy org_roles_super_admin_only on public.org_roles for all
  using (exists (select 1 from public.org_roles r
                 where r.user_id = auth.uid() and r.role = 'super_admin'));

-- client_memberships: visible to anyone with access to that client; writes by super_admin or client_admin (for their client)
create policy memberships_select on public.client_memberships for select
  using (public.can_access_client(client_id));
create policy memberships_write on public.client_memberships for all
  using (
    exists (select 1 from public.org_roles
            where user_id = auth.uid() and role = 'super_admin')
    or exists (select 1 from public.client_memberships m
               where m.user_id = auth.uid()
                 and m.client_id = client_memberships.client_id
                 and m.role = 'client_admin')
  );

-- audit_log: SELECT per can_access_client; NO INSERT/UPDATE/DELETE for authenticated.
-- (Triggers run as security definer and bypass RLS; that's how rows land.)
create policy audit_log_select on public.audit_log for select
  using (public.can_access_client(client_id));
-- No INSERT/UPDATE/DELETE policies → default-deny.
```

- [ ] **Step 4: Push + re-run tests**

```bash
supabase db push
supabase test db
```

Expected: all RLS assertions in `0004_rls_test.sql` now PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0004_rls_policies.sql supabase/tests/0004_rls_test.sql
git commit -m "feat(db): RLS policies enforced on every table (migration 0004)"
```

### Task 1.5: Migration 0005 — Storage bucket + storage RLS

**Files:**
- Create: `supabase/migrations/0005_storage_bucket.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0005_storage_bucket.sql`:

```sql
-- Create the private bucket for inventory photos
insert into storage.buckets (id, name, public)
values ('inventory-photos', 'inventory-photos', false)
on conflict (id) do nothing;

-- Storage RLS: same access rule, applied via the client_id segment in the path.
-- Path format: clients/{client_id}/items/{item_id}/{uuid}.{ext}
-- We extract the client_id with split_part on the object name.

create policy "inventory-photos read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'inventory-photos'
    and public.can_access_client((split_part(name, '/', 2))::uuid)
  );

create policy "inventory-photos write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'inventory-photos'
    and public.can_access_client((split_part(name, '/', 2))::uuid)
  );

create policy "inventory-photos update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'inventory-photos'
    and public.can_access_client((split_part(name, '/', 2))::uuid)
  );

create policy "inventory-photos delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'inventory-photos'
    and public.can_access_client((split_part(name, '/', 2))::uuid)
  );
```

- [ ] **Step 2: Push migration**

```bash
supabase db push
```

Expected: applies cleanly.

- [ ] **Step 3: Manual verification in Supabase Studio**

Open the Supabase dashboard → Storage → confirm `inventory-photos` bucket exists, is private, and has 4 policies attached. (Storage policies are awkward to assert in pgTAP; manual check is acceptable for v1.)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0005_storage_bucket.sql
git commit -m "feat(db): inventory-photos storage bucket + RLS (migration 0005)"
```

### Task 1.6: Migration 0006 — seed Janelle as super_admin

**Files:**
- Create: `supabase/migrations/0006_seed_super_admin.sql`

- [ ] **Step 1: Add the env var to `.env.local`**

Append to `.env.local`:

```
SEED_SUPER_ADMIN_EMAIL=janelle@straightenuphome.com
```

(Replace with Janelle's real email when known.)

- [ ] **Step 2: Write the migration**

Create `supabase/migrations/0006_seed_super_admin.sql`:

```sql
-- Seed the super_admin. Reads email from a Supabase Vault secret, not an env var,
-- so this works against the linked remote project.
-- For prototype: store `seed_super_admin_email` in Supabase Vault before running.
--   supabase secrets set seed_super_admin_email=janelle@example.com
--
-- This migration is idempotent: re-running won't create duplicate users.

do $$
declare
  v_email text;
  v_uid   uuid;
begin
  -- Read from vault
  select decrypted_secret into v_email
  from vault.decrypted_secrets
  where name = 'seed_super_admin_email'
  limit 1;

  if v_email is null then
    raise notice 'seed_super_admin_email not set in vault; skipping seed';
    return;
  end if;

  -- Skip if a profile with this email already exists
  if exists (select 1 from public.profiles where email = v_email) then
    raise notice 'super_admin profile for % already exists; skipping', v_email;
    return;
  end if;

  -- Create the auth user (Supabase Admin API equivalent done via SQL).
  -- Generates a uuid; password is intentionally NULL — magic-link login only.
  insert into auth.users (id, instance_id, email, email_confirmed_at, role, aud, created_at, updated_at)
  values (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    v_email,
    now(),
    'authenticated',
    'authenticated',
    now(),
    now()
  )
  returning id into v_uid;

  -- Profile row + super_admin role
  insert into public.profiles (id, email, display_name) values (v_uid, v_email, 'Janelle Lam');
  insert into public.org_roles (user_id, role) values (v_uid, 'super_admin');

  raise notice 'Seeded super_admin: % (%)', v_email, v_uid;
end $$;
```

- [ ] **Step 3: Set the vault secret + push migration**

```bash
supabase secrets set seed_super_admin_email=janelle@straightenuphome.com
supabase db push
```

Expected: NOTICE "Seeded super_admin: janelle@straightenuphome.com (uuid)".

- [ ] **Step 4: Verify**

In Supabase Studio → SQL editor:

```sql
select p.email, p.display_name, r.role
from public.profiles p
join public.org_roles r on r.user_id = p.id;
```

Expected: one row, janelle's email + super_admin.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0006_seed_super_admin.sql .env.local
# NOTE: .env.local is gitignored; the SEED_SUPER_ADMIN_EMAIL var is just for local reference.
# The actual seed reads from Supabase Vault, not env.
git commit -m "feat(db): seed Janelle as super_admin via vault secret (migration 0006)"
```

---

## Phase 2 — Auth scaffolding

### Task 2.1: Create Supabase clients (server + browser)

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`

- [ ] **Step 1: Browser client**

Create `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Server client (cookies-aware)**

Create `src/lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore (proxy handles refresh)
          }
        },
      },
    }
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/client.ts src/lib/supabase/server.ts
git commit -m "feat(auth): Supabase client factories (server + browser)"
```

### Task 2.2: Create proxy.ts for session refresh

**Files:**
- Create: `src/proxy.ts` (Next.js 16's renamed middleware.ts)
- Create: `src/lib/supabase/proxy-client.ts`

- [ ] **Step 1: Read the Next.js 16 proxy doc**

Run: `cat node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md | head -80`
Confirm: proxy.ts replaces middleware.ts; signature is identical.

- [ ] **Step 2: Create the proxy-aware Supabase client helper**

Create `src/lib/supabase/proxy-client.ts`:

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect logged-out users away from /clients/* and /settings/*
  const pathname = request.nextUrl.pathname;
  const isAppRoute = pathname.startsWith('/clients') || pathname.startsWith('/settings');
  if (!user && isAppRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return response;
}
```

- [ ] **Step 3: Write proxy.ts**

Create `src/proxy.ts`:

```typescript
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy-client';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on all routes except static assets and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

- [ ] **Step 4: Verify proxy loads**

Run: `npm run dev`
Visit `http://localhost:3000/clients` (you're not logged in yet).
Expected: redirect to `/login` (which will 404 — created in next task).

- [ ] **Step 5: Commit**

```bash
git add src/proxy.ts src/lib/supabase/proxy-client.ts
git commit -m "feat(auth): proxy.ts session refresh + redirect to /login"
```

### Task 2.3: Build /login page (magic-link form)

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/login/actions.ts`
- Create: `src/app/(auth)/layout.tsx`

- [ ] **Step 1: Auth layout (centered card on paper)**

Create `src/app/(auth)/layout.tsx`:

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-paper p-8">
      <div className="w-full max-w-[420px] bg-surface border border-rule rounded-[4px] p-8 lg:p-12">
        {children}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Server action for magic-link send**

Create `src/app/(auth)/login/actions.ts`:

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';

export async function sendMagicLink(_prev: { error?: string; sent?: boolean }, formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email) return { error: 'Enter an email' };

  const supabase = await createClient();

  // shouldCreateUser=false → Supabase refuses if no user exists for this email,
  // so we don't have to pre-check profiles ourselves (and pre-checks would fail
  // anyway because the login caller isn't authenticated yet → RLS blocks read).
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    // Generic message — don't leak whether the email exists or not.
    return { error: 'No access — ask Janelle for an invite.' };
  }
  return { sent: true };
}
```

- [ ] **Step 3: Login page UI**

Create `src/app/(auth)/login/page.tsx`:

```tsx
'use client';

import Image from 'next/image';
import { useActionState } from 'react';
import { sendMagicLink } from './actions';

export default function LoginPage() {
  const [state, action, pending] = useActionState(sendMagicLink, {});

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <Image src="/logo-dark.svg" alt="Straighten Up" width={180} height={48} priority />
        <p className="text-ink3 text-[12px] tracking-wide">Inventory · Straighten Up Home</p>
      </div>

      {state.sent ? (
        <p className="text-center text-ink2 text-[15px]">
          Check your email for a sign-in link.
        </p>
      ) : (
        <form action={action} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-[13px] font-medium mb-2">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px] focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
            />
          </div>
          {state.error && <p className="text-danger text-[13px]">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-ink text-paper py-2.5 rounded-[2px] hover:bg-ink2 disabled:opacity-60"
          >
            {pending ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npm run dev`. Visit `http://localhost:3000/login`. Confirm:
- Dark logo renders centered on warm-white card
- "Inventory · Straighten Up Home" tagline shows in `ink3`
- Form has email input + button styled per design tokens
- Submitting an unknown email shows "No access — ask Janelle for an invite."

- [ ] **Step 5: Commit**

```bash
git add src/app/\(auth\)/
git commit -m "feat(auth): /login page with magic-link send"
```

### Task 2.4: Build /auth/callback route handler

**Files:**
- Create: `src/app/auth/callback/route.ts`

- [ ] **Step 1: Write the route handler**

Create `src/app/auth/callback/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/clients';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(new URL('/login?error=callback', url.origin));
}
```

- [ ] **Step 2: Add NEXT_PUBLIC_APP_URL to .env.local**

Append:

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 3: End-to-end verification**

Run: `npm run dev`.
- Visit `/login`, submit Janelle's seeded email.
- Check the Supabase project's Auth → Logs for the magic link OR check the inbox.
- Click the link, verify it lands on `/clients` (which will 404 next).

- [ ] **Step 4: Commit**

```bash
git add src/app/auth/callback/route.ts .env.local
git commit -m "feat(auth): /auth/callback exchanges OTP for session"
```

---

## Phase 3 — App shell + Brand

### Task 3.1: Create the Brand component

**Files:**
- Create: `src/components/Brand.tsx`

- [ ] **Step 1: Component**

Create `src/components/Brand.tsx`:

```tsx
import Image from 'next/image';

export function Brand({ variant = 'dark', size = 28 }: { variant?: 'light' | 'dark'; size?: number }) {
  const src = variant === 'light' ? '/logo-light.svg' : '/logo-dark.svg';
  return (
    <Image
      src={src}
      alt="Straighten Up"
      width={size * (3850 / 1134)}
      height={size}
      priority
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Brand.tsx
git commit -m "feat(brand): Brand component with light/dark variant picker"
```

### Task 3.2: Create the AppShell (dark header band layout)

**Files:**
- Create: `src/app/(app)/layout.tsx`
- Create: `src/components/AppShell.tsx`

- [ ] **Step 1: AppShell component**

Create `src/components/AppShell.tsx`:

```tsx
import Link from 'next/link';
import { Bell, User } from 'lucide-react';
import { Brand } from './Brand';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <header className="bg-ink h-14 lg:h-16 flex items-center justify-between px-6 lg:px-8">
        <Link href="/clients" className="flex items-center">
          <Brand variant="light" size={28} />
        </Link>
        <div className="flex items-center gap-4">
          {/* Client switcher placeholder — built in Task 4.1 */}
          <Bell className="text-paper" size={20} aria-label="Notifications" />
          <User className="text-paper" size={20} aria-label="Profile" />
        </div>
      </header>
      <div className="flex-1 p-8 lg:p-12">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: App layout wraps with AppShell + auth-gate**

Create `src/app/(app)/layout.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/AppShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return <AppShell>{children}</AppShell>;
}
```

- [ ] **Step 3: Update root layout to use Inter via next/font**

Modify `src/app/layout.tsx`:

```tsx
import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata = {
  title: 'Straighten Up · Inventory',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npm run dev`. Log in. Visit `/clients` (will still 404 routes-wise but the layout should render with the dark header band + Brand logo).

- [ ] **Step 5: Commit**

```bash
git add src/components/AppShell.tsx src/app/\(app\)/layout.tsx src/app/layout.tsx
git commit -m "feat(shell): AppShell with dark header band + auth gate"
```

---

## Phase 4 — Client picker, detail stub, and invite forms

### Task 4.1: Client picker / list page

**Files:**
- Create: `src/app/(app)/clients/page.tsx`

- [ ] **Step 1: Page (server component, RLS does the filtering)**

Create `src/app/(app)/clients/page.tsx`:

```tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name')
    .order('name');

  if (error) throw error;

  // If user has access to exactly 1 client, jump straight in.
  if (clients && clients.length === 1) {
    redirect(`/clients/${clients[0].id}`);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-[32px] font-medium leading-[40px]">Clients</h1>
      {clients && clients.length === 0 ? (
        <p className="text-ink3">You have no access. Ask Janelle for an invite.</p>
      ) : (
        <ul className="space-y-3">
          {clients?.map((c) => (
            <li key={c.id}>
              <Link
                href={`/clients/${c.id}`}
                className="block bg-surface border border-rule rounded-[4px] p-6 hover:bg-paper"
              >
                <span className="text-[18px] font-medium">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/clients/page.tsx
git commit -m "feat(clients): /clients picker page (RLS-filtered)"
```

### Task 4.2: Client detail stub

**Files:**
- Create: `src/app/(app)/clients/[clientId]/page.tsx`

- [ ] **Step 1: Stub page**

Create `src/app/(app)/clients/[clientId]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function ClientDetailPage({
  params,
}: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const supabase = await createClient();
  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('id', clientId)
    .maybeSingle();

  if (!client) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-[32px] font-medium leading-[40px]">{client.name}</h1>
      <p className="text-ink2 text-[15px]">
        Locations + inventory will land here in slice 02. For now, this is just proof RLS is working.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify end-to-end with Janelle's seeded account**

Run: `npm run dev`. Log in as Janelle. Land on `/clients` (empty list). 
Then manually create a test client in Supabase Studio:

```sql
insert into public.clients (name) values ('Test Client');
```

Refresh `/clients`. Confirm "Test Client" appears, click it, confirm the detail page renders.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/clients/\[clientId\]/page.tsx
git commit -m "feat(clients): client detail stub (replaced in slice 02)"
```

### Task 4.3: Create-client server action (super_admin only)

**Files:**
- Create: `src/app/(app)/clients/new/page.tsx`
- Create: `src/app/(app)/clients/new/actions.ts`

- [ ] **Step 1: Server action**

Create `src/app/(app)/clients/new/actions.ts`:

```typescript
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function createClientAction(_prev: { error?: string }, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'Name is required' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clients')
    .insert({ name })
    .select('id')
    .single();

  if (error) return { error: error.message };

  revalidatePath('/clients');
  redirect(`/clients/${data.id}`);
}
```

- [ ] **Step 2: Form page**

Create `src/app/(app)/clients/new/page.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import { createClientAction } from './actions';

export default function NewClientPage() {
  const [state, action, pending] = useActionState(createClientAction, {});

  return (
    <div className="max-w-md mx-auto space-y-8">
      <h1 className="text-[32px] font-medium leading-[40px]">New client</h1>
      <form action={action} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-[13px] font-medium mb-2">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px] focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
          />
        </div>
        {state.error && <p className="text-danger text-[13px]">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full bg-ink text-paper py-2.5 rounded-[2px] hover:bg-ink2 disabled:opacity-60"
        >
          {pending ? 'Creating…' : 'Create client'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Add a "+ New client" link on /clients (super_admin only)**

Modify `src/app/(app)/clients/page.tsx` (replace the h1 line):

```tsx
import Link from 'next/link';
// ... existing imports

// inside the component, after fetching clients, before the empty/list render:
const { data: { user } } = await supabase.auth.getUser();
const { data: roles } = await supabase
  .from('org_roles')
  .select('role')
  .eq('user_id', user!.id)
  .eq('role', 'super_admin')
  .maybeSingle();
const isSuperAdmin = !!roles;

// replace the standalone <h1>:
<div className="flex items-center justify-between">
  <h1 className="text-[32px] font-medium leading-[40px]">Clients</h1>
  {isSuperAdmin && (
    <Link
      href="/clients/new"
      className="bg-ink text-paper px-4 py-2.5 rounded-[2px] hover:bg-ink2 text-[13px] font-medium"
    >
      + New client
    </Link>
  )}
</div>
```

- [ ] **Step 4: Verify**

Run: `npm run dev`. Logged in as Janelle, visit `/clients`. Click "+ New client". Submit a name. Confirm:
- New client appears in the list (or you're redirected to its detail)
- RLS prevented non-super-admins from creating (verify by inserting an org_team_per_client user and trying)

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/clients/new/ src/app/\(app\)/clients/page.tsx
git commit -m "feat(clients): create-client form (super_admin only)"
```

### Task 4.4: Invite-user server action (super_admin path)

**Files:**
- Create: `src/lib/supabase/admin.ts`
- Create: `src/app/(app)/settings/team/page.tsx`
- Create: `src/app/(app)/settings/team/actions.ts`

- [ ] **Step 1: Admin (service-role) Supabase client**

Create `src/lib/supabase/admin.ts`:

```typescript
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
```

- [ ] **Step 2: Invite server action**

Create `src/app/(app)/settings/team/actions.ts`:

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type InviteInput = {
  email: string;
  displayName: string;
  scope: 'all_clients' | 'per_client';
  clientIds?: string[]; // required if scope = per_client
};

export async function inviteOrgTeamMember(
  _prev: { error?: string; sent?: boolean },
  formData: FormData
) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const displayName = String(formData.get('displayName') ?? '').trim();
  const scope = String(formData.get('scope') ?? '') as InviteInput['scope'];
  const clientIds = (formData.getAll('clientIds') as string[]) ?? [];

  if (!email || !displayName) return { error: 'Email and display name are required.' };
  if (scope === 'per_client' && clientIds.length === 0)
    return { error: 'Pick at least one client.' };

  // Verify caller is super_admin (RLS will also enforce, but fail fast with a clear error)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: isAdmin } = await supabase
    .from('org_roles')
    .select('role')
    .eq('user_id', user!.id)
    .eq('role', 'super_admin')
    .maybeSingle();
  if (!isAdmin) return { error: 'Not authorized.' };

  // Use admin client to invite + create profile + insert role
  const admin = createAdminClient();
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  });
  if (inviteErr) return { error: inviteErr.message };

  await admin.from('profiles').upsert({ id: invited.user.id, email, display_name: displayName });

  if (scope === 'all_clients') {
    await admin.from('org_roles').insert({ user_id: invited.user.id, role: 'org_team_all' });
  } else {
    await admin.from('client_memberships').insert(
      clientIds.map((client_id) => ({
        user_id: invited.user.id,
        client_id,
        role: 'org_team_per_client',
      }))
    );
  }

  revalidatePath('/settings/team');
  return { sent: true };
}
```

- [ ] **Step 3: Team-settings page UI**

Create `src/app/(app)/settings/team/page.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import { inviteOrgTeamMember } from './actions';
import { useState } from 'react';

// In production, pass clients from a server-component parent.
// For this stub, fetch via the browser client.
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function TeamSettingsPage() {
  const [state, action, pending] = useActionState(inviteOrgTeamMember, {});
  const [scope, setScope] = useState<'all_clients' | 'per_client'>('all_clients');
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('clients').select('id, name').order('name').then(({ data }) => {
      if (data) setClients(data);
    });
  }, []);

  return (
    <div className="max-w-md mx-auto space-y-8">
      <h1 className="text-[32px] font-medium leading-[40px]">Invite team member</h1>
      {state.sent ? (
        <p className="text-ink2">Invite sent. They'll get an email with a magic link.</p>
      ) : (
        <form action={action} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-[13px] font-medium mb-2">Email</label>
            <input id="email" name="email" type="email" required
              className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px]" />
          </div>
          <div>
            <label htmlFor="displayName" className="block text-[13px] font-medium mb-2">Display name</label>
            <input id="displayName" name="displayName" type="text" required
              className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px]" />
          </div>
          <div>
            <label className="block text-[13px] font-medium mb-2">Scope</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[14px]">
                <input type="radio" name="scope" value="all_clients"
                  checked={scope === 'all_clients'}
                  onChange={() => setScope('all_clients')} />
                All clients
              </label>
              <label className="flex items-center gap-2 text-[14px]">
                <input type="radio" name="scope" value="per_client"
                  checked={scope === 'per_client'}
                  onChange={() => setScope('per_client')} />
                Specific clients
              </label>
            </div>
          </div>
          {scope === 'per_client' && (
            <div>
              <label className="block text-[13px] font-medium mb-2">Clients</label>
              <select multiple name="clientIds" className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px]">
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          {state.error && <p className="text-danger text-[13px]">{state.error}</p>}
          <button type="submit" disabled={pending}
            className="w-full bg-ink text-paper py-2.5 rounded-[2px] hover:bg-ink2 disabled:opacity-60">
            {pending ? 'Sending…' : 'Send invite'}
          </button>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npm run dev`. Logged in as Janelle, visit `/settings/team`. Send an invite to a test email you can access. Check inbox for magic link. Confirm:
- Invited user receives magic link
- Clicking it lands them on `/clients` with their scoped access

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/admin.ts src/app/\(app\)/settings/team/
git commit -m "feat(invites): super_admin can invite org team members"
```

### Task 4.5: Invite-client-admin server action (super_admin path)

**Files:**
- Create: `src/app/(app)/clients/[clientId]/invite-admin/page.tsx`
- Create: `src/app/(app)/clients/[clientId]/invite-admin/actions.ts`

- [ ] **Step 1: Server action**

Create `src/app/(app)/clients/[clientId]/invite-admin/actions.ts`:

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function inviteClientAdmin(
  clientId: string,
  _prev: { error?: string; sent?: boolean },
  formData: FormData
) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const displayName = String(formData.get('displayName') ?? '').trim();
  if (!email || !displayName) return { error: 'Email and display name are required.' };

  // Authz: super_admin only (client_admin invites are a separate task for clients to invite their team)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: isAdmin } = await supabase
    .from('org_roles')
    .select('role')
    .eq('user_id', user!.id)
    .eq('role', 'super_admin')
    .maybeSingle();
  if (!isAdmin) return { error: 'Not authorized.' };

  const admin = createAdminClient();
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  });
  if (inviteErr) return { error: inviteErr.message };

  await admin.from('profiles').upsert({ id: invited.user.id, email, display_name: displayName });
  await admin.from('client_memberships').insert({
    user_id: invited.user.id,
    client_id: clientId,
    role: 'client_admin',
  });

  revalidatePath(`/clients/${clientId}`);
  return { sent: true };
}
```

- [ ] **Step 2: Form page (uses bound server action)**

Create `src/app/(app)/clients/[clientId]/invite-admin/page.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import { use } from 'react';
import { inviteClientAdmin } from './actions';

export default function InviteAdminPage({
  params,
}: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const bound = inviteClientAdmin.bind(null, clientId);
  const [state, action, pending] = useActionState(bound, {});

  return (
    <div className="max-w-md mx-auto space-y-8">
      <h1 className="text-[32px] font-medium leading-[40px]">Invite client admin</h1>
      {state.sent ? (
        <p className="text-ink2">Invite sent.</p>
      ) : (
        <form action={action} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-[13px] font-medium mb-2">Email</label>
            <input id="email" name="email" type="email" required
              className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px]" />
          </div>
          <div>
            <label htmlFor="displayName" className="block text-[13px] font-medium mb-2">Display name</label>
            <input id="displayName" name="displayName" type="text" required
              className="w-full bg-surface border border-rule px-3 py-2.5 rounded-[2px]" />
          </div>
          {state.error && <p className="text-danger text-[13px]">{state.error}</p>}
          <button type="submit" disabled={pending}
            className="w-full bg-ink text-paper py-2.5 rounded-[2px] hover:bg-ink2 disabled:opacity-60">
            {pending ? 'Sending…' : 'Send invite'}
          </button>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run dev`. As Janelle, visit `/clients/[id]/invite-admin` for an existing client. Send invite to a test email. Confirm:
- Invite lands; magic link works
- Logged-in invitee has `client_admin` role for that one client (they see only that client in `/clients`)

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/clients/\[clientId\]/invite-admin/
git commit -m "feat(invites): super_admin invites a client_admin for a client"
```

---

## Phase 5 — Final verification + slice handoff

### Task 5.1: End-to-end smoke check

- [ ] **Step 1: Cold-start verification on a clean DB**

Reset the database and re-run all migrations:

```bash
supabase db reset --linked
supabase test db
```

Expected: all migrations apply in order, all SQL tests pass.

- [ ] **Step 2: Full user-flow smoke check**

Run: `npm run dev`. Step through:

1. Hit `/login` → magic-link form renders
2. Submit Janelle's seeded email → check inbox → click link → land on `/clients`
3. Click "+ New client" → submit → land on the new client's detail
4. Visit `/settings/team` → invite a test user (all_clients scope) → confirm magic link in test inbox
5. Click the test invite link → land on `/clients` → confirm visibility matches scope
6. Visit `/clients/[id]/invite-admin` for a client → invite another test user → log in as them → confirm they see only that client

- [ ] **Step 3: Commit final state**

```bash
git status   # should be clean if nothing new was added
```

### Task 5.2: Update slice status

- [ ] **Step 1: Mark slice 01 implementation done**

Modify `docs/specs/01-foundation.md` frontmatter:

```yaml
status: implemented
```

Modify `docs/README.md` slice-01 row:

```
| 01  | Foundation ... | **implemented** | ...
```

- [ ] **Step 2: Commit**

```bash
git add docs/specs/01-foundation.md docs/README.md
git commit -m "docs: mark slice 01 implemented"
```

### Task 5.3: Hand off to slice 02 planning

Slice 01 ships when:
- All migrations applied to the linked Supabase project
- Janelle can log in, create a client, invite team + client_admin
- RLS tests pass
- End-to-end smoke check in Task 5.1 succeeds

When ready, invoke the writing-plans skill again with `docs/specs/02-photo-item-capture.md` as the scope.

---

## Self-review against the spec

Run through `docs/specs/01-foundation.md` and confirm each requirement maps to a task:

| Spec requirement                              | Implemented in |
| --------------------------------------------- | -------------- |
| Supabase project provisioned + linked         | Task 0.5       |
| All 4 (now 6) migrations applied              | Tasks 1.1–1.6  |
| 5 roles + access rule via RLS                 | Tasks 1.3, 1.4 |
| Storage bucket with same access rule          | Task 1.5       |
| Magic-link auth + session middleware (proxy)  | Tasks 2.1–2.4  |
| Seeded Janelle account                        | Task 1.6       |
| `audit_log` table created                     | Task 1.2       |
| `/login`, client picker, client detail stub   | Tasks 2.3, 4.1, 4.2 |
| Invite forms for super_admin + client_admin   | Tasks 4.4, 4.5 |
| RLS tests covering role × table × op          | Task 1.4       |
| Brand: AppShell with dark header band         | Task 3.2       |
| Design tokens applied                         | Task 0.3       |
| Logo light + dark variants in `public/`       | Task 0.4       |
| Inter font via `next/font`                    | Task 3.2       |

No gaps. Plan complete.
