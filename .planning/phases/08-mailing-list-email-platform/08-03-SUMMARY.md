---
plan: 08-03
phase: 08-mailing-list-email-platform
status: complete
wave: 2
started: 2026-05-19
completed: 2026-05-19
---

# Plan 08-03: Wire API Routes and Tests — Summary

## What Was Built

Wired Plan 01's cleanup and Plan 02's React Email template into both API routes and their tests, completing the Resend migration.

## Key Files

### Modified
- `tests/mailingList.test.ts` — Rewritten: Supabase mock replaced with `resend.contacts.create` mock. 4 tests covering success, silent-duplicate, invalid-email, and Resend-error paths.
- `app/api/mailing-list/route.ts` — Rewritten: Supabase insert removed; calls `resend.contacts.create({ email })`. Inline `RESEND_API_KEY` guard (no `getResendEnv()` — subscribe route doesn't need `RESEND_SEGMENT_ID`). Generic 500 prevents vendor-message leakage.
- `tests/broadcast.test.ts` — Rewritten: Supabase/per-recipient/emails.send mocks removed; replaced with `resend.broadcasts.create` mock + `@react-email/render` mock. 3 auth tests preserved; 2 sanitize-html tests deleted; 4 new tests added (success, Resend error, missing subject, missing segment ID). 7 tests total.

### Renamed + Rewritten
- `app/api/admin/broadcast/route.ts` → `app/api/admin/broadcast/route.tsx` — Renamed for JSX support. Removes: sanitize-html, Supabase subscriber fetch, per-recipient for-loop, email_logs writes, signUnsubscribeToken. Adds: `await render(<DropNotificationEmail subject={subject} dropId={dropId} />)`, `resend.broadcasts.create({ segmentId, from, subject, html, send: true })`, `getResendEnv()` fail-fast guard. `authorize()` preserved verbatim.

## Test Results

- `tests/mailingList.test.ts`: 4/4 green
- `tests/broadcast.test.ts`: 7/7 green
- Full suite (`npm test`): **80/80 tests, 14 files** — all passed

## TypeScript

`npx tsc --noEmit` — Phase 8 code is clean. Two pre-existing issues noted (not introduced by Phase 8):
- `tests/packageMapping.test.ts` — `catalogName` missing from fixture; pre-dates Phase 8 (added in commit `eec344a`)
- `.next/validator.ts` — references deleted `app/unsubscribe/` pages from Plan 01; resolved by `next build`

## Repo-wide Cleanup (confirmed)

- `jose` imports: 0 (D-11 satisfied)
- `sanitize-html` imports: 0 (D-08 satisfied)
- `unsubscribeToken` references: 0 (D-09 satisfied)
- `email_logs` in active routes/lib: 0 (only in generated `database.types.ts`)
- `app/api/admin/broadcast/route.ts`: deleted — only `.tsx` remains

## Deviations

None — all tasks executed as specified in the plan.

## Self-Check: PASSED

- `app/api/mailing-list/route.ts` calls `resend.contacts.create({ email })` ✓
- `app/api/admin/broadcast/route.tsx` calls `resend.broadcasts.create({ segmentId, from, subject, html, send: true })` exactly once ✓
- React Email rendered via `await render(<DropNotificationEmail .../>)` ✓
- `getResendEnv()` used for fail-fast env validation in broadcast route ✓
- `authorize()` preserved verbatim (Bearer BROADCAST_SECRET check) ✓
- Schema is `{ subject, dropId? }` — no `html` field (XSS surface eliminated, D-08) ✓
- 500 responses return generic strings, NOT Resend's `error.message` ✓
- 80/80 tests green ✓
- D-03, D-05, D-06, D-08, D-09 satisfied ✓
