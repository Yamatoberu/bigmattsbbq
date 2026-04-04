---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/supabase` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/supabase`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | DATA-01 | unit | `npx vitest run tests/supabase-schema.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DATA-02 | unit | `npx vitest run tests/reservation.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/supabase-schema.test.ts` — stubs for DATA-01 (schema + RLS verification)
- [ ] `tests/reservation.test.ts` — stubs for DATA-02 (reserve_pickup_slot logic)

*Existing vitest infrastructure covers framework needs — no new framework install required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tables visible in Supabase Studio | DATA-01 | Requires Supabase dashboard access | Log into Supabase Studio → verify all 5 tables appear |
| RLS blocks anon writes | DATA-01 | Requires live Supabase instance | Attempt INSERT with anon key → expect 403/RLS violation |
| Seed drop queryable from API route | DATA-01 | Requires running dev server + Supabase | `curl localhost:3000/api/test-drop` → expect seeded drop JSON |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
