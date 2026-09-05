---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: SCA Tracker
status: milestone_complete
stopped_at: Milestone complete (Phase 12 was final phase)
last_updated: 2026-08-28T21:56:32.943Z
last_activity: 2026-08-28
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 29
  completed_plans: 29
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-28 — v2.0 SCA Tracker milestone shipped and archived)

**Core value (storefront):** Customers can preorder frozen BBQ from a live drop without overselling — capacity is enforced, pickup is clear, and confirmation is immediate.
**Core value (SCA Tracker):** A chef/spectator can browse, compare, and understand Big Matt's SCA steak cookoff history — cooks, scores, process detail, and AI appearance reviews — in one place that looks and feels like it belongs on bigmattsbbq.com.
**Current focus:** Milestone complete

## Current Position

Phase: 12
Plan: Not started
Status: Milestone complete
Last activity: 2026-08-28

## Milestone Summary

**v1.0 — Website Refresh & Frozen Drops**

- 5 phases, 19 plans completed
- 3,730 LOC TypeScript
- Timeline: 2026-04-03 → 2026-04-22 (19 days)
- See: .planning/milestones/v1.0-ROADMAP.md

**v1.1**

- 3 phases (6-8), 10 plans completed
- Code review fixes + mailing list/email platform migration to Resend

## Performance Metrics

**Velocity:**

- Total plans completed: 22 (v2.0 not yet started)
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 9. Foundation & Subdomain Routing | TBD | - | - |
| 10. Core Browsing | TBD | - | - |
| 11. Analytics & AI Reviews | TBD | - | - |
| 10 | 12 | - | - |
| 11 | 5 | - | - |
| 12 | 5 | - | - |

*Updated after each plan completion*
| Phase 09 P02 | 3min | 3 tasks | 5 files |
| Phase 09 P04 | 1min 19s | 2 tasks | 2 files |
| Phase 09 P01 | 5min | 2 tasks | 2 files |
| Phase 09 P03 | 12min | 2 tasks | 3 files |
| Phase 09 P05 | 1min | 2 tasks | 2 files |
| Phase 09 P06 | 8min | 3 tasks | 4 files |
| Phase 09 P07 | 4min | 1 tasks | 0 files |
| Phase 10 P01 | 6min | 2 tasks | 3 files |
| Phase 10 P02 | 12min | 2 tasks | 4 files |
| Phase 10 P03 | 15min | 2 tasks | 4 files |
| Phase 10 P04 | 20min | 2 tasks | 2 files |
| Phase 10 P05 | 3min | 2 tasks | 3 files |
| Phase 10 P06 | 3min | 2 tasks | 2 files |
| Phase 10 P08 | 3min | 2 tasks | 2 files |
| Phase 10 P10 | 6min | 3 tasks | 4 files |
| Phase 10 P11 | 8min | 2 tasks | 4 files |
| Phase 10 P12 | 12min | 2 tasks | 0 files |
| Phase 11 P01 | 1min | 2 tasks | 2 files |
| Phase 11 P02 | 1min | 3 tasks | 3 files |
| Phase 11 P03 | 2min | 2 tasks | 2 files |
| Phase 11 P04 | 3min | 2 tasks | 2 files |
| Phase 11 P05 | 25min | 2 tasks | 1 files |
| Phase 12 P01 | 3min | 2 tasks | 4 files |
| Phase 12 P02 | 3min | 2 tasks | 3 files |
| Phase 12 P03 | 5min | 2 tasks | 3 files |
| Phase 12 P04 | 6min | 2 tasks | 2 files |
| Phase 12 P05 | 7min | 3 tasks | 7 files |

## Accumulated Context

### Roadmap Evolution

