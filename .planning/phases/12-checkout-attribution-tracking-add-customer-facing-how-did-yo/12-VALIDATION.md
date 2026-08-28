---
phase: 12
slug: checkout-attribution-tracking
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-28
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.0.18 (unit) + Playwright ^1.62.1 (E2E) |
| **Config file** | `vitest.config.ts` (environment: `node`, include: `tests/**/*.test.ts`) |
| **Quick run command** | `npx vitest run tests/<file>.test.ts` |
| **Full suite command** | `npm run test` (unit) / `npm run test:e2e -- checkoutFlow` (E2E) |
| **Estimated runtime** | ~10s unit / ~30-60s E2E (existing checkout spec baseline) |

---

## Sampling Rate

- **After every task commit:** Run the targeted `npx vitest run tests/<file>.test.ts` for the file(s) touched
- **After every plan wave:** Run `npm run test` (full Vitest suite)
- **Before `/gsd:verify-work`:** `npm run test` green + `npm run test:e2e -- checkoutFlow` pass
- **Max feedback latency:** ~60 seconds (E2E run is the slowest step)

---

## Per-Task Verification Map

> This repo has no `REQUIREMENTS.md`; CONTEXT.md's decision IDs (D-01 … D-10) are used as the requirement anchor per RESEARCH.md's Phase Requirements → Test Map. Plan/Wave/Task columns are filled in once `gsd-planner` assigns concrete task IDs — this table pre-registers the requirement-to-test mapping the planner must honor.

| Requirement | Secure/Expected Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|---------------------------|-----------|--------------------|-------------|--------|
| D-10 | Malformed/oversized attribution value never causes `createOrder`/checkout to fail | unit | `npx vitest run tests/attributionMetadata.test.ts` | ❌ Wave 0 | ⬜ pending |
| D-08 | `createOrder` receives `metadata.attribution_source = code` (never `label`/`id`) when a source is selected | unit | `npx vitest run tests/checkoutLineItems.test.ts` (extend) | ✅ extend existing | ⬜ pending |
| — | `metadata` key omitted entirely from order body when no attribution selected | unit | same file as above | ✅ extend existing | ⬜ pending |
| D-01 | Slack message includes `Heard about us: <label>` (+ detail) when present, omits line when absent | unit | `npx vitest run tests/checkoutLineItems.test.ts` or new `tests/checkoutSlack.test.ts` | ❌ Wave 0 (or extend) | ⬜ pending |
| D-04, D-09 | `GET /api/attribution-sources` failure degrades gracefully — dropdown hidden, checkout still submits | unit (route) + manual/E2E | `npx vitest run tests/attributionSourcesRoute.test.ts` | ❌ Wave 0 | ⬜ pending |
| D-06, D-07 | Selecting a `requires_detail` source shows contextual detail input; switching away clears stale detail before submit | E2E | `npm run test:e2e -- checkoutFlow` (extend) | ❌ Wave 0 (extend `e2e/checkoutFlow.spec.ts`) | ⬜ pending |
| D-02 | `/confirmation` renders unchanged (no attribution acknowledgment) | manual / existing E2E regression | `npm run test:e2e -- checkoutFlow` | ✅ regression-only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/attributionMetadata.test.ts` — unit tests for `buildAttributionMetadata()` (D-10: truncation, undefined-key omission, no-throw on garbage input)
- [ ] `tests/attributionSourcesRoute.test.ts` — mirrors `tests/checkoutLineItems.test.ts` mocking style for the new `GET /api/attribution-sources` route
- [ ] Extend `tests/checkoutLineItems.test.ts` (or add `tests/checkoutAttribution.test.ts`) — asserts `metadata` shape on the `createOrder` call body, and the Slack message line (D-01)
- [ ] Extend `e2e/checkoutFlow.spec.ts` — dropdown selection, conditional detail field show/hide, and detail-clearing-on-switch (D-06/D-07)
- [ ] Confirm live `attribution_sources` schema (column types) before finalizing `lib/database.types.ts` edits (RESEARCH.md Open Question 1)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| Stored Square value can be retrieved via Square's API after a real Sandbox checkout | D-10 / phase goal | Requires a live Square Sandbox order + `RetrieveOrder` call; not practical as an automated CI assertion given external API dependency | Run a Sandbox checkout with an attribution selection, then `GET /v2/orders/{order_id}` (or via `lib/square.ts` helper in a scratch script) and confirm `order.metadata.attribution_source` / `attribution_detail` match what was submitted |
| Attribution write failure does not strand or fail an otherwise-valid checkout | D-10 | Requires simulating a Square-side failure specifically on the attribution path without breaking the whole `createOrder` call — best verified by code review of `buildAttributionMetadata()`'s no-throw guarantee plus the Wave 0 unit tests, not a live failure injection | Code review: confirm `buildAttributionMetadata()` cannot throw and Zod bounds are enforced before the value reaches Square; unit test coverage substitutes for live failure injection |

---

## Validation Sign-Off

- [x] All requirements have an automated verify path or an explicit Wave 0 dependency
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (all D-IDs above have a unit or E2E automated command)
- [x] Wave 0 covers all MISSING references (5 items above)
- [x] No watch-mode flags in any command
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
