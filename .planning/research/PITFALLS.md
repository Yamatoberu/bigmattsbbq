# Domain Pitfalls

**Domain:** Frozen BBQ e-commerce — limited-run drops with hybrid Square + Supabase architecture
**Researched:** 2026-04-03
**Confidence:** HIGH (codebase directly inspected; pitfalls derived from actual code + known behavioral properties of each technology)

---

## Critical Pitfalls

Mistakes that cause overselling, data loss, silent failures, or require rewrites.

---

### Pitfall 1: Dual Inventory Sources Diverge Under Load

**What goes wrong:** The project correctly keeps Square as the inventory source of truth, but the Supabase `drops` table will carry a `capacity` field (total seats for a drop). If any code ever enforces capacity from both sources simultaneously — or if the capacity concept drifts to mean different things in each system — you end up with two competing sources of truth and silent overselling.

The existing codebase already has this problem in embryonic form: Square inventory is not decremented on order placement (see CONCERNS.md). Once Supabase drop capacity is added, there will be *two* unenforced numbers: Square inventory per-variation and Supabase capacity per-drop. They measure different things (per-item stock vs. per-drop seats), which is fine — but any enforcement logic must be explicit about which one it's checking for which purpose.

**Why it happens:** Teams add Supabase capacity tracking to solve the overselling problem, then discover Square inventory was never wired to decrement either. They try to fix both at once and race-condition logic ends up split across two systems with neither being fully authoritative.

**Consequences:**
- Customers complete checkout when no pickup slots remain
- Per-item inventory and per-drop capacity fall out of sync
- Rollback logic becomes ambiguous (which system to roll back?)

**Prevention:**
- Define capacity enforcement architecture before writing any code: Supabase `drops.slots_remaining` is the gate for whether a drop is open; Square inventory is the gate for whether an individual item is in stock. Enforce them independently — do not combine them into a single check.
- Use a Postgres function with `FOR UPDATE` row locking to decrement `slots_remaining` atomically. Never do a read-then-write from application code.
- Keep Square inventory decrement as a fire-and-forget best-effort step after the Supabase reservation succeeds. If Square decrement fails, log it and alert — but do not block the customer's order.

**Warning signs:**
- Any route handler that reads capacity from Supabase *and* inventory from Square in the same conditional
- `slots_remaining` decremented in JavaScript rather than inside a Postgres function
- No database test proving the atomic decrement blocks concurrent requests

**Phase:** Supabase schema + drops model (Phase 1 of the milestone)

---

### Pitfall 2: Supabase Anon Key Exposed to the Browser Allows Direct Table Writes

**What goes wrong:** Supabase provides an `anon` key that is safe to include in client-side code *only* if Row Level Security (RLS) is properly configured. Without RLS, any visitor can call the Supabase REST API directly (bypassing your Next.js API routes entirely) and insert, update, or delete rows in any table.

For this project, the two tables most exposed are:
- `mailing_list` — anyone can mass-insert fake emails
- `orders` — anyone can insert fake order records or delete real ones

The default Supabase project has RLS disabled on all tables. Forgetting to enable it before using the anon key in the browser is one of the most common Supabase production mistakes.

**Why it happens:** RLS is not enforced during local development against the service role key. Everything works fine in dev. The anon key is then copied into the frontend `.env.local` and it works there too — because RLS is off. The bug is invisible until someone discovers the open endpoint.

**Consequences:**
- Mailing list filled with spam addresses that corrupt Resend recipient quality
- Fake order rows corrupt drop capacity counts
- `drops` table capacity can be zeroed out by a malicious actor, taking down the drop

**Prevention:**
- Enable RLS on every table immediately when creating it — before writing any application code against it.
- For `mailing_list`: `INSERT` allowed for anon (public signup is intentional), `SELECT/UPDATE/DELETE` denied for anon.
- For `orders`, `drops`, `email_logs`: no anon access at all. All writes go through Next.js API routes using the Supabase service role key (server-side only).
- Never put the Supabase service role key in `NEXT_PUBLIC_` variables.
- Write a Supabase RLS test (using `anon` role) in the migration file that proves the policy before merging.

