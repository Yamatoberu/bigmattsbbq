---
phase: quick-260910-sbl
plan: 01
subsystem: api
tags: [zod, resend, react-email, mailing-list, forms]

# Dependency graph
requires: []
provides:
  - "Required firstName field on POST /api/mailing-list, validated with Zod and forwarded to resend.contacts.create"
  - "First-name text input on both the footer MailingListSection form and the inline SoldOutCapture widget"
  - "Personalized drop notification email greeting with a Resend merge-tag fallback for legacy contacts"
affects: [mailing-list, broadcast-email, checkout-attribution]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Resend triple-brace merge tags ({{{FIELD|fallback}}}) emitted as a JSX string-literal expression child to avoid JSX brace-parsing, matching the existing {{{RESEND_UNSUBSCRIBE_URL}}} precedent"

key-files:
  created: []
  modified:
    - app/api/mailing-list/route.ts
    - components/MailingListSection.tsx
    - components/SoldOutCapture.tsx
    - emails/DropNotificationEmail.tsx
    - tests/mailingList.test.ts
    - tests/dropNotificationEmail.test.ts

key-decisions:
  - "SoldOutCapture's compact single-row form was restructured into a two-row flex-col layout (input row + button row) to fit a second required field without shrinking inputs below usable width on mobile"
  - "The 400 error message was widened from 'Invalid email.' to 'Invalid name or email.' rather than adding per-field error detail, keeping the existing generic-error response shape"

patterns-established:
  - "Merge-tag greetings in react-email templates are string-literal JSX children ({\"Hey {{{FIRST_NAME|there}}},\"}), never bare JSX braces"

requirements-completed: [ISSUE-16]

# Metrics
duration: 3min
completed: 2026-09-10
---

# Quick Task 260910-sbl: Collect Subscriber First Name Summary

**Required first-name field on both mailing-list signup surfaces, forwarded to Resend contacts, with a merge-tag greeting fallback in the drop notification email.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-09-11T02:26:47Z
- **Completed:** 2026-09-11T02:29:26Z
- **Tasks:** 3 completed
- **Files modified:** 6

## Accomplishments
- `POST /api/mailing-list` now requires a trimmed, non-empty `firstName` via Zod `safeParse`, rejecting missing/empty/whitespace-only values with 400 before any Resend call, and forwards the trimmed value to `resend.contacts.create`
- Both `MailingListSection` (footer) and `SoldOutCapture` (inline sold-out widget) collect a required first name and send it in the POST body; submit stays disabled until both fields have non-whitespace content
- `DropNotificationEmail` renders a `{{{FIRST_NAME|there}}}` Resend merge-tag greeting, so contacts created before this change still get a personalized-looking "Hey there," rather than a broken tag

## Task Commits

Each task was committed atomically (TDD tasks split into RED/GREEN commits):

1. **Task 1: Require and forward firstName in the mailing-list API route**
   - `c674814` (test) - RED: failing firstName cases added to `tests/mailingList.test.ts`
   - `a1df4f4` (feat) - GREEN: Zod schema + Resend payload updated in `app/api/mailing-list/route.ts`
2. **Task 2: Add required first-name input to both signup forms** - `b17181b` (feat)
3. **Task 3: Personalize the drop notification email with a fallback merge tag**
   - `65e7882` (test) - RED: failing `{{{FIRST_NAME|there}}}` assertion added to `tests/dropNotificationEmail.test.ts`
   - `e88e75f` (feat) - GREEN: greeting `Text` block added to `emails/DropNotificationEmail.tsx`

**Plan metadata:** committed separately by the orchestrator (SUMMARY.md/STATE.md not committed here per constraints)

## Files Created/Modified
- `app/api/mailing-list/route.ts` - Zod schema requires trimmed `firstName`; forwarded to `resend.contacts.create`; 400 message widened to "Invalid name or email."
- `components/MailingListSection.tsx` - Added required first-name input (`sm:w-44`) before the email input; POST body and submit-disabled guard updated
- `components/SoldOutCapture.tsx` - Added required first-name input; form restructured to a two-row `flex-col` layout (input row + button row) to keep the compact widget readable
- `emails/DropNotificationEmail.tsx` - Added a greeting `Text` block emitting the literal `{{{FIRST_NAME|there}}}` merge tag as a string-literal JSX child
- `tests/mailingList.test.ts` - Existing tests updated with a valid `firstName`; new cases for missing/empty/whitespace-only `firstName` (400, no Resend call) and trimmed-value pass-through (200)
- `tests/dropNotificationEmail.test.ts` - New assertion that rendered HTML contains `{{{FIRST_NAME|there}}}`

## Decisions Made
- Widened the 400 error message rather than adding field-level Zod error detail, preserving the route's existing generic-error contract (`{ error, requestId }`) and the test guarantee that Resend error text never leaks to the client.
- Restructured `SoldOutCapture`'s form from a single `flex` row to `flex flex-col` (input row + button row) instead of shrinking input widths, keeping the compact widget usable at mobile width with two required fields.

## Deviations from Plan

None - plan executed exactly as written. All four `must_haves.truths` and five `must_haves.artifacts` are satisfied; the two `key_links` grep patterns (`JSON\.stringify\(\{[^}]*firstName` in both form components, `firstName:\s*parsed\.data\.firstName` in the route) match the implemented code.

## Issues Encountered

`npm run lint` (`next lint`) fails with `Invalid project directory provided, no such directory: <repo>/lint`, reproducing identically on an unmodified `npx next lint` with zero relation to any file this plan touched. Root cause: Next.js 16.1.6 changed `next lint`'s argument handling and this repo has no ESLint config file (per CLAUDE.md: "No ESLint config file present"). This is a pre-existing, out-of-scope condition — logged to `.planning/quick/260910-sbl-collect-subscriber-first-name-for-person/deferred-items.md` rather than fixed, since adding an ESLint config or repinning the lint invocation is an architectural/tooling change (Rule 4) outside this quick task's scope. `npx tsc --noEmit` and `npm run build` — both specified in the plan's own `<verification>` section — pass clean and serve as the type/build safety net.

## User Setup Required

None - no external service configuration required. No new environment variables, no Resend dashboard changes needed (`firstName` is an existing optional field on Resend's `CreateContactOptions`, already typed in `resend@^6.12.2`).

## Next Phase Readiness

- Both signup surfaces and the API route are fully wired and tested; ready for a manual smoke test against a real Resend sandbox audience if desired, but not required for this task's completion.
- The out-of-scope guard held: `app/api/admin/broadcast/route.tsx` and `tests/broadcast.test.ts` were never touched (confirmed via `git diff --name-only`), and `tests/broadcast.test.ts` (7 tests) still passes unchanged.
- `npm run lint` remains broken repo-wide (pre-existing, see Issues Encountered) — a future quick task should add an ESLint flat config or replace the `lint` script, independent of this change.

---
*Phase: quick-260910-sbl*
*Completed: 2026-09-10*

## Self-Check: PASSED

All 6 modified source/test files and both new `.planning` artifacts found on disk; all 5 task commit hashes (`c674814`, `a1df4f4`, `b17181b`, `65e7882`, `e88e75f`) found in git log.
