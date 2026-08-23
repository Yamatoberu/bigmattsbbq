---
phase: 09-foundation-subdomain-routing
plan: 07
subsystem: verification
tags: [checkpoint, human-verify, sca-tracker, phase-completion]

# Dependency graph
requires:
  - phase: 09-foundation-subdomain-routing (plan 02)
    provides: "proxy.ts host-based rewrite into app/sca and x-sca-area chrome suppression in app/layout.tsx"
  - phase: 09-foundation-subdomain-routing (plan 06)
    provides: "on-brand SCA shell (ScaNavBar/ScaFooter/app/sca/layout.tsx) and live app/sca/page.tsx"
provides:
  - "Human-verified confirmation that the SCA shell is on-brand and the storefront has zero regression — closes Phase 9"
affects: ["10-core-browsing", "11-analytics-and-ai-reviews"]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified: []

key-decisions:
  - "No code changes in this plan — pure verification checkpoint per its <action> instructions; any defect found would have been routed back to 09-02 (routing) or 09-06 (shell), but none was found"

requirements-completed: [INFRA-03, INFRA-04]

# Metrics
duration: 4min
completed: 2026-08-23
---

# Phase 09 Plan 07: Human Verification of SCA Shell and Storefront Non-Regression Summary

**A human personally reviewed the SCA shell's on-brand appearance, the host-based rewrite, and full storefront non-regression in a live browser, and replied "approved" — closing out Phase 9 (Foundation & Subdomain Routing) as complete with all five ROADMAP success criteria demonstrably true.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-08-23 (continuation from orchestrator handoff)
- **Completed:** 2026-08-23
- **Tasks:** 1 completed (checkpoint:human-verify)
- **Files modified:** 0 — this plan is verification-only, no code changes

## Accomplishments

- Re-ran all four automated gate commands as final confirmation immediately before closing out the plan:
  - `npm run build` — exits 0, `/sca` route registered as a dynamic (`ƒ`) route alongside all existing storefront routes, `Proxy (Middleware)` present in the route manifest
  - `npm run test` — 118/118 tests passing across 18 test files, including `tests/sca-routing.test.ts` (20 tests) and `tests/sca-scoring.test.ts` (10 tests)
  - `npx tsc --noEmit` — clean, zero output
  - `npm run check:sca` — `PASS: sca schema is reachable at wpziabhigztyjrmjpmbw.supabase.co.`
- Confirmed the orchestrator's prior automated evidence remained valid at hand-off time:
  - `test -f proxy.ts` succeeds, `test -f middleware.ts` fails (Next.js 16 rename convention honored, no stale middleware file)
  - `curl -H 'Host: sca.bigmattsbbq.com' http://localhost:3000/` returns content containing "SCA Tracker", not "Catering"
  - `curl -H 'Host: sca.bigmattsbbq.com' http://localhost:3000/sca` returns 200 (double-prefix guard confirmed working)
  - `curl http://localhost:3000/` (plain host, no spoofed header) contains "Catering", not "SCA Tracker"
- Human reviewer personally verified all three sections of the checkpoint in a live browser against the running dev server:
  - **Section A — SCA shell appearance (INFRA-04):** dark smoke background, ember/gold accents, Playfair display heading read as a sibling area of bigmattsbbq.com; header shows the Big Matt's BBQ logo with glow treatment, "SCA Tracker" wordmark, and a single Dashboard nav link; no Home/Catering/About/Contact/Cart in the SCA header; logo click navigates to the marketing site, not back to `/sca`; live competition count renders inside a glass card; mobile-width header does not overflow
  - **Section B — Host-based rewrite (INFRA-03):** already covered by the curl checks above, confirmed a real Host header (not just the `/sca` path) drives the rewrite
  - **Section C — Storefront non-regression (INFRA-03):** `/`, `/catering`, `/about`, `/contact` all render normally with full nav; cart-to-checkout flow works; no console errors on any storefront page
- Human replied exactly **"approved"** — the resume-signal required by the plan for closing the checkpoint
- No styling or behavioral defects were reported; no fix was routed back to 09-02 or 09-06

## Task Commits

This plan performed no code changes — Task 1 is a `checkpoint:human-verify` gate satisfied by explicit human approval, not by a code commit. The only commit produced by this plan is the metadata/docs commit accompanying this summary.

