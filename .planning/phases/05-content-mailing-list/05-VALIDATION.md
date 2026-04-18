---
phase: 5
slug: content-mailing-list
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-17
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.0.18 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test && npm run build` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test && npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green + `npm run build` succeeds
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 0 | MAIL-02, MAIL-03 | — | N/A | unit | `npx vitest run tests/mailingList.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| 5-01-02 | 01 | 0 | MAIL-05 | T-5-01 | Expired token rejected | unit | `npx vitest run tests/unsubscribeToken.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| 5-01-03 | 01 | 0 | MAIL-06 | T-5-02 | 401 on missing/wrong auth | unit | `npx vitest run tests/broadcast.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| 5-02-01 | 02 | 1 | NAV-01 | — | N/A | manual | browser smoke test | N/A | ⬜ pending |
| 5-02-02 | 02 | 1 | NAV-01 | — | N/A | build | `npm run build` | N/A | ⬜ pending |
| 5-03-01 | 03 | 1 | MAIL-02 | — | Duplicate email silent 200 | unit | `npx vitest run tests/mailingList.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| 5-03-02 | 03 | 1 | MAIL-03 | — | Footer signup identical behavior | unit | `npx vitest run tests/mailingList.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| 5-04-01 | 04 | 1 | MAIL-05 | T-5-01 | Signed token round-trip | unit | `npx vitest run tests/unsubscribeToken.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| 5-05-01 | 05 | 2 | MAIL-06 | T-5-02 | Bearer auth enforced | unit | `npx vitest run tests/broadcast.test.ts -x` | ❌ Wave 0 | ⬜ pending |
| 5-06-01 | 06 | 2 | PAGE-01 | — | N/A | build | `npm run build` | N/A | ⬜ pending |
| 5-06-02 | 06 | 2 | PAGE-02 | — | N/A | build | `npm run build` | N/A | ⬜ pending |
| 5-06-03 | 06 | 2 | PAGE-03 | — | N/A | build | `npm run build` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/mailingList.test.ts` — stubs for MAIL-02/MAIL-03 endpoint logic
- [ ] `tests/unsubscribeToken.test.ts` — stubs for MAIL-05 JWT sign/verify/expiry
- [ ] `tests/broadcast.test.ts` — stubs for MAIL-06 auth guard (401 on bad/missing token)
- [ ] `npm install resend jose` — required before any Phase 5 imports compile

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| NavBar renders 5 nav links with correct hrefs | NAV-01 | Test env is `node` (no jsdom); React component rendering not feasible | Open browser at `/`, verify links: Home, Frozen Drops, Catering, About, Contact with correct hrefs |
| Mobile hamburger drawer opens and closes | NAV-01 | Interaction test requires browser | Resize to mobile width, tap hamburger, verify drawer opens; tap close or link, verify drawer closes |
| Mailing list section visible on home page | MAIL-02 | Visual placement requires browser | Verify full-width section appears above footer on home page |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
