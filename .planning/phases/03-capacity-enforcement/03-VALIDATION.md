---
phase: 03
slug: capacity-enforcement
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-12
audited: 2026-04-12
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
| 03-01-01 | 01 | 0 | DATA-03, ORD-05 | — | N/A | unit | `npx vitest run tests/checkoutReservation.test.ts` | ✅ exists | ✅ green |
| 03-01-02 | 01 | 1 | DATA-03 | T-03-01 | Zod union rejects arbitrary productName strings | unit | `npx vitest run tests/checkoutReservation.test.ts` | ✅ exists | ✅ green |
| 03-01-03 | 01 | 1 | DATA-03 | — | Quantities aggregated by productName before RPC | unit | `npx vitest run tests/checkoutReservation.test.ts` | ✅ exists | ✅ green |
| 03-01-04 | 01 | 1 | ORD-05 | — | RPC failure returns 409 — checkout does not proceed to Square | unit | `npx vitest run tests/checkoutReservation.test.ts` | ✅ exists | ✅ green |
| 03-02-01 | 02 | 1 | — | — | place_preorder type fix (p_drop_id/p_pickup_id: string) | type | `npm run build` | ✅ exists | ✅ green |
| 03-03-01 | 03 | 1 | — | — | getSupabaseEnv removed, tests updated | unit | `npm run test` | ✅ exists | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `03-01-04` — route-level RPC failure returns 409 test added to `tests/checkoutReservation.test.ts`; all 7 tests green

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved

---

## Validation Audit 2026-04-12

| Metric | Count |
|--------|-------|
| Gaps found | 1 |
| Resolved | 1 |
| Escalated | 0 |

**Notes:** Task 03-01-04 behavior description corrected — original plan described non-blocking fire-and-forget RPC after publishInvoice; actual implementation calls reserve_pickup_slot before Square and returns 409 on failure (with rollback). Test added to verify the actual blocking behavior.
