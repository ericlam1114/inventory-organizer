# Inventory Organizer — Design Dashboard

**Status:** design complete for MVP (slices 01–05). 06 + 07 deferred. Implementation plan next.

Start here: [`00-master.md`](./00-master.md) — full project vision, users, data model, slice map.

**Cross-cutting docs:**
- [`design-guidelines.md`](./design-guidelines.md) — visual identity, color/type tokens, component patterns
- [`env-vars.md`](./env-vars.md) — all environment variables with slice-by-slice dependency map

**Implementation plans:**
- [`plans/2026-05-16-slice-01-foundation.md`](./plans/2026-05-16-slice-01-foundation.md) — Phase 0 (tooling/brand) + Slice 01. ~25 tasks, TDD with RLS tests as the load-bearing checks.

## Slice index

| #   | Slice                                                     | Status     | Spec |
| --- | --------------------------------------------------------- | ---------- | ---- |
| 01  | Foundation — auth, tenancy, core data model               | **shipped** ✅ | [`specs/01-foundation.md`](./specs/01-foundation.md) |
| 02  | Photo + item capture — upload, metadata, grid + sheet     | **code complete** ✅ | [`specs/02-photo-item-capture.md`](./specs/02-photo-item-capture.md) |
| 03  | Move / audit log — one-click move, who-did-what trail     | **code complete** ✅ | [`specs/03-move-audit-log.md`](./specs/03-move-audit-log.md) |
| 04  | Comments + notifications                                  | **code complete** ✅ | [`specs/04-comments-notifications.md`](./specs/04-comments-notifications.md) |
| 05  | Sharing + filtered export — agent / insurance access      | **code complete** ✅ | [`specs/05-sharing-export.md`](./specs/05-sharing-export.md) |
| 06  | QR codes — physical unit → digital list                   | **deferred** | not specced — Janelle hasn't validated; revisit if she asks |
| 07  | Move-in tour mode — housekeeper / new-place orientation   | **deferred** | not specced — Janelle hasn't validated; even Eric wasn't sure what it is. Revisit if she asks. |

Status values: `not started` → `in design` → `draft written` → `approved` → `in implementation` → `done`.

## Workflow per slice

Each slice goes through the same loop before being marked `approved`:

1. Clarifying questions — one at a time
2. Propose 2–3 approaches with trade-offs + recommendation
3. Present design in sections (architecture, data, UX, error/edge cases) — approval after each
4. Write spec to `specs/0X-*.md`
5. Self-review pass (placeholders, contradictions, scope, ambiguity — fixed inline)
6. User reviews the written spec
7. Mark `status: approved` in frontmatter, update this README, start the next slice

After all 7 are approved → cross-slice consistency review → `writing-plans` skill → implementation.
