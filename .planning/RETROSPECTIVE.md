# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

---

## Milestone: v1.0 — Website Refresh & Frozen Drops

**Shipped:** 2026-04-22
**Phases:** 5 | **Plans:** 19 | **Timeline:** 19 days (2026-04-03 → 2026-04-22)

### What Was Built

- Supabase persistence layer: 5-table schema with RLS, atomic `reserve_pickup_slot` RPCs, typed Node.js singleton client
- Database-driven drops model replacing all hardcoded pickup config; drop state gates ordering availability
- Atomic capacity enforcement: `reserve_pickup_slot` called before Square API calls — no overselling possible
- Deterministic SHA-256 idempotency keys; order persistence to Supabase `orders` with JSONB cart snapshot
- Complete mailing list: signup (home + footer + checkout opt-in), Jose HS256 JWT unsubscribe, Resend broadcast with `email_logs` audit trail
- Site-wide NavBar in layout.tsx with 5 links, mobile hamburger drawer, active-route highlight
- Static content pages: /catering (tiered menu + booking), /about, /contact
- 56 tests passing across 12 test files

### What Worked

- **GSD phase discipline**: Planning artifacts (CONTEXT, RESEARCH, PLAN, SUMMARY, VERIFICATION) kept each phase well-scoped and easy to hand off between sessions
- **Verification before advancing**: VERIFICATION.md files caught 3 real gaps (missing resend/jose deps, idempotency regression, stub form not replaced) before milestone close
- **Fire-and-forget pattern for Supabase writes**: Decoupling order persistence from checkout success kept the flow simple and resilient
- **Single migration file**: All DDL, RLS, and functions in `0001_foundation.sql` made it easy to inspect and replay during Phase 1
- **Test-first for side effects**: Writing RED tests before implementing mailing list, broadcast, and unsubscribe routes made implementation fast and regressions obvious
- **Quick tasks for interruptions**: `/gsd-quick` kept NavBar hotfixes (breakpoint, Tailwind custom breakpoint) tracked and separate from phase work

### What Was Inefficient

- **Phase 5 gaps required 2 extra plans**: resend/jose deps and SHA-256 idempotency were accidentally dropped during Phase 5 execution, requiring Plans 07 and 08 to re-close gaps that Phase 4 had already resolved. More careful cross-phase dependency tracking would have caught this earlier.
- **NavBar merge conflict in Phase 5**: The layout lift (moving NavBar from OrderLanding to layout.tsx) caused a merge conflict during Phase 5 Plan 06. A dedicated layout-lift plan earlier in Phase 5 would have avoided the conflict.
- **Human UAT not completed before milestone close**: 3 human verification scenarios remain open (NavBar UX, opt-in checkbox, E2E order write). These are non-blocking but represent unconfirmed behavior.
- **REQUIREMENTS.md checkboxes out of sync**: The traceability table showed "Pending" for requirements that were actually implemented. Keeping REQUIREMENTS.md in sync during execution (not just at close) would reduce the audit overhead at milestone time.
- **STATE.md staleness**: The STATE.md "Current Position" section drifted significantly from reality — it showed "Phase: 2" when all 5 phases were complete. The frontmatter was more reliable than the body.

### Patterns Established

- **Atomic pre-reservation before external API**: Always reserve capacity in Supabase before calling Square — never rely on Square's response timing for capacity enforcement
- **Deterministic idempotency over sorted inputs**: `createHash("sha256")` with `[...inputs].sort().join("|")` produces stable keys for retry safety without UUID randomness
- **Fire-and-forget for audit writes**: Order saves and email_logs inserts use `logError` on failure but don't rethrow — checkout/broadcast success is independent of audit write success
- **Jose HS256 for stateless unsubscribe**: Signed JWT with `algorithms` pin and length guard on secret — no DB query needed to verify unsubscribe intent
- **RED → GREEN test scaffolding**: Create failing test files in Plan N, implement in Plan N+1 — makes acceptance criteria executable from day one

### Key Lessons

