---
phase: 4
slug: checkout-email
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-13
audited: 2026-04-17
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.0.18 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/idempotency.test.ts` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | ORD-03 | — | Deterministic idempotency key; no UUID | unit | `npx vitest run tests/idempotency.test.ts` | ✅ | ✅ green |
| 4-01-02 | 01 | 1 | ORD-01 | — | Pre-reserve before Square calls | unit | `npx vitest run tests/checkoutReservation.test.ts` | ✅ | ✅ green |
| 4-02-01 | 02 | 2 | ORD-02 | — | Order saved to Supabase after publishInvoice | unit | `npx vitest run tests/checkoutReservation.test.ts` | ✅ | ✅ green |
| 4-03-01 | 03 | 2 | MAIL-04 | — | Mailing list upsert ON CONFLICT DO NOTHING | unit | `npx vitest run tests/checkoutReservation.test.ts` | ✅ | ✅ green |
| 4-04-01 | 04 | 3 | MAIL-01 | — | Square invoice email covers confirmation (no Resend) | manual | n/a | n/a | ✅ manual |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/idempotency.test.ts` — 6 tests for ORD-03 (deterministic key generation) — COMPLETE

*Existing infrastructure (`tests/checkoutReservation.test.ts`) covers ORD-01, ORD-02, MAIL-04 with new describe blocks added during execution.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Square invoice email delivers to buyer | MAIL-01 | External email delivery; no Resend in Phase 4 | Place sandbox order, verify Square sends invoice email to buyer address |
| Checkout form shows opt-in checkbox unchecked by default | MAIL-04 (UI) | Browser UI | Load `/checkout`, verify checkbox present and unchecked |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** 2026-04-17 — 48/48 tests passing, all automated requirements COVERED

## Validation Audit 2026-04-17

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Manual-only | 2 |
| Total automated | 4/4 COVERED |
