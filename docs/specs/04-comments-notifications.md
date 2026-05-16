---
title: Slice 04 — Comments + notifications
status: implemented
slice: 04
depends_on: [01, 02, 03]
last_updated: 2026-05-16
---

# Slice 04 — Comments + notifications

## Purpose

Bring the "leave a note / get pinged" workflow into the app — replaces the Google Photos comment threads Janelle's team uses today, and lets clients (Sydney, Sia, etc.) and team members @-mention each other directly on items. The comments panel on the item detail page (stubbed in slice 02) goes live.

## What's in scope

- Comments on items only (not on locations or clients in v1)
- @mention parsing + autocomplete in the compose box
- Notifications fired only when a user is @-mentioned (no follow / no audit-event pings in v1)
- In-app bell + dropdown + dedicated `/notifications` page
- Email after 10 minutes if a mention is still unread
- Comment audit trail (comment / comment_edit / comment_delete actions land in `audit_log`)

## Data model

### Tables

```sql
-- comments
id uuid primary key default gen_random_uuid(),
item_id uuid not null references items(id) on delete cascade,
author_id uuid not null references auth.users(id),
body text not null,                              -- plain text with @[Name](uuid) markers
edited_at timestamptz,
deleted_at timestamptz,                          -- soft-delete tombstone
created_at timestamptz default now()

-- comment_mentions (derived from body at write time)
comment_id uuid not null references comments(id) on delete cascade,
mentioned_user_id uuid not null references auth.users(id),
primary key (comment_id, mentioned_user_id)

-- notifications
id uuid primary key default gen_random_uuid(),
recipient_id uuid not null references auth.users(id),
kind text not null check (kind in ('mention')),  -- v1: mentions only
client_id uuid not null references clients(id),
source_comment_id uuid not null references comments(id) on delete cascade,
source_item_id uuid not null references items(id) on delete cascade,
read_at timestamptz,
email_sent_at timestamptz,
created_at timestamptz default now()

-- profiles addition
alter table profiles
  add column email_notifications_enabled boolean not null default true;
```

### Body format

Plain text with mention markers:

```
@[Dom](abc-1234-…) please move this to Mandeville
```

