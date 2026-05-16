---
title: Slice 01 — Foundation
status: approved
slice: 01
depends_on: []
last_updated: 2026-05-16
amendments:
  - 2026-05-16 (slice 02): dropped item_photos.kind enum; added items.cover_photo_id FK
  - 2026-05-16 (slice 03): dropped 'moved' from items.status enum (moves are audit entries, not a status)
  - 2026-05-16 (cross-slice review): added profiles.email mirrored column; added client_for_item() helper; clarified audit_log.target_type values to 'item' | 'comment' | 'share'; documented default-deny RLS pattern for audit_log INSERT
  - 2026-05-16 (Next.js 16 reality-check): renamed middleware.ts → proxy.ts (Next.js 16 convention — functionality unchanged)
---

# Slice 01 — Foundation (auth, tenancy, data model)

## Purpose

Build the skeleton everything else hangs from: per-user accounts, per-client tenancy, the core data schema (`Client → Location → Item → Photo`), and the access rules that enforce who can see and edit what. No user-facing inventory features yet — slice 02 fills the UI in.

After this slice, Janelle can log in, create a client, invite a `client_admin` for that client, invite her own team members, and the database correctly walls off who sees which client's data.

## Stack

| Concern   | Choice           | Notes                                                                 |
| --------- | ---------------- | --------------------------------------------------------------------- |
| Auth      | Supabase Auth    | Magic link primary; email + password secondary                        |
| Database  | Supabase Postgres | RLS enforces the access rule at the DB layer                         |
| Storage   | Supabase Storage | Single private `inventory-photos` bucket; same RLS rule as DB tables  |
| Hosting   | Vercel           | Next.js 16 App Router (the version in this repo's `node_modules`)     |
| Framework | Next.js 16, React 19, Tailwind 4 | Already scaffolded in the repo |

Project ref: `sdljytzqvmaldukwtopt`. Secrets live in `.env.local` (gitignored).

## Roles & access model

Five roles, two scopes:

| Role                  | Scope        | Who                                                | Edit items/locations? | Comment + mark status? | Invite users? |
| --------------------- | ------------ | -------------------------------------------------- | --------------------- | ---------------------- | ------------- |
| `super_admin`         | org-wide     | Janelle                                            | ✓                     | ✓                      | ✓ everyone    |
| `org_team_all`        | org-wide     | Movers, organizing assistants who span all clients | ✓                     | ✓                      | ✗             |
| `org_team_per_client` | per-client   | Dom, Pat, Cass (assigned to specific clients)      | ✓                     | ✓                      | ✗             |
| `client_admin`        | per-client   | Sydney herself, or Sydney's assistant if designated | ✗                     | ✓                      | ✓ `client_team` for their client |
| `client_team`         | per-client   | Sydney's stylist, lawyer, insurance contact, etc.  | ✗                     | ✓                      | ✗             |

### The one access rule

> A user can access client X's data if they have any row in `org_roles` (org-wide access) OR any row in `client_memberships` where `client_id = X` (per-client access).

This rule is enforced via Postgres RLS on every table that holds client data (`clients`, `locations`, `items`, `item_photos`, `audit_log`) and mirrored to the Supabase Storage bucket via path-based RLS. The app layer never needs to check permissions — the database refuses to return rows the user shouldn't see.

Write permissions follow the role table above and are enforced via separate RLS policies per operation (`INSERT` / `UPDATE` / `DELETE`).

## Data model

```
auth.users                  — Supabase built-in
profiles                    — extends auth.users
clients                     — the celebrity/household entity
locations                   — self-referential tree (parent_location_id nullable)
items                       — attached to any location (leaf or non-leaf)
item_photos                 — N photos per item; cover denoted by items.cover_photo_id
org_roles                   — (user_id, role) for super_admin / org_team_all
client_memberships          — (user_id, client_id, role) for everyone else tied to a client
audit_log                   — append-only log of mutations; populated starting in slice 03
```

### Table sketches (canonical schema lives in migrations)

```sql
-- profiles
id uuid primary key references auth.users(id) on delete cascade,
email text not null,                              -- mirrored from auth.users.email via trigger; cron queries don't need to JOIN auth
display_name text not null,
avatar_url text,
created_at timestamptz default now()
-- A trigger on auth.users INSERT/UPDATE keeps profiles.email in sync;
-- slice 04's email cron reads from profiles.email directly.

-- clients
id uuid primary key default gen_random_uuid(),
name text not null,
created_at timestamptz default now()

-- locations (nested tree)
id uuid primary key default gen_random_uuid(),
client_id uuid not null references clients(id) on delete cascade,
parent_location_id uuid references locations(id) on delete cascade,
name text not null,
created_at timestamptz default now()

-- items
id uuid primary key default gen_random_uuid(),
location_id uuid not null references locations(id) on delete restrict,
title text not null,
description text,
metadata jsonb not null default '{}'::jsonb,  -- designer, where worn, etc.
status text not null default 'active' check (status in ('active','donated','archived')),
cover_photo_id uuid references item_photos(id) on delete set null,  -- set in slice 02
created_at timestamptz default now()

-- item_photos
id uuid primary key default gen_random_uuid(),
item_id uuid not null references items(id) on delete cascade,
storage_path text not null,  -- clients/{client_id}/items/{item_id}/{uuid}.{ext}
uploaded_by uuid not null references auth.users(id),
created_at timestamptz default now()
-- Cover photo is denoted by items.cover_photo_id; everything else is secondary by absence.

-- org_roles
user_id uuid not null references auth.users(id) on delete cascade,
role text not null check (role in ('super_admin','org_team_all')),
created_at timestamptz default now(),
primary key (user_id, role)

-- client_memberships
user_id uuid not null references auth.users(id) on delete cascade,
client_id uuid not null references clients(id) on delete cascade,
role text not null check (role in ('org_team_per_client','client_admin','client_team')),
created_at timestamptz default now(),
primary key (user_id, client_id)  -- one role per user per client

-- audit_log
id uuid primary key default gen_random_uuid(),
user_id uuid not null references auth.users(id),
client_id uuid not null references clients(id),
target_type text not null,  -- 'item' | 'comment' | 'share' (location never written in v1)
target_id uuid not null,
action text not null,        -- 'create' | 'update' | 'status_change' | 'move' | 'comment'
before jsonb,
after jsonb,
created_at timestamptz default now()
```

### Helper functions for the access rule

Two SQL functions, both called by RLS policies across slices:

```sql
-- The core access rule
create function can_access_client(target_client_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from org_roles where user_id = auth.uid()
  ) or exists (
    select 1 from client_memberships
    where user_id = auth.uid() and client_id = target_client_id
  );
$$;

-- Convenience helper: walks items → locations → clients
-- Used by slice 04 (comments), and any future code that needs the
-- client_id for an item without two JOINs in every policy.
create function client_for_item(target_item_id uuid)
returns uuid
language sql
stable
as $$
  select l.client_id
  from items i
  join locations l on l.id = i.location_id
  where i.id = target_item_id;
$$;
```

RLS is enabled on every user-data table (`alter table ... enable row level security`). Tables without explicit INSERT/UPDATE/DELETE policies default-deny those operations for authenticated users — `audit_log` relies on this: triggers run as `security definer` and bypass RLS, but app-layer INSERTs are denied because no INSERT policy exists.

## Photo storage

Single private bucket `inventory-photos`. Path pattern:

```
clients/{client_id}/items/{item_id}/{photo_uuid}.{ext}
```

Supabase Storage RLS extracts `client_id` from the path and applies `can_access_client(client_id)`. No manually-managed signed URLs in v1.

## Auth & onboarding flows

### Bootstrap
Janelle's account is seeded by `0004_seed_super_admin.sql`. Her email is read from a `SEED_SUPER_ADMIN_EMAIL` env var at migration time. No public signup form — `/login` accepts only emails of already-invited users; unrecognized emails get a generic "no access — ask Janelle for an invite" message after submission (no magic link sent, so we don't leak which emails exist).