- Phase 12 added: Checkout Attribution Tracking — customer-facing "How did you hear about us?" capture in checkout, sourced from Supabase `public.attribution_sources`, persisted against the Square order via a to-be-researched Square API mechanism, never blocking a valid checkout

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- v2.0 kickoff: read-only tracker, no new auth, service-role Supabase reads only, shared repo/Vercel project/design system (not a separate app)
- v2.0 kickoff: full DNS cutover to sca.bigmattsbbq.com is manual (Hostinger) and out of scope for the repo work
- [Phase 09]: INFRA-03 subdomain routing implemented via Next.js 16 proxy.ts (not middleware.ts, obsolete on this version) with pure resolveScaRouting decision logic and x-sca-area header driving root layout chrome suppression
- [Phase 09]: SCA subdomain activation checklist written to docs/sca-subdomain-deployment.md with unambiguous NOT-yet-performed status — DNS cutover remains a manual Hostinger step outside repo scope; checklist and README pointer satisfy D-11 and INFRA-03 documentation requirement
- [Phase 09]: Phase 09 Plan 01: PGRST106 blocker resolved via Supabase dashboard Exposed schemas change (sca added); check:sca preflight confirms PASS. INFRA-01 left Pending in REQUIREMENTS.md until 09-03/09-06 land the actual service-role client and live read.
- [Phase 09]: Plan 03: getScaSupabaseClient() and lib/database-sca.types.ts shipped via Supabase CLI (no MCP tool access this session); sca table names: chef, competition, cook, cook_ai_review, cook_detail, cook_weather, score. server-only package requires vi.mock in Vitest tests (throws outside react-server condition).
- [Phase 09]: Phase 09 Plan 05: PERFECT_SCORE (254.5) defined exactly once in lib/sca/scoring.ts; a repo-wide grep confirms no other file duplicates the literal
- [Phase 09]: Phase 09 Plan 05: deriveScoreMetrics accepts the real sca.score.Row directly (total_score/first_place_score as number | null) with zero adapter code needed by Phase 10/11
- [Phase 09]: Phase 09 Plan 05: deriveScoreMetrics never clamps or rounds — negative distances above the score cap are returned as-is; formatting for display is a caller concern
- [Phase 09]: Plan 06 shipped ScaNavBar/ScaFooter/app/sca layout/page reusing 100% existing ember/smoke/gold/pit tokens and glass-card/logo-glow classes per D-09; ScaNavBar ships a single Dashboard-only scaNavLinks entry per D-10 for Phase 10/11 to extend
- [Phase 09]: Plan 06 app/sca/page.tsx performs a real head:true exact-count query against sca.competition via getScaSupabaseClient(), rendering the raw Supabase error message inline on failure rather than throwing, so schema-exposure regressions stay visible
- [Phase 09]: Plan 07 checkpoint approved by human -- all five ROADMAP Phase 9 success criteria confirmed true; Phase 9 (7/7 plans) is complete, DNS/Vercel cutover remains the only outstanding manual step before sca.bigmattsbbq.com goes live
- [Phase 10]: [Phase 10 Plan 01]: cookColumnLabel treats whitespace-only competition names/steak labels as absent, matching the project's no-filler UI convention
- [Phase 10]: Plan 02: scoredCooks() type predicate narrows CookWithScore[] to ScoredCook[]; getLatestCooks operates on the raw unfiltered cook array (not scoredCooks) since D-02 requires ALL cooks, including unscored ones, in the latest-cooks group
- [Phase 10]: Plan 03: buildComparisonTable is the single shared comparison-table model builder (D-01) — cook columns sorted ascending by cooked_at, tie-broken by id; worst/best/average columns are optional via the aggregates flag, reused from lib/sca/aggregates.ts
- [Phase 10]: Plan 03: ProcessFieldKey declared as an explicit 15-member string-literal union rather than Omit<ScaCookDetailRow, metadata keys>, so the metadata column names never appear as quoted strings in lib/sca/cookDetailFields.ts
- [Phase 10]: Plan 04: parseScaId regex-gates route ids (/^\d+$/ + Number.isSafeInteger + >0) before any Supabase .eq() call; PGRST116-to-null mapping centralized in lib/sca/queries.ts so both [id] pages share identical notFound() semantics with zero duplicated error-code strings
- [Phase 10]: Plan 05: components/sca/*.tsx presentational components (ComparisonTable, SummaryCards, WhatStandsOut) never import lib/sca/comparison.ts, aggregates.ts, or insights.ts -- only lib/sca/format.ts for display, keeping all aggregation/formatting logic in lib/sca/* per D-01
- [Phase 10]: Plan 06 locked /sca Dashboard section order to h1 -> WhatStandsOut -> Summary -> Comparison Table per UI-SPEC visual hierarchy; closed WR-02 by rendering only the locked generic error string with logError() for the raw Supabase error
- [Phase 10]: Plan 08: Cook Detail page falls back to cookColumnLabel for the h1 when steak_label is null, and the back-link target is conditional on cook.competition being non-null so it never links to a null competition id
- [Phase 10]: Plan 10 (gap closure G-10-1/COOK-01): added /sca/cooks index route + sortCooksByRecencyDesc + Cooks nav entry — Human UAT found Cook Detail reachable only via a comparison table column header; this supersedes the nav half of D-11 (Cook Detail stays drill-down-only)
- [Phase 10]: Plan 11 (gap closure G-10-2/COMP-03): buildComparisonTable gained an optional aggregateSource (defaults to cooks, preserving Dashboard behavior byte-for-byte) and aggregateScopeLabel; Competition detail now compares event cooks against all-time Worst/Best/Cook Averages via Promise.all(getCompetitionWithCooks, getAllCooksWithScores), closing the single-cook-competition degenerate-comparison gap
- [Phase 10]: Plan 12 (gap-closure re-verification): both Phase 10 UAT gaps closed and developer-approved against live Supabase data (21 cooks, 14 competitions; single-cook id 4, multi-cook id 1) -- G-10-1 (Cooks index/nav) and G-10-2 (all-time aggregate scope on Competition Detail) confirmed with zero regressions to Dashboard, Competitions list, Cook Detail, 404 handling, or storefront. Phase 10 (12/12 plans) is complete. — 10-09's human verification pass rejected the phase on these exact two points; both gaps were closed by code (10-10, 10-11) and could only be proven closed by re-running the same human click-through against real records.
- [Phase 11]: Phase 11 Plan 01: buildTrendSeries always delegates distance_from_winning to deriveScoreMetrics (never re-derived inline); input array order is preserved since getAllCooksWithScores() already returns ascending cooked_at
- [Phase 11]: Plan 02: AiReviewWithCook derived via intersection with generated ScaCookAiReviewRow alias rather than hand-typed columns; embed select string shared via AI_REVIEW_EMBED_SELECT const between list and detail queries to prevent drift
- [Phase 11]: Phase 11 Plan 03: TrendChart consolidates to a single svg viewBox wrapper rendered once with conditional zero/one/many-point children (rather than three duplicated svg blocks) so the literal viewBox/role/aria-label strings each appear exactly once in source, per the plan's grep-based acceptance criteria; each of the 7 charts on /sca/analytics scales to its own y-domain independently
- [Phase 11]: Plan 04: AI Reviews list row's cook link renders conditionally on review.cook (never a non-null assertion); when null, the same cookColumnLabel() text renders as plain <p> instead of a Link with an undefined href
- [Phase 11]: Plan 04: AI Review detail footer gates View Competition on review.cook?.competition independently of review.cook, so a present cook with a null competition still yields View Cook without View Competition
- [Phase 11]: Plan 05 checkpoint found a real mobile horizontal-scroll regression (5-item ScaNavBar didn't wrap below ~945px) during human verification; fixed same-session with flex-wrap below md: (reverting to the original flex-nowrap classes at md: and up) per explicit user request rather than deferred to separate gap-closure planning
- [Phase 11]: Plan 05 checkpoint approved by human -- all five ROADMAP Phase 11 success criteria (ANLY-01, ANLY-02, ANLY-03, AIRV-01, AIRV-02) confirmed true against live Supabase data (21 cooks, 20 scores, 3 AI reviews). Phase 11 (5/5 plans) is complete. v2.0 SCA Tracker milestone's 3 phases (9, 10, 11) are all complete.
- [Quick 260828-f3i]: The `sca.bigmattsbbq.com` subdomain and its DNS cutover were decided against; `/sca` is the canonical SCA Tracker URL and is sufficient. `docs/sca-subdomain-deployment.md` was deleted; README.md and PROJECT.md were updated to drop the pending-cutover framing. The shipped routing code (`proxy.ts`, `lib/sca/routing.ts`, `SCA_HOSTNAME`) was deliberately left in place — it is inert when no `sca.*` host is bound and is already tested, so removing it would be churn with regression risk and no benefit. No CNAME was ever created at Hostinger and no Vercel domain binding was ever added, so the dangling-subdomain-takeover concern documented in the deleted rollback section does not apply — there is nothing to unwind.
- [Phase 12]: Plan 01: attribution_sources types shipped -- AttributionSourceDTO.id is number (bigint), correcting an earlier string/uuid guess; buildAttributionMetadata() truncates to 60/255 UTF-8 bytes (code-point-aware, never .slice() on string length) so multi-byte attribution detail can never overflow Square's metadata limits and abort checkout (D-10)
- [Phase 12]: Plan 02: resolveAttributionLabel() intentionally does NOT filter on is_active -- a source deactivated between page load and checkout submit should still resolve to a readable label for the D-01 Slack line
- [Phase 12]: Plan 03: attribution metadata written unconditionally as a literal object key (metadata: buildAttributionMetadata(...)); no conditional spread, matching the existing phone_number: customer.phone precedent that relies on JSON.stringify dropping undefined keys
- [Phase 12]: Plan 03: resolveAttributionLabel() call site uses '?? customer.attributionSourceCode' as its fallback rather than a try/catch, since the resolver is contractually non-throwing (plan 02) and this call sits inside a try block whose catch releases already-reserved capacity and rethrows
- [Phase 12]: Plan 04: useAttributionSources hook surfaces its own error state; D-09 silent-degradation gate lives in CheckoutClient's render condition (!attributionSourcesError && attributionSources.length > 0), not the hook, matching the plan's separation of concerns
- [Phase 12]: Plan 04: isLoading from useAttributionSources is never destructured in CheckoutClient so the attribution fetch can never enter the submit button's disabled expression
- [Phase 12]: Plan 05: docs/checkout-attribution.md records D-10 as a design mitigation (validation-before-request) not a runtime one (call isolation) -- attribution metadata rides inline in the same POST /v2/orders that creates the order, so there is no separable call to isolate the way the fire-and-forget Slack notification isolates its own failure
- [Phase 12]: Plan 05: e2e fixture hardcodes 4 deterministic attribution rows rather than reading live Supabase data so browser tests stay stable when the source list is edited; live-list correctness is instead proven by the load-bearing real-Sandbox check:attribution verification

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Deferred Items

Items acknowledged and carried forward from previous milestone close (2026-04-22, still open):

| Category | Item | Status |
|----------|------|--------|
| uat_gap | Phase 04: opt-in checkbox UI + E2E order save (2 scenarios) | partial |
| uat_gap | Phase 05: NavBar full UX verification (1 scenario) | partial |
| verification_gap | Phase 04: 04-VERIFICATION.md | human_needed |
| verification_gap | Phase 05: 05-VERIFICATION.md | human_needed |
| requirement | MAIL-01 branded Resend confirmation email | deferred (D-10) |
| quick_task | 5 of the previously-deferred pre-v2.0 quick tasks — 20260501-hero-redesign (full-bleed hero), 20260505-catering-page-hook-trust-restructure, 20260505-homepage-funnel (copy), 260505-fus (no-active-drop gating), and 260507-fix-bundle-variation-ids (+orderItems expansion) — had SUMMARY.md backfilled by quick task 260901-fej on 2026-09-01 (see Quick Tasks Completed rows below for full directory names/commits); an unknown remaining count of older quick tasks may still lack a SUMMARY.md — `gsd-sdk query audit-open`'s "missing summary" list was found to be unreliable during 260901-fej (it flagged tasks that already had a SUMMARY.md on disk, and one row referenced a directory that never existed), so its output must be spot-checked against the filesystem with `ls` before being trusted, not assumed accurate | partially closed 2026-09-01, remaining count unverified |
| uat_gap | Phase 10: 10-HUMAN-UAT.md | resolved (0 pending scenarios) |
| verification_gap | Phase 09: 09-VERIFICATION.md never generated (gsd-verifier step predates this phase); functionally covered by 09-07 human-verify checkpoint | acknowledged at v2.0 close 2026-08-28, deferred |
| tech_debt | 20 non-blocking code review findings (10 Warning, 10 Info, 0 Critical) across 09-REVIEW.md/10-REVIEW.md/11-REVIEW.md | acknowledged at v2.0 close 2026-08-28, see v2.0-MILESTONE-AUDIT.md |

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 20260501-hero-redesign-full-bleed | Hero section redesign — full-bleed atmospheric | 2026-05-01 | feef870 | [20260501-hero-redesign-full-bleed](./.planning/quick/20260501-hero-redesign-full-bleed/) |
| 260501-sc1 | Hero section redesign | 2026-05-02 | a25a39a | [260501-sc1-hero-section-redesign](./.planning/quick/260501-sc1-hero-section-redesign/) |
| 260502-eu1 | Fix Issue 10 — About page bio missing heading and section wrapper | 2026-05-02 | 3b427e7 | [260502-eu1-fix-issue-10-about-page-bio-missing-head](./.planning/quick/260502-eu1-fix-issue-10-about-page-bio-missing-head/) |
| 260502-ex3 | Fix catering page max-width for desktop viewports (Issue 12) | 2026-05-02 | a27c739 | [260502-ex3-fix-catering-page-max-width-for-desktop-](./.planning/quick/260502-ex3-fix-catering-page-max-width-for-desktop-/) |
| 20260502-ui-review-quick-batch | UI review quick batch — Issues 2, 5, 6, 7, 9, 11 | 2026-05-02 | 4b0a938 | [20260502-ui-review-quick-batch](./.planning/quick/20260502-ui-review-quick-batch/) |
| 260502-ui3 | Fix Issue 3 — excessive blank whitespace at page bottom | 2026-05-02 | b74909d | [260502-ui3-fix-blank-whitespace-at-page-bottom](./.planning/quick/260502-ui3-fix-blank-whitespace-at-page-bottom/) |
| 20260505-homepage-funnel-copy | Homepage funnel copy — hero hook, pre-sell block, origin story (Issues 1, 3, 8) | 2026-05-05 | 845099e | [20260505-homepage-funnel-copy](./.planning/quick/20260505-homepage-funnel-copy/) |
| 20260505-sold-out-capture | Inline sold-out email capture in product cards (Funnel Issue 2) | 2026-05-05 | 733199f | [20260505-sold-out-capture](./.planning/quick/20260505-sold-out-capture/) |
| 20260505-catering-page-hook-trust-restructure | Catering page Hook → Trust → Offer → CTA restructure (Funnel Issue 6) | 2026-05-05 | 3d89fcf | [20260505-catering-page-hook-trust-restructure](./.planning/quick/20260505-catering-page-hook-trust-restructure/) |
| 260505-fkj | Add catering cross-sell block to homepage (Funnel Issue 5 — partial) | 2026-05-05 | 4939aaa | [260505-fkj-add-catering-cross-sell-block-to-homepag](./.planning/quick/260505-fkj-add-catering-cross-sell-block-to-homepag/) |
| 260505-fus | Hide only hero/bundles/items when there is no active drop | 2026-05-05 | dde136a | [260505-fus-when-there-is-no-active-drop-hide-only-t](./.planning/quick/260505-fus-when-there-is-no-active-drop-hide-only-t/) |
| 260505-rcp | Add capacity_enforced boolean flag to the drops table and wire it through all capacity gates | 2026-05-06 | 05c1fda | [260505-rcp-add-capacity-enforced-boolean-flag-to-th](./.planning/quick/260505-rcp-add-capacity-enforced-boolean-flag-to-th/) |
| 260507-fix-bundle-variation-ids-and-orderitems | Fix bundle checkout — variation IDs + orderItems expansion | 2026-05-07 | c753abb | [260507-fix-bundle-variation-ids-and-orderitems](./.planning/quick/260507-fix-bundle-variation-ids-and-orderitems/) |
| 260506-t9u | Expand stock tracking to all 6 menu items independently | 2026-05-07 | 179f157 | [260506-t9u-expand-stock-tracking-to-all-6-menu-item](./.planning/quick/260506-t9u-expand-stock-tracking-to-all-6-menu-item/) |
| 260506-tr9 | Remove Square inventory from stock display — drive all in-stock checks off drop.soldOut from the database | 2026-05-07 | 1cdd49b | [260506-tr9-remove-square-inventory-from-stock-displ](./.planning/quick/260506-tr9-remove-square-inventory-from-stock-displ/) |
| 260506-u3i | Fix cart showing Item instead of bundle name in CheckoutClient | 2026-05-07 | 8ba6268 | [260506-u3i-fix-cart-showing-item-instead-of-bundle-](./.planning/quick/260506-u3i-fix-cart-showing-item-instead-of-bundle-/) |
| 260507-bcm | Fix bundle price showing zero in checkout order summary | 2026-05-07 | 70aa204 | [260507-bcm-fix-bundle-price-showing-zero-in-checkou](./.planning/quick/260507-bcm-fix-bundle-price-showing-zero-in-checkou/) |
| 260507-bnv | Fix useActiveDrop infinite fetch loop | 2026-05-07 | 00c4d51 | [260507-bnv-fix-useactivedrop-infinite-fetch-loop](./.planning/quick/260507-bnv-fix-useactivedrop-infinite-fetch-loop/) |
| 260507-c71 | Fix checkout Square API failure | 2026-05-07 | 480cc99 | [260507-c71-fix-checkout-square-api-failure](./.planning/quick/260507-c71-fix-checkout-square-api-failure/) |
| 260507-emt | Move enhancements.md backlog items to ROADMAP.md, delete public file | 2026-05-07 | — | [260507-move-enhancements-to-roadmap](./.planning/quick/260507-move-enhancements-to-roadmap/) |
| 20260520-fix-pickup-issoldout | Fix pickup isSoldOut incorrectly true when capacity_enforced is false | 2026-05-20 | 1a4e57c | [20260520-fix-pickup-issoldout](./.planning/quick/20260520-fix-pickup-issoldout/) |
| 20260520-package-item-display-name | Add displayName to PackageItemConfig for clean sauce label override | 2026-05-20 | eca119b | [20260520-package-item-display-name](./.planning/quick/20260520-package-item-display-name/) |
| 20260819-slack-order-notification | Add fire-and-forget Slack notification to checkout route on new order | 2026-08-19 | 7c3918a | [20260819-slack-order-notification](./.planning/quick/20260819-slack-order-notification/) |
| 260828-f3i | Scrub the SCA subdomain DNS cutover plan — decided against, /sca path is sufficient | 2026-08-28 | 4f3cd2c | [260828-f3i-scrub-the-sca-subdomain-dns-cutover-plan](./.planning/quick/260828-f3i-scrub-the-sca-subdomain-dns-cutover-plan/) |
| 260828-fhk | Scaffold Playwright for E2E testing; specs for browse/sold-out and checkout flow with sauce bump | 2026-08-28 | ed91ecc | [260828-fhk-scaffold-playwright-for-e2e-testing-and-](./.planning/quick/260828-fhk-scaffold-playwright-for-e2e-testing-and-/) |
| 260831-s0z | Fix Square invoice due date to use selected pickup/drop date instead of today's date | 2026-08-31 | d799f89 | [260831-s0z-fix-square-invoice-due-date-to-use-selec](./.planning/quick/260831-s0z-fix-square-invoice-due-date-to-use-selec/) |
| 260901-eul | Bump Square API version from 2026-04-21 to 2026-07-15 in lib/square.ts and scripts/check-order-attribution.mjs; corrected stale README/docs version references; removed stale STATE.md deferred item | 2026-09-01 | 5019ec9 | [260901-eul-bump-square-api-version-from-2026-04-21-](./.planning/quick/260901-eul-bump-square-api-version-from-2026-04-21-/) |
| 260904-twn | Remove capacity enforcement and reservation system (Issue #13) — stripped reservation RPCs from checkout, removed capacity/soldOut surface from DropDTO and all consumers, added not-yet-applied migration 0005 dropping the columns/functions | 2026-09-05 | e30c4f4 | [260904-twn-remove-capacity-enforcement-and-reservat](./.planning/quick/260904-twn-remove-capacity-enforcement-and-reservat/) |
| 260904-uyl | Add pickup-window columns to drop_pickup_options (Issue #6) — dropped the ambiguous pickup_at column, added pickup_start_date/pickup_end_date + dormant orders.assigned_pickup_date, DST-correct Square instant synthesis via lib/timezone.ts, expand/contract migrations 0006+0007 created but not yet applied | 2026-09-05 | 1ca41db | [260904-uyl-add-pickup-window-columns-to-drop-pickup](./.planning/quick/260904-uyl-add-pickup-window-columns-to-drop-pickup/) |
| 2026-05-07 | fast | Increase cart item price text size and highlight with ember-400 color | ✅ | — |
| 2026-05-07 | fast | Bump Square API version from 2024-12-18 to 2026-04-21 | ✅ | — |
| 2026-05-07 | fast | Normalize catalogName bundle match and add console.warn on mismatch in CheckoutClient | ✅ | — |

## Session Continuity

Last session: 2026-08-28T21:42:36.171Z
Stopped at: Completed 12-05-PLAN.md — Phase 12 (5/5 plans) complete
Resume file:

None

- Start the next milestone with /gsd-new-milestone
- Last activity: 2026-08-31 - Completed quick task 260831-s0z: Fix Square invoice due date to use selected pickup/drop date instead of today's date
- Last activity: 2026-09-01 - Completed quick task 260901-eul: Bump Square API version from 2026-04-21 to 2026-07-15; check:sca confirmed PASS against 2026-07-15 (Supabase Sandbox reachable); check:attribution still open — no active drop in Supabase to check out against, not a credentials issue
- Last activity: 2026-09-01 - Completed quick task 260901-fej: backfilled 5 missing quick-task SUMMARY.md files and cleaned 3 stale + 1 inaccurate STATE.md deferred-item rows
- Last activity: 2026-09-05 - Completed quick task 260904-twn: Remove capacity enforcement and reservation system (Issue #13) — migration 0005 created but not yet applied to Supabase (manual, ordered human step required before/after deploy per plan)
- Last activity: 2026-09-05 - Completed quick task 260904-uyl: Add pickup-window columns to drop_pickup_options (Issue #6) — migrations 0006 (expand) and 0007 (contract) created but not yet applied; ordering differs from 260904-twn since this change both adds and removes column reads (apply 0006 → deploy code → apply 0007, per plan's human-check)
