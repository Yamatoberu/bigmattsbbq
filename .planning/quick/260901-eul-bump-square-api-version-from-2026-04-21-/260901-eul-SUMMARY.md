---
phase: 260901-eul
plan: 01
subsystem: infra
tags: [square-api, versioning, docs]

requires: []
provides:
  - SQUARE_VERSION pin bumped from 2026-04-21 to 2026-07-15 across app and verification script
  - README.md and docs/checkout-attribution.md corrected to stop asserting the stale pin
  - STATE.md Deferred Items table cleared of the stale "pending since 2024-12-18" row
affects: [square-integration, checkout-attribution]

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - lib/square.ts
    - scripts/check-order-attribution.mjs
    - README.md
    - docs/checkout-attribution.md
    - .planning/STATE.md

key-decisions:
  - "Only the version string literal changed - changelog review (recorded in the plan's research findings) confirmed the one breaking change in the 2026-07-15 release (TRANSFER inventory-change type retirement) doesn't apply since batchSetInventoryCounts only ever sends PHYSICAL_COUNT"
  - "Live Sandbox verification (check:attribution, check:sca) could not run in this checkout - no .env.local present - so neither script's output is claimed as a pass; this is recorded as an outstanding manual follow-up for the user"
  - "STATE.md docs/PLAN.md commit deferred to the orchestrator per execution constraints; only code-affecting files (lib/, scripts/, README.md, docs/) were committed per task"

requirements-completed: [STATE-DEFERRED-square-api-version]

duration: 26min
completed: 2026-09-01
---

# Quick Task 260901-eul: Bump Square API Version Summary

**Bumped the pinned Square-Version header from 2026-04-21 to 2026-07-15 in lib/square.ts and its hand-synced copy in scripts/check-order-attribution.mjs, corrected two stale docs references, and closed the stale STATE.md deferred item that had drifted since the app was already bumped off 2024-12-18 on 2026-05-07.**

## Performance

- **Duration:** 26 min
- **Started:** 2026-09-01T16:23:00Z
- **Completed:** 2026-09-01T16:49:15Z
- **Tasks:** 3 completed
- **Files modified:** 5

## Accomplishments
- `SQUARE_VERSION` in `lib/square.ts` and the hand-synced copy in `scripts/check-order-attribution.mjs` both now read `2026-07-15`; `npm run test` passes 278/278 with no regressions
- `README.md`'s self-contradictory Square-version sentence rewritten to genuinely not restate the value, and to name both files that must stay in sync
- `docs/checkout-attribution.md`'s re-verification trigger re-armed against `2026-07-15` and recorded as fired, with the finding that the release introduced no Orders API changes affecting `Order.metadata`
- Stale `Square API version bump from 2024-12-18` row removed from `.planning/STATE.md` Deferred Items (the app has been on a bumped version since 2026-05-07; this task closes the loop truthfully rather than leaving a corrected-but-still-open row)

## Task Commits

Each code-affecting task was committed atomically:

1. **Task 1: Bump the version pin in both source locations and verify** - `702a8cc` (feat)
2. **Task 2: Correct the two repo docs that state the old pin** - `5019ec9` (docs)
3. **Task 3: Remove the stale deferred item from STATE.md** - not committed here; `.planning/STATE.md` was edited and verified, but per execution constraints the orchestrator commits STATE.md/SUMMARY.md/PLAN.md together in the docs commit that follows this plan.

## Files Created/Modified
- `lib/square.ts` - `SQUARE_VERSION` const bumped to `2026-07-15`
- `scripts/check-order-attribution.mjs` - hand-synced `SQUARE_VERSION` const bumped to `2026-07-15`; sync comment preserved
- `README.md` - Square-version paragraph rewritten to avoid restating the literal and to name both files holding the pin
- `docs/checkout-attribution.md` - re-verification trigger re-pointed to `2026-07-15` and marked as fired with its finding recorded
- `.planning/STATE.md` - stale `Square API version bump from 2024-12-18` Deferred Items row removed (not committed by this agent; left for orchestrator docs commit)

## Decisions Made
- Changed only the version string literal in both source locations, per the plan's pre-verified research findings (the sole 2026-07-15 breaking change, TRANSFER retirement, doesn't touch this codebase's inventory calls)
- Did not fabricate a live-Sandbox pass: `.env.local` is absent in this checkout, so `npm run check:attribution` and `npm run check:sca` both failed on missing environment variables (not a Square API error) — recorded below as a manual follow-up

## Deviations from Plan

None - plan executed exactly as written. `npm install` was run first since `node_modules/` was absent in this checkout (standard project setup, not a scope deviation); it left an incidental `package-lock.json` normalization (`fsevents` gained a `"dev": true` field) which was left unstaged as out of scope for this task.

## Issues Encountered
None - all three tasks completed on the first attempt with no auto-fixes required.

## Live Sandbox Verification — Update (2026-09-01, post-`.env.local`)

`.env.local` was added to the checkout after this SUMMARY was first written. Re-ran both checks:

- **`npm run check:sca`**: `PASS: sca schema is reachable at wpziabhigztyjrmjpmbw.supabase.co.` — confirms Supabase Sandbox connectivity is unaffected by the `2026-07-15` bump.
- **`npm run check:attribution`**: could not complete. It requires a real Square Sandbox order ID (`npm run check:attribution -- <orderId>`), which per Phase 12's own verification record can only be obtained by driving a real `POST /api/checkout` through the running app. `GET /api/drop` returned `null` — there is currently no `drops` row with `status: active` in Supabase, so no checkout can be submitted (same precondition the e2e suite's `hasActiveDrop` skip guards). The user was asked whether to insert a temporary active drop to unblock this and chose to skip it rather than write synthetic data into this Supabase instance.

**Outcome:** `check:sca` is now a confirmed PASS against `2026-07-15`. `check:attribution` remains unverified against live Sandbox — not because of missing credentials, but because there is no active drop to check out against. This is an environmental gap, not a version-compatibility signal one way or the other.

**Action needed from the user:** once a real drop is active, run a live checkout with an attribution selection and then `npm run check:attribution -- <orderId>` against the resulting order. Given the changelog review found no relevant Orders/Invoices/Customers changes between `2026-04-21` and `2026-07-15`, a failure here would be unexpected and worth investigating immediately.

## User Setup Required
None for `check:sca` (now passing). For `check:attribution`, the only remaining requirement is an active drop in Supabase — no new external service configuration needed.

## Next Phase Readiness
- The app is on the current Square API release (`2026-07-15`); no further version-bump work is queued
- STATE.md Deferred Items table no longer references the resolved version-bump item
- `check:sca` confirmed passing against `2026-07-15`; `check:attribution` remains open pending an active drop to check out against

---
*Phase: 260901-eul*
*Completed: 2026-09-01*

## Self-Check: PASSED

All 5 modified files found on disk; both task commits (`702a8cc`, `5019ec9`) confirmed present in git log.
