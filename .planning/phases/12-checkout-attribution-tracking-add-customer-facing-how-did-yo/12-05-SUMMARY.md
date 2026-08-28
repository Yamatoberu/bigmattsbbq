---
phase: 12-checkout-attribution-tracking
plan: 05
subsystem: testing-and-docs
tags: [playwright, e2e, square, documentation]

# Dependency graph
requires:
  - phase: 12-01
    provides: "AttributionSourceDTO contract, buildAttributionMetadata()"
  - phase: 12-02
    provides: "GET /api/attribution-sources"
  - phase: 12-03
    provides: "Square order metadata write, Slack attribution line"
  - phase: 12-04
    provides: "Customer-facing dropdown + conditional detail input on /checkout"
provides:
  - "e2e/fixtures/attributionSources.ts — deterministic AttributionSourceDTO[] fixture"
  - "stubAttributionSources() — e2e/support/stubs.ts route stub"
  - "5 new Playwright tests in e2e/checkoutFlow.spec.ts covering D-02/D-04/D-06/D-07/D-08"
  - "scripts/check-order-attribution.mjs + npm run check:attribution — one-command Square RetrieveOrder metadata readback"
  - "docs/checkout-attribution.md — key contract, extensibility path, D-10 residual-risk documentation"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Standalone .mjs verification script (no lib/ imports, plain fetch) modeled on scripts/check-sca-schema.mjs, invoked via npm run check:<name> -- <arg>"

key-files:
  created:
    - e2e/fixtures/attributionSources.ts
    - scripts/check-order-attribution.mjs
    - docs/checkout-attribution.md
  modified:
    - e2e/support/stubs.ts
    - e2e/checkoutFlow.spec.ts
    - package.json
    - README.md

key-decisions:
  - "docs/checkout-attribution.md records D-10 as a design mitigation (validation-before-request), not a runtime one (call isolation) — attribution metadata rides inline in the same POST /v2/orders that creates the order, so there is no separable call to isolate the way the fire-and-forget Slack notification isolates its own failure"
  - "e2e fixture hardcodes 4 deterministic rows rather than reading live Supabase data (T-12-13, accepted) so browser tests stay stable when Big Matt edits the source list; live-list correctness is instead proven by this plan's load-bearing real-Sandbox verification"

requirements-completed: [D-01, D-02, D-06, D-07, D-08, D-10]

# Metrics
duration: 7min
completed: 2026-08-28
---

# Phase 12 Plan 05: E2E Coverage, Sandbox Readback Script, and Attribution Contract Docs Summary

**Automated the two decisions only a browser can prove (D-06 contextual detail input, D-07 stale-detail clearing) with 5 new Playwright tests, replaced the phase's ad-hoc manual Square readback with `npm run check:attribution`, and documented the `attribution_*` metadata contract including the D-10 residual-risk tradeoff — verified end-to-end against a real Square Sandbox order.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-08-28T21:33:00Z
- **Completed:** 2026-08-28T21:40:09Z
- **Tasks:** 3 completed
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments

- Added `e2e/fixtures/attributionSources.ts` (4 deterministic rows, 2 requiring detail) and `stubAttributionSources()` in `e2e/support/stubs.ts`, structurally identical to the existing `stubFrozenItems` pattern
- Extended `e2e/checkoutFlow.spec.ts` with 5 new tests inside the existing `checkout flow` describe block, covering: the contextual detail input appearing/disappearing per selected source (D-06), stale detail text being dropped from the submitted payload when switching to a no-detail source (D-07), code-plus-detail submission (D-08), no-attribution submission (D-04 regression), and confirmation page having zero attribution acknowledgment (D-02 regression) — all 7 tests in the file (2 pre-existing + 5 new) passed against a real active drop in Supabase
- Shipped `scripts/check-order-attribution.mjs` + `npm run check:attribution -- <orderId>`, a zero-dependency script modeled on `scripts/check-sca-schema.mjs` that calls Square's `RetrieveOrder` and prints the order's `attribution_source`/`attribution_detail` metadata (or an explicit `NO ATTRIBUTION` message), always with a Seller-Dashboard-invisibility reminder
- **Ran the load-bearing verification for real**: created a live Square Sandbox order via `POST /api/checkout` with `attributionSourceCode: "ai"` / `attributionDetail: "ChatGPT"`, then ran `npm run check:attribution -- <orderId>` against the resulting order and confirmed Square persisted and returned the exact submitted code and detail (see "Load-Bearing Sandbox Verification" below)
- Wrote `docs/checkout-attribution.md` (180 lines) covering the key contract, the 10-slot/60-char-key/255-char-value Square metadata limits, the extensibility naming shape (`attribution_utm_source` etc.), the rejected Order Custom Attributes alternative, the Seller Dashboard invisibility caveat, the reliability contract, and a dedicated "Residual risk: D-10 holds by validation, not by call isolation" subsection; linked from `README.md`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the attribution E2E fixture, route stub, and D-06/D-07 browser coverage** - `5cd0755` (feat)
2. **Task 2: Add a one-command Square order attribution readback script** - `af5fcb8` (feat)
3. **Task 3: Document the attribution metadata contract, its extensibility path, and the Dashboard-visibility caveat** - `900defc` (docs)

