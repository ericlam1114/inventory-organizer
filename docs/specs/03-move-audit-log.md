---
title: Slice 03 — Move / audit log
status: approved
slice: 03
depends_on: [01, 02]
last_updated: 2026-05-16
---

# Slice 03 — Move / audit log

## Purpose

The fix for the original transcript's #2 pain point: "If something goes missing it's on me." After this slice, every move, status change, and item deletion is attributed to a real human, with timestamp and optional note, in an append-only log. The history panel on the item detail page (stubbed in slice 02) goes live.

## What's audited

| Action          | Trigger source             | Logged by                                     |
| --------------- | -------------------------- | --------------------------------------------- |
| `create`        | INSERT on `items`          | trigger on `items`                            |
| `move`          | `items.location_id` change | trigger on `items` (UPDATE)                   |
| `status_change` | `items.status` change      | trigger on `items` (UPDATE)                   |
| `delete`        | DELETE on `items`          | trigger on `items` (DELETE)                   |
| `comment`       | INSERT on `comments`       | slice 04 wires this trigger when comments land |

Deliberately NOT audited in v1: title/description/metadata edits, photo uploads/deletes, custom field definition changes. Keeps the history view scannable for the "what happened to this dress?" question.

## Approach: Postgres triggers, not app-layer writes

Why triggers:

- Fires regardless of mutation source (app, MCP, Supabase Studio, direct SQL).
- Future slices (04 comments, 05 sharing) don't each need to remember to write audit rows.
- Accountability is the whole point of the slice; bypass-proof matters more than flexibility.

The cost (slightly more SQL, harder to mock in tests) is acceptable for a four-action surface.

### Trigger sketch — `log_item_change`

Fires `AFTER INSERT OR UPDATE OR DELETE ON items FOR EACH ROW`:

```sql
create or replace function log_item_change()
returns trigger language plpgsql security definer as $$
declare
  v_note text := nullif(current_setting('audit.note', true), '');
  v_client uuid;
begin
  v_client := (
    select client_id from locations
    where id = coalesce(NEW.location_id, OLD.location_id)
  );

  if TG_OP = 'INSERT' then
    insert into audit_log (user_id, client_id, target_type, target_id, action, before, after)
    values (auth.uid(), v_client, 'item', NEW.id, 'create', null, to_jsonb(NEW));
    return NEW;
  end if;

  if TG_OP = 'DELETE' then
    insert into audit_log (user_id, client_id, target_type, target_id, action, before, after)
    values (auth.uid(), v_client, 'item', OLD.id, 'delete', to_jsonb(OLD), null);
    return OLD;
  end if;

  -- TG_OP = 'UPDATE'
  if NEW.location_id is distinct from OLD.location_id then
    insert into audit_log (user_id, client_id, target_type, target_id, action, before, after)
    values (
      auth.uid(), v_client, 'item', NEW.id, 'move',
      jsonb_build_object('location_id', OLD.location_id, 'note', v_note),
      jsonb_build_object('location_id', NEW.location_id)
    );
  end if;

  if NEW.status is distinct from OLD.status then
    insert into audit_log (user_id, client_id, target_type, target_id, action, before, after)
    values (
      auth.uid(), v_client, 'item', NEW.id, 'status_change',
      jsonb_build_object('status', OLD.status, 'note', v_note),
      jsonb_build_object('status', NEW.status)
    );
  end if;

  return NEW;
end $$;
```

### Passing the note

`SET LOCAL` only persists within a single transaction. Two separate Supabase JS calls (one to set the config, one to UPDATE) land in two separate HTTP requests → two transactions → trigger doesn't see the note.

Fix: wrap the config-set + UPDATE in a single Postgres function called via one RPC:

```sql
create or replace function move_item(p_item_id uuid, p_new_location_id uuid, p_note text default null)
returns items language plpgsql security invoker as $$
declare
  v_row items;
begin
  perform set_config('audit.note', coalesce(p_note, ''), true);
  update items set location_id = p_new_location_id where id = p_item_id returning * into v_row;
  return v_row;
end $$;

create or replace function change_item_status(p_item_id uuid, p_new_status text, p_note text default null)
returns items language plpgsql security invoker as $$
declare
  v_row items;
begin
  perform set_config('audit.note', coalesce(p_note, ''), true);
  update items set status = p_new_status where id = p_item_id returning * into v_row;
  return v_row;
end $$;
```

`security invoker` means RLS is enforced against the caller (not the function definer) — so users can only move items they have access to. The trigger reads `audit.note` from the same transaction the UPDATE runs in.

### Append-only enforcement

RLS policies on `audit_log`:

- SELECT: same `can_access_client(client_id)` rule as everywhere else
- INSERT: only `service_role` and triggers (which run as `security definer`) — never users directly
- UPDATE: deny for all roles, including `super_admin`
- DELETE: deny for all roles, including `super_admin`

Mistakes get corrective audit entries, not edits.

### Display name snapshots

`audit_log.user_id` joins live to `profiles.display_name` for display. To keep historical names intact after removal:

- New column: `profiles.deleted_at timestamptz`
- User removal sets `deleted_at = now()` instead of hard-deleting the row
- Display layer renders "Dom (removed)" when `deleted_at is not null`
- The `auth.users` row also gets disabled (Supabase Admin API: `updateUserById` with `ban_duration: 'forever'`)

## Move action UX

### Button

On the **item detail page**, in the primary action row. No move on grid (no bulk in v1). On mobile, action row is sticky at the bottom of the detail.

### Dialog