**Plan metadata:** commit to follow this summary (docs: complete plan)

## Files Created/Modified

None. This plan is a verification checkpoint with `files_modified: []` in its frontmatter, matching the plan's `<action>` instruction: "Write no code in this task."

## Decisions Made

See `key-decisions` in frontmatter. No architectural deviation — the plan executed exactly as scoped: automated re-confirmation followed by human sign-off, no code touched.

## Deviations from Plan

None — plan executed exactly as written. All four automated gate commands matched the plan's literal acceptance criteria exactly, and the human approval was unconditional ("approved" with no caveats or defects listed).

## Issues Encountered

None. All four automated commands passed clean on this final re-run, matching the orchestrator's earlier results with no drift.

## User Setup Required

None for this plan specifically. However, Phase 9 as a whole leaves one manual, non-repo step outstanding before `sca.bigmattsbbq.com` is live in production — see the full activation checklist inlined below per this plan's `<output>` requirement (D-11).

---

## SCA Tracker Subdomain Activation Checklist (inlined from `docs/sca-subdomain-deployment.md`)

> This is the exact, current content of `docs/sca-subdomain-deployment.md` at the time Phase 9 closed. It is
> reproduced here in full so the remaining manual steps are visible without opening another file, per plan 09-07's
> `<output>` instruction and decision D-11.

### Status

**`sca.bigmattsbbq.com` is NOT yet live.** The manual steps in this checklist are **NOT yet performed**
— nothing below has been done. DNS lives at Hostinger, outside this repo, so no code task in this
repository can complete the cutover.

What **is** done:

- The application-side routing (`proxy.ts` + `lib/sca/routing.ts`) ships as part of this phase and is
  already live in every deployed environment.
- The SCA tracker is already reachable today at the `/sca` path on any host — `http://localhost:3000/sca`,
  any Vercel preview URL, and `https://bigmattsbbq.com/sca`.

Only the DNS + Vercel domain binding described below remains.

### What already works

- `/sca` is a real, directly visitable Next.js path segment (`app/sca`) — not a rewrite trick. It works
  today in dev (`http://localhost:3000/sca`), on every Vercel preview deployment, and on
  `https://bigmattsbbq.com/sca`.
- `*.vercel.app` preview URLs deliberately do **not** and should not match the sca host rule (D-03) —
  by design, `resolveScaRouting` only matches an exact configured hostname or anything starting with
  `sca.`. Preview deployments are exercised via the `/sca` path instead, not via a preview subdomain.
- Once the steps below are complete, `https://sca.bigmattsbbq.com/` will resolve to the exact same
  content as `/sca` today, with the clean subdomain shown in the browser's address bar (a rewrite, not
  a redirect).

### Step 1 — Add the domain in Vercel

- [ ] Open the Vercel dashboard for this project.
- [ ] Go to **Project Settings → Domains**.
- [ ] Click **Add** and enter `sca.bigmattsbbq.com`.
- [ ] Because this is a single named subdomain (not a wildcard `*.bigmattsbbq.com`), Vercel will display
      a **CNAME** target to add at the DNS host — typically `cname.vercel-dns.com`. No nameserver
      delegation to Vercel is required for this case.
- [ ] Copy the exact CNAME target value Vercel displays. Do not assume it is `cname.vercel-dns.com` —
      always use the literal value shown in the dashboard for this project.

### Step 2 — Add the CNAME at Hostinger

- [ ] Log in to Hostinger and open the DNS zone editor for the `bigmattsbbq.com` domain.
- [ ] Add a new DNS record:
  - **Type:** `CNAME`
  - **Name / Host:** `sca`
  - **Value / Points to:** the exact target Vercel displayed in Step 1 (e.g. `cname.vercel-dns.com`),
    copied verbatim — including a trailing period if Hostinger's editor shows one.
  - **TTL:** leave at the default value.
- [ ] Save the record.
- [ ] Do **not** guess the target value or reuse a CNAME target from a different project/tutorial — an
      incorrect value here will fail Vercel's validation or, worse, point the subdomain nowhere.

### Step 3 — Verify

- [ ] `dig +short sca.bigmattsbbq.com` resolves to a Vercel target (may take time to propagate after
      Step 2).
