---
phase: 12-checkout-attribution-tracking
plan: 03
subsystem: api
tags: [typescript, square, slack, zod, vitest, tdd]

# Dependency graph
requires:
  - phase: 12-01
    provides: "buildAttributionMetadata() pure, non-throwing, byte-safe Square metadata builder"
  - phase: 12-02
    provides: "resolveAttributionLabel() never-throwing code->label resolver"
provides:
  - "checkoutSchema.customer.attributionSourceCode / attributionDetail validated fields on POST /api/checkout"
  - "Square Order.metadata carrying attribution_source / attribution_detail on every created order"
  - "Heard about us: <label> (<detail>) line in the fire-and-forget Slack new-order notification"
affects: [12-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "vi.importActual to pull one real export through an otherwise-fully-mocked module factory, so a pure helper (buildAttributionMetadata) is exercised for real inside a route test that mocks everything else in the same module"
    - "?? fallback on a never-throwing resolver's result, used specifically because the call site sits inside a try block whose catch releases already-committed side effects (reserved capacity) and rethrows"

key-files:
  created:
    - tests/checkoutSlack.test.ts
  modified:
    - app/api/checkout/route.ts
    - tests/checkoutLineItems.test.ts

key-decisions:
  - "attribution metadata written unconditionally as a literal object key (metadata: buildAttributionMetadata(...)); no conditional spread, matching the existing phone_number: customer.phone precedent that already relies on JSON.stringify dropping undefined keys"
  - "resolveAttributionLabel() call site uses '?? customer.attributionSourceCode' as its fallback rather than a try/catch, since the resolver is contractually non-throwing (plan 02) and a try/catch here would misrepresent that guarantee"

requirements-completed: [D-01, D-04, D-08, D-10]

# Metrics
duration: 5min
completed: 2026-08-28
---

# Phase 12 Plan 03: Order Metadata & Slack Attribution Line Summary

**Wired the customer's "how did you hear about us" answer into the existing `POST /v2/orders` request as Square order metadata and into the fire-and-forget Slack new-order notification, with Zod bounds enforced before any Square call.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-08-28T21:24:00Z
- **Completed:** 2026-08-28T21:29:49Z
- **Tasks:** 2 completed
- **Files modified:** 3 (2 modified, 1 created)

## Accomplishments
- Extended `checkoutSchema.customer` with optional `attributionSourceCode` (trimmed, 1-60 chars, `[a-zA-Z0-9_-]` charset) and `attributionDetail` (trimmed, up to 255 chars) fields, rejecting out-of-bounds input with HTTP 400 before any Square call is made
- Wired `buildAttributionMetadata()` (plan 01) into the existing `createOrder` body as `metadata`, so the attribution code (never the label, never the numeric id — D-08) rides along inside the same `POST /v2/orders` request that already creates the order, with the metadata key entirely absent when no source was selected (byte-identical to prior behavior)
- Extended `notifySlackNewOrder` with a `Heard about us: <label> (<detail>)` line, populated via `resolveAttributionLabel()` (plan 02) with a raw-code fallback (`?? customer.attributionSourceCode`) so a Supabase outage degrades gracefully rather than ever reaching the checkout `catch` handler that releases reserved capacity
- 12 new tests across `tests/checkoutLineItems.test.ts` (metadata shape, key omission, Zod rejection) and the new `tests/checkoutSlack.test.ts` (label rendering, line omission, null-resolver fallback, fire-and-forget resilience, no-webhook-configured behavior) — full suite: 274/274 passing, `tsc --noEmit` clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Validate attribution input and write it to the Square order as structured metadata** - `14af9ef` (feat)
2. **Task 2: Append the attribution line to the fire-and-forget Slack new-order notification** - `f8ed838` (feat)

**Plan metadata:** (pending — this commit)

_Note: both tasks were marked `tdd="true"` in the plan; tests and implementation were written and verified together per task rather than as separate RED/GREEN commits, since each task's `<action>` specified schema/route/test changes as a single coherent unit and the plan's own acceptance criteria required the full test file to pass before any commit._

## Files Created/Modified
- `app/api/checkout/route.ts` - Added `buildAttributionMetadata` and `resolveAttributionLabel` imports; extended `checkoutSchema.customer` with `attributionSourceCode`/`attributionDetail`; added `metadata: buildAttributionMetadata({...})` to the `createOrder` body; extended `notifySlackNewOrder`'s params with `attributionLabel`/`attributionDetail` and a conditionally-spread `Heard about us:` message line; added the pre-notify `resolveAttributionLabel` call with `?? customer.attributionSourceCode` fallback
- `tests/checkoutLineItems.test.ts` - Converted the `../lib/square` mock factory to an async factory pulling `buildAttributionMetadata` through `vi.importActual`; added `vi.mock("../lib/attributionSources", ...)`; added a new `describe` block with 6 tests covering metadata shape, key omission, and Zod-boundary rejection (raw code, not label, in metadata; 400 + no Square call on invalid charset/length)
- `tests/checkoutSlack.test.ts` (new) - 6 tests covering: label+detail rendering, code-only rendering with no parenthesized suffix, line omission + zero resolver calls when no attribution submitted, null-resolver-result raw-code fallback, fire-and-forget resilience when the Slack `fetch` rejects (checkout still 200), and no-fetch-attempted behavior when `SLACK_ORDERS_WEBHOOK_URL` is unset

## Decisions Made
- `metadata` is assigned unconditionally as a literal key in the `createOrder` body (`metadata: buildAttributionMetadata({...})`), never conditionally spread — this matches the existing `phone_number: customer.phone` precedent in the same file, which already relies on `JSON.stringify` dropping `undefined`-valued keys
- The Slack call site fallback is `resolvedLabel ?? customer.attributionSourceCode`, not a try/catch — `resolveAttributionLabel()` is contractually non-throwing (enforced by plan 02's own grep acceptance criterion), and wrapping it in a try/catch here would incorrectly imply it can throw

## Deviations from Plan

### Auto-fixed Issues

None — Rules 1-3 were not triggered; the plan's action specifications mapped directly onto the existing code shape with no bugs, missing functionality, or blockers encountered.

## Acceptance Criteria Note

Task 2's acceptance criteria specify `sed -n '/^function notifySlackNewOrder/,/^}/p' app/api/checkout/route.ts | grep -c "console.warn"` should return `1`. This sed range terminates early: `notifySlackNewOrder`'s destructured-parameter type annotation closes with `}: {` at column 0 (a line starting with `}`), which the `/^}/p` end-pattern matches before reaching the function's actual closing brace — so the extracted range never reaches the `.catch(err => console.warn(...))` block and the grep returns `0`, not `1`. Confirmed via `git show` that this exact sed pattern was already broken against the pre-Task-2 code (before this plan touched the file at all): the destructured-params closing line has been shaped this way since the file's prior state. This is a pre-existing plan-authoring artifact in the acceptance-criteria grep command, not a functional regression — the function is directly verified (by reading the file) to remain fully synchronous (0 `await`s, matching the `await`-count criterion which passed) with the `console.warn` handler intact at line 75. All other Task 2 acceptance criteria (behavior assertions, `attributionLabel` count, `resolveAttributionLabel` count, `Heard about us:` count, `tsc --noEmit`, `npm run test`) pass exactly as specified.

## Issues Encountered

None beyond the sed-pattern acceptance-criteria note above.

## Known Stubs

None — this plan wires real, non-stubbed behavior end-to-end (Square metadata + Slack line); no placeholder values or unwired data paths were introduced.

## Threat Flags

None — all new surface (Zod bounds on `attributionSourceCode`/`attributionDetail`, the `metadata` key on the `createOrder` body, and the Slack message line) was explicitly covered by this plan's own `<threat_model>` (T-12-01, T-12-02, T-12-06, T-12-07) and no additional trust-boundary-crossing surface was introduced beyond what the plan anticipated.

## User Setup Required

None - no external service configuration required. The existing `SLACK_ORDERS_WEBHOOK_URL` environment variable (already configured from the prior quick task) is reused as-is.

## Next Phase Readiness
- Plan 04 (customer-facing checkout UI) can now submit `customer.attributionSourceCode` / `customer.attributionDetail` on `POST /api/checkout` and rely on both the Square order metadata and the Slack notification being wired end-to-end
- No blockers

---
*Phase: 12-checkout-attribution-tracking*
*Completed: 2026-08-28*

## Self-Check: PASSED

All created/modified files exist on disk (`app/api/checkout/route.ts`, `tests/checkoutLineItems.test.ts`, `tests/checkoutSlack.test.ts`) and all referenced commit hashes (14af9ef, f8ed838) are present in git history.
