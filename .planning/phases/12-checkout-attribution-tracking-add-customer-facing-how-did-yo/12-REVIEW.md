---
phase: 12-checkout-attribution-tracking-add-customer-facing-how-did-yo
reviewed: 2026-08-28T21:49:07Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - app/api/attribution-sources/route.ts
  - app/api/checkout/route.ts
  - components/CheckoutClient.tsx
  - components/hooks/useAttributionSources.ts
  - docs/checkout-attribution.md
  - e2e/checkoutFlow.spec.ts
  - e2e/fixtures/attributionSources.ts
  - e2e/support/stubs.ts
  - lib/attributionSources.ts
  - lib/database.types.ts
  - lib/square.ts
  - lib/types.ts
  - package.json
  - README.md
  - scripts/check-order-attribution.mjs
  - tests/attributionMetadata.test.ts
  - tests/attributionSourcesRoute.test.ts
  - tests/checkoutLineItems.test.ts
  - tests/checkoutSlack.test.ts
findings:
  critical: 1
  warning: 2
  info: 3
  total: 6
status: fixed
fixed: 2026-08-28
fix_commit: 1e62173
---

# Phase 12: Code Review Report

**Reviewed:** 2026-08-28T21:49:07Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** fixed (commit `1e62173`)

## Resolution

- **CR-01 (Critical) — FIXED.** `attributionSourceCode`/`attributionDetail`
  removed from `checkoutSchema`'s blocking Zod object. A new
  `sanitizeAttribution()` in `app/api/checkout/route.ts` applies the real
  bounds *after* the checkout payload has already validated, logging and
  dropping (never blocking) on failure. `tests/checkoutLineItems.test.ts`
  Tests 8–10 rewritten to assert graceful degradation (200 + order created,
  attribution silently omitted) instead of the previous 400.
- **WR-01 (Slack mrkdwn injection) — FIXED.** Added `escapeSlackText()` in
  `app/api/checkout/route.ts`; `attributionLabel`/`attributionDetail` are now
  escaped before interpolation into the Slack message. New regression test
  in `tests/checkoutSlack.test.ts` (Test 7).
- **IN-01 (stale README Square version) — FIXED.** README now points to the
  `SQUARE_VERSION` constant instead of restating the value.
- **IN-03 (missing URL-encoding in dev script) — FIXED.** `orderId` now
  passed through `encodeURIComponent()` in `scripts/check-order-attribution.mjs`.
- **WR-02 (hardcoded detail-label map) — NOT FIXED, accepted.** CONTEXT.md's
  discuss-phase decisions explicitly left the source-to-label mapping to
  "Claude's Discretion" as long as it matched the user's worked examples;
  the hardcoded map is a deliberate, in-scope choice, not an oversight.
  Documented as a follow-up if the source list grows.
- **IN-02 (`useAttributionSources.reload` unused) — NOT FIXED, deferred.**
  Wiring a retry affordance is a UX enhancement beyond this phase's scope;
  noted as a recommended follow-up.

Full suite after fixes: `npm run test` 275/275 passing, `npx tsc --noEmit`
clean.

## Summary

The byte-safe truncation logic in `lib/square.ts` (`truncateToByteLimit` /
`buildAttributionMetadata`) is correct: it caps the initial codepoint slice at
`limit` (a provably safe upper bound since every UTF-8 codepoint is at least
1 byte), then trims one codepoint at a time until the UTF-8 byte length is
within Square's limit. It never produces a truncated multi-byte sequence and
never throws on non-string input — this matches the unit tests
(`tests/attributionMetadata.test.ts`) including the emoji/CJK boundary cases.

However, the phase's stated "core reliability requirement" — that a bad
attribution value must never fail the checkout itself — is **not actually
met**. The Zod schema at `POST /api/checkout` validates `attributionSourceCode`
and `attributionDetail` as part of the *same* schema as the rest of the
checkout payload, so a value that fails those bounds returns a 400 for the
**entire** request (order, invoice, customer — everything), before Square is
ever contacted. `tests/checkoutLineItems.test.ts` (Test 8–10) explicitly
proves this happens. The only thing keeping this theoretical is that the UI
always sources `attributionSourceCode` from `GET /api/attribution-sources`
(Supabase `attribution_sources.code`), and nothing in the reviewed code
verifies that Supabase-managed codes actually satisfy the checkout schema's
charset/length constraints before they're surfaced in the dropdown. See CR-01.

