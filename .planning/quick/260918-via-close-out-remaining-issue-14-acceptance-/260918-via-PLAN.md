---
phase: quick-260918-via
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/0017_function_search_path.sql
  - supabase/migrations/0018_drop_dead_place_preorder.sql
  - docs/supabase-environments.md
autonomous: true
requirements: [ISSUE-14-AC-SEARCHPATH, ISSUE-14-AC-DEADFN, ISSUE-14-AC-DOCS]

must_haves:
  truths:
    - "A developer can read supabase/migrations/0017 and see exactly which 4 functions get search_path pinned and why"
    - "A developer can read supabase/migrations/0018 and understand what public.place_preorder was, why it is provably dead, and why dropping it is safe"
    - "A developer who has never touched this project can read docs/supabase-environments.md and know which two Supabase projects exist, where each env var comes from, how to promote a schema change from bigmattsbbq-test to production, and what to do when a migration goes wrong"
    - "No existing migration file (0001-0016) or existing doc is modified"
    - "No secret value appears in any file created by this plan"
  artifacts:
    - path: "supabase/migrations/0017_function_search_path.sql"
      provides: "search_path pinning for 4 advisor-flagged functions"
      contains: "set search_path = ''"
    - path: "supabase/migrations/0018_drop_dead_place_preorder.sql"
      provides: "removal of dead public.place_preorder + orphaned order_number_seq"
      contains: "drop function if exists public.place_preorder"
    - path: "docs/supabase-environments.md"
      provides: "two-environment model, env-var conventions, promotion + rollback workflow"
      min_lines: 80
  key_links:
    - from: "supabase/migrations/0017_function_search_path.sql"
      to: "supabase/migrations/0010_menu_costing_schema.sql and 0014_sca_trigger_functions.sql"
      via: "exact function signatures as declared in those migrations"
      pattern: "menu_costing\\.(calculate_item_unit_cost|round_price_point)|sca\\.(touch_updated_at|default_competition_steak_label)"
    - from: "docs/supabase-environments.md"
      to: ".env.example"
      via: "documents the three Supabase env vars by their exact names"
      pattern: "SUPABASE_SERVICE_ROLE_KEY"
---

<objective>
Close the last three acceptance criteria on GitHub issue #14 ("Establish Supabase
environments") with repo-file-only work: two new forward-only migrations and one
new operations doc.

Purpose: migrations 0001-0016 already capture the live schema of both Supabase
projects. What remains is (a) remediating the `function_search_path_mutable`
security advisory, (b) removing a dead, publicly-callable `SECURITY DEFINER`
function discovered on production, and (c) writing down the two-environment
model and the promotion/rollback workflow that was actually exercised this
session so the next person can repeat it without rediscovering it.

Output: `supabase/migrations/0017_function_search_path.sql`,
`supabase/migrations/0018_drop_dead_place_preorder.sql`,
`docs/supabase-environments.md`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md

Style references — read before writing:
@supabase/migrations/0016_production_schema.sql
@docs/checkout-attribution.md
@.env.example

Function signature sources (read only the function definitions, do not modify):
@supabase/migrations/0010_menu_costing_schema.sql
@supabase/migrations/0014_sca_trigger_functions.sql
</context>

<hard_constraints>
**This plan produces REPO FILES ONLY.**

- No task may connect to, query, or apply anything against a live Supabase
  database. No Supabase MCP tool calls. No `supabase db push`, no
  `supabase migration up`, no `psql`. Applying 0017 and 0018 live is handled
  separately by the orchestrator, exactly as it was for 0010-0016.
- Do not modify any existing file under `supabase/migrations/` (0001-0016).
- Do not modify `docs/checkout-attribution.md`, `.env.example`, `.env.local`,
  `README.md`, or any other existing file.
- Never print, echo, paste, or otherwise reproduce any value from `.env.local`.
  Env vars are referred to by NAME only, everywhere.

**Verified facts for this plan (already confirmed, do not re-derive):**

| Fact | Value |
|------|-------|
| Test project ref | `ujpviiulhibzztbricxu` (`bigmattsbbq-test`) |
| Production project ref | `wpziabhigztyjrmjpmbw` |
| Highest existing migration | `0016_production_schema.sql` |
| `.env.local` currently points at | `bigmattsbbq-test` (confirmed by project ref in the URL) |
| Supabase env vars in `.env.example` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Verification scripts | `npx tsc --noEmit`, `npm run test`, `npm run test:e2e` |
</hard_constraints>

