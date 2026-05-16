---
title: Slice 05 — Sharing + filtered export
status: approved
slice: 05
depends_on: [01, 02, 03]
last_updated: 2026-05-16
---

# Slice 05 — Sharing + filtered export

## Purpose

The fix for the transcript's #4 pain point: "If they're going to send that to her agent or insurance now they need access." After this slice, Janelle (or a `client_admin`) can share any location subtree of a client's inventory with one or more named recipients via a read-only, email-gated, expiring link — without giving anyone a Supabase account or access to the wider inventory.

## What's in scope

- Sharing scope: **a location subtree** (whole client = root, a single house, or one specific room) — and everything below it
- Authentication: **email-gated** — link sent to specific emails, recipient enters their email to view
- Recipient experience: read-only grid + sheet + item detail, no comments, no history, no actions
- Expiry + revocation
- View tracking per recipient
- Audit entries for create + revoke

Deliberately out: file export (PDF/CSV), per-item sharing, metadata-filter sharing, public no-auth shares.

## Data model

```sql
-- shares
id uuid primary key default gen_random_uuid(),
client_id uuid not null references clients(id) on delete cascade,
root_location_id uuid not null references locations(id) on delete cascade,
token text not null unique,                       -- 32 bytes base64url; the URL path token
created_by uuid not null references auth.users(id),
expires_at timestamptz not null,
revoked_at timestamptz,
note text,                                        -- optional message shown to recipient
created_at timestamptz default now()

-- share_recipients
share_id uuid not null references shares(id) on delete cascade,
email text not null,
invited_at timestamptz default now(),
first_viewed_at timestamptz,
last_viewed_at timestamptz,
view_count int not null default 0,
primary key (share_id, email)

-- share_auth_attempts (transient, auto-pruned daily)
id uuid primary key default gen_random_uuid(),
token text not null,
ip text not null,
attempted_at timestamptz default now()
```

### Token format

`token` is 32 bytes from `crypto.randomBytes`, base64url-encoded (~43 chars). Generated server-side. Stored as-is — no hashing (leaking the row leaks the URL, same threat model as a leaked URL).

## Permissions

| Role                   | Create shares       | Revoke own | Revoke any                               |
| ---------------------- | ------------------- | ---------- | ---------------------------------------- |
| `super_admin`          | ✓                   | ✓          | ✓ across all clients                     |
| `org_team_all`         | ✓                   | ✓          | ✓ across all clients                     |
| `org_team_per_client`  | ✓ for assigned      | ✓          | ✓ for assigned clients                   |
| `client_admin`         | ✓ for own client    | ✓          | ✓ for own client                         |
| `client_team`          | ✗                   | ✗          | ✗ (also cannot see the dashboard)       |

## Audit additions

Single `log_share_change` trigger on `shares`. Two new actions in `audit_log`:

| Action          | When                                | `before` / `after`                                            |
| --------------- | ----------------------------------- | -------------------------------------------------------------- |
| `share_create`  | INSERT into `shares`                | null / `{ root_location_id, recipients, expires_at, note }`    |
| `share_revoke`  | UPDATE setting `revoked_at`         | `{ revoked_at: null }` / `{ revoked_at: now() }`               |

View events do NOT go to `audit_log` — they update counters on `share_recipients` instead.

## RLS

### `shares` (management side)

- **SELECT** — `can_access_client(client_id)` AND user holds a role from the permissions table (so `client_team` never sees the dashboard)
- **INSERT** — same as SELECT, AND `created_by = auth.uid()`, AND `root_location_id` belongs to `client_id` (defensive — the UI picker prevents this but enforce in DB)
- **UPDATE (revoke)** — `created_by = auth.uid()` OR user has revoke-any role for this client; only `revoked_at` can change
- **DELETE** — denied (shares are archived via `revoked_at`, never hard-deleted)

### Viewer side is RLS-free

`/share/[token]` is a public route. The Next.js route handler resolves the token server-side, validates email + expiry + revocation, then queries items using the `service_role` key (bypasses RLS). The route handler IS the security boundary because the viewer never has a Supabase auth.users row.

The share session lives entirely in a signed cookie scoped to `/share/[token]/*`.

## Create-share UX

Lives on:
- Any location node in the tree → kebab menu → "Share this location"
- Location grid/sheet header → "Share" button next to the view toggle
- Client root node → same Share action ("share everything")
- NOT per-item in v1

### Dialog

