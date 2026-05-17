---
title: Google Sheets — layout + interaction reference
last_updated: 2026-05-17
---

# Google Sheets

Where Janelle ends up doing the *structured* part of her work today — designer, when worn, where worn, who has it, what's the appraised value. Our slice-02 sheet view (TanStack Table) is trying to feel like Sheets for the editing flow, while connecting the rows back to actual photos + audit history.

## Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ▲ ✕ Inventory · Miley           ☆ 🗀  All changes saved      Share  👤 │  ← title bar
├─────────────────────────────────────────────────────────────────────────┤
│ File  Edit  View  Insert  Format  Data  Tools  Extensions  Help        │  ← menu bar
├─────────────────────────────────────────────────────────────────────────┤
│ ⏪ ⏩ 🎨  100% ⌄  $  %  .00  →   Arial ⌄  10 ⌄  B I U  Aa ▾  ⬛ ⬜  ━  │  ← toolbar
├─────────────────────────────────────────────────────────────────────────┤
│ fx │ Vanity Fair 2024 dress                                              │  ← formula bar
├───┬──────────────────────────────────────────────────────────────────┬──┤
│   │ A          │ B          │ C          │ D          │ E          │ F │  ← column letters
│───┼────────────┼────────────┼────────────┼────────────┼────────────┼──│
│ 1 │ Title      │ Designer   │ When worn  │ Where worn │ Status     │   │  ← header row
│ 2 │ Vanity F…  │ Versace    │ 2024-09-01 │ Met Gala   │ Active     │   │
│ 3 │ Black coc… │ Tom Ford   │ 2023-12-15 │ Vanity F…  │ Donated    │   │
│ 4 │ Red carpe… │ Galliano   │ 2024-03-10 │ Oscars     │ Active     │   │
│ 5 │            │            │            │            │            │   │
│ 6 │            │            │            │            │            │   │
├───┴──────────────────────────────────────────────────────────────────┴──┤
│ + ≡  Sheet1 ⌄   Sheet2 ⌄   Sheet3 ⌄                       Filter ⌄  ⚙  │  ← sheet tabs
└─────────────────────────────────────────────────────────────────────────┘
```

### Title bar (top, ~40px)
- App switcher / back arrow + Sheets logo
- Filename (click to rename), star, folder
- Status indicator: "All changes saved" / "Saving…" / "Edit history"
- Spacer
- **Share button** (prominent blue), avatar

### Menu bar (~32px)
- File / Edit / View / Insert / Format / Data / Tools / Extensions / Help
- Plain text, each menu opens a classic desktop-style dropdown
- Power users navigate this with Alt+F, etc.

### Toolbar (~48px)
- Undo / Redo / Paint format
- Zoom dropdown (50% / 75% / 100% / 125% / 150% / 200%)
- Number formats: $ / % / .00 / decrease/increase decimals
- Format type dropdown
- Font family + size
- Bold / Italic / Underline / Strikethrough
- Text color / Fill color
- Borders / Merge cells / Horizontal align / Vertical align / Wrap text / Text rotation
- Insert link / Comment / Chart / Filter / Function

### Formula bar (~32px)
- `fx` icon (insert function), active cell reference left side
- Cell content / formula on the right (full width)
- Editable; Enter commits to the cell

### The grid (the meat)
- **Column letters** (A, B, C…) — sticky top, light gray background `#f8f9fa`, 14px medium, ink-2 gray
- **Row numbers** (1, 2, 3…) — sticky left, same styling as column letters
- **Cells** — white background, 1px `#e2e3e3` gridlines on right + bottom
- **Default cell**: 13–14px Arial-ish text, 4px padding all sides, height auto-fits content (~21px default)
- **Selected cell**: thick blue (`#0b57d0`) 2px border, small blue square at bottom-right (fill handle)
- **Active range** (multi-cell): blue tint background `#e8f0fe`, dotted blue outline around the range
- **Frozen rows/cols**: thicker gray border, slightly darker background on the frozen pane
- **Filter views**: when active, the column headers show small triangle icons; the row numbers turn green to indicate a filter is on

### Sheet tabs (~40px, bottom)
- Each tab: small color stripe + name + chevron for sheet menu (rename, color, delete, hide, duplicate, copy to, lock, etc.)
- "+" button on the left to add a sheet
- "≡" button (hamburger) for the sheet picker (jump to any sheet by name)
- "Filter views" pill on the right
- Settings cog (sheet protection, etc.) far right

## Visual style

| Token | Value |
| --- | --- |
| Page background | `#fcfcfc` |
| Cell background | `#ffffff` |
| Gridlines | `#e2e3e3` (very light gray) |
| Header background (col/row) | `#f8f9fa` |
| Selected border | `#0b57d0` 2px |
| Selected range fill | `#e8f0fe` |
| Body text | `#000000` cell content; `#5f6368` for headers |
| Typography | Arial / Helvetica fallback, default 10pt (~13px) for cells |

**Density is VERY high.** Cells are tight — you fit ~25 rows in a normal viewport. Default row height is around 21px. Compare to our sheet view which uses `py-3` (~44px row height) — almost twice as tall.

## Interactions

### Selection
- **Click** a cell → select (one cell)
- **Click + drag** → select range
- **Shift+click** → extend selection to that cell
- **Cmd/Ctrl+click** → add to selection (multi-region)
- **Cmd+A** → select all; again → select sheet
- **Click column letter** → select entire column; **click row number** → select entire row

