---
phase: 2
slug: drop-config-storefront
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-10
audited: 2026-04-12
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x (node environment) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/<file>.test.ts` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run targeted `npx vitest run tests/<file>.test.ts`
- **After every plan wave:** Run `npm run test` + `npx tsc --noEmit`
- **Before `/gsd:verify-work`:** Full suite + `npm run lint` + `npm run build` must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01 | 02-01 | 1 | DATA-03, DATA-04 | tsc + file probe | `npx tsc --noEmit && grep -q 'export interface DropDTO' lib/types.ts && grep -q 'dropId: string' lib/types.ts` | — | ✅ green |
| 02-02 | 02-02 | 1 | DATA-03, DATA-04, ORD-05 | unit | `npx vitest run tests/drops.test.ts` | ✅ `tests/drops.test.ts` | ✅ green |
| 02-03 | 02-03 | 1 | ORD-04 | unit | `npx vitest run tests/checkoutDropGate.test.ts` | ✅ `tests/checkoutDropGate.test.ts` | ✅ green |
| 02-04 | 02-04 | 2 | DATA-03, DATA-04, ORD-05 | unit + tsc | `npm run test && npx tsc --noEmit` | ✅ `tests/storefront-state.test.ts` | ✅ green |
| 02-05 | 02-05 | 2 | DATA-05, ORD-04 | unit + tsc | `npm run test && npx tsc --noEmit` | ✅ `tests/storefront-state.test.ts` | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/drops.test.ts` — unit tests for `lib/drops.ts` active-drop fetch + capacity math (DATA-03, DATA-04) — 5 tests ✅
- [x] `tests/checkoutDropGate.test.ts` — checkout route rejects when drop inactive / over capacity (ORD-04) — 9 tests ✅
- [x] `tests/storefront-state.test.ts` — server component renders no-active-drop teaser when no row (DATA-05) — 6 tests ✅
- [x] `tests/supabase.test.ts` — Supabase client mock / test double shared across drops/checkout tests — 4 tests ✅

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sold-out badge appears without page reload | ORD-05 | Requires real browser polling tick + visibility API | 1) Open `/` in browser. 2) In a second tab, mark drop as sold out via Supabase. 3) Within 30s, sold-out badges should appear on the original tab without reload. |
| No-active-drop teaser visual fidelity | DATA-05 | Visual / responsive check against UI-SPEC | Open `/` with no active drop row; compare layout against `02-UI-SPEC.md` teaser mock at mobile + desktop widths. |
| Mobile-first layout of pickup options pulled from Supabase | DATA-03 | Visual / responsive | Verify pickup option chips render correctly at 375px viewport and match Supabase data. |

---

## Validation Audit 2026-04-12

| Metric | Count |
|--------|-------|
| Requirements audited | 5 (DATA-03, DATA-04, DATA-05, ORD-04, ORD-05) |
| Gaps found | 0 |
| Resolved | 0 |
| Escalated to manual | 0 (3 manual items pre-existing by design) |
| Total tests passing | 38/38 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ✅ 2026-04-12 — 38 tests green, all Wave 0 files exist, 0 gaps