**Plan metadata:** (pending — this commit)

## Load-Bearing Sandbox Verification

This is the phase's only proof that Square actually persists and returns the attribution metadata — every other gate in this phase asserts on a request body the app constructs itself.

**Setup:** started `npm run dev` locally with real `.env.local` Square Sandbox credentials (`SQUARE_ENV=sandbox`, `SQUARE_HOST=https://connect.squareupsandbox.com`) and the live Supabase active drop (`c152caa2-f31e-4779-9df0-bf33df4d6140`, "2026 September Drop"), then issued a real `POST /api/checkout` request (not a stub) with `attributionSourceCode: "ai"` and `attributionDetail: "ChatGPT"`:

```bash
curl -s -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "dropId": "c152caa2-f31e-4779-9df0-bf33df4d6140",
    "pickupOptionId": "4c1a29c7-bcc2-407d-9aff-5053980ec797",
    "customer": {
      "firstName": "Attribution",
      "lastName": "Verify",
      "email": "attribution-verify-260828@example.com",
      "attributionSourceCode": "ai",
      "attributionDetail": "ChatGPT"
    },
    "cart": [
      { "variationId": "TXDOELPK4D7CUBWJBNLVD3TB", "quantity": 1 }
    ]
  }'
```

Response:
```json
{"orderId":"mmnnj7wnLtBEci1iFz5DdA4bF8TZY","invoiceId":"inv:0-ChCHmQOsxLqOLs7cTiOt17KkEOQL","pickupNote":"Sandy Pickup - Sep 3"}
```

**Load-bearing command and output:**

```bash
$ npm run check:attribution -- mmnnj7wnLtBEci1iFz5DdA4bF8TZY

> big-matts-bbq@1.0.0 check:attribution
> node --env-file-if-exists=.env.local scripts/check-order-attribution.mjs mmnnj7wnLtBEci1iFz5DdA4bF8TZY

PASS: order mmnnj7wnLtBEci1iFz5DdA4bF8TZY carries attribution metadata.
attribution_source=ai
attribution_detail=ChatGPT
Reminder: this metadata is private to this application and will NOT appear in the Square Seller Dashboard.
```

`attribution_source=ai` matches the submitted **code** (not the label "ChatGPT or another AI", not any numeric id), and `attribution_detail=ChatGPT` matches the submitted free-text detail exactly. This confirms Square's real `RetrieveOrder` round-trips the metadata written inline on `CreateOrder`, closing the phase's one remaining manual-verification gap.

## Files Created/Modified