### Editing
- **Start typing** → overwrites the cell (entering edit mode automatically)
- **F2 or double-click** → enters edit mode preserving current content
- **Enter** → commit + move down
- **Tab** → commit + move right
- **Shift+Enter / Shift+Tab** → commit + move up / left
- **Esc** → cancel edit, revert to previous value
- **Cmd+Z / Cmd+Shift+Z** → undo / redo with full history
- **Formula starts with `=`** → autocomplete kicks in (function name + arg hints)

### Fill handle (the killer feature)
- Small blue square at the bottom-right of the selection
- **Drag** it down/across → fills the pattern (numbers, dates, formulas, even text patterns Sheets can infer)
- **Double-click** → fills all the way down to the bottom of the adjacent column

### Copy / paste
- Cmd+C copies selection; Cmd+V pastes
- **Paste special**: values only, format only, formula only, transposed
- Cross-sheet paste preserves formulas with relative references
- Marching ants animate around the source range during copy

### Right-click context menu
- Cut / Copy / Paste / Paste special
- Insert row above/below, column left/right
- Delete row / column / cells
- View row in side panel
- Filter / Sort range
- Get link to this cell
- Comment / Note
- Smart fill / Smart cleanup
- Data validation
- Conditional formatting
- Protect range

### Filters + views
- **Filter range**: opens a popover on each column header with conditions, distinct values, sort
- **Filter views**: per-user filter state, doesn't affect other collaborators (good for shared sheets)
- Slicers can pin filter controls above the grid

### Collaboration
- Live cursors (named, colored) showing where other users are
- Click someone's cursor → see what they're typing
- Comment threads attached to ranges, with resolve workflow
- Edit history per cell

## Visual style nuances

- **No drop shadows on cells.** Just gridlines. Flat.
- **Hover** on a row number / column letter → slight darker gray background
- **Hover on a cell** → no visual change (would be too noisy with so many cells)
- **Cell padding is 4px** — extremely tight by web standards
- **Numbers right-align by default; text left-aligns** — this is convention but Sheets does it without asking

## Empty / loading states

- New sheet: shows the empty grid with a watermark "Try a new layout" prompt in the bottom-right
- Loading: skeletons that match the cell grid (column letters appear, then rows progressively load)
- No-data state on a filtered view: "No rows match your filters."

## Mobile

- Sheets on mobile is **rough** — Janelle has complained about this
- The toolbar collapses to icon-only with overflow
- Tapping a cell opens a bottom-sheet inline editor (covers half the screen)
- Pinch-zoom for grid scale
- No fill handle on touch (gone)
- Frequent layout shifts when keyboard opens

## What works

- **Keyboard-first editing** — once you know Enter / Tab / Shift modifiers, you can fly through data entry
- **Fill handle** is unmatched for repetitive data
- **Frozen rows/cols** let you scroll a 1000-row sheet without losing context
- **Filter views per user** is the right model for shared sheets
- **Cell-level edit history** — "who changed this cell?" is one click
- **Right-click menu density** — every cell-level action one right-click away

## What hurts (Janelle's pain)

- **No native photo column** — you have to manually `=IMAGE(url)` and the URL has to be a public Drive link, which means losing privacy
- **No relational model** — a row can't have multiple photos; a row can't have a structured "history of moves"
- **Setting up the schema is on the user** — Sheets gives you cells, you decide what's a column
- **Mobile sheet editing is bad** — Janelle won't do data entry on phone in Sheets
- **No "needs metadata" view** — you can filter for empty cells but it's not first-class
- **Sharing is per-spreadsheet, not per-row** — agents see everything or nothing

## Takeaways for our inventory app

1. **We're way less dense than Sheets.** Our `py-3` (44px) rows vs Sheets' 21px. For *power users* doing the cleanup pass, a "compact" toggle on the sheet view that drops row height to ~28px would feel native. v2 polish.
2. **Tab / Shift+Tab between cells** — our TanStack sheet view already supports this for keyboard nav. Verify it actually works (was claimed in slice 02 spec).
3. **Fill handle is the killer feature we're missing.** For the prototype it's deferred. But when Janelle is filling in 30 items with `where_worn = "Met Gala 2025"`, the fill handle is the right UX. Add to v2 list.
4. **Filter views per user** — our sheet view has zero per-user state right now. The view-mode toggle (grid/sheet) is per-user via localStorage. Filters should be similarly per-user (especially for shared clients).
5. **Right-click context menu** — same takeaway as Drive. Power user gap.
6. **Frozen first column** — our sheet has `sticky-left` on the title column per the spec. Confirm this is actually wired.
7. **Live "X cells changed" status** — "All changes saved" / "Saving…" indicator. We have per-cell toasts; a global status indicator (saving / saved / error) at the top would be more reassuring.
8. **No drop shadows, just gridlines** — our sheet uses `border-rule` between rows. Good — that's the right direction.
9. **The formula bar shows the active cell's full content.** We don't have one, and we probably don't need one — but the *idea* (a single canonical source of truth for the currently-focused cell) is worth a thought for editing long descriptions.
10. **Mobile is where Sheets falls apart.** That's our actual moat: we built mobile-first capture, while Sheets users hit Sheets on phone reluctantly. Lean into this — don't try to make our sheet view good on mobile (grid is better there); just make damn sure the *grid* view is the default on mobile.