```
┌──────────────────────────────────────────────────┐
│  Share "Bentley · Pink closet"                   │
│  ──────────────────────────────────────────────  │
│  Sharing: 47 items in this location and below    │
│                                                  │
│  Recipients (email):                             │
│  [ insurance@bigco.com  ×  agent@caa.com  ×  ]   │
│  [ type or paste, separate with commas ... ]     │
│                                                  │
│  Expires:                                        │
│  ( ) 7 days   (•) 30 days   ( ) 90 days          │
│  ( ) Custom date: [ pick... ]                    │
│                                                  │
│  Note to recipient (optional):                   │
│  [ For insurance review — please confirm by 6/1 ]│
│                                                  │
│            [Cancel]   [Create & send →]          │
└──────────────────────────────────────────────────┘
```

- Multiple recipients per share — one link, many authorized emails
- Recipient input accepts comma-separated paste
- Default expiry: 30 days
- Submit: INSERT `shares` + one INSERT per `share_recipients` + fire one Resend email per recipient (immediate, not via cron)

## Shares dashboard

`/clients/[clientId]/shares` — visible only to roles that can create shares.

```
┌──────────────────────────────────────────────────────────────────┐
│  Shares · Sydney                          [+ New share]         │
│  ──────────────────────────────────────────────────────────────  │
│  Active                                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Bentley · Pink closet           ⓘ                         │   │
│  │ Recipients: insurance@bigco.com, agent@caa.com           │   │
│  │ Expires May 31 · Viewed 2× (last: 2d ago)                │   │
│  │ Created by Janelle, 4 days ago                           │   │
│  │                                       [Copy link] [Revoke]│   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Expired / Revoked  (3)  ▸                                       │
└──────────────────────────────────────────────────────────────────┘
```

- Per-row: subtree name, recipients, view stats, expiry, revoke
- "Copy link" copies bare URL (in case recipient lost the email)
- "Revoke" → confirm → sets `revoked_at = now()`; trigger writes `share_revoke` audit row; link returns 410 immediately
- Expired/Revoked section collapsed by default

## Recipient flow

### 1. Email arrives (immediate, via Resend)

```
Subject: Janelle Lam shared "Bentley · Pink closet" with you

Janelle Lam shared an inventory subset with you on her organization app.

  "For insurance review — please confirm by 6/1"

Subset:    Bentley · Pink closet  (47 items)
Expires:   May 31, 2026

[ Open inventory → ]

You'll be asked to enter this email address (insurance@bigco.com) to view.
```

Minimal content (no item titles, no metadata, no client name beyond subtree label) — same privacy stance as slice 04 emails.

### 2. Email gate at `/share/[token]/auth`

```
┌─────────────────────────────────────────┐
│  Janelle Lam shared an inventory        │
│  with you.                              │
│  ─────────────────────────────────────  │
│  Enter the email address this link      │
│  was sent to:                           │
│                                         │
│  [ _____________________________ ]      │
│                                         │
│              [ View inventory → ]       │
└─────────────────────────────────────────┘
```

