---
title: Google Drive — layout + interaction reference
last_updated: 2026-05-17
---

# Google Drive

A file + folder browser. Janelle stores most non-photo client material here (PDFs of appraisals, contracts, scanned documents). For inventory specifically, she's mostly hit it for sharing folders with her team.

## Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ☰  ▲ Drive    [🔍 Search in Drive                    ⌄]   ⚙  ::  👤  │  ← Top header, ~64px
├──────────────┬──────────────────────────────────────────────────────────┤
│              │                                                          │
│  [+ New ⌄]   │  Suggested                                               │
│              │  ┌─────────┐ ┌─────────┐ ┌─────────┐                    │
│  ▸ My Drive  │  │ thumb   │ │ thumb   │ │ thumb   │                    │
│  ▸ Computers │  │ filename│ │ filename│ │ filename│                    │
│  ▸ Shared    │  └─────────┘ └─────────┘ └─────────┘                    │
│  ▸ Recent    │                                                          │
│  ☆ Starred   │  Folders                  Sort: Name ⌄    [⊞] [≡]      │
│  🗑 Trash    │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │
│              │  │ 📁    │ │ 📁    │ │ 📁    │ │ 📁    │                  │
│  ────────    │  │ Sydney│ │ Sia   │ │ Miley │ │ Paris │                 │
│              │  └──────┘ └──────┘ └──────┘ └──────┘                    │
│  Storage     │                                                          │
│  ▓░░░░░░░    │  Files                                                   │
│  3.2 / 15 GB │  ┌──────────────────────────────────────────────┐        │
│              │  │ ▤  contract-sydney.pdf      Me     May 12    │        │
│              │  │ ▤  packing-list.xlsx        Me     May 10    │        │
│              │  └──────────────────────────────────────────────┘        │
│              │                                                          │
└──────────────┴──────────────────────────────────────────────────────────┘
```

### Header (top, ~64px)
- App switcher hamburger (left edge)
- Drive logo + wordmark
- **Big rounded search bar in the middle**, takes up ~60% of viewport width on desktop. Has a filter chevron on the right that opens a popover (type / owner / date / has-words filters)
- Apps grid (the 9-dot icon), settings cog, account avatar (right edge)

### Left sidebar (~256px, collapses to ~72px on narrow)
- **"+ New" button** at the top — pill-shaped, white with a soft drop shadow, has a small chevron for a dropdown (New folder / File upload / Folder upload / Google Docs / Sheets / Slides / etc.). Bigger and more visually weighty than any other button on the page.
- Navigation tree below: "Home" / "My Drive" / "Computers" / "Shared with me" / "Recent" / "Starred" / "Spam" / "Trash"
- Each item is a row with a small icon + label, hover state is a soft pill background
- "My Drive" has a chevron — expandable to show the folder tree inline
- "Storage" widget at the bottom with a thin progress bar and "X GB of Y GB used"

### Main area
- **Breadcrumb** at the top: "My Drive > Photos > 2024"
- **Action bar** flush-right of the content: sort dropdown (Name / Last modified / Last opened by me / Storage used / Quota used) + view-mode toggle (grid icon / list icon)
- **Sections** stacked: "Suggested" (recent + AI-suggested files), "Folders", "Files"
- Each section header is a small label (text-[13px] tracking-wide gray)

### Folder card (grid view)
- Compact card, ~180×40px
- Folder icon (filled, blue tint) + folder name + 3-dot kebab menu on hover
- Sharing indicator: small "people" icon if shared
- Click → enters folder
- Double-click → same as click

### File row (list view)
- Each row ~40px tall, sparse columns:
  - Thumbnail (24×24)
  - Name (truncates with ellipsis)
  - Owner
  - Last modified (date)
  - File size (right-aligned)
  - Kebab menu (appears on row hover)
- Hover: row background lightens to `#f1f3f4`
- Selected: row background is `#e8f0fe` (blue tint), 2px blue left border

### Right side panel (slide-in, optional)
- Appears when a file is selected and the "i" button is clicked
- Width ~360px
- Tabs: Details / Activity
- Details: preview thumbnail, name, type, size, owner, location, modified, opened, created, description, sharing summary
- Activity: edit history with timestamps + user avatars

