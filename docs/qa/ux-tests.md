---
title: UX design tests (Google UX designer review)
last_updated: 2026-05-17
---

# UX tests

Written from the perspective of a Google UX designer reviewing the app. Focuses on user flow, mental model, task completion, mobile ergonomics, recovery, accessibility minimums — not pixel polish (see [ui-tests.md](./ui-tests.md) for that).

Each test gets a code (UX-01 to UX-30) for tracking in the results doc.

## First impression

| # | Test |
|---|---|
| UX-01 | On `/`, can the user understand what the app is in 5 seconds without scrolling? |
| UX-02 | Is the "invite only" framing clear so a stranger doesn't think they should self-signup? |
| UX-03 | On `/`, is the primary CTA ("Sign in") visually dominant vs supporting copy? |

## Auth & onboarding

| # | Test |
|---|---|
| UX-04 | On `/login`, is the magic-link CTA the obvious next step? |
| UX-05 | After submitting the email, does the user know what happens next (wait for email)? |
| UX-06 | On error (unrecognized email), is the message helpful + not security-leaky? |
| UX-07 | Does signing out leave the user in a sensible place (home / login)? |

## Navigation & wayfinding

| # | Test |
|---|---|
| UX-08 | On mobile, is there ALWAYS visible nav on every signed-in page (no dead-ends)? |
| UX-09 | On desktop, is the sidebar context-aware (Root vs Client) without surprising the user? |
| UX-10 | Is the back affordance always visible/predictable on deep pages? |
| UX-11 | Can a new user predict where Shares / Custom fields / Team live (without a tour)? |
| UX-12 | Does the global search bar work and route somewhere sensible? |

## Information architecture

| # | Test |
|---|---|
| UX-13 | Is the hierarchy (Client → Location → Item → Photos) self-evident? |
| UX-14 | Are related settings grouped (per-client settings inside the client)? |
| UX-15 | Is the location tree predictable (parent/child, no orphan nodes)? |

## Empty states & onboarding moments

| # | Test |
|---|---|
| UX-16 | Does an empty client home suggest concrete next actions (templates)? |
| UX-17 | Does an empty location prompt the user to capture? |
| UX-18 | Do empty search / notifications / shares states explain WHY they're empty and suggest next steps? |

## Feedback & state

| # | Test |
|---|---|
| UX-19 | Does the user see confirmation (toast / inline) when an action succeeds? |
| UX-20 | When an action is pending (saving, uploading), is there a loading state? |
| UX-21 | On error, is the message actionable (says what's wrong + what to try)? |
| UX-22 | Is "needs metadata" surfaced visibly without the user hunting? |

## Recovery

| # | Test |
|---|---|
| UX-23 | Can the user back out of a delete? (Confirm dialog exists.) |
| UX-24 | Can edits be canceled (Esc / Cancel button)? |
| UX-25 | Is destructive UI (delete, revoke) visually distinct from constructive? |

## Time & status

| # | Test |
|---|---|
| UX-26 | Are timestamps human-readable (relative: "2m ago" vs raw ISO)? |
| UX-27 | Is time-grouping consistent across surfaces (today/yesterday/this week)? |
| UX-28 | Is the item status (active/donated/archived) visible at a glance in the grid? |

## Mobile ergonomics

| # | Test |
|---|---|
| UX-29 | Are all tap targets ≥ 44×44px on mobile? |
| UX-30 | Is the primary CTA reachable with one thumb (bottom-anchored or thumb zone)? |

## Sharing comprehension

| # | Test |
|---|---|
| UX-31 | When a recipient lands on a share viewer, do they know who sent it + that they're view-only? |
| UX-32 | Is the email-gate explanation clear (why am I being asked for my email)? |

## Accessibility minimums

| # | Test |
|---|---|
| UX-33 | Are all interactive elements keyboard-reachable (Tab nav works)? |
| UX-34 | Do form inputs have associated labels (screen-reader friendly)? |
| UX-35 | Do images have alt text? |