### Auth methods enabled
- Email + password
- Magic link (default for invites)
- Google OAuth: **not** enabled in v1

### Five flows

1. **Login.** `/login` form → enter email → Supabase sends magic link → user clicks → lands on `/auth/callback` → session established → redirect to client picker.
2. **Janelle creates a client.** `/clients` page (super_admin only) → "New client" → name → insert `clients` row.
3. **Janelle invites a `client_admin`.** Client detail page → "Invite admin" → email + name → server action calls `inviteUserByEmail` AND inserts `client_memberships(role=client_admin)`. Recipient gets magic link.
4. **`client_admin` invites `client_team`.** Same UI on the client detail page, visible only to `client_admin`. Adds `client_memberships(role=client_team)` for that one client.
5. **Janelle invites org team.** Org settings page → email + scope (all-clients vs per-client) → if per-client, multi-select clients → inserts `org_roles` or `client_memberships` rows.

### Session handling
`@supabase/ssr` for Next.js 16 (cookie-based, works in Server Components, proxy, and route handlers). Middleware refreshes the session and redirects logged-out users to `/login`.

After login, routing is:
- Has access to >1 client → `/clients` (picker)
- Has access to exactly 1 client → `/clients/{id}` directly
- Has access to 0 clients → "you have no access; ask Janelle" page