The display name is stored at write time (doesn't re-resolve if Dom later renames). The uuid stays stable for the join and for navigation. Render parses the markers and replaces them with styled pills.

## Audit additions

Three new actions land in `audit_log` (the table from slice 01; trigger pattern matches slice 03):

| Action            | When                                         | `before`                  | `after`            |
| ----------------- | -------------------------------------------- | ------------------------- | ------------------ |
| `comment`         | INSERT into `comments`                       | null                      | `{ body }`         |
| `comment_edit`    | UPDATE to `comments.body` within 5 min       | `{ body }` (old)          | `{ body }` (new)   |
| `comment_delete`  | UPDATE setting `comments.deleted_at`         | `{ body }` (preserved)    | null               |

Implemented as `log_comment_change()` — single function, fires `AFTER INSERT OR UPDATE ON comments FOR EACH ROW`. Comment hard deletes are blocked at the RLS layer; soft-delete is the only path.

## Notifications fan-out

The same `log_comment_change` trigger that writes the `comment` audit row also:

1. Parses `body` for `@[…](uuid)` matches → list of mentioned uuids
2. INSERTs one `comment_mentions` row per mentioned uuid (skips self-mentions)
3. INSERTs one `notifications` row per *newly* mentioned uuid (skips self)

### On edit

Same trigger fires on UPDATE; it parses both OLD.body and NEW.body, diffs the mention sets, and:

- `added = new − old` → INSERT `comment_mentions` + INSERT `notifications`
- `removed = old − new` → DELETE `comment_mentions` rows only (existing notifications stay; we don't unsend pings)
- `unchanged` → nothing

All inside the trigger, so an UPDATE from any caller (RPC, raw query, Supabase Studio) gets the same fan-out behavior. The `edit_comment` RPC is kept as a clean API endpoint, not because the trigger needs it.

## RLS

### `comments`

- **SELECT** — `can_access_client(client_for_item(item_id))` — helper walks `items → locations → clients`
- **INSERT** — same as SELECT, AND `author_id = auth.uid()`, AND `deleted_at is null` on write
- **UPDATE (edit)** — `author_id = auth.uid()` AND `created_at > now() - interval '5 minutes'` AND `deleted_at is null`, only `body` / `edited_at` columns can change
- **UPDATE (soft-delete)** — `author_id = auth.uid()` OR caller has `super_admin` / `org_team_all` / `org_team_per_client` role for the client; only `deleted_at` can change
- **DELETE** — denied for everyone

Two UPDATE policies OR-combine in Postgres.

### `notifications`

- **SELECT** — `recipient_id = auth.uid()`
- **INSERT** — denied to all (triggers only)
- **UPDATE** — `recipient_id = auth.uid()`, only `read_at` can change
- **DELETE** — `recipient_id = auth.uid()` (user can clear their own bell)

### `comment_mentions`

- **SELECT** — `can_access_client(client_for_item via comment)` — readers of the comment can see who was tagged
- All writes — denied to users (trigger / RPC only)

## RPC functions

Convenience endpoints — the trigger does the heavy lifting; these just keep app-side calls clean and predictable.

```sql
-- edit_comment: sets body + bumps edited_at; trigger handles mention diff + notifications
create or replace function edit_comment(p_comment_id uuid, p_new_body text)
returns comments language plpgsql security invoker as $$
declare
  v_row comments;
begin
  update comments
    set body = p_new_body, edited_at = now()
    where id = p_comment_id
    returning * into v_row;
  return v_row;
end $$;

-- delete_comment: soft-deletes; trigger logs the action
create or replace function delete_comment(p_comment_id uuid)
returns comments language plpgsql security invoker as $$
declare
  v_row comments;
begin
  update comments
    set deleted_at = now()
    where id = p_comment_id
    returning * into v_row;
  return v_row;
end $$;
```

Standard `INSERT` into `comments` is fine for creation (the trigger handles fan-out). The RPCs above exist so the app doesn't sprinkle raw UPDATEs across components — single named API per mutation.

## Comment panel UX

Lives in the "Comments" slot on the item detail page (the stub slice 02 reserved).

```
─── Comments ────────────────────────────
👤 Dom · 3d ago
   Hey @Janelle  bring this to Malibu next week?

👤 Janelle · 2d ago  (edited)
   On it — moving this Friday

👤 Pat · 1d ago
   [Comment deleted by author · 1d ago]
─────────────────────────────────────────
[ Write a comment...                  ⏎ ]
```

- Flat list, oldest at top, newest at bottom
- Compose sticky at the bottom
- Tombstones stay in the timeline so context isn't lost
- `(edited)` marker shows when `edited_at is not null`

### Compose box

- Auto-growing textarea
- `@` opens mention autocomplete; closes on space-without-selection or Esc
- ⌘/Ctrl-Enter submits; Enter alone adds a newline
- Send button right-side; disabled on empty

### @mention autocomplete

- Triggered by `@`
- Query: all users with access to this client (via `client_memberships` for this client OR any `org_roles`), excluding the author
- Filter by `display_name` substring as user types
- Render row: avatar + display name + role chip
- Insert `@[Display Name](uuid)` at cursor

### Edit flow

- Edit button visible only to author, only while `created_at > now() - 5 min`
- Click → body becomes editable textarea, pre-filled, same autocomplete
- Save → `edit_comment(comment_id, new_body)` → trigger diffs mentions + fires notifications for added ones
- Cancel → revert
- After save: "(edited)" marker added

### Delete flow

- Delete button visible to author OR `super_admin` OR any `org_team_*` for this client
- Confirm dialog: "Delete this comment? It'll show as 'deleted' in the thread."
- Submit → `delete_comment(comment_id)` → UI swaps body for tombstone

### Mention pill rendering

- Pill shows `@Display Name` (the name from the body's write-time marker)
- Click → popover with current display name + role (deeper profile UI is later)

### Realtime

- Supabase Realtime on `comments WHERE item_id = $current` per open item-detail page
- INSERT → append to bottom (subtle slide-in)
- UPDATE (edit / soft-delete) → in-place re-render
- Per-item subscription scope keeps it cheap

### Empty state

"No comments yet. Be the first to ping someone @ this item." — points at the compose box.

## Notifications UX

### Bell + dropdown

```
                                              ┌────────────────────────┐
                                              │ 3 unread               │
                                              ├────────────────────────┤
                                              │ 👤 Dom · 2m            │
                                              │ mentioned you on       │
                                              │ "Vanity Fair dress"    │
                                              │ ─ please move this…    │
                                              │ ─────────────────────  │
                                              │ 👤 Pat · 1h            │
                                              │ mentioned you on…      │
                                              ├────────────────────────┤
                                              │ See all notifications  │
                                              └────────────────────────┘
🔔(3)
```

- Bell in top-right of app bar, always visible inside client context
- Badge with unread count (caps at "9+")
- Dropdown shows 10 most recent; unread rows have a blue dot
- Click row → navigate to item detail with comment anchored + scroll into view; sets `read_at = now()`
- "Mark all as read" button at top-right of dropdown
- "See all notifications" link → `/notifications` page

### Full page

`/notifications` route — same row format, paginated 20/page, filters: All / Unread / Mentions (only one kind in v1, but the filter is in place for v2).

### Realtime

Supabase Realtime subscription on `notifications WHERE recipient_id = auth.uid()`:

- INSERT → badge increments, dropdown top row updates
- UPDATE → badge recomputes (handles read-on-another-device)

One subscription per logged-in session.

## Email delivery

### Vercel cron

`vercel.ts`:

```ts
crons: [
  { path: '/api/notifications/send-emails', schedule: '*/2 * * * *' }
]
```

Every 2 minutes the function runs:

```sql
select n.*, p.email, p.display_name as recipient_name,
       a.display_name as author_name, i.title as item_title, c.body as comment_body
from notifications n
join profiles p on p.id = n.recipient_id
join comments c on c.id = n.source_comment_id
join profiles a on a.id = c.author_id
join items i on i.id = n.source_item_id
where n.read_at is null
  and n.email_sent_at is null
  and n.created_at < now() - interval '10 minutes'
  and p.email_notifications_enabled = true
  and p.deleted_at is null
limit 50;
```

For each row → send via Resend → UPDATE `email_sent_at = now()`. Failures retry next cron run (idempotent: `email_sent_at` gate prevents double-send).

### Template

```
Subject: {author_name} mentioned you on "{item_title}"

{author_name} just mentioned you in a comment on Janelle's inventory app.

   "{comment_body_snippet}"

[Open comment →]   ← deep-link to /clients/[id]/items/[id]#comment-[id]

To stop email notifications, sign in and toggle them off in your profile.
```

No client name, no location, no metadata in the email body — only the comment text and the link. Email viewers see strictly less than the app.

### Read-state semantics

| State                      | Meaning                                                  |
| -------------------------- | -------------------------------------------------------- |
| `read_at = null`           | Unread; counts toward badge; email-eligible at 10 min    |
| `read_at != null`          | Read in-app                                              |
| `email_sent_at = null`     | Email never sent (either read in time or opted out)      |
| `email_sent_at != null`    | Email was sent                                           |

If read in-app before 10 minutes pass: `read_at` set, `email_sent_at` stays null forever.

## Error handling

- **Submit fails** (network / RLS) — compose box keeps content + shows inline error; retry on next submit
- **Edit window expired** — Edit button hidden after 5 min; defense-in-depth in the RLS policy too
- **@mention picks unknown user** (race: user just removed) — server-side INSERT fails gracefully; comment posts without that mention; toast warning
- **Email send fails** (Resend down) — `email_sent_at` stays null; next cron run retries
- **Realtime subscription drops** — auto-reconnect built into `@supabase/supabase-js`; polling fallback not needed for prototype

## Testing

- **Trigger SQL tests** — INSERT a comment with 2 mentions → assert 2 `comment_mentions`, 2 `notifications`, 1 `audit_log` row
- **Edit diff test** — edit comment to swap one mention for another → assert one new notification, one removed mention row, no notifications for the removed mention
- **RLS test** — non-author tries to edit a comment within 5 min → denied
- **Cron idempotency test** — run cron twice without delay → email sent exactly once
- **Email content test** — assert template contains comment body but NOT client/location/metadata

## In v1

- `comments`, `comment_mentions`, `notifications` tables + `profiles.email_notifications_enabled`
- `log_comment_change` trigger
- RPCs: `edit_comment`, `delete_comment`
- Comment panel on item detail (compose, list, @autocomplete, edit-within-5min, soft-delete tombstone, mention pills)
- Bell + dropdown + `/notifications` page
- Realtime updates for in-app
- Vercel cron + Resend for email-after-10-min
- Audit additions: `comment`, `comment_edit`, `comment_delete` actions

## Out of v1

- Threaded replies / nested comments
- Reactions (👍 emoji)
- Image attachments in comments
- @everyone / @team mentions
- Notifications for comment-on-item-I-created
- Notifications for audit events (move / status_change)
- Push notifications (Web Push API)
- Daily email digests vs per-event
- In-app settings page for notification toggle (flip the column in Supabase Studio for v1)
- Snooze / mute / per-item subscription controls
- Markdown formatting (plain text only + mention markers)

## Open questions deferred

- **Settings UI for `email_notifications_enabled`** — slice 05 or v2; manual flip in Supabase Studio meanwhile
- **Unsubscribe link in emails** — v1 uses "sign in and toggle them off" line; CAN-SPAM-grade one-click is v2 polish
- **Email branding / custom domain** — Resend default sender for v1; custom domain when brand exists
- **Mention rate-limiting** — no `@everyone` so per-comment fan-out is small; revisit if abuse appears
- **Notification retention** — keep all in v1; auto-archive read items older than 90 days in v2
