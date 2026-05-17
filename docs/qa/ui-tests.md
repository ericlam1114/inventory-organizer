---
title: UI design tests (Google UI designer review)
last_updated: 2026-05-17
---

# UI tests

Written from the perspective of a Google UI designer reviewing the app. Focuses on visual rendering, spacing rhythm, typography, color, hierarchy, density, motion, brand integrity — not flow (see [ux-tests.md](./ux-tests.md) for that).

Each test gets a code (UI-01 to UI-30+) for tracking.

## Spacing & rhythm

| # | Test |
|---|---|
| UI-01 | All spacing values come from the Tailwind 4/8/12/16/24/32 scale (no arbitrary `mt-7` etc.) |
| UI-02 | Vertical rhythm consistent — page paddings, section gaps, row heights repeat the same values |
| UI-03 | Page outer padding consistent across routes (~`px-6 lg:px-12 py-8 lg:py-12`) |
| UI-04 | Sidebar item vertical breathing — `py-3` per item, `gap-1` between |

## Typography

| # | Test |
|---|---|
| UI-05 | h1 page titles use the SAME scale (`text-[28px] sm:text-[32px] lg:text-[40px]`) on every page |
| UI-06 | Type weight uses only 400/500 (no random 600/700 bolds) |
| UI-07 | All text uses Inter (the configured font); no fallback to default serif |
| UI-08 | Numbers in tables use tabular-nums where comparing values |
| UI-09 | Body text ≥ 14px (legibility floor); secondary 13px; caption 12px |
| UI-10 | Line-height comfortable: body ≥ 1.5, headings ~1.2 |

## Color tokens

| # | Test |
|---|---|
| UI-11 | Only brand tokens used (paper / ink / ink2 / ink3 / rule / sand / sand2 / success / warning / danger / info) |
| UI-12 | No raw hex codes in JSX (`#ffffff`, `#000`, etc.) except in special-purpose places (logo SVG fill) |
| UI-13 | Contrast ≥ 4.5:1 on body text pairs (ink/paper, ink2/paper, ink3/paper) |
| UI-14 | Semantic colors used consistently (danger only for destructive, success only for confirmations) |

## Corner radii

| # | Test |
|---|---|
| UI-15 | Inputs/buttons use `rounded-[2px]` |
| UI-16 | Cards/modals use `rounded-[4px]` |
| UI-17 | Pills/active states use `rounded-full` |
| UI-18 | No arbitrary radii (`rounded-md`, `rounded-xl`, etc.) |

## Borders, dividers, shadows

| # | Test |
|---|---|
| UI-19 | All borders use `border-rule` (the warm `#E8E4DC`); no random grays |
| UI-20 | Lists use `divide-y` for row separation (not card-per-row) |
| UI-21 | Shadows only on overlays (modals, dropdowns); none on cards, tiles, rows |
| UI-22 | Focus rings present and visible (`ring-2 ring-ink/10` or equivalent) |

## Iconography

| # | Test |
|---|---|
| UI-23 | All icons from `lucide-react` (consistent 1.5 stroke) |
| UI-24 | Icon sizes from {14, 16, 20, 24} — no random 18 or 22 unless intentional |
| UI-25 | Icons inherit current text color (no decorative tints) |

## Buttons

| # | Test |
|---|---|
| UI-26 | Primary CTA: `bg-ink text-paper` consistently |
| UI-27 | Secondary: `bg-surface border-rule text-ink` |
| UI-28 | Danger: `bg-danger text-paper` (only for destructive) |
| UI-29 | Button height ≥ 40px desktop / ≥ 44px mobile (touch target) |
| UI-30 | Buttons left-anchor with their content; no centering inside the button |

## Forms

| # | Test |
|---|---|
| UI-31 | All inputs share the same shape: `bg-surface border-rule px-3 py-2.5 rounded-[2px]` |
| UI-32 | All labels 13px medium with `mb-2` gap to input |
| UI-33 | Error text is `text-danger text-[13px]` |
| UI-34 | Forms have a card panel wrapper (`bg-surface border-rule rounded-[4px] p-6 lg:p-8`) |
| UI-35 | Forms are left-anchored (no `mx-auto` on the form card itself when sidebar present) |

## Photos

| # | Test |
|---|---|
| UI-36 | Grid thumbs are square 1:1 with `object-fit: cover` |
| UI-37 | No rounded corners on photo thumbs |
| UI-38 | No shadows / borders on photos |
| UI-39 | Lightbox uses dark backdrop (`bg-ink/90` or similar) |

## Avatars

| # | Test |
|---|---|
| UI-40 | Single Avatar component used everywhere (no hand-rolled initials divs) |
| UI-41 | Deterministic color hashing (same user → same color) |
| UI-42 | Size scale: 24 / 32 / 40 |

## Status badges

| # | Test |
|---|---|
| UI-43 | StatusBadge component used consistently |
| UI-44 | Uppercase tracking-wide 11px label |
| UI-45 | Pill shape `rounded-full` |

## Navigation chrome

| # | Test |
|---|---|
| UI-46 | Dark header band is consistent height (56px mobile / 64px desktop) |
| UI-47 | Search pill in header is `bg-paper rounded-full` with consistent padding |
| UI-48 | Sidebar fixed width 256px (`w-64`) on desktop |
| UI-49 | Bottom nav uses `env(safe-area-inset-bottom)` for iPhone notch |
| UI-50 | Active nav state is `rounded-full bg-sand2 text-ink` pill everywhere |

## Empty / loading states

| # | Test |
|---|---|
| UI-51 | Empty states all follow same shape: icon + heading + subhead + CTA |
| UI-52 | Skeleton loaders match the eventual layout (no layout shift) |
| UI-53 | Loading spinners avoided in favor of skeletons |

## Motion

| # | Test |
|---|---|
| UI-54 | Hover transitions ~150ms ease-out |
| UI-55 | Modal/menu transitions ~200ms |
| UI-56 | No bouncy / celebratory animations on serious actions |

## Brand integrity

| # | Test |
|---|---|
| UI-57 | Logo (`Brand` component) renders at correct aspect (no stretch) |
| UI-58 | Logo light variant on dark surfaces, dark variant on light surfaces |
| UI-59 | Logo size matches the surface (28px in header band) |

## Responsive

| # | Test |
|---|---|
| UI-60 | Single breakpoint set: `sm:`(640) `md:`(768) `lg:`(1024) — no magic media queries |
| UI-61 | No horizontal scroll at 390×844 (iPhone 14 Pro) |
| UI-62 | No content cut off by safe-area / nav on mobile |
