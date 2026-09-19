# Supabase Environments

This document records the two-environment model behind this project's
Supabase usage, the environment variables that point at each one, and the
promotion/rollback workflow actually exercised while closing out issue #14
("Establish Supabase environments"). Read this before writing a new
migration, before repointing `.env.local`, or before asking "which Supabase
project am I even looking at."

## 1. The two environments

Exactly two Supabase projects exist for this app. There is no local Docker
stack and no staging/Vercel-preview database — both were descoped from issue
#14 on 2026-09-19; that decision is not re-argued here.

| Project | Ref | Used for |
|---------|-----|----------|
| `bigmattsbbq-test` | `ujpviiulhibzztbricxu` | Local development and Playwright e2e runs |
| production | `wpziabhigztyjrmjpmbw` | The live storefront and SCA tracker |

`bigmattsbbq-test` was rebuilt from a clean slate by replaying migrations
0001-0016 plus `supabase/seed.sql`. It holds only synthetic data (one active
drop, three pickup options, a handful of attribution sources) and no real
customer rows — no orders, no mailing-list subscribers, no email logs.

## 2. Environment variables

Three Supabase vars are declared in `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

For whichever project you are targeting, all three values come from that
project's Supabase dashboard, under Settings -> API.

A few things to keep straight:

- `.env.local` is gitignored and is the only place these are ever set for
  local development. It is never committed.
- `.env.local` currently points at `bigmattsbbq-test`, not production.
- Production's values live in the Vercel project's environment variables,
  never in this repo.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security entirely. It must
  never be sent to the browser, never prefixed `NEXT_PUBLIC_`, and never
  logged. The `NEXT_PUBLIC_` prefix on the other two vars is what makes them
  browser-visible by design; the anon key is safe there only because RLS
  constrains what it can read or write.

This doc does not reproduce any actual key or URL value — names only.

## 3. Promoting a schema change

This is the reusable sequence for next time, not a narrative of what
happened during this session.

1. Write a new file in `supabase/migrations/` using the existing
   `NNNN_description.sql` naming at the next free number (0018 is the
   highest as of this doc), with a header comment explaining what changed
   and why. Migrations are hand-written and forward-only — there are no
   generated down-migrations.
2. Apply it to `bigmattsbbq-test` first. As of this session the local
   `supabase` CLI is not authenticated in this environment, so the
   practical path is the Supabase MCP tools from a Claude Code session; the
   CLI works too once authenticated. Then verify with `get_advisors` (both
   the security and performance checks) plus a `list_tables` or targeted
   `execute_sql` spot-check that the change actually landed.
3. Run the full local verification suite against `bigmattsbbq-test` —
   `npx tsc --noEmit`, `npm run test`, `npm run test:e2e`. `.env.local`
   already points there, so no env switching is needed.
4. Only once test verification passes, apply the identical SQL to
   production via the same mechanism, then re-run `get_advisors` against
   production to confirm the fix landed and no new advisory appeared.
5. Commit the migration file to git alongside that verification. The repo
   is the source of truth: a migration is not done until it is committed,
   whether or not it has been applied live. Migrations 0010-0016 exist
   precisely because that rule was broken for a long stretch and live
   schema drifted away from the repo.

One operational reality found this session: destructive SQL (`drop schema`,
`drop table`, bulk `delete`) run through Claude Code's Supabase MCP tools is
refused by an automated safety classifier even as a single statement against
the non-production test project — that class of change needs a human to run
it in the Supabase SQL Editor. Additive and `alter`-based changes pass fine,
as do the narrower `drop function` / `drop sequence` statements in 0018.

## 4. Rollback and incidents

There are no down-migrations here — no `supabase db push`-managed pairs, no
generated reversals. Rolling back means writing and applying a new
corrective forward migration (an accidental `add column` is undone by a
later `drop column if exists` migration), never editing or reverting the
original file, which may already be applied elsewhere.

For anything larger — data loss, or a bad migration already live on
production — the actual safety net is Supabase's built-in Point-in-Time Recovery
and daily backups, reached from the project's Database settings in the
dashboard. This repo automates none of that. Say so plainly rather than
describing tooling that does not exist.

## 5. Related reading

| Concern | File |
|---------|------|
| All migrations, in order | `supabase/migrations/` |
| Synthetic seed data for `bigmattsbbq-test` | `supabase/seed.sql` |
| Local Supabase CLI project config | `supabase/config.toml` |
| Env var names and required/optional status | `.env.example` |
