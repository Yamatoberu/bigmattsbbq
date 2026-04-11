---
phase: 2
slug: drop-config-storefront
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
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
| TBD | TBD | TBD | DATA-03/04/05, ORD-04/05 | unit + integration | `npm run test` | ❌ W0 | ⬜ pending |

*Filled in by gsd-planner after PLAN.md files are written. Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/drops.test.ts` — unit tests for `lib/drops.ts` active-drop fetch + capacity math (DATA-03, DATA-04)
- [ ] `tests/checkout-drop-gate.test.ts` — checkout route rejects when drop inactive / over capacity (ORD-05)
- [ ] `tests/storefront-state.test.ts` — server component renders no-active-drop teaser when no row (DATA-05)
- [ ] Test fixtures for Supabase client mock (or test double) — shared across drops/checkout tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sold-out badge appears without page reload | ORD-04 | Requires real browser polling tick + visibility API | 1) Open `/` in browser. 2) In a second tab, mark drop as sold out via Supabase. 3) Within 30s, sold-out badges should appear on the original tab without reload. |
| No-active-drop teaser visual fidelity | DATA-05 | Visual / responsive check against UI-SPEC | Open `/` with no active drop row; compare layout against `02-UI-SPEC.md` teaser mock at mobile + desktop widths. |
| Mobile-first layout of pickup options pulled from Supabase | DATA-03 | Visual / responsive | Verify pickup option chips render correctly at 375px viewport and match Supabase data. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