One additional injection-adjacent issue (unsanitized free text forwarded to
Slack) and a few maintainability/documentation gaps round out the findings
below.

## Critical Issues

### CR-01: A malformed attribution value can fail the entire checkout, not just attribution

**File:** `app/api/checkout/route.ts:97-117` (schema), `:151-156` (400 response), `lib/attributionSources.ts:6-26` (`fetchActiveAttributionSources`)
**Issue:**
`checkoutSchema` validates `attributionSourceCode` and `attributionDetail` as
part of the single Zod object that also validates `dropId`, `customer`,
`cart`, etc.:

```ts
attributionSourceCode: z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(/^[a-zA-Z0-9_-]+$/)
  .optional(),
attributionDetail: z.string().trim().max(255).optional()
```

If either field fails validation, `checkoutSchema.safeParse(body)` fails and
the route returns a blanket 400 (`"Invalid checkout payload."`) **before any
Square call, before capacity is reserved, before anything** — the customer
cannot check out at all. `tests/checkoutLineItems.test.ts` Test 8 ("invalid
characters"), Test 9 ("longer than 60 chars"), and Test 10 (detail "longer
than 255 chars") all explicitly assert `response.status === 400` and
`createOrderMock` not called — i.e. the test suite documents and locks in
this exact behavior.

`docs/checkout-attribution.md` §5 states this outcome plainly ("Out-of-bounds
input is rejected with a 400 before any Square call is made") and then
reframes D-10 ("attribution must never fail a checkout") to only cover
*post-order* persistence failures, arguing the pre-Square 400 is out of
scope. That's a documentation rationalization, not a fix: from the
customer's perspective, a bad attribution value **does** fail their checkout
— the literal requirement in the phase brief.

The trigger is entirely plausible in production: `fetchActiveAttributionSources()`
(`lib/attributionSources.ts:6-26`) reads `code` straight from Supabase with
no format check, and nothing enforces (in any file reviewed here) that
`attribution_sources.code` conforms to `^[a-zA-Z0-9_-]{1,60}$`. Per the
design doc itself, "the source list can change without a deploy" — i.e. a
non-engineer can add a row via Supabase Studio with a code containing a
space, apostrophe, emoji, or >60 characters (e.g. "Friend's referral"), and
every customer who then picks that option from the dropdown will have their
entire order rejected with a generic "Invalid checkout payload" error.

**Fix:** Decouple attribution from the fail-closed part of the schema so a
bad value degrades to "no attribution" instead of blocking checkout, e.g.:

```ts
// Validate attribution leniently and separately; never let it block checkout.
const attributionCodeResult = z
  .string().trim().min(1).max(60).regex(/^[a-zA-Z0-9_-]+$/)
  .safeParse(body?.customer?.attributionSourceCode);
const attributionDetailResult = z
  .string().trim().max(255)
  .safeParse(body?.customer?.attributionDetail);

const safeCustomer = {
  ...parsedCustomerWithoutAttribution,
  attributionSourceCode: attributionCodeResult.success ? attributionCodeResult.data : undefined,
  attributionDetail: attributionDetailResult.success ? attributionDetailResult.data : undefined
};
```

and/or filter `fetchActiveAttributionSources()` results (or add a DB `CHECK`
constraint on `attribution_sources.code`) so the dropdown can never offer a
value that the checkout schema will reject.

## Warnings

### WR-01: Unsanitized `attributionDetail` free text is forwarded verbatim into the Slack webhook message

**File:** `app/api/checkout/route.ts:47-77` (`notifySlackNewOrder`), specifically line 64
**Issue:** `attributionDetail` is customer-entered free text (up to 255
chars, no charset restriction — unlike `attributionSourceCode` it has no
`.regex()`), and it's interpolated directly into the Slack message `text`:

```ts
...(attributionLabel
  ? [`Heard about us: ${attributionLabel}${attributionDetail ? ` (${attributionDetail})` : ""}`]
  : []),
```

Slack Incoming Webhooks interpret `text` as mrkdwn by default, where
`<!channel>`, `<!here>`, `<@USERID>`, and `<url|label>` are all special
sequences. A customer typing `<!channel> check this out <http://evil.example|here>`
into the "Tell us more" box gets that rendered live in the team's Slack
channel — an unauthenticated, low-effort way to ping the whole channel or
plant a deceptive link in an internal notification.
**Fix:** Escape Slack mrkdwn special characters before interpolating
user-controlled text into the message (`&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`),
e.g.:

```ts
function escapeSlackText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
// ...
`Heard about us: ${attributionLabel}${attributionDetail ? ` (${escapeSlackText(attributionDetail)})` : ""}`
```

### WR-02: Client-side detail-label copy is hardcoded against Supabase-managed codes

**File:** `components/CheckoutClient.tsx:18-24, 154-155`
**Issue:**

```ts
const ATTRIBUTION_DETAIL_LABELS: Record<string, string> = {
  ai: "Which AI? (optional)",
  event: "Which event? (optional)",
  other: "Tell us more (optional)"
};
```

`docs/checkout-attribution.md` states the source list "can change without a
deploy" via Supabase. If an operator adds a new `requires_detail: true` row
(e.g. `podcast`) without a matching frontend deploy, the UI silently falls
back to the generic label — not incorrect, but it's a hidden coupling
between a DB-editable list and a hardcoded frontend map, with no test or
runtime warning when they drift. `showAttributionDetail` itself is correctly
data-driven (`selectedAttributionSource?.requiresDetail`), so only the
*label* is affected, but this is exactly the kind of silent drift the
architecture doc says it's designed to avoid.
**Fix:** Either move detail-input labels into the Supabase row (e.g. a
`detail_label` column returned by `AttributionSourceDTO`) or drop the
per-code map entirely and always use the generic fallback label.

## Info

### IN-01: README documents a stale Square API version

**File:** `README.md:44`
**Issue:** README states `Square-Version: 2024-12-18`, but
`lib/square.ts:3` pins `SQUARE_VERSION = "2026-04-21"`. Since
`docs/checkout-attribution.md` explicitly calls out re-checking
`Order.metadata`'s `x-release-status` "before any Square API version bump
past the pinned `2026-04-21`," a reader trusting the README's stale value
could look at the wrong version's release notes.
**Fix:** Update the README line to reference `lib/square.ts`'s
`SQUARE_VERSION` constant instead of restating the value, or update the
literal string to match.

### IN-02: `useAttributionSources`'s `reload` is never called

**File:** `components/hooks/useAttributionSources.ts:38-41`, `components/CheckoutClient.tsx:34`
**Issue:** The hook exposes `reload`, but `CheckoutClient` destructures only
`sources` and `error`. If Supabase is transiently unavailable when the
checkout page first loads, `attributionSourcesError` is set once and the
"How did you hear about us?" section disappears for the rest of that page
load — there's no retry affordance wired up, even though the hook already
supports one.
**Fix:** Either wire a "Retry" action to `reload()` next to the hidden
section, or remove the unused export if retry isn't planned.

### IN-03: `orderId` not URL-encoded in the attribution readback script

**File:** `scripts/check-order-attribution.mjs:44`
**Issue:** `` fetch(`${host}/v2/orders/${orderId}`, ...) `` interpolates the
CLI argument directly without `encodeURIComponent`. Low risk since this is a
locally invoked developer/ops tool reading `process.argv[2]`, but a
malformed argument produces a broken request path instead of a clear
"invalid order id" error.
**Fix:** `` fetch(`${host}/v2/orders/${encodeURIComponent(orderId)}`, ...) ``

---

_Reviewed: 2026-08-28T21:49:07Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