**Warning signs:**
- Any Supabase client initialized with `NEXT_PUBLIC_SUPABASE_ANON_KEY` used in an API route that writes to sensitive tables
- `supabase.from('orders').insert(...)` called from a client component
- No RLS policies visible in the Supabase dashboard for any table

**Phase:** Supabase schema setup (very first step — must be done before any table is created)

---

### Pitfall 3: Checkout Creates Square Objects Before Recording the Supabase Order

**What goes wrong:** The existing checkout flow creates three Square objects in sequence: customer, order, invoice. When Supabase order recording is added, the temptation is to insert the Supabase order *after* the Square invoice is published (because that's where success is confirmed). This means:

1. Square order created
2. Square invoice created and published
3. Supabase `orders` insert fails (network error, constraint violation, schema mismatch)
4. Customer has a real Square invoice in their inbox, no record exists in Supabase, and drop `slots_remaining` was never decremented

The customer is confirmed in Square but invisible to the system's drop capacity logic.

**Why it happens:** The natural instinct is "write to Supabase after success." But "success" from Square's perspective is not the same as the system's success.

**Consequences:**
- Drop oversells because capacity was never decremented
- Customer is confirmed but not visible in any orders query
- Admin has no record of the order for pickup management

**Prevention:**
- Write the Supabase order record (and decrement `slots_remaining`) *before* calling Square. Use the Supabase record as the reservation. If the Square step fails afterward, the Supabase record becomes a "pending" order that can be retried or cancelled.
- The Supabase `orders` table should have a `status` field: `pending | confirmed | failed`. Set it to `confirmed` only after Square invoice is published. This allows orphaned orders to be queried and resolved.
- The atomic Supabase slot decrement should be the first write in the checkout handler. If it fails (no slots remaining), abort immediately before touching Square.

**Warning signs:**
- Supabase insert comes after `publishInvoice` in the checkout route
- No `status` column on the `orders` table
- `slots_remaining` decremented anywhere other than the first step of checkout

**Phase:** Checkout API route integration (after schema is established)

---

### Pitfall 4: Resend Confirmation Email Sent Before Order Is Fully Committed

**What goes wrong:** Resend email sends are fast and tempting to fire as soon as a Square invoice is published. If the email is sent before the Supabase `orders` row is committed (or if the row is in an indeterminate state), the customer receives a confirmation for an order that doesn't exist in the database.

The inverse is equally dangerous: if the email send is inside the same try/catch as the order creation, a Resend API failure will roll back the user-visible success — they get an error page but a real Square invoice in their inbox.

**Why it happens:** Email confirmation feels like a simple "send at the end" step. The ordering of async side effects in the checkout pipeline is rarely architected explicitly.

**Consequences:**
- Confirmation email sent for a failed/orphaned order
- Resend failure causes checkout to return 500 even though Square confirmed the order
- Customer confused by mismatch between what they see on screen and what arrives in email

**Prevention:**
- Treat email sends as fire-and-forget after a successful response is committed to Supabase. Do not `await` the Resend call in a way that allows its failure to affect the HTTP response to the customer.
- Pattern: `const emailPromise = resend.emails.send(...); void emailPromise.catch(err => logError(...))` — the email is fired but its failure is logged, not rethrown.
- Log the email attempt to `email_logs` table in Supabase (status: `sent | failed`) so failed emails are recoverable without relying on Resend's dashboard.
- Consider a queue: write the email payload to `email_logs` with status `queued`, then send from a separate step. For MVP, the fire-and-forget approach is acceptable as long as failures are logged.

**Warning signs:**
- `await resend.emails.send(...)` inside the main try/catch block alongside Square and Supabase writes
- No `email_logs` table in the schema
- Email send attempted before Supabase `orders.status` is set to `confirmed`

**Phase:** Resend integration (within checkout pipeline work)

---

### Pitfall 5: Mailing List Signup Silently Fails on Duplicate Email

**What goes wrong:** Supabase (Postgres) will throw a unique constraint violation if a user submits their email twice. If this error is not handled explicitly, the UI either shows a generic error to a legitimate re-signup attempt or — worse — the catch block eats the error and the user thinks they signed up when they did not.

For mailing list signups, "already subscribed" should be treated as success from the user's perspective, not an error.

**Why it happens:** Postgres constraint violations bubble up from Supabase as error code `23505`. Teams unfamiliar with Supabase error codes treat all insert errors as real errors.

**Consequences:**
- Users who try to re-subscribe see an error and think signup is broken
- The checkout mailing list opt-in fails silently if the customer placed a previous order and opted in then

**Prevention:**
- Use Supabase's `.upsert()` with `onConflict: 'email'` and `ignoreDuplicates: true` for all mailing list inserts. This is idempotent: insert if new, no-op if exists.
- Alternatively: catch error code `23505` explicitly and return a success response with `{ alreadySubscribed: true }` so the UI can show appropriate messaging.
- Add a unique index on `mailing_list.email` and test the duplicate path explicitly.

**Warning signs:**
- `.insert()` used instead of `.upsert()` for mailing list writes
- Generic error handler that doesn't distinguish `23505` from other errors
- No test for the duplicate email path

**Phase:** Mailing list signup (standalone feature, also relevant to checkout opt-in)

---

### Pitfall 6: Drop "Closed" State Not Enforced Server-Side

**What goes wrong:** The existing storefront has hardcoded pickup dates that have already expired (see CONCERNS.md). The Supabase drops model will add a `closes_at` timestamp and an `is_active` boolean to replace this. But if the "drop is closed" check only happens in the UI (hiding the checkout button), a direct POST to `/api/checkout` can still place orders against a closed drop.

This is a meaningful attack surface for a limited-run drop: a determined customer (or a bot) can bypass the closed storefront and submit orders.

**Why it happens:** Client-side gating is easy to implement and immediately visible. Server-side validation of drop state is a separate step that is easily deferred.

**Consequences:**
- Orders placed against closed drops that have no valid pickup slots
- Drop capacity overflows after the intended close time
- Operator confusion when Square invoices exist for a "closed" drop

**Prevention:**
- The checkout API route must read the current active drop from Supabase and validate: (a) the drop exists, (b) `closes_at` is in the future, (c) `slots_remaining > 0`, and (d) the requested pickup date belongs to this drop. All four checks must happen before any Square API call.
- The drops table should be the canonical source for which pickup options are valid — not the hardcoded `PICKUP_OPTIONS` in `lib/config.ts`. The checkout schema's `locationLabel` enum should be derived from the active drop, not hardcoded.
- Client-side gating should still exist for UX (hide checkout when closed), but treat it as a convenience layer only.

**Warning signs:**
- `closes_at` or `is_active` only checked in the React component, not in the API route
- Checkout API still accepts arbitrary `pickupAtISO` values not validated against the active drop's options
- No test that proves a POST to `/api/checkout` against a closed drop returns a 409

**Phase:** Drops model + checkout integration (must be done together)

---

### Pitfall 7: Non-Idempotent Checkout Creates Duplicate Square Objects on Retry

**What goes wrong:** The existing `newIdempotencyKey()` calls in the checkout route generate a fresh UUID on every call. This means if the network drops after Square creates the order but before it returns, the customer retries and a *second* order is created with a different idempotency key. The customer is charged (via invoice) twice.

The CONCERNS.md already flags this as a known fragile area. Adding Supabase to the flow makes it worse: now there can be two Supabase order records and two Square invoices for the same customer + drop.

**Why it happens:** The idempotency key is generated at call time instead of being derived deterministically from the request content. The Square docs recommend idempotency keys that persist across retries for the same logical request.

**Consequences:**
- Duplicate Square orders and invoices
- Duplicate Supabase order records, inflated capacity decrement
- Customer confusion receiving two invoices
- Operator cannot tell which order is real

**Prevention:**
- Derive the checkout idempotency key from a stable hash of `(email + drop_id + cart_fingerprint)`. This makes retries for the same logical order idempotent.
- Before calling Square, check Supabase for an existing `orders` record with `status = pending | confirmed` for the same customer + drop. If one exists, return the existing record rather than creating a new one.
- The Supabase order record should be written first (see Pitfall 3) with an `idempotency_key` column. This becomes the guard against duplicate processing.

**Warning signs:**
- `newIdempotencyKey()` called inside the request handler without derivation from request content
- No deduplication check at the start of the checkout route
- No `idempotency_key` column on the `orders` table

**Phase:** Checkout API route integration

---

## Moderate Pitfalls

---

### Pitfall 8: Supabase Client Instantiated Per-Request Instead of Per-Process

**What goes wrong:** Supabase's JavaScript client maintains a connection pool internally. If you `createClient()` inside a Next.js API route handler (one instance per request), you bypass this pooling and open a new connection on every request. Under a drop event (burst traffic), this can exhaust the Supabase free-tier connection limit (default: 60 connections for Supabase free, ~200 for pro).

**Prevention:**
- Create the Supabase client as a module-level singleton: `export const supabase = createClient(url, serviceKey)` in `lib/supabase.ts`. Import and reuse this instance across all API routes.
- For Next.js App Router server components that need per-request context (e.g., session cookies for auth), use `createServerClient` from `@supabase/ssr`. For API routes using the service role key, the module-level singleton is correct.
- Vercel serverless functions are stateless — the singleton pattern still works because the module is cached for the lifetime of the warm function instance.

**Warning signs:**
- `createClient(...)` called inside a `POST(request)` handler function body
- No `lib/supabase.ts` singleton module

**Phase:** Supabase setup (establish before writing any route that uses Supabase)

---

### Pitfall 9: Resend's "From" Address Must Be a Verified Domain, Not an Arbitrary Email

**What goes wrong:** Resend requires the `from` address to use a domain you have verified in their dashboard (via DNS records). If you attempt to send from `orders@bigmattsbbq.com` before DNS verification is complete, every send will return a 403 and the confirmation email pipeline fails silently.

This blocks the entire confirmation email feature during development and testing if the domain isn't set up early.

**Prevention:**
- Verify the sending domain in Resend *before* writing any email-sending code. Add the required DNS records (DKIM, SPF, DMARC) and confirm they propagate.
- Use `onboarding@resend.dev` as the `from` address during local development only — it is a pre-verified sandbox address Resend provides.
- Store the verified from-address in an environment variable (`RESEND_FROM_ADDRESS`) so it can differ between environments without code changes.

**Warning signs:**
- Hardcoded `from: "noreply@bigmattsbbq.com"` in code before DNS verification is confirmed
- Resend API key added to env but no DNS records visible in Resend dashboard

**Phase:** Resend setup (Day 1 of email work — DNS propagation can take up to 48 hours)

---

### Pitfall 10: Mailing List Checkout Opt-In Tied to Checkout Success Creates Orphaned Subscriptions

**What goes wrong:** If mailing list opt-in during checkout is written as: "if user checked the opt-in box AND order succeeded, insert into mailing_list" — this creates a tight coupling. If the mailing list insert fails (Supabase down, duplicate key not handled), the checkout either fails unnecessarily or the opt-in is silently dropped.

The reverse coupling is also a risk: if a customer opts in, the checkout fails, they try again without the opt-in box checked, and they get subscribed from the first attempt but then unsubscribed from the retry — or vice versa.

**Prevention:**
- Treat mailing list opt-in as a separate, independent write that never affects the outcome of checkout. Use a fire-and-forget pattern with a logged failure: `void insertMailingListEntry(...).catch(logError)`.
- Use `.upsert()` for all mailing list writes (see Pitfall 5) so retried checkouts don't error on duplicate.
- The mailing list opt-in flag should be recorded on the `orders` row so it can be processed asynchronously if the real-time insert fails.

**Warning signs:**
- Mailing list insert inside the same try/catch that gates checkout success
- `await supabase.from('mailing_list').insert(...)` before `return NextResponse.json({ orderId })`

**Phase:** Checkout integration (when opt-in field is added to the checkout form)

---

### Pitfall 11: Drops Table Has No Validation on Pickup Options Shape

**What goes wrong:** The `drops` table will store pickup options as a JSONB column (most likely — an array of `{ label, location, datetime }` objects). Without a check constraint or Zod validation at write time, a manually-inserted drop record with a malformed pickup options array will cause runtime crashes when the checkout API tries to iterate pickup options.

Since the admin interface for MVP is "manage drops directly in Supabase," Matt will be hand-editing JSONB rows. Typos in the JSONB structure crash the live storefront.

**Prevention:**
- Define a strict TypeScript type for the pickup options shape and validate it with Zod in the API route when reading from Supabase. Never trust JSONB from the database without runtime validation.
- Add a Postgres check constraint on the `drops` table that validates the JSONB structure at insert/update time. This catches malformed values before they reach application code.
- Consider a separate normalized `drop_pickups` table instead of JSONB. More verbose to manage in Supabase UI, but schema-enforced.
- Write a SQL seed file with a valid example drop record as the reference template for hand-editing.

**Warning signs:**
- No Zod schema defined for the drop JSONB shape
- Checkout route accesses `drop.pickupOptions[0].datetime` without optional chaining or runtime validation

**Phase:** Drops schema design (define shape constraints before any code reads from the table)

---

### Pitfall 12: Square API Version Pinned to a Date That Will Be Deprecated

**What goes wrong:** `lib/square.ts` pins `SQUARE_VERSION = "2024-12-18"`. Square deprecates API versions on an 18-month rolling schedule. The `2024-12-18` version will reach end-of-life around mid-2026. When it is sunset, all Square API calls will begin returning errors with no dependency update to trigger a warning.

This is a risk for the current milestone because new Supabase/email code will be built on top of the existing Square integration. If that integration silently breaks post-launch, the new work is disrupted too.

**Prevention:**
- Note the deprecation date (approximately June 2026 for `2024-12-18`) in a comment next to `SQUARE_VERSION`. Add a calendar reminder or a GitHub issue to upgrade before then.
- Consider adopting the `squareup` Node.js SDK, which handles API version management automatically.
- When adding new Supabase/email features, bump `SQUARE_VERSION` to the current stable version as a housekeeping step to extend the runway.

**Warning signs:**
- No comment on `SQUARE_VERSION` indicating expected end-of-life date
- No upgrade ticket or reminder in the project backlog

**Phase:** Pre-integration housekeeping (address before the milestone begins, not after)

---

## Minor Pitfalls

---

### Pitfall 13: `NEXT_PUBLIC_` Variables Used for Server Secrets

**What goes wrong:** The Supabase service role key, Resend API key, and any signing secrets must never be in `NEXT_PUBLIC_` environment variables. `NEXT_PUBLIC_` values are inlined into the client-side JavaScript bundle and visible to anyone who opens DevTools.

This is a common mistake when developers are moving quickly and want a variable to be available without thinking about whether it needs to be server-side only.

**Prevention:**
- Rule: Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` should be public. Everything else (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `SQUARE_ACCESS_TOKEN`) must be server-only.
- The existing `lib/env.ts` pattern (server-only environment reads with runtime assertions) is the right pattern — extend it for Supabase and Resend keys.
- Add a lint rule or CI check that greps for `NEXT_PUBLIC_SUPABASE_SERVICE` or `NEXT_PUBLIC_RESEND` to catch accidental exposure.

**Warning signs:**
- `NEXT_PUBLIC_RESEND_API_KEY` or `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
- Supabase client initialized in a component using service role key

**Phase:** Any phase — establish as a convention before first Supabase/Resend key is added

---

### Pitfall 14: Mailing List Unsubscribe Not Built Results in Spam Complaints

**What goes wrong:** Resend's bulk email features (broadcast campaigns for drop notifications) require a functional unsubscribe mechanism or you risk violating CAN-SPAM/GDPR and getting the sending domain flagged. A simple `unsubscribed_at` timestamp on the mailing list table is sufficient for MVP, but it must be there before any notification emails are sent.

**Prevention:**
- Add `unsubscribed_at TIMESTAMP` to the `mailing_list` table from day one.
- Resend supports one-click unsubscribe headers natively — use `headers: { 'List-Unsubscribe': '<mailto:unsubscribe@bigmattsbbq.com>?subject=unsubscribe' }` at minimum. For proper compliance, implement a `/unsubscribe?email=...&token=...` route that sets `unsubscribed_at`.
- Filter out `unsubscribed_at IS NOT NULL` rows before any mailing list send.

**Warning signs:**
- `mailing_list` table schema has no `unsubscribed_at` column
- Broadcast emails sent without `List-Unsubscribe` header

**Phase:** Mailing list schema design (add the column from the start)

---

### Pitfall 15: Confirmation Page Reads from URL Params Without Server Verification

**What goes wrong:** The current confirmation page reads `orderId` and `pickupNote` from URL query params (see CONCERNS.md security section). With Supabase added, there may be a temptation to enrich this by fetching order details from Supabase using the `orderId` from the URL. This would allow any user to view any order's details by guessing or iterating order IDs.

**Prevention:**
- Do not use `orderId` from URL params to fetch order details from Supabase on the confirmation page without authenticating that the user placed that order.
- For MVP, the confirmation page should display only data passed at redirect time (via sessionStorage or server-side), not fetched via Supabase.
- If order lookup is needed, use a signed token (generated at checkout, stored in Supabase, consumed once) rather than the raw Square order ID.

**Warning signs:**
- `supabase.from('orders').select().eq('square_order_id', params.orderId)` on the confirmation page without auth

**Phase:** Checkout redirect flow (when Supabase order records are added)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Supabase schema creation | RLS off by default — all tables exposed | Enable RLS on every table *at creation time*, before any code is written |
| Supabase client setup | New instance per request exhausts connections | Create singleton in `lib/supabase.ts` as the first step |
| Drops model (JSONB) | Malformed admin-entered JSONB crashes checkout | Add Zod validation + Postgres check constraint on drop pickup options shape |
| Capacity enforcement | Read-then-write race condition oversells drops | Use Postgres function with `FOR UPDATE` for slot decrement; never do it in JS |
| Checkout pipeline integration | Supabase write after Square write — capacity never decremented on Square failure | Write Supabase reservation first; Square is the fulfillment step |
| Checkout pipeline integration | New idempotency key per retry creates duplicate Square objects | Derive idempotency key from deterministic hash of (email + drop_id + cart) |
| Resend setup | Sending domain not verified blocks all confirmation emails | Verify domain DNS records before writing any email code |
| Resend email send | Email failure rolls back successful checkout | Fire-and-forget with logged failure; never `await` email in main error boundary |
| Mailing list signup | Duplicate email causes 500 error on re-signup | Use `.upsert()` with `ignoreDuplicates: true` |
| Mailing list broadcasts | No unsubscribe mechanism → spam complaint → domain flagged | Add `unsubscribed_at` column and `List-Unsubscribe` header from day one |
| Drop closed state enforcement | Closed drop only gated client-side | Validate drop state server-side in checkout route before any Square call |
| Secret management | Service role key in `NEXT_PUBLIC_` | Extend `lib/env.ts` pattern; no Supabase/Resend keys in public prefix |

---

## Sources

These pitfalls are derived from:
- Direct code inspection of `/Users/matt/Development/BigMattsBbq` (checkout route, Square client, config, cart logic)
- `.planning/codebase/CONCERNS.md` (codebase audit dated 2026-04-03)
- Known behavioral properties of: Supabase RLS enforcement model, Postgres `FOR UPDATE` row locking, Resend domain verification requirements, Next.js App Router server/client environment boundary, Square idempotency key semantics
- Confidence: HIGH for pitfalls derived from direct code inspection; MEDIUM for pitfalls derived from Supabase/Resend platform behavior (well-documented, stable platform behaviors)
