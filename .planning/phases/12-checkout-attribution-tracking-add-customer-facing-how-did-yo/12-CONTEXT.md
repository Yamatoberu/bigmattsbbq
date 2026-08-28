# Phase 12: Checkout Attribution Tracking - Context

**Gathered:** 2026-08-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a customer-facing "How did you hear about us?" question to the existing checkout flow. The choice list is owned by Supabase (`public.attribution_sources`, already created — id, code, label, is_active, sort_order, requires_detail; RLS allows anon/authenticated SELECT of active rows only). The selected `code` (+ optional free-text `detail` when `requires_detail = true`) must be persisted against the Square order using whichever currently-supported Square mechanism research determines is correct — Square remains the system of record for the order. Attribution is best-effort metadata: it must never cause a valid checkout/payment to fail. No new Supabase orders/customer table; `public.attribution_sources` is read-only config data for this phase.

</domain>

<decisions>
## Implementation Decisions

### Slack notification enrichment
- **D-01:** Append the attribution answer to the existing fire-and-forget `notifySlackNewOrder` Slack message in `app/api/checkout/route.ts` (e.g. a line like `Heard about us: <label>` and, if present, `(<detail>)`), in addition to writing it to Square. Reuses an existing non-blocking pattern — no new failure surface, gives Big Matt immediate visibility without querying Square.

### Confirmation page
- **D-02:** No acknowledgment of the attribution answer on `/confirmation`. Keep that page unchanged — attribution is silent backend/reporting metadata, not part of the customer-facing success message.

### Field placement in checkout UI
- **D-03:** Add the "How did you hear about us?" dropdown as the last field in the existing single customer-info form in `components/CheckoutClient.tsx` (after `phone`, before the submit button) — consistent with how the other optional field (`phone`) is already handled in that same form. Not a separate section/card.

### Field behavior (from user's original spec — locked, not re-discussed)
- **D-04:** Optional. No selection is a valid submission (matches the existing `phone` optional-field pattern already in `checkoutSchema`).
- **D-05:** Dropdown/select control, not radio buttons — "compact control" per user spec.
- **D-06:** Detail field is a single-line optional text input, shown only when the selected option's `requires_detail = true`. Label text is contextual to the selection (e.g. "Which AI? (optional)", "Which event? (optional)", and "Tell us more (optional)" for `other`) — placeholder copy can generically read `{label} — tell us more (optional)` unless the researcher/planner finds cleaner per-code copy warranted; exact source-to-label mapping is Claude's discretion at implementation time as long as it matches the spirit of the user's three worked examples.
- **D-07:** Switching from a `requires_detail` option to a non-`requires_detail` option must clear (or ignore) any stale detail text already typed — it must not be submitted alongside a source that doesn't call for it.
- **D-08:** The dropdown shows `label` to the customer; the value sent to the backend is the stable `code`, never the numeric `id`.
- **D-09:** A Supabase read failure for `attribution_sources` must degrade gracefully — hide the question entirely, do not block or error the checkout page.
- **D-10:** A failure to persist attribution to Square (after order/payment otherwise succeeded) must not fail the checkout response to the customer — log it (via the existing `logError` pattern in `lib/logger.ts`) and move on.

