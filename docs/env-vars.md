---
title: Environment Variables
status: living-doc
last_updated: 2026-05-16
---

# Environment Variables

All env vars used across v1 slices. `.env*` is gitignored — never commit values.

## Required (no defaults)

| Variable                          | Used by                                | Scope            | Source / how to set                           |
| --------------------------------- | -------------------------------------- | ---------------- | --------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | all slices                             | client + server  | Supabase dashboard → Project Settings → API   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | all slices                             | client + server  | Supabase dashboard → Project Settings → API   |
| `SUPABASE_SERVICE_ROLE_KEY`       | slice 04 cron, slice 05 share viewer   | **server only**  | Supabase dashboard → Project Settings → API   |
| `SEED_SUPER_ADMIN_EMAIL`          | slice 01 migration `0004_seed_super_admin.sql` | migration-time | Janelle's email; set before first deploy   |
| `RESEND_API_KEY`                  | slice 04 cron, slice 05 invite emails  | server only      | resend.com → API Keys                         |
| `RESEND_FROM_EMAIL`               | slice 04 cron, slice 05 invite emails  | server only      | Verified sender on Resend                     |
| `SHARE_COOKIE_SECRET`             | slice 05 share-session cookie HMAC     | server only      | 32+ random bytes, hex or base64 encoded       |
| `NEXT_PUBLIC_APP_URL`             | email deep-links, OAuth callback       | client + server  | e.g. `https://inventory.example.com` (prod) or `http://localhost:3000` (dev) |
| `CRON_SECRET`                     | slice 04 cron route                    | server only      | auto-injected by Vercel for cron; set manually in `.env.local` for local testing |

## Security rules

- **`NEXT_PUBLIC_*` vars are exposed to the browser.** Only put values safe for client code.
- **`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS.** Never read in client components. Only use in route handlers / server actions / cron jobs.
- **`SHARE_COOKIE_SECRET` rotation invalidates all active share sessions.** Recipients have to re-auth via email.
- **If any secret leaks** (commit, chat, log), rotate it in the provider dashboard first, then update `.env.local` and redeploy.

## Local dev setup

```bash
cp .env.example .env.local  # if .env.example exists; otherwise create .env.local fresh
# Fill in values from Supabase + Resend dashboards
# Generate SHARE_COOKIE_SECRET:
openssl rand -hex 32
```

## Vercel setup

Set the same variables in Vercel → Project → Settings → Environment Variables, scoped to Production + Preview + Development as appropriate. Use `vercel env pull .env.local` to mirror Vercel values to local.

## Slice → env-var dependency map

| Slice                          | Vars depended on                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------- |
| 01 Foundation                  | `NEXT_PUBLIC_SUPABASE_*`, `SEED_SUPER_ADMIN_EMAIL`, `NEXT_PUBLIC_APP_URL`        |
| 02 Photo + item capture        | (above)                                                                          |
| 03 Move / audit log            | (above)                                                                          |
| 04 Comments + notifications    | (above) + `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`     |
| 05 Sharing + filtered export   | (above) + `SHARE_COOKIE_SECRET`                                                  |
