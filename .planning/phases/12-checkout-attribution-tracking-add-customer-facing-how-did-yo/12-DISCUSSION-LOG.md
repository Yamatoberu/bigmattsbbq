# Phase 12: Checkout Attribution Tracking - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-28
**Phase:** 12-checkout-attribution-tracking
**Areas discussed:** Slack notification enrichment, Confirmation page acknowledgment, Field placement in checkout UI

---

## Slack notification enrichment

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, include it | Add a line like "Heard about us: ChatGPT or another AI (ChatGPT)" to the existing Slack message. Cheap, reuses an existing non-blocking pattern, no new failure surface. | ✓ |
| No, Square only | Keep the Slack message unchanged. Attribution only visible by querying Square later. | |

**User's choice:** Yes, include it (recommended option)
**Notes:** Reuses the existing `notifySlackNewOrder` fire-and-forget pattern in `app/api/checkout/route.ts` — no new failure surface.

---

## Confirmation page acknowledgment

| Option | Description | Selected |
|--------|-------------|----------|
| No acknowledgment | Keep confirmation page unchanged — attribution is silent backend metadata. | ✓ |
| Small thank-you note | Show "Thanks for letting us know how you found us!" on the confirmation page when an answer was given. | |

**User's choice:** No acknowledgment (recommended option)
**Notes:** Matches the user's "don't add unnecessary friction" guidance.

---

## Field placement in checkout UI

| Option | Description | Selected |
|--------|-------------|----------|
| In the customer form | Add as the last field in the existing customer-info form, after phone, before submit. | ✓ |
| Separate section | Give it its own card/section elsewhere on the checkout page. | |

**User's choice:** In the customer form (recommended option)
**Notes:** Consistent with how `phone` (also optional) is already handled in the same form.

---

## Claude's Discretion

- Exact Square persistence mechanism (Order Custom Attributes vs. Order `metadata` field vs. other) — deferred to the phase's mandatory research step.
- Sync-vs-async lifecycle for the Square attribution write.
- Exact dropdown/detail-input styling, consistent with existing form field styling.
- Depth of server-side validation of the submitted `code` against live Supabase rows.

## Deferred Ideas

- Automatic UTM attribution, Meta campaign IDs, email campaign attribution, first-touch acquisition reporting, Square-to-Supabase analytics — all explicitly out of scope per the user's original spec, noted for future phases.
- `public.orders` table remains unused — explicitly forbidden to resurrect for this phase.