### Claude's Discretion
- Exact Square persistence mechanism (Order Custom Attributes vs. Order `metadata` field vs. another currently-supported approach) — this is what the phase's research step must determine and document; do not assume Order Custom Attributes are correct without verifying against current Square docs and this repo's existing Square API version (`SQUARE_VERSION = "2026-04-21"` in `lib/square.ts`).
- Whether the Square attribution write happens synchronously (awaited, but caught/isolated so it can't fail checkout) inside `POST /api/checkout`, or asynchronously fire-and-forget like `notifySlackNewOrder` — pick whichever fits the chosen Square mechanism's lifecycle (e.g., if attribution can only be attached after order creation via a follow-up call, mirror the Slack notification's non-blocking pattern).
- Exact wording/styling of the dropdown and detail input, consistent with existing form field styling in `CheckoutClient.tsx`.
- Whether server-side validation of the submitted `code` cross-checks against live Supabase active rows, or just sanitizes shape (non-empty string, reasonable max length) — dynamic list makes strict enum validation impractical; use judgment consistent with `checkoutSchema`'s existing Zod patterns.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### This phase's source spec
- Full feature spec was provided directly by the user in the session that created this phase (not a separate file) — the phase-add description and this CONTEXT.md together capture all requirements, reliability constraints, and documentation deliverables from that spec. No separate SPEC.md/PRD file exists for Phase 12.

### Square integration (existing)
- `lib/square.ts` — all Square API calls are centralized here; `SQUARE_VERSION = "2026-04-21"` pinned at top; add any new Square calls (order attribute/metadata read+write) here, not inline in the route.
- `app/api/checkout/route.ts` — where the Square order (`createOrder`) and invoice (`createInvoice`, `publishInvoice`) are created; this is the integration point for attribution persistence.
- `lib/env.ts` — `getSquareEnv()` validates required Square env vars; add any new required var here if the research phase determines one is needed (e.g., a custom attribute definition key/scope).

### Supabase integration (existing)
- `lib/supabase.ts` — server-only Supabase singleton using `SUPABASE_SERVICE_ROLE_KEY`; **only import from API routes**, never from client components. No client-side (anon-key) Supabase usage exists anywhere in the codebase today — this phase should not introduce the first one.
- `.env.example` — documents all current env vars; append the Supabase section if anything new is needed (unlikely — `attribution_sources` reads reuse existing Supabase env vars).

### No external ADRs/specs beyond the above — requirements fully captured in decisions above plus the original user spec from this session.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/hooks/useFrozenItems.ts` — the established hook pattern for "fetch from a `GET /api/*` route, expose `{items, isLoading, error}`, no-store cache" — the researcher/planner should model a new `useAttributionSources` hook on this exact shape (state shape: `{sources: AttributionSourceDTO[], isLoading, error}`).
- `app/api/frozen-items/route.ts` — the established pattern for a thin `GET` API route that calls a `lib/` function and returns normalized JSON; model a new `GET /api/attribution-sources` route on this.
- `lib/logger.ts` (`logError`, `logInfo`) — reuse for logging attribution persistence failures without throwing.
- `notifySlackNewOrder` in `app/api/checkout/route.ts` — existing fire-and-forget (`.catch()`, not awaited) notification pattern; both the D-01 Slack enrichment and possibly the Square attribution write (if async) should follow this exact non-blocking shape.

### Established Patterns
- All Square API calls go through `lib/square.ts`; routes never call Square directly (per `CLAUDE.md` architecture rules — must be preserved).
- Zod `safeParse` (never `.parse()`) at every API boundary; invalid payloads return 400 with `{ error, requestId }`. New `attributionSourceCode`/`attributionDetail` fields on `checkoutSchema` should be `.optional()`, following the same optionality as `customer.phone`.
- `getSupabaseClient()` is service-role and server-only — a new `/api/attribution-sources` route follows the same server-only access pattern already used for `drops`/`drop_pickup_options` queries in `app/api/checkout/route.ts` and `lib/drops.ts`.
- Every API route generates/propagates `x-request-id` and calls `logError(message, error, requestId)` on failure.

### Integration Points
- `components/CheckoutClient.tsx` — single customer-info `<form>` (firstName, lastName, email, phone) submitted to `POST /api/checkout`; attribution dropdown + conditional detail input insert here, in `formState`, right after `phone`.
- `app/api/checkout/route.ts` — `checkoutSchema` (add optional attribution fields), the `createOrder` call (attach or prepare attribution data here or in a follow-up call depending on research), and `notifySlackNewOrder` (append attribution line per D-01).
- New file likely needed: `app/api/attribution-sources/route.ts` (GET, Supabase-backed) + `components/hooks/useAttributionSources.ts` (or similar), per the reusable patterns above.

</code_context>

<specifics>
## Specific Ideas

- Detail-field label copy should read naturally per source, e.g.: `ai` → "Which AI? (optional)"; `event` → "Which event? (optional)"; `other` → "Tell us more (optional)". These are the user's own worked examples and should be followed closely rather than genericized, unless a per-code copy field doesn't exist in Supabase — in which case Claude's discretion applies (see Decisions → Claude's Discretion).
- Structured Square storage is required — e.g. `source = ai`, `detail = ChatGPT` as separate structured values, never a single concatenated human-readable string.
- Design must not "paint into a corner" for future UTM/Meta/email-campaign/first-touch attribution work — those are explicitly out of scope for this phase, but the chosen Square storage approach and any key naming should be documented so it's extensible later without a rework.

</specifics>

<deferred>
## Deferred Ideas

- Automatic UTM attribution capture — explicitly out of scope per user; future phase.
- Meta campaign ID capture — explicitly out of scope; future phase.
- Email campaign attribution — explicitly out of scope; future phase.
- Customer first-touch acquisition reporting / Square-to-Supabase analytics reporting — explicitly out of scope; future phase.
- Resurrecting/using `public.orders` in Supabase — explicitly forbidden for this phase per user instruction; Square remains sole system of record for orders.

None — discussion stayed within phase scope beyond the above explicitly-deferred items called out by the user.

</deferred>

---

*Phase: 12-checkout-attribution-tracking*
*Context gathered: 2026-08-28*
