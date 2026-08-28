# Milestones — Big Matt's BBQ

## v2.0 SCA Tracker (Shipped: 2026-08-28)

**Phases completed:** 3 phases, 24 plans, 49 tasks

**Key accomplishments:**

- One-command `npm run check:sca` PostgREST reachability probe shipped, and the confirmed PGRST106 blocker (sca schema missing from Supabase's Data API "Exposed schemas" allowlist) is now resolved — live probe returns `PASS: sca schema is reachable at wpziabhigztyjrmjpmbw.supabase.co.` with exit 0.
- Next.js 16 `proxy.ts` rewrites `sca.bigmattsbbq.com` traffic into `app/sca` via a pure, unit-tested `resolveScaRouting` decision function, and the root layout suppresses storefront NavBar/Footer using a proxy-stamped, non-spoofable `x-sca-area` header.
- Server-side code now has a typed, service-role-only door into the `sca` schema via `getScaSupabaseClient()`, backed by generated types in `lib/database-sca.types.ts` whose top-level `Database` key is `sca` — the storefront's `lib/supabase.ts` and `lib/database.types.ts` are untouched.
- Wrote `docs/sca-subdomain-deployment.md`, an exact Vercel-domain + Hostinger-CNAME activation checklist for `sca.bigmattsbbq.com` with an unambiguous "NOT yet performed" status line, and linked it from README.md so it's discoverable without reading planning artifacts.
- Single shared `deriveScoreMetrics()` function in `lib/sca/scoring.ts` computes `distance_from_winning` and `distance_from_perfect` from a real `sca.score` row with no field mapping, backed by 10 passing Vitest cases and a compile-time proof that the generated `Database["sca"]["Tables"]["score"]["Row"]` type satisfies the function's input type.
- `/sca` now renders inside its own tracker-specific header/footer built entirely from existing ember/smoke design tokens, and the index page performs a real head-only count query against the `sca.competition` table via `getScaSupabaseClient()` — proving the proxy rewrite, chrome suppression, service-role client, and generated types all work together end to end.
- A human personally reviewed the SCA shell's on-brand appearance, the host-based rewrite, and full storefront non-regression in a live browser, and replied "approved" — closing out Phase 9 (Foundation & Subdomain Routing) as complete with all five ROADMAP success criteria demonstrably true.
- Type-only view-model contracts (`lib/sca/types.ts`) and Intl-only display formatters (`lib/sca/format.ts`) that every downstream Phase 10 dashboard/competition/cook-detail module builds on, including the em-dash missing-value rule and the `<competition> - <steak label>` column formula.
- Pure reducers (`lib/sca/aggregates.ts`) and a three-insight generator (`lib/sca/insights.ts`) that compute best/worst/average cook stats and data-driven "what stands out" copy, both null-safe against the real zero-scored-cook edge case (competition 4 / cook 7) with no NaN, Infinity, or thrown errors.
- Single `buildComparisonTable` pure function producing the eleven-row DASH-02/COMP-03 comparison model (cook columns plus optional worst/best/average columns) reusing existing aggregate and scoring helpers, and `getPresentProcessFields` selecting only non-null `cook_detail` columns in a declared display order.
- Server-only `lib/sca/queries.ts` centralizing all five Phase 10 Supabase reads (Dashboard, Competitions list, Competition detail, Cook detail) plus `parseScaId`, the one input-validation control in this read-only tracker.
- Replaced the Phase 9 placeholder `/sca` page with the real Dashboard — WhatStandsOut insight cards, five SummaryCards, and the full aggregate ComparisonTable driven by live Supabase data — and added the Competitions link to ScaNavBar.
- Built `/sca/competitions` (list, newest-first, non-null meta only) and `/sca/competitions/[id]` (event metadata plus the shared comparison table scoped to that event's cooks), completing COMP-01/02/03.
- Cook Detail page (`app/sca/cooks/[id]/page.tsx`) rendering competition context, full score breakdown, process variables, and AI reviews, with an on-brand SCA 404 (`app/sca/not-found.tsx`) for malformed/unknown ids.
- Task 1's automated gate passed cleanly (tests, typecheck, build, XSS/error-leakage greps, live 404 curls, live sparse-data id confirmation). Task 2's human verification pass surfaced two issues rather than "approved" — captured as gaps in `10-HUMAN-UAT.md` for gap-closure planning.
- Added a `/sca/cooks` index route and nav entry so any visitor can reach cook detail pages without first landing on a comparison table, closing gap G-10-1.
- Gave `buildComparisonTable` a separable `aggregateSource`/`aggregateScopeLabel`, and pointed Competition detail's Worst/Best/Cook Averages columns at every recorded cook instead of just that event's own cooks, closing G-10-2 without touching the Dashboard's output.
- Developer approved both Phase 10 UAT gaps (G-10-1 cook discoverability, G-10-2 competition aggregate scope) against live Supabase data with zero regressions.
- Pure `buildTrendSeries(cooks, metric)` function in `lib/sca/trends.ts` converting `CookWithScore[]` into chronological, null-safe `TrendPoint[]` for all 7 Analytics trend metrics (total score, gap-to-first, 5 judging categories)
- Two Supabase queries (`getAllAiReviews`, `getAiReviewById`) joining `cook_ai_review` → `cook` → `competition`, newest-first and unfiltered by review_type, with matching view-model types and full TDD coverage.
- Shared static-SVG `TrendChart` Server Component plus the `/sca/analytics` route rendering it 7 times (Total Score, Gap to First, and 5 judging categories) from a single Supabase fetch, with zero client-side charting JS and zero new dependencies
- Newest-first `/sca/ai-reviews` list (badge + model + date + linked cook + 3-line comment preview) and a `/sca/ai-reviews/[id]` detail page with full comments, conditional prompt section, and independent back-links to cook and competition.
- Five-item SCA nav (Dashboard, Competitions, Cooks, Analytics, AI Reviews) wired in, plus a responsive-wrap fix for a mobile horizontal-scroll regression the new entries introduced — verified against live Supabase data by the developer.

---

---

## v1.0 — Website Refresh & Frozen Drops

**Shipped:** 2026-04-22
**Phases:** 1–5 | **Plans:** 19
**Timeline:** 2026-04-03 → 2026-04-22 (19 days)
**LOC:** ~3,730 TypeScript

### Delivered

Transformed a hardcoded Next.js/Square storefront into a fully database-driven frozen BBQ drop platform with Supabase persistence, atomic capacity enforcement, and a complete mailing list system.

### Key Accomplishments

1. **Supabase foundation** — 5-table PostgreSQL schema with RLS, atomic `reserve_pickup_slot` RPC, typed Node.js client
2. **Database-driven drops** — live pickup options from Supabase replace hardcoded config; drop state gates ordering
3. **Atomic capacity enforcement** — `reserve_pickup_slot` called before Square API; no overselling possible
4. **Deterministic idempotency** — SHA-256 keys derived from order data prevent duplicate Square calls on retry
5. **Order persistence** — JSONB cart snapshot saved to Supabase `orders` after each successful checkout
6. **Mailing list system** — signup (home + footer + checkout opt-in), Jose HS256 unsubscribe JWT, Resend broadcast with email audit trail
7. **Site-wide navigation** — NavBar in layout.tsx with 5 links, mobile drawer, active-route highlight
8. **Static pages** — /catering (tiers + booking), /about, /contact
9. **56 tests green** — unit tests covering inventory join, cart logic, idempotency, mailing list, broadcast, unsubscribe token

### Requirements Coverage

19/20 v1 requirements satisfied. 1 deferred:

- MAIL-01 (branded Resend confirmation) — Square invoice covers MVP; deferred to v1.1 via D-10

### Known Deferred Items at Close: 7

(See STATE.md Deferred Items for full list)

- 2 phases with partial human UAT (Phases 4 and 5)
- 2 verification files at human_needed status
- 3 quick task directories missing closing summaries

### Archive

- Full roadmap: `.planning/milestones/v1.0-ROADMAP.md`
- Requirements archive: `.planning/milestones/v1.0-REQUIREMENTS.md`
- Milestone audit: `.planning/milestones/v1.0-MILESTONE-AUDIT.md`