- Submit → server checks email against `share_recipients` for this token
- Match: signed cookie set, redirect to `/share/[token]`
- No match: "This email isn't authorized for this link" (doesn't reveal which emails are)

### 3. Read-only view at `/share/[token]`

```
┌──────────────────────────────────────────────────────────────────┐
│  🔒 Shared by Janelle Lam · Expires May 31, 2026                 │
│  ──────────────────────────────────────────────────────────────  │
│  "For insurance review — please confirm by 6/1"                  │
│                                                                  │
│  Bentley · Pink closet                       [Grid][Sheet]       │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                                │
│  │     │ │     │ │     │ │     │                                │
│  └─────┘ └─────┘ └─────┘ └─────┘                                │
│  Dress…  Boots…  Bag…    Hat…                                    │
│  ...                                                             │
└──────────────────────────────────────────────────────────────────┘
```

- Top banner: sharer name, expiry, optional note
- Same grid + sheet views as the authenticated app — READ-ONLY:
  - No status edits, no comments, no history panel, no move buttons
  - Tap item → item detail showing photos + metadata ONLY
- Bottom nav hidden (viewer can't navigate outside the subtree)
- Photos served via short-lived signed Supabase Storage URLs (30-min expiry, regenerated per request) — no public bucket exposure

## Cookie + token security

- **Cookie name**: `share-session` (path-scoped to `/share/[token]/*`)
- **Attributes**: `HttpOnly`, `Secure`, `SameSite=Lax`
- **Payload**: signed (HMAC-SHA256) JSON `{ token, email, expires }` using `SHARE_COOKIE_SECRET` env var
- **Expiry**: `min(share.expires_at, now() + 7 days)` — even a 90-day share requires re-auth weekly

## Rate-limiting the email gate

- 5 failed attempts from one IP for one token → 15-minute lockout
- Tracked in `share_auth_attempts`; pruned daily by a separate Vercel cron `{ path: '/api/shares/prune-auth-attempts', schedule: '0 3 * * *' }` (runs at 03:00 UTC). Slice 04's cron is `*/2 * * * *` for notification emails — different schedule, different handler.
- Lockout message: "Too many attempts. Try again in 15 minutes." — doesn't reveal valid emails

## View counting

Increment `share_recipients.view_count` only if no view from the same `(token, email)` in the last 30 minutes — prevents refresh-inflation. `last_viewed_at` updates on every visit regardless.

## Error states

| State                                  | Page shown                                                    |
| -------------------------------------- | ------------------------------------------------------------- |
| Token not found                        | 404 "Share not found"                                         |
| Token exists, `revoked_at != null`     | "This share was revoked by the sender."                       |
| Token exists, `expires_at < now()`     | "This share expired on {date}."                               |
| Auth: email not in recipients          | "This email isn't authorized for this link."                  |
| Auth: rate-limited                     | "Too many attempts. Try again in 15 minutes."                 |
| Cookie expired                         | Redirect to `/share/[token]/auth`                             |

## Server route handlers

- `GET  /share/[token]` — gates on cookie; renders subtree
- `POST /share/[token]/auth` — checks email, sets cookie
- `GET  /share/[token]/items/[id]` — read-only item detail (cookie-gated)
- `GET  /share/[token]/photos/[id]` — proxies signed Storage URL (cookie-gated)

All four run with `service_role` server-side; the route handler is the security boundary.

## Testing

- **Auth gate** — valid email → cookie set; invalid email → error; rate-limited IP → 429
- **RLS** — `client_team` cannot SELECT from `shares`
- **Revocation** — revoked share returns 410 immediately on next request
- **Expiry** — share past `expires_at` returns 410
- **Subtree scoping** — items outside the shared subtree are not reachable via guessed URL (`/share/[token]/items/[unrelated-id]` returns 404)
- **Signed Storage URL** — copied URL works until expiry; can't enumerate other photos in the bucket
- **Audit** — `share_create` row on INSERT, `share_revoke` row on revoke; no audit rows for views (those go to `share_recipients`)
- **View dedup** — 10 refreshes within 30 min increment `view_count` by 1

## In v1

- `shares` + `share_recipients` + `share_auth_attempts` tables
- `log_share_change` trigger (audit: `share_create`, `share_revoke`)
- RLS per the permissions table
- Create-share dialog with subtree picker, multi-recipient, expiry presets, optional note
- Per-client shares dashboard with revoke + copy-link + view stats
- Recipient flow: Resend email → `/share/[token]/auth` → cookie-gated `/share/[token]`
- Read-only grid + sheet + item detail in shared view
- Signed Storage URLs (30-min) for photos
- Rate-limiting on email-gate attempts
- View tracking on `share_recipients`

## Out of v1

- File export (PDF, CSV) — confirmed deferred
- Per-item sharing (subtrees only)
- Metadata-filter sharing ("only Met Gala items") — depends on slice-02 deferred filtering
- Custom branding (logo, colors, custom domain)
- Watermark on photos in the shared view
- Per-share notification preferences ("notify me when insurance views")
- Renaming / re-sending an existing share (must revoke + create new)
- One-time-only links (token dies on first view)
- Multi-language email templates
- Public no-auth shares (everything is email-gated; not making bare-URL public an option)

## Open questions deferred

- **File export** — likely resurfaces from insurance asks; slice 05 v2 will add PDF
- **Custom branding** — Janelle's branding pending; Resend default sender + plain template for v1
- **Per-view audit log** — counters in v1; full event log only if forensic need appears
- **Cookie session storage** — signed cookies (stateless) in v1; switch to a server-side session table if cookie size becomes an issue
- **Reusing shares for the same recipient set** — currently must revoke + create new; "extend expiry" UI is v2 quality-of-life
- **Notification when share is viewed** — could pair with slice 04's notifications system
