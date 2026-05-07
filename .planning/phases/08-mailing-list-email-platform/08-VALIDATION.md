---
phase: 8
slug: mailing-list-email-platform
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-07
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/mailingList.test.ts tests/broadcast.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/mailingList.test.ts tests/broadcast.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| subscribe-resend | TBD | 1 | D-03 | — | Returns `{ok:true}` regardless of duplicate (no email enumeration) | unit | `npx vitest run tests/mailingList.test.ts` | ✅ (rewrite) | ⬜ pending |
| broadcast-resend | TBD | 1 | D-05 | T-broadcast | Single broadcasts.create() call only | unit | `npx vitest run tests/broadcast.test.ts` | ✅ (rewrite) | ⬜ pending |
| react-email-template | TBD | 1 | D-07, D-08 | T-xss | No raw HTML from caller — structured React props | unit | `npx vitest run tests/broadcast.test.ts` | ❌ W0 | ⬜ pending |
| unsubscribe-cleanup | TBD | 1 | D-09, D-10, D-11 | — | N/A — deletion task | manual | `grep -r "unsubscribeToken\|jose" src/ lib/` exits 1 | N/A | ⬜ pending |
| env-cleanup | TBD | 1 | D-12 | — | RESEND_SEGMENT_ID in .env.example, UNSUBSCRIBE_SECRET removed | manual | `grep "RESEND_SEGMENT_ID" .env.example` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/mailingList.test.ts` — rewrite: replace Supabase mock with `resend.contacts.create` mock; remove 23505 unique-violation test; add Resend API error test; keep 400 invalid-email test
- [ ] `tests/broadcast.test.ts` — rewrite: replace `resend.emails.send` mock with `resend.broadcasts.create` mock; remove Supabase `mailing_list` / `email_logs` mocks; remove `sanitize-html` behavior tests; add test for single API call return shape `{ id }`
- [ ] `tests/unsubscribeToken.test.ts` — DELETE when `lib/unsubscribeToken.ts` is deleted
- [ ] Install `@react-email/components` and `@react-email/render` before any `render()` call in tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Deleted routes return 404 | D-10 | Next.js file-system routing — no unit hook | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/unsubscribe` returns 404; same for `/unsubscribe` page |
| `jose` package fully removed | D-11 | Runtime import check | `grep -r "from 'jose'" . --include="*.ts" --include="*.tsx" --exclude-dir=node_modules` exits 1 (no matches) |
| `{{{RESEND_UNSUBSCRIBE_URL}}}` survives JSX render | D-08 | React Email JSX escaping risk | Render the broadcast component to HTML string and verify the literal `{{{RESEND_UNSUBSCRIBE_URL}}}` appears in output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
