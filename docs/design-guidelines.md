---
title: Design Guidelines
status: approved
last_updated: 2026-05-16
brand_source: straightenuphome.com (palette + mood) · straightenupbyjanelle.com (logo asset)
---

# Design Guidelines

Cross-cutting visual + interaction system for the inventory app. Applies to every approved slice (01–05). Lives next to the master and slice specs.

## Brand alignment

The app lives **inside Janelle's existing brand world** — not as a separate SaaS product. Visual identity is sourced from `straightenuphome.com` (the products line, which carries Janelle's primary palette). The wordmark SVG comes from `straightenupbyjanelle.com` (her personal/services brand) and is stored at `public/logo.svg` (white-on-transparent — needs a dark variant for white surfaces).

### Wordmark

```
Straighten Up · Inventory
```

- Header logo on every authenticated page
- Login screen: full lockup
- Email senders: "Straighten Up Home"
- Email subjects: clean — never says "Inventory app"
- Share viewer header: "Shared by Janelle Lam · Straighten Up Home"

### Mood

**Sophisticated minimalism, photo-forward, calming.** Closer to Aesop + Apple than Vogue editorial. All-sans typography, warm-white surfaces, charcoal text, restrained warm-neutral accents. No bright color anywhere on chrome.

## Color tokens

```ts
// tailwind.config — extend theme.colors
{
  paper:    '#FAF8F5',  // warm-white page background
  surface:  '#FFFFFF',  // cards, modals, sheets
  ink:      '#1A1A1A',  // primary text (charcoal)
  ink2:     '#4A4A4A',  // secondary text (labels, metadata)
  ink3:     '#8A8A8A',  // tertiary text (timestamps, helper)
  rule:     '#E8E4DC',  // dividers, borders (warm gray)
  sand:     '#C8B89A',  // muted gold/sand accent
  sand2:    '#E8DFCB',  // softer fill (hover, badge bg)
  // Semantic — desaturated to match brand restraint
  success:  '#5B7C5A',  // muted olive
  warning:  '#C29551',  // muted amber (⚠ needs metadata)
  danger:   '#A6433A',  // muted brick
  info:     '#6B7A88',  // muted slate
}
```

The `sand` hex (`#C8B89A`) is inferred from product imagery. Replace with Janelle's brand-book value if available.

## Typography

All sans-serif. No serifs anywhere.

```css
font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
```

Inter is the default for v1. Söhne / GT America is a v2 upgrade if brand polish demands it.

**Numerics in tables:** `font-variant-numeric: tabular-nums` so columns align cleanly in the sheet view.

### Type scale

| Token       | Size / line-height | Weight | Use                                         |
| ----------- | ------------------ | ------ | ------------------------------------------- |
| `display`   | 48 / 56            | 400    | Logo lockup, login screen                   |
| `h1`        | 32 / 40            | 500    | Page titles                                 |
| `h2`        | 24 / 32            | 500    | Section headings ("Comments", "History")    |
| `h3`        | 18 / 28            | 500    | Item title in detail                        |
| `body`      | 15 / 24            | 400    | Default body, comments, metadata values     |
| `label`     | 13 / 20            | 500    | Field labels, badges, table headers         |
| `caption`   | 12 / 16            | 400    | Timestamps, helper, audit metadata          |

15px body (not 16) reads as more refined — Aesop/Stripe convention.

## Spacing

Standard Tailwind scale used liberally. Component-level defaults:

| Context                | Padding                    | Gap     |
| ---------------------- | -------------------------- | ------- |
| Page outer             | `p-8 lg:p-12`              | —       |
| Card / modal           | `p-6 lg:p-8`               | —       |
| Sheet row              | `py-3 px-4`                | —       |
| Grid (thumbnails)      | `gap-4 lg:gap-6`           | —       |
| Stacked form fields    | —                          | `gap-5` |
| Inline button row      | —                          | `gap-3` |