```
┌──────────────────────────────────────┐
│  Move "Vanity Fair 2024 dress"       │
│  ─────────────────────────────────── │
│  From:  Bentley · Pink closet        │
│                                      │
│  To:    [ Search or browse...     ▾] │
│         ┌─────────────────────────┐  │
│         │ ▸ Bentley               │  │
│         │   ▾ Mandeville          │  │
│         │     · Bedroom           │  │
│         │     · Closet            │  │
│         │   ▸ Local personal      │  │
│         └─────────────────────────┘  │
│                                      │
│  Note (optional):                    │
│  [_______________________________]   │
│                                      │
│            [Cancel]   [Move →]       │
└──────────────────────────────────────┘
```

- **Location picker:** tree of all locations for the current client. Search box filters by name across all depths. Selecting a parent (non-leaf) is allowed — item lives at that level if no specific child is meant.
- **Note:** single-line text, optional, ≤ 200 chars.
- **Move button:** disabled until destination is selected and differs from current.

### Server action

```
POST /api/items/[id]/move  { newLocationId, note? }
  → supabase.rpc('move_item', { p_item_id, p_new_location_id, p_note })
  → returns updated item
```

The function call is one transaction: `set_config` → UPDATE → trigger writes audit_log → return. RLS enforces access to both old + new location's client (always the same client for v1; cross-client moves are blocked).

## Status change UX

Simpler than move:

- **Item detail:** `<StatusBadge>` next to title; tap → dropdown of enum values
  - Changing to `donated` or `archived` triggers a confirm dialog with optional note (same shape as move's note field)
  - Other transitions (e.g. donated → active) submit directly, no confirm
- **Sheet view (slice 02):** the status cell editor uses the same confirm-with-note for donated/archived

Server action mirrors move's pattern: calls `change_item_status(p_item_id, p_new_status, p_note)` via RPC. Single transaction; trigger fires.

## History panel

Lives on the item detail page (the stubbed slot from slice 02). Newest first; loads all entries for the item (count is small per-item-lifetime; paginate later if real data shows otherwise).

```
History
─────────────────────────────────────
👤 Dom                              2d ago
   moved this to Mandeville · Bedroom
   "returned from photoshoot"
─────────────────────────────────────
👤 Janelle                          1w ago
   marked this as donated
─────────────────────────────────────
👤 Dom                              3mo ago
   created this item
```

### Action → display copy

| Action          | Display                                    | Note rendered?     |
| --------------- | ------------------------------------------ | ------------------ |
| `create`        | "created this item"                        | no                 |
| `move`          | "moved this to {new_location_path}"        | yes if present     |
| `status_change` | "marked this as {new_status}"              | yes if present     |
| `delete`        | (item is gone; entry not user-visible)     | n/a                |
| `comment`       | "commented: \"{body}\""                    | n/a (body = content) |

Avatars: 32 × 32 round, `profiles.avatar_url` if set, else initials on a deterministic color.

Real-time updates not in v1 — refetched on item-detail mount + after any mutation on the page.

### Other surfaces

- **Sheet view:** already shows `created` column from slice 02. No additional history column.
- **Grid view:** no history surface — keep it visual.

## Schema additions

```sql
-- profiles
alter table profiles add column deleted_at timestamptz;

-- audit_log: deny UPDATE and DELETE for everyone
create policy "audit_log_no_update" on audit_log for update using (false);
create policy "audit_log_no_delete" on audit_log for delete using (false);

-- triggers
create trigger items_audit
  after insert or update or delete on items
  for each row execute function log_item_change();
```

The `audit_log` table itself was created in slice 01.

## Slice 01 amendment (already applied)

Dropped `'moved'` from the `items.status` enum. Moves are audit entries, not a status value. (`items.status` is now `('active','donated','archived')`.)

## Error handling

- **Move to inaccessible location:** RLS rejects the UPDATE → server action returns 403 → toast surfaces it. (Effectively unreachable since the picker only shows accessible locations.)
- **Concurrent move (two team members both moving same item):** last write wins; both audit rows land in order — history shows what happened.
- **Trigger exception (data-integrity check fail):** transaction rolls back, item stays in original location, server action returns 500 — toast.
- **Note > 200 chars:** validated client-side, rejected server-side, never reaches the trigger.

## Testing

- **Trigger tests in SQL** — for each audited action × each role's ability to perform that action, assert exactly one audit row is written per logical event with correct `before` / `after` / `note`.
- **RLS tests:** confirm no role can UPDATE or DELETE `audit_log` rows (including `super_admin`).
- **Integration test:** open move dialog, pick destination, type note, submit, assert audit row + updated `items.location_id`.
- **Soft-delete display:** set `profiles.deleted_at` on a user with existing audit entries; assert history panel still renders "(removed)" for them.

## In v1

- Triggers on `items` (create, move, status_change, delete)
- `profiles.deleted_at` soft-delete column + Admin-API ban call on removal
- Move dialog with tree-picker location + optional note
- Status dropdown on item detail + sheet view, with donated/archived confirm-with-note
- History panel on item detail (chronological, newest first)
- Append-only RLS on `audit_log`
- Slice 01 amendment applied (`'moved'` dropped from status enum)

## Out of v1

- Global recent-activity feed across the client (revisit with slice 04 notifications)
- Audit log filtering / search ("everything Dom did this week")
- Audit log export (CSV/PDF) — may surface in slice 05
- Audit log retention pruning (keep forever in v1)
- Bulk move
- Backdating moves
- Cross-client moves
- "Undo" UI (manual re-move; audit shows the round trip)
- Photo upload/delete auditing
- Hard delete of users (users are always soft-deleted in v1)

## Open questions deferred

- **Global activity feed** — pairs naturally with slice 04 notifications; revisit then.
- **Audit export for insurance/legal** — slice 05 may bake a PDF of "all moves on Sydney's Met Gala items, 2025" into the share flow.
- **Retention** — keep forever in v1; prune old entries on archived items if perf bites.