- `e2e/fixtures/attributionSources.ts` - 4 deterministic `AttributionSourceDTO` rows (`referral`, `facebook` — no detail; `ai`, `other` — require detail)
- `e2e/support/stubs.ts` - Added `stubAttributionSources()`, routing `**/api/attribution-sources`, same shape as `stubFrozenItems`; no existing export altered
- `e2e/checkoutFlow.spec.ts` - Added `stubAttributionSources` import and setup call to the existing "submitting checkout posts a valid body" test; added 5 new tests (D-06 detail-input reveal, D-07 stale-detail clearing, D-08 code+detail submission, D-04 no-attribution submission, D-02 confirmation-page regression)
- `scripts/check-order-attribution.mjs` - New standalone script: reads `orderId` from argv, `SQUARE_ACCESS_TOKEN`/`SQUARE_HOST` from env, calls `GET /v2/orders/{id}`, prints `PASS`/`NO ATTRIBUTION`/`FAIL` plus a Seller Dashboard invisibility reminder
- `package.json` - Added `"check:attribution": "node --env-file-if-exists=.env.local scripts/check-order-attribution.mjs"`
- `docs/checkout-attribution.md` - New 180-line doc: storage location, key naming/extensibility, Custom Attributes rejection rationale, Dashboard invisibility, reliability contract, D-10 residual-risk subsection, out-of-scope list, file map
- `README.md` - One-line pointer to `docs/checkout-attribution.md`

## Decisions Made

- The D-10 residual-risk documentation frames the guarantee as a **design-time** mitigation (Zod bounds + `buildAttributionMetadata()` byte-safety, both applied before the Square request is built) rather than a **runtime** one (there is no separable network call to isolate — metadata rides inline in the same `POST /v2/orders` that creates the order)
- E2E fixture data is intentionally hardcoded (4 rows) rather than sourced live from Supabase, keeping browser tests deterministic; the live list's correctness is instead proven by the load-bearing Sandbox verification against the real active drop and real Supabase `attribution_sources` table

## Deviations from Plan

### Acceptance Criteria Note (not a deviation — pre-existing plan/code discrepancy)

Task 1's acceptance criterion `grep -c "export async function" e2e/support/stubs.ts` returns 5 expected `5` (4 pre-existing + 1 new). The actual pre-existing file already had **5** exported functions (`stubFrozenItems`, `stubActiveDrop`, `stubCheckout`, `seedCart`, `hasActiveDrop`) — the plan's `<interfaces>` block listed only 4 of them (omitting `stubActiveDrop`, which predates this phase). The correct post-change count is **6**, confirmed by `grep -n "export async function\|export function"` showing all 6 functions with no existing helper removed or altered. This mirrors the same category of pre-existing plan/code count mismatch documented in 12-02-SUMMARY.md's "Acceptance Criteria Note."

No Rule 1-4 auto-fixes were needed — the plan's action specifications mapped directly onto the existing code shape.

## Issues Encountered

None. The load-bearing Sandbox verification succeeded on the first real attempt; no blocker was hit.

## Known Stubs

None — all deliverables are fully wired: the E2E tests exercise the real `CheckoutClient` UI and real submit payload construction (stubbing only network responses, per the existing E2E convention in this repo), the readback script calls the real Square API, and the documentation describes only shipped, non-aspirational behavior.

## Threat Flags

None — all new surface (the readback script's token handling, the documentation's content) was explicitly covered by this plan's own `<threat_model>` (T-12-11, T-12-12, T-12-13, T-12-SC) and verified: the script never echoes the access token (only HTTP status + first 500 chars of a failure body), and the doc was reviewed for secrets before commit (none found).

## User Setup Required

None - no new external service configuration required. Verified against the already-configured Square Sandbox credentials and Supabase active drop in `.env.local`.

## Next Phase Readiness

- Phase 12 (checkout-attribution-tracking) is now fully complete: all 5 plans shipped, all decisions D-01 through D-10 have automated or Sandbox-verified coverage
- `npm run check:attribution -- <orderId>` is available for any future manual spot-check of attribution data on a real order
- `docs/checkout-attribution.md` gives the next maintainer everything needed to extend the metadata contract (UTM/campaign/first-touch) without re-deriving the key-naming convention or the D-10 tradeoff reasoning
- No blockers

---
*Phase: 12-checkout-attribution-tracking*
*Completed: 2026-08-28*

## Self-Check: PASSED

All created files exist on disk (`e2e/fixtures/attributionSources.ts`, `scripts/check-order-attribution.mjs`, `docs/checkout-attribution.md`, this SUMMARY) and all referenced commit hashes (5cd0755, af5fcb8, 900defc) are present in git history.