<tasks>

<task type="auto">
  <name>Task 1: Write migration 0017 pinning search_path on the 4 advisor-flagged functions</name>
  <files>supabase/migrations/0017_function_search_path.sql</files>
  <action>
Create `supabase/migrations/0017_function_search_path.sql`. New file only —
do not touch 0001-0016.

Open with a `-- ===...` banner header comment in the exact visual style of
`0016_production_schema.sql` (full-width `=` rule, `Big Matt's BBQ — Migration
0017` title line, wrapped prose at ~78 columns, closing `=` rule). The header
must state:

- This closes the `function_search_path_mutable` advisory (WARN level) reported
  by Supabase's `get_advisors` security check against both projects after this
  session's schema-drift capture (migrations 0010-0016).
- The advisory flags functions that do not pin `search_path`, which is the
  standard Postgres hardening gap: an unpinned `search_path` lets a caller's
  schema resolution order influence which objects the function body resolves to.
- All four functions already reference every object fully schema-qualified
  (verified against their definitions in `0010_menu_costing_schema.sql` and
  `0014_sca_trigger_functions.sql`), so pinning `search_path = ''` is a pure
  hardening change with no behavioral effect.
- This is also the schema change used to demonstrate the
  `bigmattsbbq-test` -> production promotion pipeline for issue #14's final
  acceptance criterion — see `docs/supabase-environments.md`.

Then emit exactly these four statements, in this order, lowercase keywords to
match the surrounding migration style:

    alter function menu_costing.calculate_item_unit_cost(uuid) set search_path = '';
    alter function menu_costing.round_price_point(numeric, numeric) set search_path = '';
    alter function sca.touch_updated_at() set search_path = '';
    alter function sca.default_competition_steak_label() set search_path = '';

The argument type lists above are load-bearing — they are the signatures as
declared in 0010 (`p_item_id uuid`; `p_amount numeric, p_increment numeric`)
and 0014 (both zero-arg `returns trigger`). Do not abbreviate, reorder, or
guess them.

Optionally group the two `menu_costing` statements and the two `sca` statements
under short `-- ---` section comments (the `Section N:` convention 0016 uses),
noting that the `sca` pair are trigger functions. Keep it brief — this file is
four statements, not a schema.
  </action>
  <verify>
    <automated>test -f supabase/migrations/0017_function_search_path.sql && [ "$(grep -v '^--' supabase/migrations/0017_function_search_path.sql | grep -c "set search_path = ''")" = "4" ] && grep -v '^--' supabase/migrations/0017_function_search_path.sql | grep -q 'menu_costing.round_price_point(numeric, numeric)' && grep -v '^--' supabase/migrations/0017_function_search_path.sql | grep -q 'menu_costing.calculate_item_unit_cost(uuid)' && grep -v '^--' supabase/migrations/0017_function_search_path.sql | grep -q 'sca.touch_updated_at()' && grep -v '^--' supabase/migrations/0017_function_search_path.sql | grep -q 'sca.default_competition_steak_label()' && echo OK</automated>
  </verify>
  <done>`supabase/migrations/0017_function_search_path.sql` exists with a banner header explaining the advisory and exactly four `alter function ... set search_path = ''` statements carrying the correct argument signatures. No existing migration modified.</done>
</task>

<task type="auto">
  <name>Task 2: Write migration 0018 dropping the dead public.place_preorder function and its orphaned sequence</name>
  <files>supabase/migrations/0018_drop_dead_place_preorder.sql</files>
  <action>
Create `supabase/migrations/0018_drop_dead_place_preorder.sql`. New file only.

Same banner header style as 0016/0017. The header comment is the substance of
this migration — it must record the full forensic context, because the object
being dropped is invisible in this repo and nobody will otherwise know what was
removed or why it was safe:

