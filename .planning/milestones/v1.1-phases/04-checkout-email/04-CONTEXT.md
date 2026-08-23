# Phase 4: Checkout & Email — Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Save orders to Supabase, pre-reserve capacity slots atomically before Square API calls (ORD-01), save a full cart snapshot to the `orders` table (ORD-02), use deterministic idempotency keys (ORD-03), and add mailing list opt-in at checkout (MAIL-04).

No Resend integration in this phase — MAIL-01 (branded confirmation email) has been dropped from the v1.0 milestone. Square's invoice email via `publishInvoice` is sufficient for MVP. Resend setup will happen in Phase 5 when mailing list broadcast (MAIL-06) is needed.

</domain>

<decisions>
## Implementation Decisions

### Checkout Transaction Sequence (ORD-01)

- **D-01:** The checkout sequence is: Validate → Reserve slots → Square customer upsert → Square order → Square invoice → Publish invoice → Save order to Supabase → Return success.
- **D-02:** If any Square API call fails after a successful reservation, call `release_pickup_slot` in the catch block and return a 500 error to the client. Reservation is cleaned up automatically — no leaked capacity.
- **D-03:** If the Supabase order save fails after `publishInvoice` succeeds, log the error and return success (fire-and-forget). The customer already has a valid Square invoice; failing the checkout at this point creates a confusing experience. Mirrors Phase 3 D-02 intent.

### Order Save (ORD-02)

- **D-04:** The Supabase `orders` record is created after `publishInvoice` succeeds. The record is populated with: `drop_id`, `pickup_option_id`, `customer_email`, `customer_name`, `square_order_id`, `square_invoice_id`, and `cart_snapshot` (JSONB).
- **D-05:** The `cart_snapshot` JSONB contains: items with `variationId`, `productName`, `quantity`, and unit price in cents; plus the estimated order total in cents. Drop ID and pickup option ID are already top-level FK columns in the schema — they do not need to be duplicated in the JSONB.

### Deterministic Idempotency Keys (ORD-03)

- **Claude's Discretion:** Choose a hash-based derivation from a stable combination of order inputs (e.g., email + dropId + pickupOptionId + sorted cart fingerprint) for Square API idempotency keys. This replaces the current `crypto.randomUUID()` approach. Goal: same logical order submitted twice yields the same key, preventing duplicate Square orders on client retry.

### Mailing List Opt-in (MAIL-04)

- **D-06:** Opt-in checkbox near the email field in the checkout form, unchecked by default. This is an explicit opt-in — no dark patterns.
- **D-07:** Label text is Claude's discretion (something like "Notify me about future drops").
- **D-08:** If the customer's email is already in `mailing_list`, use `INSERT ... ON CONFLICT DO NOTHING` — silently skip, no error, no duplicate row.
- **D-09:** Mailing list insert happens as fire-and-forget alongside the order save. A failure to record the opt-in does not fail the checkout.

### MAIL-01 Scope Change

- **D-10:** MAIL-01 (branded Resend confirmation email) is **dropped from v1.0**. The Square invoice email covers customer confirmation for MVP. This eliminates any Resend setup in Phase 4.

### Claude's Discretion

- Deterministic idempotency key hash algorithm and input selection
- Exact shape of cart_snapshot JSONB (field names, nesting)
- Mailing list checkbox label text and placement within CheckoutClient form
- Log message text for reservation success/failure, order save failure, mailing list insert failure
- Sequential vs Promise.allSettled for per-product reservation calls (sequential is fine for MVP given 2 products)
- Rollback call (`release_pickup_slot`) signature — same product grouping logic as Phase 3 (group by productName, aggregate quantities)

</decisions>

<deferred>
## Deferred Ideas

- MAIL-01: Branded Resend confirmation email — dropped from v1.0. Future enhancement after MVP ships.
- Email logs table (`email_logs` in Supabase) — schema exists but unused in Phase 4; relevant when Resend is integrated.

</deferred>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Spec
- `public/PRD.pdf` — Approved PRD for MVP build
- `.planning/PROJECT.md` — Project context, constraints, key decisions
- `.planning/REQUIREMENTS.md` — ORD-01, ORD-02, ORD-03, MAIL-04 are this phase's requirements

### Prior Phase Context
- `.planning/phases/01-foundation/01-CONTEXT.md` — Capacity model (D-01–D-10); `reserve_pickup_slot` and `release_pickup_slot` RPC design; server-only Supabase client decision
- `.planning/phases/03-capacity-enforcement/03-CONTEXT.md` — D-04/D-05/D-06: productName values (`pulled_pork`, `brisket`), Zod cartSchema productName field, grouping logic for RPC calls; D-02: fire-and-forget pattern for post-invoice failures

### Schema
- `supabase/migrations/0001_foundation.sql` — Live schema for `orders`, `mailing_list`, `email_logs` tables; `reserve_pickup_slot` and `release_pickup_slot` RPC signatures

### Existing Checkout Code
- `app/api/checkout/route.ts` — Current checkout handler; pre-reservation replaces the post-publishInvoice call added in Phase 3
- `components/CheckoutClient.tsx` — Checkout form; mailing list opt-in checkbox added here
- `lib/square.ts` — Square API client; idempotency key usage pattern
- `lib/idempotency.ts` — Current random UUID idempotency key; to be replaced with deterministic approach
- `lib/supabase.ts` — Supabase client; order and mailing list inserts go here or in a new lib module

</canonical_refs>