Density target: **spacious everywhere.** Even sheet view gets `py-3` rows instead of the cramped `py-1` you'd see in dense data UIs.

## Corners, shadows, motion

- **Border radius:** `rounded-[2px]` on buttons/inputs, `rounded-[4px]` on cards/modals
- **Shadows:** only on overlays (`shadow-sm` on modals + dropdowns); grid tiles and cards get none
- **Motion:** 150ms ease-out for hovers, 200ms for menu/modal open-close, no celebratory bounces

## Component patterns

### App shell

Every authenticated page has a thin dark band at the top so the white logo has a natural home:

```
┌──────────────────────────────────────────────────────────────┐
│ ▓ STRAIGHTEN UP                  [Client ▾]   🔔(3)   👤   │  ← bg-ink, 56/64px
├──────────────────────────────────────────────────────────────┤
│   ... page content on bg-paper ...                           │
└──────────────────────────────────────────────────────────────┘
```

- Dark band: 56px mobile / 64px desktop
- Logo height: 28px, white SVG, ~24px from left edge
- Right side: client switcher (`super_admin` / `org_team_*` only), bell, profile menu — all paper-tinted icons on dark
- Body: `paper` background

### Button variants (shadcn buttons re-themed)

| Variant     | Classes                                  | Use                                       |
| ----------- | ---------------------------------------- | ----------------------------------------- |
| `primary`   | `bg-ink text-paper hover:bg-ink2`        | Save, Send invite, Move →                 |
| `secondary` | `bg-surface border-rule text-ink hover:bg-paper` | Cancel, secondary actions         |
| `ghost`     | `text-ink hover:bg-sand2`                | Header / table-row actions                |
| `danger`    | `bg-danger text-paper hover:bg-danger/90`| Destructive confirms                      |
| `link`      | `text-ink2 underline-offset-4 hover:text-ink hover:underline` | Inline in body copy   |

- Height: 40px desktop / 44px mobile (thumb-friendly)
- Radius: 2px
- Same height as inputs so they align in form rows

### Inputs (text / date / select / textarea)

- `bg-surface border border-rule px-3 py-2.5 rounded-[2px]`
- Focus: 1px `ink` border + `ring-2 ring-ink/10`
- Disabled: `bg-paper text-ink3`
- Error: `border-danger` + helper `text-danger text-[13px]`

### Status badges

Pill with uppercase 11px label:

| Status                    | Classes                          |
| ------------------------- | -------------------------------- |
| `active`                  | `bg-sand2 text-ink2`             |
| `donated`                 | `bg-sand2 text-success`          |
| `archived`                | `bg-rule text-ink3`              |
| `⚠ needs metadata` (chip) | `bg-sand2 text-warning` + dot    |

### Modals / dropdowns (Radix via shadcn)

- Modal: `bg-surface rounded-[4px] shadow-sm border border-rule p-6 lg:p-8`, max-w 480px (forms) / 720px (content)
- Backdrop: `bg-ink/40 backdrop-blur-sm`
- Dropdown items: `px-3 py-2 text-[14px] text-ink hover:bg-sand2`

### Cards

- `bg-surface border border-rule rounded-[4px] p-6`
- Hover (when clickable): subtle `bg-paper`
- No drop shadow

### Bottom nav (mobile — slice 02)

- `bg-surface border-t border-rule h-14`
- Tabs: Browse · Capture · Search
- Active: `text-ink` icon + label; Inactive: `text-ink2`
- **Capture** is the only filled tab: `bg-ink rounded-full` circle with `text-paper` icon — prominent without a separate FAB

### Login screen

- Logo lockup centered top on `paper` (uses dark-variant logo)
- Email input + "Send magic link" primary button
- Tagline beneath: `Inventory · Straighten Up Home` in `ink3` caption
- Subtle `sand2` divider above tagline

### Empty / loading / error states

