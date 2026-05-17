---
title: Google Photos — layout + interaction reference
last_updated: 2026-05-17
---

# Google Photos

The visual browse experience Janelle relies on today. When a team member uploads a stack of inventory shots, Photos is where they go to scroll through them, comment, and find that one item from six months ago. Photos is *good* — most of our slice 02 grid is trying to live up to it.

## Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ☰  ▲ Photos      [🔍 Search your photos              ]    ::  👤      │  ← thin header
├────┬─────────────────────────────────────────────────────────────────┬──┤
│    │                                                                 │  │
│ 🖼  │  Today                                                          │  │
│Pho │  ┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐                    │May│
│tos │  │    ││    ││    ││    ││    ││    ││    │                    │   │
│    │  └────┘└────┘└────┘└────┘└────┘└────┘└────┘                    │   │
│ 🔍 │  ┌────┐┌────┐                                                   │   │
│Exp │  │    ││    │                                                   │   │
│lor │  └────┘└────┘                                                   │   │
│    │                                                                 │Apr│
│ 👥 │  Yesterday                                                      │   │
│Sha │  ┌────┐┌────┐┌────┐┌────┐                                       │   │
│re  │  │    ││    ││    ││    │                                       │   │
│    │  └────┘└────┘└────┘└────┘                                       │   │
│ 📚 │                                                                 │Mar│
│Lib │  May 11                                                         │   │
│    │  ┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐                          │   │
│    │  │    ││    ││    ││    ││    ││    │                          │   │
│    │  └────┘└────┘└────┘└────┘└────┘└────┘                          │   │
│    │                                                                 │   │
└────┴─────────────────────────────────────────────────────────────────┴──┘
```

### Header (top, ~52px — thinner than Drive)
- Hamburger + Photos logo on the left
- **Big rounded search bar** in the middle, but slightly smaller than Drive's
- Apps grid + account avatar on the right
- No filter chevron — the search results page has filters instead

### Left rail (~80px, narrow)
- Sparse: icon + label, stacked vertically
- **Photos** (the main timeline)
- **Explore** (search by faces, things, places, categories)
- **Sharing** (sent + received share links)
- **Library** (Albums, Trash, Archive, Favorites)
- Active item gets a blue pill background and bold label
- On narrow viewports the rail collapses to icons only

### Main area — the timeline
- **Date-grouped justified grid** of square (or near-square) photo thumbs
- Group headers: "Today" / "Yesterday" / specific dates ("May 11") / month names farther back / years for old stuff
- The thumbs are **tight** — gap is ~2–4px, not 16px. The grid is "justified": each row's thumbs are scaled so the row fills the available width exactly (Flickr-style).
- Thumbs are square by default. The grid auto-balances row heights so a wide panorama still fits.
- Aspect-ratio variants exist (square / day / month / year) — user can zoom in/out the entire timeline density

### Right scrollbar (the killer feature)
- A custom scrollbar on the right edge that shows year/month markers
- Drag the thumb to jump in time — "scrub" to August 2024 in two seconds
- Year labels appear as the thumb passes them

### Fullscreen carousel (when you click a photo)
- Photo centered on a near-black `#1f1f1f` backdrop
- Top bar: back arrow (left), Info / Share / Add to / Favorite / Edit / Delete / kebab (right)
- Bottom: a thin filmstrip of neighboring photos (you can click another thumb to jump)
- Right side panel (optional): photo info (date, time, file name, location, camera, dimensions), people, comments, location map
- Arrow keys navigate; Esc closes; the chevron arrows on left/right of photo for click navigation
- On hover, the chrome dims (auto-hide after ~3s)
- Pinch / scroll to zoom

## Visual style

| Token | Value |
| --- | --- |
| Page background | `#ffffff` (light mode) / `#202124` (dark mode) |
| Carousel backdrop | `#1f1f1f` (very dark — almost black) |
| Thumb gap | 4px |
| Border / divider | none on the timeline (photos *are* the chrome) |
| Selection ring | 2px blue (`#1a73e8`) inset |
| Selection check | white circle, top-left of thumb, on hover or in select mode |
| Group header text | 14px medium, ink-2 gray |
| Typography | Google Sans + Roboto |