- **What it was:** `public.place_preorder(bigint, bigint, jsonb, text, text,
  text, boolean)` was found live on the production project
  (`wpziabhigztyjrmjpmbw`) while reviewing advisors. It is `SECURITY DEFINER`
  and `EXECUTE`-granted to the `anon` and `authenticated` roles, meaning it was
  callable unauthenticated over PostgREST at
  `/rest/v1/rpc/place_preorder`, accepting customer PII (full name, email,
  phone) and an arbitrary item JSON payload.
- **Why it is untracked:** it appears in no migration in this repo and was
  created out-of-band, the same way the `sca`, `menu_costing`, and `production`
  schemas were (see 0013-0016).
- **Why it is provably dead — three independent reasons:**
  1. No application code calls it. A repo-wide grep finds only a generated type
     stub in `lib/database.types.ts`; there is no call site.
  2. Its body references four tables that do not exist anywhere in the
     database — `drop_pickups`, `drop_inventory`, `customers`,
     `mailing_list_subscribers` (confirmed against `information_schema.tables`,
     zero rows). Any invocation errors out before touching data.
  3. It compares a `bigint` parameter against `public.drops.id`, which is
     `uuid`. Postgres will not implicitly cast between those types, so the
     comparison cannot even plan.
- **What else goes:** `public.order_number_seq`, a sequence owned by no column
  and referenced only by this dead function.
- **Decision:** the user decided on 2026-09-19 to drop both rather than leave a
  non-functional, publicly-callable `SECURITY DEFINER` entry point on the
  production API surface.
- **Environment effect:** this migration is a no-op on `bigmattsbbq-test`
  (`ujpviiulhibzztbricxu`) — the function predates this session's migration
  work, was never part of the tracked schema, and so was never recreated when
  that project was rebuilt from 0001-0016. On production it removes a real,
  live, anon-reachable function. Both `drop` statements use `if exists`
  precisely so the migration is safe to replay against either project.

Then emit exactly these two statements:

    drop function if exists public.place_preorder(bigint, bigint, jsonb, text, text, text, boolean);
    drop sequence if exists public.order_number_seq;

Do not add `cascade` to either statement. If something unexpected depends on
these objects, the migration should fail loudly rather than silently widen its
blast radius.
  </action>
  <verify>
    <automated>test -f supabase/migrations/0018_drop_dead_place_preorder.sql && grep -v '^--' supabase/migrations/0018_drop_dead_place_preorder.sql | grep -q 'drop function if exists public.place_preorder(bigint, bigint, jsonb, text, text, text, boolean);' && grep -v '^--' supabase/migrations/0018_drop_dead_place_preorder.sql | grep -q 'drop sequence if exists public.order_number_seq;' && ! grep -v '^--' supabase/migrations/0018_drop_dead_place_preorder.sql | grep -qi 'cascade' && echo OK</automated>
  </verify>
  <done>`supabase/migrations/0018_drop_dead_place_preorder.sql` exists with a header documenting what `place_preorder` was, the three independent proofs it is dead, the user's drop decision, and its no-op-on-test / real-on-production effect; followed by exactly two `drop ... if exists` statements with no `cascade`.</done>
</task>

<task type="auto">
  <name>Task 3: Write docs/supabase-environments.md</name>
  <files>docs/supabase-environments.md</files>
  <action>
Create `docs/supabase-environments.md`. New file only — do not modify
`docs/checkout-attribution.md`.

Match that doc's shape: an H1 title, a short 2-4 line orienting paragraph that
says who should read this and when, then numbered `## N. Title` sections with
prose-first explanation, prose wrapped at ~78 columns, tables where a table is
genuinely clearer, and minimal bullet nesting (never more than one level).
Write it as if by someone who just ran this workflow twice today — concrete,
specific, no generic platform-engineering filler, no invented tooling.

Use the real migration numbers (`0001`-`0018`) and the real project refs
throughout. Never use placeholders like `<project-ref>`.

Required sections:

**1. The two environments.** Exactly two Supabase projects exist:
`bigmattsbbq-test` (ref `ujpviiulhibzztbricxu`), used for local development and
Playwright e2e runs, and production (ref `wpziabhigztyjrmjpmbw`). A small table
mapping project name -> ref -> what it is used for is appropriate here. State in
one line that there is deliberately no local-Docker stack and no
staging/Vercel-preview database — both were descoped from issue #14 on
2026-09-19. Do not re-argue that decision. Note that `bigmattsbbq-test` was
rebuilt from a clean slate by replaying migrations 0001-0016 plus
`supabase/seed.sql`, so it holds only synthetic data and no real customer rows.