## Visual style

| Token | Value |
| --- | --- |
| Page background | `#ffffff` |
| Surface (cards, rows) | `#ffffff` |
| Subtle hover background | `#f1f3f4` |
| Selected background | `#e8f0fe` (blue-50) |
| Border / divider | `#dadce0` |
| Primary blue | `#1a73e8` / `#0b57d0` |
| Body text | `#202124` |
| Secondary text | `#5f6368` |
| Typography | Google Sans for headers, Roboto for body, base 14px |
| Icon set | Material Symbols (filled when active, outlined otherwise) |

Density is moderate — not crammed like a database admin, not airy like a marketing site. Spacing increments feel like 4/8/12/16/24/32.

## Interactions

- **Click** a row/card → select (highlights, opens right panel)
- **Double-click** a folder → enters it; a file → opens preview
- **Right-click** → context menu: Open, Open with, Get link, Show file location, Make available offline, View details, Manage versions, Make a copy, Send a copy, Add to starred, Rename, View activity, Move to, Move to trash
- **Multi-select**: Cmd/Ctrl-click adds; Shift-click ranges
- **Drag**: drop a file/folder onto another folder to move; drop on the sidebar to move to a top-level view
- **Search**: type → autocomplete suggestions appear in a dropdown (recent searches + filtered results)
- **Keyboard**: arrow keys navigate, Enter opens, `?` shows the shortcut sheet
- **Bulk actions bar**: when 2+ items are selected, a thin bar pops in at the top with Share / Move / Get link / Delete / etc.

## Empty / loading states

- Empty folder: a centered illustration (file boxes) + "Drop files here to upload, or use the 'New' button"
- Loading: shimmering skeleton rows in list view, skeleton cards in grid view
- Search no-results: "No results found" + suggestion chips ("Search owners" / "Search labels")

## Mobile

- Sidebar collapses to a hamburger drawer
- File rows take the full width
- Cards stack 2-per-row (or 1-per-row on narrow phones)
- FAB at bottom-right replaces "+ New" button
- Bottom bar for switching sections (Home / Starred / Shared / Files)

## What works

- **Right-click everywhere** is a power-user superpower; secondary actions are never more than one click away
- **Suggested files** at the top — Drive surfaces what you probably want before you even search
- **Live search with type-ahead** finds files faster than navigation
- **The sidebar is always available** — context never leaves the user
- **Side panel doesn't navigate away** — peek at details without losing your place

## What hurts (Janelle's pain)

- **Moving photos across folders** is multi-click and easy to forget — there's no inline "move this somewhere" affordance on a thumb
- **Sharing flow** requires a modal with permission dropdowns; not optimized for "send this exact thing to this exact person"
- **No structured metadata** beyond filename — you can't add "Designer: Versace" to a photo
- **Comments are per-file and easy to miss** — there's no global "things people commented on" view in the file browser
- **Albums vs folders confusion** — Drive folders vs Photos albums are different conceptually but visually similar

## Takeaways for our inventory app

1. **Three-zone shell** (header / left context / main) is what Janelle expects when she's in "browse mode." Our location tree drawer + main grid mirror this.
2. **Right-click context menu** is missing today on our location nodes and item tiles. Worth adding for power moves (Move, Rename, Delete, Share).
3. **Bulk action bar** when multiple items are selected — out of v1, but the pattern is well-known. When we add bulk actions in slice 02 v2, mirror Drive's top-bar treatment.
4. **Suggested / Recent rail** on the client home — "items captured today, items needing metadata, items moved recently" — gives Janelle a starting point instead of an empty tree.
5. **The "+ New" button is the most prominent element on the page** — pill-shaped, slightly raised. Our "+ New client" / "+ New location" / "+ New share" buttons should have similar weight (we already use `bg-ink text-paper`, which is the right move).
6. **Storage indicator** at the bottom of the sidebar is calm and informative. Could surface "items needing metadata" or "active shares" the same way.