**Density is HIGH.** Photos packs maybe 6–8 thumbs per row on desktop, 4 per row on tablet, 3 on phone. The whole point is that the photos *are* the content; chrome fades.

## Interactions

- **Click** a thumb → fullscreen carousel opens
- **Hover** a thumb → a circle checkbox appears in the top-left (click it to multi-select); thumb dims very slightly
- **Click the checkbox circle** → enters multi-select mode (no fullscreen). A top action bar slides in with Add to / Share / Download / Delete / etc.
- **Shift-click** another thumb → range select (very fast)
- **Long-press** on mobile → enters multi-select mode
- **Right scrollbar drag** → time-scrub
- **Pinch in/out** on the timeline → changes grid density (Day / Month / Year zoom levels)
- **Keyboard in carousel**: arrows nav, Esc closes, `i` toggles info panel, `Delete` deletes
- **Swipe** on mobile in carousel → next/prev photo
- **Swipe up** in carousel → opens info panel

## Empty / loading states

- Empty: a calm illustration + "Photos and videos you upload will appear here"
- Loading: shimmering placeholder squares in the same grid layout (no rectangles or layout shift)
- Search no-results: "No matches. Try a face, place, or thing." with chip suggestions

## Mobile

- **Bottom nav** with Photos / Search / Library
- FAB-like upload button bottom-right
- Pinch-zoom for grid density
- Fullscreen carousel uses the whole screen, chrome auto-hides
- Pull-to-refresh
- "Scroll to year" via the right scrubber works the same

## What works

- **Photos *are* the chrome** — the grid removes everything that isn't a photo. The eye goes to the content.
- **Justified grid** uses the full width without awkward gaps. Aesthetically way better than fixed-column grids.
- **The right-edge time scrubber** turns scroll position into time-travel. Brilliant.
- **Long-press / hover-check for multi-select** keeps the default click action (open fullscreen) un-modal.
- **Fullscreen carousel chrome fades** — you're with the photo, not the app.
- **Search by face / place / thing** — non-obvious; one of the few things only a big-tech app does well.
- **Comments live on the photo, not in a separate thread elsewhere.**

## What hurts (Janelle's pain)

- **Albums are flat** — you can't have an album of albums. Janelle's hierarchy (client → house → room) doesn't fit.
- **No structured metadata** — you can describe a photo via comment but you can't say "designer = Versace" as a field.
- **Moving a photo between albums** still requires you to open the album view + select + "Add to album" + pick from list. No drag-to-folder.
- **Shared-album permissions** are coarse: everyone in the album can comment + add photos. No "read only" mode.
- **No bulk filtered export** — you can't say "export everything tagged Met Gala 2025" as a packaged file.
- **No way to attach a photo to a structured item** — a photo of a dress isn't linked to a record of "the dress."

## Takeaways for our inventory app

1. **Tighten our grid spacing.** Photos uses ~4px gaps; we use `gap-4` (16px) and `gap-6` (24px). For pure browse, we could drop to `gap-1` or `gap-2` on the location grid and let the photos dominate. The sand-2 hover treatment can stay.
2. **The fullscreen lightbox should auto-hide chrome.** Ours has a close X always visible — Photos fades it after a few seconds, then reappears on mouse-move. Worth borrowing.
3. **Right-edge time scrubber** is gold for "find that photo from three months ago." Could be a v2 polish item on the location grid — group by date created, scrubber on right edge.
4. **Justified grid (variable thumb width to fill rows)** vs. fixed-column grid — Photos picks justified. We picked fixed-column. For a *catalog* view of similar-sized objects this is fine, but for browsing actual photos a justified grid would feel more native.
5. **Long-press / hover-check for multi-select** is the right mental model for our future bulk-edit feature.
6. **Comments live on the item, not in a separate threads list** — we already do this. ✓
7. **Pinch-zoom for grid density** is a v2 polish item but a strong Photos signal that "the user controls the density" is part of the contract.
8. **Carousel filmstrip at the bottom of the lightbox** — we don't have this. Worth a 30-min addition.