**2. Environment variables.** Cover the three Supabase vars from
`.env.example` by name: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. For each, say
where the value comes from (Supabase dashboard -> Settings -> API, for whichever
project you are targeting). State plainly that:
  - `.env.local` is gitignored and is the only place these are ever set for
    local development.
  - `.env.local` currently points at `bigmattsbbq-test`, not production.
  - Production's values live in the Vercel project's environment variables,
    never in this repo.
  - `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security entirely. It must
    never be sent to the browser, never prefixed `NEXT_PUBLIC_`, and never
    logged. The `NEXT_PUBLIC_` prefix on the other two is what makes them
    browser-visible by design; the anon key is safe there only because RLS
    constrains it.
Do not reproduce any actual key or URL value in this doc.

**3. Promoting a schema change.** Write this as reusable instructions for next
time, not a narrative of what happened today. The real sequence:
  1. Write a new file in `supabase/migrations/` using the existing
     `NNNN_description.sql` naming at the next free number (0018 is the highest
     as of this doc), with a header comment explaining what changed and why.
     Migrations are hand-written and forward-only.
  2. Apply it to `bigmattsbbq-test` first. As of this session the local
     `supabase` CLI is not authenticated in this environment, so the practical
     path is the Supabase MCP tools from a Claude Code session; the CLI works
     too once authenticated. Then verify with `get_advisors` (both the security
     and performance checks) plus a `list_tables` or targeted `execute_sql`
     spot-check that the change actually landed.
  3. Run the full local verification suite against `bigmattsbbq-test` —
     `npx tsc --noEmit`, `npm run test`, `npm run test:e2e`. `.env.local`
     already points there, so no env switching is needed.
  4. Only once test verification passes, apply the identical SQL to production
     via the same mechanism, then re-run `get_advisors` against production to
     confirm the fix landed and no new advisory appeared.
  5. Commit the migration file to git alongside that verification. The repo is
     the source of truth: a migration is not done until it is committed,
     whether or not it has been applied live. Migrations 0010-0016 exist
     precisely because that rule was broken for a long stretch and live schema
     drifted away from the repo.
  Close the section with the one operational reality found this session:
  destructive SQL (`drop schema`, `drop table`, bulk `delete`) run through
  Claude Code's Supabase MCP tools is refused by an automated safety classifier
  even as a single statement against the non-production test project — that
  class of change needs a human to run it in the Supabase SQL Editor. Additive
  and `alter`-based changes pass fine, as do the narrower `drop function` /
  `drop sequence` statements in 0018.

**4. Rollback and incidents.** There are no down-migrations here — no
`supabase db push`-managed pairs, no generated reversals. Rolling back means
writing and applying a new corrective forward migration (an accidental
`add column` is undone by a later `drop column if exists` migration), never
editing or reverting the original file, which may already be applied
elsewhere. For anything larger — data loss, or a bad migration already live on
production — the actual safety net is Supabase's built-in Point-in-Time
Recovery and daily backups, reached from the project's Database settings in
the dashboard. This repo automates none of that. Say so plainly rather than
describing tooling that does not exist.

Optionally close with a short file-map or "related reading" table pointing at
`supabase/migrations/`, `supabase/seed.sql`, `supabase/config.toml`, and
`.env.example`, mirroring `checkout-attribution.md`'s closing file-map section.
  </action>
  <verify>
    <automated>test -f docs/supabase-environments.md && [ "$(wc -l < docs/supabase-environments.md)" -ge 80 ] && grep -q 'ujpviiulhibzztbricxu' docs/supabase-environments.md && grep -q 'wpziabhigztyjrmjpmbw' docs/supabase-environments.md && grep -q 'SUPABASE_SERVICE_ROLE_KEY' docs/supabase-environments.md && grep -q 'NEXT_PUBLIC_SUPABASE_ANON_KEY' docs/supabase-environments.md && grep -q 'NEXT_PUBLIC_SUPABASE_URL' docs/supabase-environments.md && grep -q 'Point-in-Time Recovery' docs/supabase-environments.md && grep -q 'npm run test:e2e' docs/supabase-environments.md && ! grep -q 'eyJ' docs/supabase-environments.md && ! grep -q '<project-ref>' docs/supabase-environments.md && echo OK</automated>
  </verify>
  <done>`docs/supabase-environments.md` exists, is at least 80 lines, follows `checkout-attribution.md`'s numbered-section prose style, names both real project refs and all three env vars, documents the five-step promotion workflow including the MCP destructive-SQL classifier limitation, documents forward-only corrective-migration rollback plus Supabase PITR/backups as the real safety net, and contains no secret values or placeholders.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| anon/authenticated PostgREST -> `public` schema functions | Unauthenticated internet traffic can invoke any `EXECUTE`-granted function at `/rest/v1/rpc/*`; `SECURITY DEFINER` functions run with the owner's privileges |
| repo files -> git history | Anything written into a tracked file is permanently public to anyone with repo access |
| function body -> `search_path` resolution | An unpinned `search_path` lets the caller's schema resolution order influence which objects a function body binds to |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-via-01 | Elevation of Privilege | `public.place_preorder` (`SECURITY DEFINER`, granted to `anon`) | mitigate | Task 2 drops the function outright, removing the anon-reachable definer-rights entry point from production's API surface |
| T-via-02 | Tampering | `menu_costing.*` / `sca.*` functions with mutable `search_path` | mitigate | Task 1 pins `search_path = ''` on all four flagged functions; all bodies are already fully schema-qualified so behavior is unchanged |
| T-via-03 | Information Disclosure | `docs/supabase-environments.md` committed to git | mitigate | Env vars are documented by NAME only; hard constraint forbids reading values into output, and Task 3's automated gate fails the doc if any `eyJ`-prefixed JWT string appears |
| T-via-04 | Information Disclosure | `SUPABASE_SERVICE_ROLE_KEY` misuse by a future developer | mitigate | Task 3 requires an explicit written statement that the service-role key bypasses RLS entirely and must never be `NEXT_PUBLIC_`-prefixed, shipped to the browser, or logged |
| T-via-05 | Denial of Service | `drop ... cascade` widening blast radius beyond the dead objects | mitigate | Task 2 forbids `cascade`; the migration fails loudly on an unexpected dependency rather than silently dropping dependents. Verified by the task's automated gate |

No package-manager installs occur in this plan, so no supply-chain legitimacy
gate applies.
</threat_model>

<verification>
Run from the repo root after all three tasks:

1. `git status --porcelain` shows exactly three new untracked files
   (`supabase/migrations/0017_function_search_path.sql`,
   `supabase/migrations/0018_drop_dead_place_preorder.sql`,
   `docs/supabase-environments.md`) and zero modified files. Any `M` line means
   a hard constraint was violated.
2. `npx tsc --noEmit` passes — proves no TypeScript source was disturbed.
3. `npm run test` passes at its current count — proves no behavior changed.
4. `git diff --stat HEAD -- supabase/migrations/000*.sql supabase/migrations/001[0-6]*.sql`
   produces empty output — migrations 0001-0016 are untouched.
5. No task connected to a live database. Confirm no Supabase MCP tool call,
   `supabase db` command, or `psql` invocation appears in the execution log.
</verification>

<success_criteria>
- Three new files created; zero existing files modified.
- Migration 0017 contains exactly four `set search_path = ''` statements with
  signatures matching the definitions in 0010 and 0014.
- Migration 0018 contains exactly two `drop ... if exists` statements, no
  `cascade`, and a header recording the full forensic justification.
- `docs/supabase-environments.md` covers all four required topics (environments,
  env vars, promotion workflow, rollback/incidents) with real project refs and
  real migration numbers, no placeholders, no secret values.
- `npx tsc --noEmit` and `npm run test` both pass.
- Neither migration has been applied to any live database by this plan.
</success_criteria>

<output>
Create `.planning/quick/260918-via-close-out-remaining-issue-14-acceptance-/260918-via-SUMMARY.md` when done.

The summary must state explicitly that migrations 0017 and 0018 are written and
committed but NOT yet applied to either `bigmattsbbq-test` or production —
applying them is the orchestrator's next step, outside this quick task's
repo-only scope, following the promotion workflow now documented in
`docs/supabase-environments.md`.
</output>
