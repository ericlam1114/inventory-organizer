---
title: Inventory Organizer — Master Spec
status: approved
last_updated: 2026-05-16
---

# Inventory Organizer — Master Spec

## Problem

A high-touch in-home organization business runs the inventory side of every client engagement across three tools that don't talk to each other:

- **Google Sheets** — item list with metadata (description, designer, where worn, etc.).
- **Google Photos** — visual browse, albums per storage unit / room, comments.
- **Apple Notes** — one-shot inventories (e.g. "Paris GR1 box, contents …").

This patchwork has six recurring failures observed in current client work:

1. **Shared per-client Google account.** Each client has a Google account (`SS inventory`, password = their address). For anyone on the team to use it, they must log out of their own account; the client's own logins trigger security alerts that land on the wrong phone (typically the spouse who set it up).
2. **No audit trail when items move.** When Dom moves a mirror from a pink closet to the Mandeville house, nothing records who, when, or why. The team works around it by leaving comments on the photo, and the photo stays in the wrong album.
3. **Photo-move friction in Drive.** Moving an item's photo from one location's album to another is many clicks; nobody on the team does it, so albums drift out of date.
4. **No filtered export.** Sending "just the Met Gala items" to an agent or insurance means handing out the shared Google account login — there's no way to scope what an outsider sees.
5. **Static snapshots.** Apple Notes inventories are frozen in time. Boxes get moved to storage; the note doesn't update.
6. **Three apps, no link between them.** The sheet row and the photo album and the note never connect to the same underlying record.

## Vision

A single mobile-first multi-tenant app that:

- Treats **photos as the primary handle** for an item — metadata is attached to the photo, not the other way around.
- Lets the team move items between locations with **one action** and records who/when/why automatically.
- Gives **every user their own login** (wife, team members, clients, occasional outsiders) so security alerts and notifications route correctly and actions are attributable.
- Lets the client export or share **a scoped subset** (e.g. "Met Gala items only", "everything in the Bentley pink closet") via a time-bound read-only link — no shared password.
- Lives in one place, so the spreadsheet view and the gallery view and the audit trail are all views of the same underlying record.

Success looks like: Eric's wife's daily work is faster than Google + Sheets + Notes was, and she can credibly offer this as part of her service to more clients without being personally on the hook for every move.

## Users

Captured roles, drawn from the transcript:

| Role            | Examples in transcript           | Needs                                                          |
| --------------- | -------------------------------- | -------------------------------------------------------------- |
| Owner / lead    | Eric's wife                      | Full control across all clients she manages; auditability      |
| Team member     | Dom, Pat, Cass                   | Move items, comment, scoped to clients they work               |
| Client          | Sydney, Sia, Miley, Paris, Bentley, Molly | View their own inventory, comment ("donated this", "bring this to Malibu"), share subsets |
| Outsider        | Client's agent, insurance company, housekeeper | Read-only access to a *subset* without a full login            |

## Core data model (high-level)

```
Client (the celebrity / household whose stuff this is)
  └── Location (a storage unit, house, or room — "Bentley pink closet", "Sia local personal", "Mandeville house: pantry")
        └── Item (a dress, mirror, bench, vitamins…)
              ├── Photos (one primary + zero-to-many secondary — item in storage, item in use)
              ├── Metadata (title, description, designer, when worn, where worn, status)
              ├── Move/audit log (who → from → to → when, plus optional note)
              └── Comments (free-form, threaded or flat, with notifications)
```

Categories on Item vary slightly per client (clothing vs furniture vs art) but the spine is stable.

Cross-cutting: **filtered exports / time-bound shareable links**, and **QR codes** that map a physical location to its digital list.

One *different* mode entirely: **move-in tour** — a guided photo-tour of a new place for a housekeeper or returning client showing where things live ("the pantry has food, medicine, vitamins, extra bags"). Same data, different presentation.

## Slice map

The project is decomposed into 7 slices. They are designed in order and implemented in order. Each one is a working unit on its own.

