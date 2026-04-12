---
phase: 03
slug: capacity-enforcement
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | DATA-03, ORD-05 | — | N/A | unit | `npx vitest run tests/checkoutReservation.test.ts` | ❌ Wave 0 | ⬜ pending |
| 03-01-02 | 01 | 1 | DATA-03 | T-03-01 | Zod union rejects arbitrary productName strings | unit | `npx vitest run tests/checkoutReservation.test.ts` | ❌ Wave 0 | ⬜ pending |
| 03-01-03 | 01 | 1 | DATA-03 | — | Quantities aggregated by productName before RPC | unit | `npx vitest run tests/checkoutReservation.test.ts` | ❌ Wave 0 | ⬜ pending |
| 03-01-04 | 01 | 1 | ORD-05 | — | RPC failure non-blocking — checkout returns success | unit | `npx vitest run tests/checkoutReservation.test.ts` | ❌ Wave 0 | ⬜ pending |
| 03-02-01 | 02 | 1 | — | — | place_preorder type fix (p_drop_id/p_pickup_id: string) | type | `npm run build` | ✅ exists | ⬜ pending |
| 03-03-01 | 03 | 1 | — | — | getSupabaseEnv removed, tests updated | unit | `npm run test` | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/checkoutReservation.test.ts` — covers DATA-03 and ORD-05; mock pattern follows `tests/checkoutDropGate.test.ts` using `vi.mock("server-only", () => ({}))` and module-level mocking of `lib/supabase`

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
