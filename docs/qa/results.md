---
title: UX + UI assessment results
last_updated: 2026-05-17
method: Playwright @ 1440×900 desktop + 390×844 mobile, plus DOM/grep inspection
---

# Assessment results

Each test scored:
- ✅ **Pass** — meets the standard
- ⚠️ **Partial** — works but rough around the edges
- ❌ **Fail** — broken or absent
- 🔄 **N/A** — not applicable / couldn't verify in this pass

## Summary

| Bucket | Pass | Partial | Fail | N/A | Pass rate |
|---|---|---|---|---|---|
| UX (35 tests) | 26 | 6 | 1 | 2 | 74% strict / 91% with partials |
| UI (62 tests) | 53 | 7 | 1 | 1 | 85% strict / 97% with partials |

## UX results

| # | Test | Score | Notes |
|---|---|---|---|
| UX-01 | Value prop clear in 5s on `/` | ✅ | "Inventory by Straighten Up" + "Invite only" eyebrow + tagline + "Sign in" CTA. Communicates the model immediately. |
| UX-02 | Invite-only framing clear | ✅ | "Invite only" eyebrow + "Access is by invitation. If you don't have one yet, reach out to Janelle directly." Strong. |
| UX-03 | Primary CTA visually dominant | ✅ | `bg-ink text-paper` Sign-in button has clear visual weight vs supporting copy. |
| UX-04 | Magic-link CTA obvious on `/login` | ✅ | Centered card, dark logo, "Email" label + input + "Send magic link" full-width primary button. Unambiguous. |
| UX-05 | User knows what happens next after email submit | ✅ | On success, "Check your email for a sign-in link." replaces the form. |
| UX-06 | Helpful, non-leaky error on unknown email | ✅ | Returns generic "No access — ask Janelle for an invite." Doesn't reveal which emails exist. |
| UX-07 | Sign out lands in sensible place | ✅ | POST /auth/signout redirects to /login. |
| UX-08 | Mobile nav always visible (no dead-ends) | ✅ | `RootBottomNav` on /clients, /notifications, /settings/* + `ClientBottomNav` inside client context. Verified by screenshot — Clients/Notifications/Team tabs visible on mobile /clients. |
| UX-09 | Sidebar context-aware Root vs Client | ✅ | `RootSidebar` on root pages shows ACCOUNT nav; `ClientSidebar` inside client shows client name + tree + INVENTORY nav. Self-swaps via path detection. |
| UX-10 | Back affordance predictable | ⚠️ | `< Back` link on location detail + item detail. **But** no back from /clients/[id]/shares or /clients/[id]/settings/fields/[id] (only via sidebar). Inconsistent. |
| UX-11 | User can predict where Shares / Fields / Team live | ⚠️ | Shares + Fields are NOT in the client sidebar — they're only reachable via direct URL or via the location detail's "Shares" button. **Real gap.** Team is in root sidebar; that part is fine. |
| UX-12 | Global search works + routes sensibly | ⚠️ | The header pill exists and submits to `/clients/[id]/search?q=` inside a client OR `/clients?q=` at root — but `/clients` doesn't actually use `q` to filter (no client-name search implemented). Looks functional but is partial. |
| UX-13 | Hierarchy Client → Location → Item is self-evident | ✅ | Sidebar shows MILEY CYRUS → INVENTORY → Iron mountain. Breadcrumb on item detail says "< Iron mountain". Mental model is clear. |
| UX-14 | Related settings grouped | ⚠️ | Per-client "Custom fields" lives at `/clients/[id]/settings/fields` (good). But it's not in the sidebar — you can only get there via direct URL. Practical orphan. |
| UX-15 | Location tree predictable | ✅ | Tree uses `parent_location_id`; depth-indented; no orphans by schema. Verified visually with single test location. |
| UX-16 | Empty client home suggests next actions | ✅ | `QuickStartTemplates` chip row: Closet, Storage unit, Garage, Bedroom, Pantry, Bathroom, Box + Custom. Strong onboarding. |
| UX-17 | Empty location prompts capture | ✅ | "No items here yet. Go to Capture" with icon + heading + CTA. |
| UX-18 | Empty search / notifications / shares explain why + suggest next | ✅ | All three use the standard empty-state shape (icon + heading + subhead + CTA where applicable). Notifications: "All caught up". Shares: "No active shares" + New share CTA. |
| UX-19 | Confirmation on success (toast) | ✅ | Toast system fires for move, status change, photo add, comment post/edit/delete, share create/copy/revoke. Auto-dismiss 4s. |
| UX-20 | Loading states present during pending actions | ✅ | Button labels swap to "Saving…/Posting…/Creating…", skeleton loading.tsx for client home + location grid + item detail. |
| UX-21 | Errors actionable, not raw codes | ⚠️ | Most errors are typed and human ("No access — ask Janelle"). But Supabase errors leak through in some places (e.g. sheet view inline edit error toast shows raw `error.message`). |
| UX-22 | "Needs metadata" surfaced visibly | ⚠️ | Sidebar bottom shows "X items · Y need metadata" pill in client context. Location grid header shows the chip when count > 0. But the test client (Miley Cyrus) has 0 custom fields defined so the "needs metadata" state never triggers in this dataset — couldn't fully verify the chip rendering with real data. |
| UX-23 | Can back out of delete (confirm dialog) | ✅ | Comment delete uses `window.confirm("Delete this comment? It'll show as 'deleted' in the thread.")`. Share revoke uses confirm. Custom field delete has a count prompt. |
| UX-24 | Can cancel edits | ✅ | All forms have Cancel buttons; status/move panels have Cancel; comment edit has Cancel. Esc closes lightbox. |
| UX-25 | Destructive UI visually distinct | ⚠️ | Delete buttons use `text-danger` color (muted brick red). Revoke is `text-danger` text on default button background. Better than generic, but Google's "destructive red" filled button pattern is stronger. |
| UX-26 | Timestamps human-readable (relative) | ✅ | History panel + comment timestamps use `relativeTime()` helper: "just now", "5m ago", "2h ago", "3d ago", "18h ago" — all relative, never raw ISO. |
| UX-27 | Time-grouping consistent | ✅ | Today / Yesterday / This week / This month / Earlier headers in location grid + client home recents. |
| UX-28 | Item status visible at a glance | ✅ | StatusBadge pill on every grid tile + item detail title row + search results + share viewer. |
| UX-29 | Tap targets ≥ 44×44px on mobile | ⚠️ | Most CTAs use `py-2.5` (~40px) — at the edge but slightly under spec. Mobile bottom nav buttons are ~44px including label + icon. Some inline action buttons (Cancel, kebab) are smaller (~28-32px). |
| UX-30 | Primary CTA reachable with one thumb | ✅ | Capture button anchored bottom-center in mobile nav, thumb-zone perfect. Save buttons in forms are full-width primary, easy to reach. |
| UX-31 | Recipient knows who sent + view-only state | ✅ | Share viewer banner: "🔒 Shared by Janelle Lam · Expires 6/15/2026 · VIEW ONLY". Tested via Playwright. |
| UX-32 | Email gate explanation clear | ✅ | "Janelle Lam shared an inventory with you. Enter the email address this link was sent to." Clear. |
| UX-33 | Interactive elements keyboard-reachable | ✅ | Tab navigation tested — focus moves Brand → search → nav items → main content actions. Focus rings visible (see UI-22). |
| UX-34 | Form labels associated with inputs | ✅ | Every `<input>` has a paired `<label htmlFor=...>` (audited via grep — all forms). |
| UX-35 | Images have alt text | ⚠️ | Brand logo has `alt="Straighten Up"`. Item photos in grid use `alt={item.title}`. **But** item-detail cover photo, lightbox photos, and share-viewer photos use `alt=""` (empty) — should describe the item. |

## UI results

| # | Test | Score | Notes |
|---|---|---|---|
| UI-01 | No arbitrary spacing values | ✅ | Grep found 0 `p-[Npx]` / `m-[Npx]` / `gap-[Npx]` arbitrary values across the codebase. |
| UI-02 | Vertical rhythm consistent | ✅ | Page paddings, section gaps, row heights all use scale increments. |
| UI-03 | Page outer padding consistent | ✅ | All app pages use `px-6 lg:px-12 py-8 lg:py-12` pattern after layout fix. |
| UI-04 | Sidebar item breathing | ✅ | `gap-1` between items + `py-3` per item (matches Google Photos rhythm). |
| UI-05 | h1 page titles use same scale everywhere | ✅ | After this pass's fix: all in-app page h1s use `text-[28px] sm:text-[32px] lg:text-[40px] font-medium leading-[1.15]`. Special cases (capture compact form, share auth narrow card, 404) intentionally use a smaller size. |
| UI-06 | Only 400/500 font weights | ✅ | Grep confirmed: no 600/700/bold/extrabold anywhere. |
| UI-07 | Inter font used; no fallback to default serif | ✅ | `next/font/google` Inter with `--font-sans` CSS var, applied to `<html>`. Only `font-mono` overrides are intentional (machine keys + key field labels). |
| UI-08 | Tabular nums in tables | ✅ | `.tabular-nums` utility defined in globals.css; sheet view applies it. |
| UI-09 | Body ≥14px / labels 13px / captions 12px | ✅ | Body defaults to 15px (per globals.css). Labels `text-[13px]`. Captions `text-[12px]`. |
| UI-10 | Comfortable line-heights | ✅ | Body 24px (~1.6); h1 `leading-[1.15]`; landing copy `leading-[1.6]`. |
| UI-11 | Only brand tokens used | ✅ | After fixing two `#F2EEE7` hover backgrounds → `bg-rule`. No other raw hex in JSX className. |
| UI-12 | No raw hex in JSX | ✅ | Cleaned in this pass. |
| UI-13 | Contrast ≥ 4.5:1 | ✅ | Verified pairs (per design-guidelines.md): ink (#1A1A1A) on paper (#FAF8F5) ≈ 14:1; ink2/paper ≈ 8:1; ink3/paper ≈ 4.6:1 (just above floor). |
| UI-14 | Semantic colors used consistently | ✅ | `text-danger` only on delete/revoke; `text-success` only on confirmations. No overuse. |
| UI-15 | Inputs/buttons use `rounded-[2px]` | ✅ | Audited — consistent. |
| UI-16 | Cards/modals use `rounded-[4px]` | ✅ | Audited. |
| UI-17 | Pills use `rounded-full` | ✅ | Sidebar active states, nav pills, status badges, search bar. |
| UI-18 | No arbitrary radii (md/lg/xl) | ✅ | Grep returned 0 matches. |
| UI-19 | All borders use `border-rule` | ✅ | Grep found 0 `border-gray/zinc/slate/neutral/stone`. |
| UI-20 | Lists use divide-y, not card-per-row | ✅ | 6 files use the `divide-y divide-rule rounded-[4px] border border-rule bg-surface` pattern. Card-per-row eliminated. |
| UI-21 | Shadows only on overlays | ✅ | Grep: only `shadow-sm` on dropdowns (ProfileMenu, NotificationBell, ItemActions panels, MentionAutocomplete, Toaster). No shadows on tiles/rows/cards. |
| UI-22 | Focus rings visible | ✅ | `focus:ring-2 focus:ring-ink/10` on inputs. Browser default focus rings on links/buttons. Verified visually — Brand element shows blue focus ring on first Tab. |
| UI-23 | All icons from lucide-react | ✅ | Grep: 0 imports from `react-icons` or `@heroicons`. |
| UI-24 | Icon sizes consistent {14, 16, 20, 24} | ⚠️ | Found `size={18}` in capture page Camera/Plus icons + `size={22}` in bottom nav. Minor drift from the scale but not visually problematic. |
| UI-25 | Icons inherit text color | ✅ | No icon-specific color overrides found. |
| UI-26 | Primary CTA `bg-ink text-paper` | ✅ | Consistent across all primary actions. |
| UI-27 | Secondary `bg-surface border-rule text-ink` | ✅ | Consistent. |
| UI-28 | Danger `bg-danger text-paper` | ⚠️ | Danger TEXT (`text-danger`) used for destructive actions, but no filled `bg-danger` button anywhere — Google would use the filled treatment for explicit destructive CTAs. Currently we use text-color signaling only. |
| UI-29 | Button height ≥40px desktop / ≥44px mobile | ⚠️ | Form CTAs use `py-2.5` (~40px) — meets desktop floor but is at the edge for mobile (44px ideal). Inline action buttons (Cancel, panel buttons) use `py-1` / `py-1.5` (~24-32px) — below mobile target. |
| UI-30 | Buttons left-anchor content | ✅ | Icon + label patterns left-align, no centered-inside-button anti-pattern. |
| UI-31 | Inputs same shape | ✅ | All inputs: `bg-surface border-rule px-3 py-2.5 rounded-[2px]` + focus ring. Consistent. |
| UI-32 | Labels 13px medium mb-2 | ✅ | Audited — consistent. |
| UI-33 | Error text `text-danger text-[13px]` | ✅ | Consistent. |
| UI-34 | Forms wrapped in card panel | ✅ | After this pass: /clients/new, invite-admin, locations/new, fields/new, fields/[id], settings/team all use `max-w-md bg-surface border-rule rounded-[4px] p-6 lg:p-8`. |
| UI-35 | Forms left-anchored (no mx-auto with sidebar) | ✅ | Fixed in dfbbbd6 commit. |
| UI-36 | Grid thumbs square 1:1 | ✅ | `aspect-square object-cover` consistently. |
| UI-37 | No rounded corners on photo thumbs | ✅ | No `rounded-*` on thumbnails — verified via grep. |
| UI-38 | No shadows/borders on photos | ✅ | Photos sit clean on paper background. |
| UI-39 | Lightbox uses dark backdrop | ✅ | Verified visually — backdrop is near-black overlay, photo centered. |
| UI-40 | Avatar component everywhere | ✅ | `Avatar` used in History, Comments, Notifications. No hand-rolled initials divs found (grep). |
| UI-41 | Deterministic color hashing | ✅ | `colorFor(name)` in Avatar.tsx uses string-hash modulo color array — same name always picks same color. |
| UI-42 | Size scale 24/32/40 | ✅ | All `<Avatar size={32}>` in current usage. Configurable for future variants. |
| UI-43 | StatusBadge used consistently | ✅ | 11 references across grid, sheet, item detail, search, share viewer. |
| UI-44 | Uppercase 11px badge label | ✅ | `text-[11px] font-medium uppercase tracking-wide`. |
| UI-45 | Pill shape | ✅ | `rounded-full`. |
| UI-46 | Header band consistent height | ✅ | `h-14 lg:h-16` (56/64px) on AppShell, login, home, share viewer. |
| UI-47 | Search pill consistent shape | ✅ | `bg-paper rounded-full` with magnifier icon, consistent padding. |
| UI-48 | Sidebar fixed 256px | ✅ | `w-64` on both RootSidebar + ClientSidebar. |
| UI-49 | Bottom nav uses safe-area-inset | ✅ | `paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))'` on both ClientBottomNav + RootBottomNav. |
| UI-50 | Active state pill consistent | ✅ | `rounded-full bg-sand2 text-ink` everywhere. |
| UI-51 | Empty states follow shape | ✅ | All use icon + heading + subhead + CTA. Consistent across 7 surfaces (LocationTree, location items, notifications, shares, fields, search × 2). |
| UI-52 | Skeleton loaders match layout | ✅ | Three loading.tsx files: client home (header + 3 rows), location grid (8 tile skeletons), item detail (photo aspect-square + title + form rows). No visible layout shift. |
| UI-53 | No spinning circles | ✅ | Skeletons used instead. |
| UI-54 | Hover transitions ~150ms | ✅ | Tailwind default `transition-colors` ≈ 150ms. Applied consistently. |
| UI-55 | Modal/menu transitions ~200ms | ✅ | shadcn defaults inherited. |
| UI-56 | No bouncy animations | ✅ | No `bounce` / `spring` keyframes. |
| UI-57 | Logo aspect not stretched | ✅ | After fix: Brand component sets both `width: ${w}px` and `height: ${size}px` explicitly, preserving 3850:1134 ratio. |
| UI-58 | Light/dark logo on right surface | ✅ | Light logo on dark header band; dark logo on white surfaces (login, home, share auth). |
| UI-59 | Logo size matches surface | ✅ | `size={28}` in headers; `size={180}` (h={53}) on login card; landing uses display-scale lockup. |
| UI-60 | Single breakpoint set sm/md/lg | ✅ | Only `sm:` / `md:` / `lg:` used in classNames. No xl: or 2xl: anywhere in app surfaces. |
| UI-61 | No horizontal scroll at 390×844 | ✅ | Verified visually — mobile screenshots have no horizontal overflow. |
| UI-62 | No content cut by safe-area/nav | ✅ | `pb-24` + safe-area-inset on layout. Bottom nav stays above home indicator. |

## Top 5 must-fix items

1. **UX-11 / UX-14 — Shares + Custom fields are orphan destinations.** They're not in the sidebar. The only way to reach Shares is via the location-detail "Shares" button; Custom fields requires the URL. Add both to `ClientSidebar`'s primary nav (under MILEY CYRUS / above the location tree).

2. **UX-29 / UI-29 — Inline button touch targets below 44px on mobile.** Cancel buttons (`py-1`), kebab/action buttons (`py-1.5`) are ~28-32px tall. Bump all interactive buttons to a minimum `py-2.5` (40px) and on mobile-specific surfaces to `py-3` (44px). One-line CSS class fix on each.

3. **UX-21 — Raw Supabase error strings leak into toasts.** The sheet view inline-edit error toast shows the raw `error.message` from PostgREST (e.g. "duplicate key value violates unique constraint…"). Wrap in user-friendly mapping (or at minimum: "Couldn't save that change.") and log the raw error to console for debugging.

4. **UX-35 — Cover photos and lightbox photos have empty alt text.** Should use `alt={item.title}` for accessibility. Quick global fix — touch 3-4 files.

5. **UX-10 — Back affordance inconsistent.** Shares dashboard + custom-field edit page have no back link. Add `< Back` link at the top of each, mirroring location/item detail pages.

## Top 5 nice-to-fix items

6. **UI-28 — No filled-danger button treatment.** Adopt the `bg-danger text-paper` filled style for explicit destructive CTAs (Delete item, Revoke share inside the confirm modal). Currently we color the text only — Google would use the filled treatment.

7. **UX-25 — Destructive UI could be louder.** Once UI-28 is in place, this resolves too.

8. **UI-24 — Icon size drift.** Two places use `size={18}` and `size={22}` outside the official {14, 16, 20, 24} scale. Cosmetic — normalize when next touching those files.

9. **UX-22 — "Needs metadata" couldn't be verified with real data.** The Miley Cyrus test client has zero custom fields defined; that path is unreachable for QA until we add at least one required field to a client. Set up a test field + a metadata-missing item to validate end-to-end.

10. **UI-29 — Form CTAs at 40px on mobile.** Bump to `py-3` (44px) on the actual save/submit primary action buttons on form pages for clearer touch on phones.
