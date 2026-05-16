---
title: Slice 02 — Photo + item capture
status: approved
slice: 02
depends_on: [01]
last_updated: 2026-05-16
---

# Slice 02 — Photo + item capture

## Purpose

The thing Janelle actually touches every day. Capture photos in the field on her phone, see them as a grid, edit metadata inline in a sheet view, and surface incomplete items so they get cleaned up.

After this slice, slice 02 must be unambiguously better than the Google Photos + Google Sheets combo it replaces — otherwise nothing else matters.

## Workflows

### A. Rapid capture (phone, in storage unit)

```
[Location grid] → tap Capture tab in bottom nav → [Capture page]
                                              ├── shutter / "Choose photos"
                                              ├── staged-photo strip: [p1][p2][+ Add]
                                              ├── Title (required)
                                              └── Save
                                                  → returns to grid; new tile
                                                    appears with "⚠ needs metadata"
```

Title is the only required field. Custom fields are not shown in capture. Save is optimistic: tile appears immediately; upload happens in the background. First photo of an item becomes the cover.

### B. Cleanup queue (office, anywhere)

```
[Location grid header: "Pink closet · 47 items · ⚠ Needs metadata (12)"]
   ↓ tap the chip
[Filtered grid: incomplete items only]
   ↓ tap any tile → [Item detail w/ metadata form]
   ↓ fill required custom fields → Save → "Next" button → repeat
```

The chip auto-hides at 0 incomplete. Item detail has a "Next →" button that walks the queue without bouncing back to the grid.

### C. Browse + view toggle

```
[Location grid] ─── toggle ─── [Sheet view of same items]
       │                              │
       └── tap photo ─────────────────┴─→ [Item detail]
```

Toggle state remembered per location per user (localStorage).

### D. Add photo to existing item

Item detail → "+ Add photo" → camera or upload → uploaded as secondary. Cover stays unless explicitly promoted.

### E. Define / edit custom fields (per client)

```
[Client settings → Custom fields]
   ├── List of fields (drag to reorder via position)
   └── [+ New field] → name, key, type (text|date|select), options-if-select, required → Save
```

Visible to `super_admin`, `org_team_all`, `org_team_per_client`. Hidden from client-side roles.

## Data model additions

### New table

```sql
custom_field_definitions
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,                                    -- "Designer" (display)
  key text not null,                                     -- "designer" (snake_case machine key)
  type text not null check (type in ('text','date','select')),
  options jsonb,                                         -- array of strings, only for type='select'
  required boolean not null default false,
  position int not null,                                 -- display/column order, 0-indexed
  created_at timestamptz default now(),
  unique(client_id, key)
```

### `items.metadata` shape

JSONB keyed by `custom_field_definitions.key`:

```json
{
  "designer": "Versace",
  "when_worn": "2024-09-01",
  "size": "M"
}
```

Validation lives at the app layer (server + client both check against the definition before write).

### Slice 01 amendments (already applied)

- `items.cover_photo_id uuid references item_photos(id) on delete set null` — added
- `item_photos.kind` enum — dropped (cover is denoted by FK)

### `items_with_status` view

Computes the needs-metadata predicate:

```sql
create or replace view items_with_status
with (security_invoker = true) as       -- inherits RLS from the underlying items table
select
  i.*,
  exists (
    select 1 from custom_field_definitions d
    where d.client_id = (select client_id from locations where id = i.location_id)
      and d.required = true
      and (i.metadata ->> d.key is null or i.metadata ->> d.key = '')
  ) as needs_metadata
from items i;
```

Grid/sheet queries hit `items_with_status` instead of `items` directly. Chip counter is `SELECT count(*) FROM items_with_status WHERE location_id = $X AND needs_metadata = true`. View can be replaced by a materialized column + trigger if perf bites.

### Field deletion behavior

