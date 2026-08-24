---
phase: 10
slug: core-browsing-dashboard-competitions-cook-detail
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-23
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.0.18 |
| **Config file** | `vitest.config.ts` (`environment: "node"`, no jsdom/React Testing Library installed) |
| **Quick run command** | `npx vitest run tests/<new-file>.test.ts` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~5 seconds |

**Constraint carried forward from the existing test suite:** No React component-rendering test infrastructure exists (`environment: "node"`, no `@testing-library/react`). New page/component `.tsx` files in this phase are **not unit-testable as rendered output** — only the pure logic they call into is. This mirrors the existing `tests/sca-scoring.test.ts` / `tests/sca-routing.test.ts` pattern (test the `lib/` function, not the page).

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/sca-<module>.test.ts` for whichever `lib/sca/*.ts` file changed
- **After every plan wave:** Run `npm run test` (full suite)
- **Before `/gsd:verify-work`:** Full suite must be green; manual click-through of all 4 pages against real data (including cook 7 / competition 4's zero-score edge case, and a cook with no `cook_detail`/`cook_ai_review`)
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-T2 | 10-01 | 1 | DASH-02, COMP-01 | T-10-01, T-10-02 | Em-dash missing-value rule, cook column-label formula, date formatting with no timezone day-shift | unit | `npx vitest run tests/sca-format.test.ts` | ❌ W1 creates | ⬜ pending |
| 10-02-T1 | 10-02 | 2 | DASH-01 | T-10-03 | Best/Worst/Average computed only over scored cooks; zero-scored-cook set returns nulls, never NaN | unit | `npx vitest run tests/sca-aggregates.test.ts` | ❌ W2 creates | ⬜ pending |
| 10-02-T2 | 10-02 | 2 | DASH-03 | T-10-04 | Three insight types only; delta insights omitted below 2 scored cooks (D-06) | unit | `npx vitest run tests/sca-insights.test.ts` | ❌ W2 creates | ⬜ pending |
| 10-03-T1 | 10-03 | 2 | DASH-02, COMP-03 | T-10-06, T-10-07 | Eleven-row model in fixed order; em dash for missing scores; aggregate columns safe on empty sets | unit | `npx vitest run tests/sca-comparison.test.ts` | ❌ W2 creates | ⬜ pending |
| 10-03-T2 | 10-03 | 2 | COOK-01 | T-10-06 | Non-null process-field selection in declared order; `[]` when the cook_detail row is absent | unit | `npx vitest run tests/sca-cook-detail-fields.test.ts` | ❌ W2 creates | ⬜ pending |
| 10-04-T1 | 10-04 | 2 | COMP-01, COMP-02, COOK-01, COOK-02 | T-10-11, T-10-12 | server-only guard; no error text formatted for users; PGRST116 mapped to null | typecheck | `npx tsc --noEmit` | n/a | ⬜ pending |
| 10-04-T2 | 10-04 | 2 | COMP-01, COMP-02, COOK-01, COOK-02 | T-10-09, T-10-10 | `parseScaId` rejects non-numeric/negative/fractional/oversized/array ids before any query (ASVS V5) | unit | `npx vitest run tests/sca-queries.test.ts` | ❌ W2 creates | ⬜ pending |
| 10-05-T1 | 10-05 | 3 | DASH-02, COMP-03 | T-10-14, T-10-16 | Table renders pre-formatted cells only; no `dangerouslySetInnerHTML`; no `"use client"` | typecheck + grep gate | `npx tsc --noEmit` | n/a | ⬜ pending |
| 10-05-T2 | 10-05 | 3 | DASH-01, DASH-03 | T-10-14, T-10-15 | Summary/insight cards render view models only; no computation, no error text | typecheck + grep gate | `npx tsc --noEmit` | n/a | ⬜ pending |
| 10-06-T1 | 10-06 | 4 | DASH-01, DASH-02, DASH-03 | — | Nav exposes Dashboard + Competitions only (D-11) | typecheck | `npx tsc --noEmit` | n/a | ⬜ pending |
| 10-06-T2 | 10-06 | 4 | DASH-01, DASH-02, DASH-03 | T-10-17, T-10-18, T-10-20 | WR-02 closed: generic error copy, `logError` server-side, no `error.message` rendered | build + grep gate | `npm run build` | n/a | ⬜ pending |
| 10-07-T1 | 10-07 | 4 | COMP-01 | T-10-23, T-10-24 | Null city/state/organizer omitted (D-08); generic error copy | build + grep gate | `npm run build` | n/a | ⬜ pending |
| 10-07-T2 | 10-07 | 4 | COMP-02, COMP-03 | T-10-21, T-10-22, T-10-25 | `parseScaId` + `notFound()` before query; shared comparison table reused, no local table markup | build + curl 404 check | `npm run build` | n/a | ⬜ pending |
| 10-08-T1 | 10-08 | 4 | COOK-01, COOK-02 | T-10-26, T-10-27, T-10-30 | Object-level score null guard; AI review text escaped via JSX; locked D-09/D-10 fallback copy | build + grep gate | `npm run build` | n/a | ⬜ pending |
| 10-08-T2 | 10-08 | 4 | COOK-01, COOK-02 | T-10-26 | On-brand 404 inside the SCA shell, no data fetching | build | `npm run build` | n/a | ⬜ pending |
| 10-09-T1 | 10-09 | 5 | all 8 | T-10-31, T-10-32, T-10-33 | Phase gate: full suite, typecheck, build, and repo-wide `dangerouslySetInnerHTML` / `error.message` grep gates | suite | `npm run test && npx tsc --noEmit && npm run build` | ✅ after W2 | ⬜ pending |
| 10-09-T2 | 10-09 | 5 | all 8 | T-10-31, T-10-32, T-10-33 | Human render verification of all four pages incl. sparse-data and 404 paths | manual only | — | n/a | ⬜ pending |

*Filled in by the planner on 2026-08-24 from `10-01-PLAN.md` through `10-09-PLAN.md`. COOK-02's page-render behavior remains manual-only (see Manual-Only Verifications) because the repo has no React rendering test infrastructure.*

---

## Wave 0 Requirements

- [ ] `tests/sca-aggregates.test.ts` — covers DASH-01 (best/worst/average, including the empty-set case modeled on competition 4 / cook 7)
- [ ] `tests/sca-comparison.test.ts` — covers DASH-02/COMP-03 (row building, em-dash rendering rule, column-header formula)
- [ ] `tests/sca-insights.test.ts` — covers DASH-03 (3 insight types, <2-cook omission)
- [ ] `tests/sca-cook-detail-fields.test.ts` — covers COOK-01 (non-null field selection, modeled on real cook 19's mixed-null `cook_detail` row)
- [ ] No new framework install needed — `vitest` already configured and sufficient for all of the above (pure-function tests only)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cook AI review section renders "No AI reviews yet" with zero rows, or lists rows when present | COOK-02 | No branching logic beyond a `.length === 0` check; page rendering itself has no automated coverage (no RTL/jsdom infra) | Visit a cook detail page for a cook with 0 `cook_ai_review` rows and one with ≥1 row; confirm both states render correctly |
| Dashboard, Competitions list/detail, and Cook Detail pages render correctly against live data | DASH-01/02/03, COMP-01/02/03, COOK-01 | Page-render output is untestable under current `environment: "node"` Vitest config (no jsdom/RTL) | Click through all 4 page types against real Supabase data, including competition 4 / cook 7 (zero-score edge case) and a cook with no `cook_detail` row |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies — the one exception (10-09-T2) declares `MISSING` with the framework-constraint rationale and pairs a `<human-check>` with 10-09-T1's automated gate
- [x] Sampling continuity: no 3 consecutive tasks without automated verify — every task carries `npx vitest run`, `npx tsc --noEmit`, or `npm run build`
- [x] Wave 0 covers all MISSING references — the four planned test files plus `tests/sca-format.test.ts` and `tests/sca-queries.test.ts` are created in Waves 1-2, ahead of every consumer
- [x] No watch-mode flags — all commands are `vitest run` / single-shot
- [x] Feedback latency < 5s for unit tests
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planner-approved 2026-08-24
