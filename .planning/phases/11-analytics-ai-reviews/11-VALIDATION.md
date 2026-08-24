---
phase: 11
slug: analytics-ai-reviews
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-24
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.0.18 (installed, `node` environment) |
| **Config file** | `vitest.config.ts` — `include: ["tests/**/*.test.ts"]` |
| **Quick run command** | `npx vitest run tests/sca-trends.test.ts tests/sca-queries.test.ts` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/sca-trends.test.ts tests/sca-queries.test.ts`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green, plus a manual browser check of `/sca/analytics`, `/sca/ai-reviews`, `/sca/ai-reviews/[id]` (no jsdom/RTL in this repo — rendering is not automated for any `app/sca` page)
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-0X-0X | TBD | 0 | ANLY-01 | — | `buildTrendSeries(cooks, "total_score")` returns chronological non-null points | unit | `npx vitest run tests/sca-trends.test.ts -t "total_score"` | ❌ W0 | ⬜ pending |
| 11-0X-0X | TBD | 0 | ANLY-02 | — | `buildTrendSeries(cooks, "distance_from_winning")` matches `deriveScoreMetrics` output per cook | unit | `npx vitest run tests/sca-trends.test.ts -t "distance_from_winning"` | ❌ W0 | ⬜ pending |
| 11-0X-0X | TBD | 0 | ANLY-03 | — | `buildTrendSeries` correctly reads each of the 5 category fields and skips null values | unit | `npx vitest run tests/sca-trends.test.ts -t "category"` | ❌ W0 | ⬜ pending |
| 11-0X-0X | TBD | N | ANLY-01/02/03 (render) | — | `/sca/analytics` renders 7 `TrendChart` instances without throwing for `cooks=[]`, 1 cook, N cooks | manual | — human/browser check | — | ⬜ pending |
| 11-0X-0X | TBD | 0 | AIRV-01 | V5 | `getAllAiReviews()` select string includes expected `cook_ai_review` columns, ordered `created_at` desc | unit | `npx vitest run tests/sca-queries.test.ts -t "getAllAiReviews"` | ❌ W0 (append) | ⬜ pending |
| 11-0X-0X | TBD | 0 | AIRV-02 | V5 | `getAiReviewById()` returns `null` on `PGRST116`, rethrows other errors, returns row on success | unit | `npx vitest run tests/sca-queries.test.ts -t "getAiReviewById"` | ❌ W0 (append) | ⬜ pending |
| 11-0X-0X | TBD | N | AIRV-01/02 (route) | V5 | `parseScaId()` reused verbatim for `/sca/ai-reviews/[id]`; `notFound()` on invalid/missing id | manual | — human/browser check + existing `parseScaId` unit coverage | — | ⬜ pending |
| 11-0X-0X | TBD | N | All (error path) | Info Disclosure | Raw Supabase/Postgrest errors never rendered to the client — `logError()` + generic message on any new SSR fetch | manual | — code review against WR-02 pattern | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs finalized once PLAN.md files are written — planner fills in real Plan/Task IDs.*

---

## Wave 0 Requirements

- [ ] `tests/sca-trends.test.ts` — new file; covers ANLY-01, ANLY-02, ANLY-03 (`buildTrendSeries`)
- [ ] Extend `tests/sca-queries.test.ts` with `describe("getAllAiReviews")` / `describe("getAiReviewById")` — covers AIRV-01, AIRV-02, using the existing `mockClient`/`lastCall` recorder pattern already proven against `order()`/`single()` chains in that file — no test-infra changes needed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 7 `TrendChart` instances render correctly at `/sca/analytics` for empty/1/N cook data | ANLY-01, ANLY-02, ANLY-03 | No jsdom/RTL in this repo; `vitest.config.ts` environment is `node` — matches the existing boundary where `app/sca/cooks/*` pages also have zero rendering tests | `npm run dev`, visit `/sca/analytics`, confirm all 7 charts render with axis/point labels and no console errors |
| `/sca/ai-reviews` list and `/sca/ai-reviews/[id]` detail render correctly, including `review_type` badge and null-safe `prompt` handling | AIRV-01, AIRV-02 | Same rendering-test boundary as above | `npm run dev`, visit `/sca/ai-reviews`, open a review with a `prompt` and one without, confirm badge and no "Prompt: —" filler |
| `ScaNavBar` shows `Analytics` and `AI Reviews` links in correct final order | — (D-07) | Visual nav check, no automated DOM test in repo | `npm run dev`, confirm nav order: Dashboard, Competitions, Cooks, Analytics, AI Reviews |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