### 01 — Foundation (auth, tenancy, core data model)

The skeleton everything else hangs from. Per-user accounts, per-client tenancy, the `Client → Location → Item → Photos` schema, the database, the hosting baseline. Nothing user-facing beyond log-in and a client picker.

**Depends on:** nothing.

### 02 — Photo + item capture

The thing Eric's wife actually touches every day. Upload one or many photos into a location, give each a title and metadata, see them as a grid *and* an auto-generated sheet view, search and filter. This is the slice that must already be better than Google Photos + Sheets in isolation.

**Depends on:** 01.

### 03 — Move / audit log

The fix for the #2 pain point. One-click "move this item to {location}", which writes an audit entry (who, from, to, when, optional note). Status changes (donated, archived, in-use). Per-item history view.

**Depends on:** 02.

### 04 — Comments + notifications

Per-item comments. In-app notification feed for mentions, comments on items the user owns or follows, and audit events on items the user owns. Optional email / push.

**Depends on:** 02 (you need items to comment on), 03 (audit events feed into notifications).

### 05 — Sharing + filtered export

The fix for the #4 pain point. Read-only shareable links scoped to a filter ("all Met Gala items", "everything in Bentley pink closet"), with expiry and revoke. Email-based invitation for named outsiders (agent, insurance). Export to PDF / spreadsheet.

**Depends on:** 02.

### 06 — QR codes — DEFERRED

Per-location QR generation, printable label layout, scan → deep link into that location's item list. Auth-on-scan rules (does an outsider need a login? configurable per QR).

**Status:** deferred 2026-05-16. The transcript mention was aspirational ("ideally one day"); Janelle hasn't validated this is something she actually wants. Revisit only if she asks for it. Not in v1 sequencing.

**Depends on:** 01, 02 (if it returns).

### 07 — Move-in tour mode — DEFERRED

A separate UX over the same data: a guided photo-tour ("here is the pantry, contents are food + medicine + vitamins + extra bags") meant for housekeepers and move-in handoffs. Shareable without a full login.

**Status:** deferred 2026-05-16. Janelle hasn't validated this is something she wants explicitly; transcript mentioned it once. Not in v1. Revisit only if she asks for it.

**Depends on:** 02, 05 (if it returns).

## Sequencing

```
01 Foundation
   ↓
02 Photo + item capture ────┬──────────┐
                            ↓          ↓
                       03 Move/log  05 Share
                            ↓
                       04 Comments

Deferred 2026-05-16 (revisit only if Janelle asks):
  06 QR codes
  07 Move-in tour
```

**MVP = slices 01 → 02 → 03 → 04 → 05.** Implementation in that order. Slices 06 and 07 are deferred and not part of v1.

## Out of scope (v1)

Explicit YAGNI to keep us honest:

- **Billing / Stripe** — Eric's wife bakes the cost into service fees; no in-app payments.
- **Public marketplace / multi-organizer SaaS** — single-org product for her business; other organizers can come later if at all.
- **Native mobile apps** — mobile *web* must be excellent; native iOS/Android is post-v1.
- **AI auto-tagging of photos** — interesting but unproven; humans tag.
- **OCR of receipts / appraisals / docs** — not in transcript.
- **Integrations with Google Drive / Photos for import** — manual migration for v1 unless a slice surfaces a need.

## Open cross-cutting questions

These will be answered inside the slices that own them but are flagged here:

- **Database + hosting choice** — answered in slice 01.
- **Photo storage backend** — answered in slice 01 (informs slice 02).
- **What counts as a "user" for outsiders** — magic link, email-only, or full account? Answered in slice 05.
- **Multi-client UX for the wife** — she works across many clients; how is the client switcher surfaced? Answered in slice 02.
- **Pricing model for clients** — out of scope for this app's build; she will figure out.

## Next step

Slice 01 (Foundation) — brainstorm + spec. Then slice 02, and so on through 07. Then cross-slice consistency review. Then `writing-plans` hand-off to produce the implementation plan.