1. **Track cross-plan dependencies explicitly**: When Plan A introduces a dep that Plan B relies on, put it in CONTEXT.md for Plan B. Phase 5 Plans 07/08 existed entirely because resend/jose (added in Plan 01) got dropped somewhere in Plans 02-06.
2. **Layout changes deserve their own plan**: Moving NavBar from a component into `layout.tsx` was a cross-cutting change that should have been isolated from content work. Mixing it with static page creation created a merge conflict.
3. **Lock the verification status before advancing phases**: human_needed verification is fine to carry forward, but should have a clear owner and deadline. Without that, it drifts to milestone close.
4. **REQUIREMENTS.md is a contract, not a log**: Keep checkboxes current during execution (mark [x] when a phase SUMMARY confirms satisfaction) — don't batch-update at close.

### Cost Observations

- Model mix: primarily Sonnet 4.x for execution; Opus for planning/discussion phases
- Notable: gap closure in Phase 5 (Plans 07-08) added ~2-3 sessions of overhead — prevented by explicit dep tracking

---

## Milestone: v2.0 — SCA Tracker

**Shipped:** 2026-08-28
**Phases:** 3 | **Plans:** 24 | **Timeline:** 5 days (2026-08-23 → 2026-08-28)

### What Was Built

- Host-based subdomain routing (`sca.bigmattsbbq.com` → `app/sca`) via Next.js 16 `proxy.ts`, with a pure `resolveScaRouting()` decision function and non-spoofable `x-sca-area` chrome-suppression header
- Server-side-only, service-role Supabase access to the `sca` schema with generated types kept in a dedicated file, never touching the storefront's `public` schema client
- A single shared `deriveScoreMetrics()` function for all derived score math, reused unmodified across Phases 10 and 11 with zero duplication
- Dashboard (summary cards, comparison table, data-driven insights), Competitions list/detail, and Cook Detail, all built on one shared `buildComparisonTable()` module
- Analytics: 7 trend charts (total score, gap-to-first, 5 judging categories) as dependency-free static SVG Server Components
- AI Reviews: list + detail views with independently-gated back-links to cook and competition
- 247 tests passing (25 test files), zero Critical code-review findings across all three phases

### What Worked

- **Human-verify checkpoints caught real gaps automated tests couldn't**: this repo has no jsdom/RTL rendering tests for `app/sca` pages, so live browser checkpoints at the end of each phase were the only mechanism that found Phase 10's cook-discoverability and aggregate-scope gaps, and Phase 11's mobile nav horizontal-scroll regression — all three were fixed same-session rather than shipping broken
- **Shared lib functions held up under cross-phase reuse**: `deriveScoreMetrics()` (Phase 9) and `buildComparisonTable()` (Phase 10) were both consumed unmodified by later phases — the milestone integration check confirmed zero duplicated derivation logic anywhere
- **Pathname-generic routing paid off**: because Phase 9's `resolveScaRouting()` was never hardcoded to a route allowlist, Phase 11's three new routes needed zero routing changes
- **TDD RED→GREEN continued from v1.0/v1.1**: query and data-layer plans (11-01, 11-02) wrote failing tests first, consistent with the pattern established in v1.0
- **Fixing a checkpoint failure inline, on explicit user request, kept momentum**: when Phase 11's human verification found the mobile nav-overflow bug, fixing it in the same session (rather than deferring to formal gap-closure planning) avoided a second cold-start round-trip

### What Was Inefficient