- **Empty:** centered, generous whitespace, single thin lucide icon at 32px, caption text in `ink2`. No illustrations.
- **Loading:** skeleton blocks (`bg-sand2` shimmer for photos, `bg-rule` for text rows). No spinning circles.
- **Inline errors:** `text-danger text-[13px] mt-1` below the field
- **Toasts (shadcn Toaster):** `bg-surface text-ink` with optional left-border accent (`border-l-2 border-danger` / `border-success`)

### Photo treatment

- Square crops in grid (`object-fit: cover`, 1:1)
- No rounded corners on photos — pure rectangles, editorial product-photography style
- No borders, no shadows — let photos sit on `paper`
- Hover on a grid tile: tile bg gently darkens to `#F2EEE7`; photo doesn't shift

### Iconography

- Library: `lucide-react` (line icons, 1.5 stroke — default with shadcn)
- Sizes: 16px in dense contexts, 20px in app bar, 24px in bottom nav
- Color: inherits current text color

## Email templates (slices 04 + 05)

- HTML email: `paper` background, dark-variant logo top, `ink` text, `sand2` button bg with `ink` text
- Plain-text fallback always present
- Width: 480px max, mobile-friendly
- Footer: "Straighten Up Home · {year}" only — no marketing copy

## Share viewer (slice 05)

Same tokens as the authenticated app. Differences:

- Banner reads "🔒 Shared by Janelle Lam · Expires {date}"
- "View only" `label`-sized tag near the heading
- No bottom nav (viewer can't navigate elsewhere)
- All action buttons absent (Move, Edit, Comment, Delete) — read-only by design

## Accessibility

- **Contrast:** every text/bg pair ≥ 4.5:1 (verified: `ink`/`paper`, `ink2`/`paper`, `ink3`/`paper`, `success` / `danger` / `warning` on `sand2`)
- **Focus:** 2px `ink` ring + 2px offset on every interactive element
- **Reduced motion:** disable transitions when `prefers-reduced-motion: reduce`
- **Keyboard:** Radix handles modal/menu focus traps; verify on item detail page
- **Alt text:** photo `alt` = item title; decorative icons get `aria-hidden`

## Project setup checklist (for implementation)

1. `npx shadcn@latest init` — accept Tailwind v4 config, Inter as font
2. Extend `tailwind.config` `theme.colors` with the token table above
3. Add `globals.css` block defining the type scale + utility classes for tabular-nums
4. Install lucide-react (already pulled by shadcn defaults)
5. Place `logo-light.svg` (downloaded) + `logo-dark.svg` (TBD from Janelle) in `public/`
6. Build a `<Brand>` component that renders the right variant by surface (dark band → light; otherwise → dark)
7. Build the `<AppShell>` with the dark header band as the layout primitive

## In v1

- All tokens defined in `tailwind.config`
- shadcn primitives initialized + re-themed once in `globals.css`
- `<AppShell>` with dark header band + white logo
- `<Brand>` component picking the right logo variant
- Login screen with brand lockup
- Bottom nav (mobile), button variants, inputs, status badges, modal, dropdown
- Email templates for slices 04 + 05
- Share viewer theming
- `logo-light.svg` (downloaded) + `logo-dark.svg` placeholder

## Out of v1

- Dark mode toggle (light-mode-only)
- Custom illustrations / marketing-style imagery
- Per-client white-label branding
- Marketing landing pages
- Font upgrade (Söhne, GT America) — Inter ships
- Animation library beyond hover/menu basics
- Logo lockups with marketing taglines

## Open questions deferred

- **Dark logo variant** — preferred: ask Janelle. Fallback: inline-tint the white SVG fill to `#1A1A1A` and ship as placeholder
- **Sand accent hex** — `#C8B89A` is inferred; replace with brand-book value if Janelle has one
- **Email template engine** — hand-rolled HTML in v1; consider Resend templates if it gets fiddly
- **Photo aspect when source isn't square** — center-crop is current plan; revisit if Janelle prefers smart-crop or aspect-preserve
- **Font upgrade** — Inter is excellent; revisit Söhne / GT America when brand identity hardens