When a definition is deleted:
1. Confirmation prompt shows count of items currently holding a value for that key.
2. On confirm: hard-delete the row AND `UPDATE items SET metadata = metadata - 'key' WHERE metadata ? 'key'` (scoped to the field's client).
3. Once slice 03 ships, both ops will write audit rows. Until then, deletion is irreversible — call out in the UI.

### Field type-change guard

`custom_field_definitions.type` is **locked once any item has a value for that key**. UI disables the type editor and shows a tooltip explaining why. Revisit in v2 with a per-value migration tool.

## Routes

```
src/app/(app)/clients/[clientId]/
├── page.tsx                                ← client home: location tree + recents
├── locations/new/page.tsx                  ← create location (nested optional)
├── locations/[locationId]/page.tsx         ← grid or sheet via ?view=grid|sheet
├── capture/page.tsx                        ← ?locationId=X prefill
├── items/[itemId]/page.tsx                 ← item detail
├── search/page.tsx                         ← text + status filter
└── settings/fields/page.tsx                ← custom field admin
```

View mode uses a search param (`?view=grid|sheet`) so URLs are shareable and the toggle is a single client-side state change. No intercepted-route capture modal — capture is always a full page (simpler).

## Navigation

Bottom nav inside a client context:

```
┌───────────────────────────────────────┐
│  [Browse]   [⊕ Capture]   [Search]    │
└───────────────────────────────────────┘
```

- Three tabs, capture is the visually-prominent middle button.
- App-bar hamburger opens the `<LocationTree>` drawer on mobile.
- Settings (custom fields, team, etc.) lives under a profile menu in the app bar.

## Components

| Component                | Role                                                          |
| ------------------------ | ------------------------------------------------------------- |
| `<LocationTree>`         | Collapsible nested tree (drawer on mobile, sidebar on desktop) |
| `<LocationHeader>`       | Breadcrumb + count + view toggle + `<NeedsMetadataChip>`      |
| `<PhotoGrid>`            | Square thumbnails, virtualized at >100 items                  |
| `<ItemSheet>`            | Inline-edit table; columns = universal + custom fields        |
| `<ItemCard>`             | Cover + title overlay + status dot                            |
| `<ItemDetail>`           | Photo carousel + metadata form + empty comments panel ("coming in slice 04") + empty history panel ("coming in slice 03") |
| `<CaptureSheet>`         | Camera/upload + staged-photo strip + title field + Save       |
| `<MetadataField>`        | Polymorphic input per `type` (text/date/select)               |
| `<CustomFieldDefForm>`   | Admin: name/key/type/options/required                         |
| `<StatusBadge>`          | Color-coded status pill                                       |
| `<NeedsMetadataChip>`    | "⚠ Needs metadata (N)" — clickable filter                     |

## Sheet view

### Library

TanStack Table v8 (headless). Inline editing hand-wired so editor varies per field type.

### Default columns

| Column           | Source                       | Sortable | Editable | Notes                       |
| ---------------- | ---------------------------- | -------- | -------- | --------------------------- |
| (thumbnail)      | `items.cover_photo_id`       | no       | no       | 40×40, click → detail       |
| Title            | `items.title`                | ✓        | ✓ text   | Sticky-left on mobile       |
| Status           | `items.status`               | ✓        | ✓ select | Colored badge cell          |
| Description      | `items.description`          | ✓        | ✓ text   | Truncated, expand on edit   |
| *Custom field N* | `items.metadata[key]`        | ✓        | ✓ typed  | One per definition, ordered |
| Created          | `items.created_at`           | ✓        | no       | Relative date display       |

### Inline-edit interaction

- click cell → typed editor → Enter / blur saves → Esc cancels
- ⌘/Ctrl-Enter saves + jumps to next row, same column
- Tab moves to next column, same row
- Editors per type: `text` → `<input>` (description gets `<textarea>`), `date` → `<input type=date>`, `select` → `<select>`, status → `<select>` of enum values

### Validation

Client-side BEFORE the save call; server re-validates (defense in depth):

- `text` — none
- `date` — must parse as ISO date
- `select` — must be in `options`
- `status` — must be one of the four enum values

Invalid cell: red border + tooltip; save blocked until valid or Esc cancels.

### Save semantics

- Each cell edit = its own PATCH (no batched save button)
- Optimistic UI; light pulse on saving cell
- On error: cell reverts, toast shows error, cell stays focused for retry
- Needs-metadata chip refetches count after each save

## Photo pipeline

1. Pick/capture → optimistic tile with placeholder
2. **HEIC → JPEG** in the browser (iPhone-default format) via `heic2any` or equivalent
3. Resize to max 2048px, JPEG ~85% — keeps mobile uploads fast
4. Enforce 25MB client-side ceiling after compression (Supabase Storage cap is 50MB)
5. Upload to `clients/{clientId}/items/{itemId}/{photoUuid}.jpg`
6. INSERT `item_photos`; if first photo for item, UPDATE `items.cover_photo_id`
7. Persistent failure → retry button on tile + banner; no silent loss

`next/image` renders thumbnails with Supabase Storage in `next.config.ts` `remotePatterns`. Grid uses `object-fit: cover`; detail uses aspect-preserving carousel.

## Error handling

- **Upload failure** — retry button on the affected tile + non-blocking banner
- **Save failure (sheet/form)** — cell/field reverts, toast with error, focus returns to retry
- **HEIC conversion failure** — fallback to uploading the original; if Supabase rejects, surface a clear error
- **RLS violation** (impossible if slice 01 is correct, but defensively) — treated as not-found

## Testing

- **Inline edit** — one integration test per field type (text/date/select/status) saving + invalid-validation rejecting
- **Capture flow** — one integration test for single-photo, one for multi-photo staging
- **Needs-metadata view** — SQL tests asserting the predicate is correct across edge cases (no required fields defined; required field empty; required field present)
- **Photo pipeline** — unit test for HEIC detection + resize, mocked Storage client

## In v1

- Schema additions (`custom_field_definitions`, `items_with_status` view, slice-01 amendments)
- Bottom nav (Browse / Capture / Search)
- Nested location tree drawer
- Location grid (default) with thumbnails, status badges, ⚠ chip
- Sheet view with TanStack Table, inline cell editing per type, client-side sort
- View toggle persisted per user per location
- Capture page (mobile-first, multi-photo staging, title-only required)
- Item detail (carousel, metadata form, comments stub, history stub)
- Custom field admin (CRUD, drag-reorder, delete confirmation, type-change guard)
- Photo pipeline (HEIC → JPEG, resize, upload, cover assignment)
- Search page (text on title + description, status chip)

## Out of v1

- Bulk multi-row edit
- Sheet: column resize / reorder / hide / copy-paste / drag-fill / multi-cell select
- Photo: crop / rotate / drag-reorder secondaries (cover can be set; manual order deferred)
- Search: filter by custom-field values
- AI auto-tagging
- Google Drive / Photos bulk import
- Custom field type migrations (locked once any item has a value)
- Move action → slice 03
- Audit log writes + history view → slice 03 (stub only here)
- Comments → slice 04 (stub only here)
- Sharing / export → slice 05
- QR scan → slice 06

## Open questions deferred

- **Field type migration tool** — when she eventually wants `text → date` on an existing field, v2 will need a per-value migration UI.
- **Image upload ceiling** — 25MB client-side limit may bite for raw photo uploads from a real camera; revisit if she hits it.
- **Search ranking** — Postgres FTS basic config is fine for v1; tune if relevance complaints surface.
- **Sheet pagination** — client-side fine for prototype; switch to server-side at ~1000 rows per location.