- **Phase 9 never got a formal VERIFICATION.md**: the `gsd-verifier` goal-verification step wasn't run for Phase 9 (predates the current execute-phase convention in this project). The phase was still legitimately verified — 09-07-SUMMARY.md documents a human-verify checkpoint with all five success criteria confirmed live — but the milestone audit had to reconstruct that evidence manually instead of reading a structured VERIFICATION.md.
- **Gap-closure cycles added real overhead in Phase 10**: G-10-1 (cook discoverability) and G-10-2 (aggregate scope) each needed their own plan plus a final re-verification plan (10-10, 10-11, 10-12) — 3 of Phase 10's 12 plans existed purely to close gaps found by the phase's own human-verify checkpoint.
- **Browser automation wasn't reliably connected**: the Chrome extension needed a manual reconnect mid-checkpoint during Phase 11's verification, and window-resize-based mobile-viewport testing was flaky (requested widths weren't always honored) — HTTP/HTML inspection filled the gap where it could, but true responsive rendering checks still needed a human's own device.

### Patterns Established

- **Static SVG charts, no charting library**: `TrendChart` renders raw `<svg>` with computed `viewBox`/scaling — zero new dependencies, zero client-side JS, and each of the 7 chart instances scales to its own y-domain independently
- **`aggregateSource` parameter over a second comparison-table builder**: when Competition Detail needed all-time aggregates instead of event-scoped ones, `buildComparisonTable` grew one optional parameter rather than a duplicate implementation
- **Responsive nav wrap over a hamburger menu**: `flex-wrap` + `gap-x`/`gap-y` below `md:`, reverting to the original `flex-nowrap` classes at `md:` and up — kept the nav server-renderable with zero new client JS when a 5th/6th nav entry threatens overflow
- **Drill-down-only detail pages (D-07)**: AI Review Detail is reached only from its own list, never cross-linked from Cook Detail (which renders AI review content inline instead) — consistent with the Cook/Competition Detail precedent from Phase 10

### Key Lessons

1. **Never skip VERIFICATION.md generation, even when a phase closes cleanly via human checkpoint**: Phase 9's missing VERIFICATION.md didn't block the milestone (the underlying evidence existed in its SUMMARY.md), but it forced the milestone audit to do manual reconstruction work that a structured artifact would have made instant.
2. **Test mobile viewport explicitly in every UI-touching human-verify checklist, not just as a general "looks good" pass**: Phase 11's plan already had a step for it, which is exactly why the nav-overflow regression was caught before shipping rather than after. Phases without an explicit mobile-width step are at higher risk of shipping this class of bug.
3. **A shared lib function's value compounds across phases**: `deriveScoreMetrics()` and `buildComparisonTable()` were written once in Phases 9/10 and never touched again by Phases 10/11 — the milestone integration check treats "zero duplicated derivation logic" as a first-class check specifically because this pattern works.
4. **When a live checkpoint finds a real bug, fixing it inline (with explicit user sign-off) beats formal gap-closure planning for small, well-scoped fixes**: the alternative — deferring to a separate `/gsd:plan-phase --gaps` cycle — is right for larger gaps, but was clear overkill for a 2-line Tailwind class change.

### Cost Observations

- Model mix: Sonnet for both execution (`gsd-executor`) and verification (`gsd-verifier`) throughout, per this project's `model_profile: balanced` config
- Sessions: milestone spanned 2 sessions (Phase 11's checkpoint began 2026-08-24, resumed and closed 2026-08-28)
- Notable: Phase 10's 3 gap-closure plans (10-10/11/12) and Phase 11's inline nav fix together represent the milestone's entire "unplanned" work — both traced directly back to human-verify checkpoints doing their job, not to planning failures

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 5 | 19 | First GSD milestone — baseline established |
| v1.1 | 3 | 10 | Code-review-driven hardening + platform migration (Resend Contacts/Broadcasts) |
| v2.0 | 3 | 24 | First milestone with a fully separate product area (SCA Tracker) sharing one repo; human-verify checkpoints became the primary safety net for a page-heavy area with no component-render test coverage |

### Cumulative Quality

| Milestone | Tests | Notes |
|-----------|-------|-------|
| v1.0 | 56 | 12 test files; idempotency, mailing list, broadcast, unsubscribe token, checkout reservation |
| v2.0 | 247 | 25 test files; adds SCA Tracker coverage (scoring, aggregates, comparison, insights, trends, queries, format, cook-detail-fields) on top of v1.0/v1.1's storefront suite |

### Top Lessons (Verified Across Milestones)

1. Atomic pre-reservation before external API calls prevents overselling — implement this pattern early, not as a gap closure
2. Gap closure plans add overhead proportional to how far the gap drifted from its origin phase — catch dependencies in CONTEXT.md at hand-off time
3. Human-verify checkpoints are the load-bearing safety net for any area without component-render tests — every real bug shipped-and-caught in v2.0 (nav discoverability, aggregate scope, mobile overflow) was found by a live checkpoint, not an automated gate
4. A shared lib function's value compounds the more phases reuse it unmodified — `deriveScoreMetrics()` and `buildComparisonTable()` in v2.0 are the clearest examples yet of this paying off across phase boundaries
