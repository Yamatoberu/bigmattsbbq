---
phase: 10
slug: core-browsing-dashboard-competitions-cook-detail
status: draft
nyquist_compliant: false
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
| 10-XX-XX | TBD | 0 | DASH-01 | — | Best/Worst/Average computed correctly, including zero-scored-cook edge case | unit | `npx vitest run tests/sca-aggregates.test.ts` | ❌ W0 | ⬜ pending |
| 10-XX-XX | TBD | 0 | DASH-02 | — | Comparison row-building (categories, em-dash for missing scores, column header formula) | unit | `npx vitest run tests/sca-comparison.test.ts` | ❌ W0 | ⬜ pending |
| 10-XX-XX | TBD | 0 | DASH-03 | — | Insight computation (swing, gap, placement change; <2-cook omission per D-06) | unit | `npx vitest run tests/sca-insights.test.ts` | ❌ W0 | ⬜ pending |
| 10-XX-XX | TBD | 0 | COMP-01/02/03 | — | Query shape correctness; comparison table reuse verified by shared unit tests | unit (shared logic) + manual (page render) | `npx vitest run tests/sca-comparison.test.ts` | ❌ W0 (shared with DASH-02) | ⬜ pending |
| 10-XX-XX | TBD | 0 | COOK-01 | — | Non-null process-field selection | unit | `npx vitest run tests/sca-cook-detail-fields.test.ts` | ❌ W0 | ⬜ pending |
| 10-XX-XX | TBD | — | COOK-02 | — | AI review list renders with zero rows ("No AI reviews yet") | manual only | — | n/a | ⬜ pending |

*Task IDs, plan numbers, and exact wave assignments are TBD until the planner produces PLAN.md files — this table's requirement rows are the binding contract; the planner fills in task/plan/wave identifiers.*

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