- [ ] The Vercel dashboard's Domains panel shows `sca.bigmattsbbq.com` as **"Valid Configuration"**.
- [ ] `curl -sI https://sca.bigmattsbbq.com/` returns `HTTP/2 200`.
- [ ] `curl -s https://sca.bigmattsbbq.com/` output contains `SCA Tracker` — this proves `proxy.ts`
      fired against a real `Host` header, not merely that the `/sca` path works.
- [ ] `curl -sI https://bigmattsbbq.com/` still returns `HTTP/2 200` and the storefront is unchanged —
      confirming the subdomain addition did not affect the main site.

### No config changes required

No `vercel.json` file exists in this repo, and none is needed for this activation — a single named
subdomain binding in the Vercel dashboard plus the app's existing `proxy.ts` is sufficient once DNS
resolves.

`SCA_HOSTNAME` (documented in `.env.example`) only needs to be set as a Vercel environment variable if
a hostname other than `sca.bigmattsbbq.com` is used for this deployment. The routing rule in
`lib/sca/routing.ts` already matches any hostname starting with `sca.` in addition to the exact
configured hostname, so a future `sca.staging.bigmattsbbq.com` subdomain is covered with zero code
changes — only a new DNS record and Vercel domain binding, following the same two steps above.

### Rollback

- [ ] Remove the CNAME record at Hostinger.
- [ ] Remove the `sca.bigmattsbbq.com` domain binding in Vercel Project Settings → Domains.

Remove both together. A CNAME left pointing at `cname.vercel-dns.com` after the Vercel domain binding
is removed is a classic dangling-subdomain takeover vector — always remove the DNS record and the
Vercel binding in the same pass, not one without the other.

Because `proxy.ts` only branches on the incoming `Host` header, removing the subdomain does not change
any storefront route or behavior — `bigmattsbbq.com` and `/sca` continue to work exactly as before.

---

## Next Phase Readiness

**Phase 9 is complete — 7/7 plans delivered.** All five ROADMAP Phase 9 success criteria are now demonstrably true:

1. ✅ Host-based routing via `proxy.ts` rewrites `sca.*` traffic into `app/sca` without changing existing routes — confirmed by automated tests (20 routing tests) and this checkpoint's live curl checks against a spoofed Host header
2. ✅ Server-side code queries the `sca` schema via `getScaSupabaseClient()` and generated `lib/database-sca.types.ts`, never bundled into browser JS — confirmed by 09-03 and re-verified by 09-06's `grep -rl SUPABASE_SERVICE_ROLE_KEY .next/static` returning 0 hits
3. ✅ `deriveScoreMetrics()` in `lib/sca/scoring.ts` is the single shared source for `distance_from_winning`/`distance_from_perfect` — confirmed by 09-05, no duplicated derivation logic anywhere in the codebase
4. ✅ `/sca` visually matches the site's ember/smoke theme, fonts, and card conventions — confirmed by human review in this checkpoint (Section A), zero new visual primitives per D-09
5. ✅ The remaining manual Hostinger/Vercel DNS steps are documented in `docs/sca-subdomain-deployment.md` and inlined above — confirmed by human review and this checkpoint's `<output>` requirement

Phase 10 (Core Browsing — Dashboard, Competitions & Cook Detail) can now build on this foundation:
- `app/sca/layout.tsx` is the stable shell every `app/sca/*` route nests inside
- `ScaNavBar`'s `scaNavLinks` array is ready to receive Competitions/Cook Detail entries
- `getScaSupabaseClient()`, `lib/database-sca.types.ts`, and `deriveScoreMetrics()` are all proven end-to-end against live data, not just unit-tested in isolation
- One outstanding manual step remains before the public subdomain is live: the Vercel + Hostinger DNS cutover documented above. This does not block Phase 10 development, which continues to use the `/sca` path on any host.

---
*Phase: 09-foundation-subdomain-routing*
*Completed: 2026-08-23*

## Self-Check: PASSED

No files were created or modified by this plan (verification-only, `files_modified: []`), so there are no file-existence claims to check. This SUMMARY.md itself is confirmed written to disk at `.planning/phases/09-foundation-subdomain-routing/09-07-SUMMARY.md`. The four automated command results quoted above (build exit 0 with `/sca` route listed, 118/118 tests, clean `tsc --noEmit`, `check:sca` PASS) were captured directly from this session's own command output, not inherited from a prior report.