## Project skeleton

```
inventory-organizer/
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (auth)/auth/callback/route.ts
│   │   ├── (app)/layout.tsx              ← requires session
│   │   ├── (app)/clients/page.tsx        ← picker / list
│   │   ├── (app)/clients/[id]/page.tsx   ← stub for slice 02
│   │   ├── (app)/clients/[id]/invite/    ← client_admin invite form
│   │   ├── (app)/settings/team/          ← super_admin org-team invite form
│   │   └── api/invite/route.ts           ← server action (uses service role)
│   ├── lib/supabase/server.ts
│   ├── lib/supabase/client.ts
│   ├── lib/supabase/proxy.ts
│   └── proxy.ts
└── supabase/migrations/
    ├── 0001_init_schema.sql
    ├── 0002_init_roles.sql
    ├── 0003_rls_policies.sql
    └── 0004_seed_super_admin.sql
```

## Error handling

- **RLS violations** return 0 rows, not errors. The app treats "not found" the same as "forbidden" — no existence leak.
- **Auth errors** (expired link, bad password) use Supabase's built-in error strings rendered on the login form. No custom copy in v1.
- **Invite failures** (duplicate email, rate limit) return a typed error from the server action; rendered inline on the invite form.
- **Migration failures** in CI fail the build. No partial migrations in production.

## Testing

- **RLS policy tests in SQL** — the most important tests in the project. For each role × each table × each operation, assert which rows the role can or cannot touch. Run via `supabase db test` in CI.
- **One integration test per invite flow** — `super_admin invites org_team_per_client` and `client_admin invites client_team`. Run against local Supabase via the CLI.
- No component tests in slice 01 — UI is minimal and is mostly forms wrapping Supabase calls.

## In v1 (slice 01 deliverables)

- Supabase project provisioned, all four migrations applied
- Magic-link auth + session proxy
- Five roles + access rule enforced on every table + the storage bucket
- Minimal UI: `/login`, client picker, client detail stub, the three invite forms
- Seeded Janelle account
- `audit_log` table created (writes begin in slice 03)
- RLS tests covering all role × table × op combinations

## Out of v1 (handled by other slices or never)

- Item / photo CRUD UI → slice 02
- Audit log writes and history view → slice 03
- Comments → slice 04
- Sharing + filtered export → slice 05
- QR codes → slice 06
- Move-in tour → slice 07
- Password reset UX → use Supabase built-in
- MFA → v2
- Public signup → never
- Self-service org creation → never (single-tenant prototype)
- Soft-delete / undo for user removal → v2 if needed

## Open questions (deferred — do not resolve here)

- **Branded invite emails** — using Supabase defaults in v1; revisit before any client demo.
- **Per-client email customization** (e.g. "you've been invited to Sydney's inventory") — slice 05 may want this for share links; revisit then.
- **Audit log retention / pruning** — slice 03's problem.
