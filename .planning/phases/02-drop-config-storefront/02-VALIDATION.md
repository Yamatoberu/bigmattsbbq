---
phase: 2
slug: drop-config-storefront
status: validated
nyquist_compliant: false
wave_0_complete: true
created: 2026-04-10
updated: 2026-04-11
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
| **Estimated runtime** | ~500ms |

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
| Task 1–2 (schema + DTOs) | 02-01 | 1 | DATA-03, DATA-04, DATA-05 | static + tsc | `npx tsc --noEmit` | ✅ | ✅ green |
| Task 1 (drops.test.ts RED) | 02-02 | 2 | DATA-03, DATA-04 | unit | `npx vitest run tests/drops.test.ts` | ✅ | ✅ green |
| Task 2 (lib/drops.ts GREEN) | 02-02 | 2 | DATA-03, DATA-04 | unit | `npx vitest run tests/drops.test.ts` | ✅ | ✅ green |
| Task 1 (checkDropReady) | 02-03 | 3 | ORD-04 | unit | `npx vitest run tests/checkoutDropGate.test.ts` | ✅ | ✅ green |
| Task 2 (checkout route schema) | 02-03 | 3 | ORD-04 | unit + tsc | `npm run test && npx tsc --noEmit` | ✅ | ✅ green |
| Task 1 (cutoff enforcement) | 02-04 | 1 | ORD-04 | unit | `npx vitest run tests/checkoutDropGate.test.ts` | ✅ | ✅ green |
| Task 2 (useActiveDrop + FrozenItemCard soldOut) | 02-04 | 1 | ORD-05 | tsc only | `npx tsc --noEmit` | ✅ | ✅ green (UI: manual) |
| Task 3 (OrderLanding teaser + page.tsx SSR) | 02-04 | 1 | DATA-05, ORD-05 | tsc only | `npx tsc --noEmit` | ✅ | ✅ green (UI: manual) |
| Task 1 (delete PICKUP_OPTIONS) | 02-05 | 2 | DATA-05 | unit | `npx vitest run tests/storefront-state.test.ts` | ✅ | ✅ green |
| Task 2 (CheckoutClient + WR-02 fix) | 02-05 | 2 | DATA-05, ORD-04 | unit + tsc | `npm run test && npx tsc --noEmit` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/drops.test.ts` — unit tests for `lib/drops.ts` active-drop fetch + capacity math (DATA-03, DATA-04) — **5 tests**
- [x] `tests/checkoutDropGate.test.ts` — checkout route rejects when drop inactive / over capacity (ORD-04) — **9 tests**
- [x] `tests/storefront-state.test.ts` — DATA-05 storefront: PICKUP_OPTIONS deleted, Supabase as source of truth — **6 tests** *(added 2026-04-11)*
- [x] Test fixtures for Supabase client mock — implemented inline in each test file via `vi.doMock`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sold-out badge appears without page reload | ORD-04 | Requires real browser polling tick + visibility API | 1) Open `/` in browser. 2) In a second tab, mark drop as sold out via Supabase. 3) Within 30s, sold-out badges should appear on the original tab without reload. |
| No-active-drop teaser visual fidelity | DATA-05 | Visual / responsive check against UI-SPEC | Open `/` with no active drop row; compare layout against `02-UI-SPEC.md` teaser mock at mobile + desktop widths. |
| Mobile-first layout of pickup options pulled from Supabase | DATA-03 | Visual / responsive | Verify pickup option chips render correctly at 375px viewport and match Supabase data. |
| `useActiveDrop` polling hook updates state every 30s | ORD-05 | Requires jsdom + React Testing Library (not configured) | `npm run dev`. Open `/`. Wait ~30s, observe no visible error. Flip a drop to sold-out in Supabase and confirm badge updates within 30s without reload. |
| `FrozenItemCard` soldOut prop dims card and disables button | ORD-05 | Requires jsdom / component rendering (not configured) | With an active drop where one product is at capacity, verify the corresponding card shows opacity reduction and "Sold Out" button text. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter *(blocked: ORD-05 and DATA-05 UI paths are manual-only due to missing jsdom setup)*

**Approval:** partial — 33/33 automated tests green; 5 manual-only behaviors documented above.

---

## Validation Audit 2026-04-11

| Metric | Count |
|--------|-------|
| Gaps found | 2 |
| Resolved (automated) | 1 |
| Escalated to manual-only | 1 |

**Resolved:** `tests/storefront-state.test.ts` created (6 tests) covering DATA-05 PICKUP_OPTIONS deletion and Supabase source-of-truth assertion.

**Escalated:** ORD-05 polling UI (`useActiveDrop` hook behavior, `FrozenItemCard` soldOut rendering) — requires jsdom/React Testing Library not present in this project's Vitest node configuration.
