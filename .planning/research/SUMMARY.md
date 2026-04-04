# Project Research Summary

**Project:** Big Matt's BBQ — Milestone 2: Supabase + Resend Integration
**Domain:** Limited-run frozen food drop / preorder e-commerce with pickup fulfillment
**Researched:** 2026-04-03
**Confidence:** HIGH

## Executive Summary

Big Matt's BBQ is a local BBQ brand running limited-run frozen food drops with two pickup locations. The existing codebase has a working storefront: Square-powered catalog, inventory, cart, checkout, and Square invoice creation. What it lacks is persistence, capacity enforcement, customer communication, and content pages. Milestone 2 adds Supabase (as a drop configuration, order logging, and mailing list store) and Resend (for transactional confirmation emails). The result is a production-ready drop platform that can operate multiple drops without code changes.

The recommended approach is to treat Square as the permanent source of truth for catalog, inventory pricing, customer records, and invoices — and Supabase as the source of truth for everything that Square does not own: drop schedules, pickup slot capacity, the order cross-reference log, and the mailing list. All Supabase and Resend access must stay server-side in Next.js API routes using the service role key, never in client components. The checkout route becomes the integration seam: Square ops happen first, Supabase and Resend follow, and failures after the Square invoice publishes are logged rather than surfaced to the customer (Square's invoice email is the safety net).

The dominant risk is the distributed write problem: two systems (Square and Supabase) must agree on a successful order, and they have no native two-phase commit. The research identifies a clear mitigation — write the Supabase reservation first using a Postgres `FOR UPDATE` row-locking function, then call Square, then log to email. Any failure after the Square step is recoverable; any failure before it aborts cleanly. A secondary risk is the Supabase anon key and RLS misconfiguration: enabling RLS on every table at creation time (before any code is written) eliminates this class of problem entirely.

---

## Key Findings

### Recommended Stack

The new dependencies attach to the existing Next.js 16 + React 18 + TypeScript + Tailwind + Zod + Vitest stack without displacing anything. Two Supabase packages are required: `@supabase/supabase-js` for the client and `@supabase/ssr` for Next.js App Router compatibility. For email, the Resend SDK (`resend`) pairs with `react-email` and `@react-email/components` to produce typed, locally-previewable email templates as TSX files. No Prisma ORM, no nodemailer, no SMTP server, no realtime subscriptions.

The Supabase CLI (installed via Homebrew, not npm) handles migrations and TypeScript type generation via `supabase gen types typescript`. Generated types flow into `createServerClient<Database>()` for end-to-end type safety on all queries. All application Supabase access uses the service role key in API routes — never the anon key server-side, never any key client-side.

**Core technologies:**
- `@supabase/supabase-js` + `@supabase/ssr`: Supabase client — drop config, order records, mailing list, email audit trail. `@supabase/ssr` is required for Next.js App Router; the deprecated `@supabase/auth-helpers-nextjs` must not be used.
- `resend` v4: Transactional email SDK — confirmation emails and future broadcast campaigns. Simpler than nodemailer/SMTP in a serverless Vercel environment.
- `react-email` + `@react-email/components`: Email template system — React TSX components rendered to HTML for Resend. Same ecosystem, same language, locally previewable.
- Supabase Postgres RPC (`reserve_pickup_slot`): Atomic capacity enforcement via `FOR UPDATE` row locking — the only correct solution to concurrent reservation race conditions.

### Expected Features

All 10 table-stakes features from the research must be completed in this milestone. The existing codebase already provides the product catalog, cart, and Square checkout — these are not rebuilt. The 8 net-new features are listed in dependency order below.

**Must have (table stakes):**
- Database-driven drop configuration — replaces hardcoded `PICKUP_OPTIONS` in `lib/config.ts`; required for all other Supabase features
- Atomic capacity enforcement — Postgres `FOR UPDATE` RPC prevents overselling pickup slots; must be correct before any drop goes live
- Confirmation email (Resend) — customers currently receive no branded email; Square invoice email alone is insufficient and creates trust gaps
- Mailing list signup (home + footer + checkout opt-in) — the primary organic growth mechanism for a drop-model food brand; without it, between-drop visitors are lost permanently
- Drop state UI (active / sold out / between drops) — prevents a confusing empty or expired storefront; reads from Supabase drop record
- Site-wide navigation — links Catering, About, and Contact into the information architecture
- Catering page (static) — expands the current teaser section into a full inquiry page
- About and Contact pages (static) — trust and brand anchors for first-time visitors

**Should have (differentiators — defer to post-MVP):**
- Drop countdown timer — urgency and re-engagement; low complexity, add after first database-driven drop runs successfully
- Order reminder email (day before pickup) — requires Vercel Cron or Supabase pg_cron; add after first successful drop cycle
- Sold-out waitlist per drop — captures excess demand; add after a drop actually sells out
- Past drops archive — social proof; add after 2-3 drops have run through Supabase

**Defer (explicitly out of scope — do not build):**
- Admin dashboard: manage drops in Supabase Studio for MVP
- Online payment / Stripe: pay-at-pickup model eliminates chargeback risk; keep it
- Shipping / delivery: outside brand promise and operational capacity
- SMS notifications: email achieves same goal without TCPA compliance surface area
- Subscriptions / recurring orders: incompatible with the drop model

### Architecture Approach

The architecture is a thin integration layer on top of the existing Next.js App Router structure. Square remains the system of record for catalog and payments. Supabase owns the new persistence layer: drop records, pickup slot capacity, order cross-references, and the mailing list. Resend handles all outbound email. All three external services are accessed exclusively from Next.js API routes — never from client components. The checkout route (`app/api/checkout/route.ts`) is extended rather than replaced: Square ops run first, Supabase writes follow, Resend fires last with logged failure tolerance.

**Major components:**
1. `lib/supabase.ts` — Supabase singleton client with typed query functions (`getActiveDropWithPickupOptions`, `insertOrder`, `upsertMailingListSubscriber`, `insertEmailLog`); mirrors the existing `lib/square.ts` pattern
2. `lib/resend.ts` — Resend singleton client with typed send functions (`sendOrderConfirmation`, `sendMailingListWelcome`); errors caught internally, returns null on failure
3. `app/api/drops/route.ts` — GET active drop config from Supabase; replaces hardcoded config read in `OrderLanding`
4. Extended `app/api/checkout/route.ts` — adds `dropId` + `mailingListOptIn` to Zod schema; adds Supabase reservation and Resend email after Square invoice publishes
5. `app/api/mailing-list/route.ts` — standalone POST endpoint for homepage/footer signups; separate from checkout opt-in
6. Static pages (`app/catering`, `app/about`, `app/contact`) — server components, no data dependencies
7. `<SiteNav>` in `app/layout.tsx` — site-wide navigation linking all pages

### Critical Pitfalls

1. **Supabase write after Square write — capacity never decremented on Square failure** — Write the Supabase slot reservation first using a Postgres `FOR UPDATE` RPC function. If Square fails afterward, the pending Supabase order can be cancelled. Never do the capacity check in JavaScript (race condition window). This is the most consequential ordering decision in the implementation.

2. **RLS disabled on Supabase tables allows direct API writes** — Enable Row Level Security on every table at the moment it is created, before any application code is written. The service role key bypasses RLS, so API routes are unaffected. Without RLS, any visitor can write to `orders` or `mailing_list` directly using the anon key.

3. **Resend email failure causes checkout 500 even though Square succeeded** — Email sends must be fire-and-forget after the Supabase order is committed. Never `await` the Resend call inside the main try/catch. Log failures to `email_logs` for recovery. The Square invoice email is the fallback.

4. **New idempotency key per retry creates duplicate Square objects** — Derive the checkout idempotency key from a deterministic hash of `(email + drop_id + cart_fingerprint)`. Check Supabase for an existing `pending | confirmed` order for the same customer + drop before calling Square.

5. **Closed drop only gated client-side** — The checkout API route must validate that the active drop exists, `closes_at` is in the future, and `slots_remaining > 0` before any Square call. Client-side hiding is a UX convenience, not a security gate.

---

## Implications for Roadmap

Based on the dependency graph in FEATURES.md and the build order from ARCHITECTURE.md, the following 4-phase structure is recommended. Each phase delivers a testable, deployable increment.

### Phase 1: Foundation — Supabase Schema + Client Setup

**Rationale:** Everything else depends on the database schema being correct and the Supabase client being properly configured. RLS, the atomic reservation function, and the singleton client pattern must all be established before any feature code is written. Getting this wrong requires schema rewrites; getting it right makes all subsequent phases straightforward.

**Delivers:** A working Supabase project with all 5 tables created, RLS enabled, the `reserve_pickup_slot` Postgres function deployed, a seeded test drop, generated TypeScript types, and `lib/supabase.ts` + `lib/env.ts` extensions — all verified with TypeScript compilation and a Supabase Studio check.

**Addresses:** Features 1 (drop config schema), 4/5 (mailing list table), 3 (order + email_logs tables)

**Avoids:** Pitfall 2 (RLS off by default), Pitfall 1 (dual inventory sources), Pitfall 8 (client instantiated per-request), Pitfall 13 (secrets in NEXT_PUBLIC_ vars)

### Phase 2: Drop Configuration + Ordering UI

**Rationale:** The `GET /api/drops` route and the `OrderLanding` update are the highest-leverage change — they replace the expired hardcoded config and make the storefront data-driven. Once this works against a real Supabase drop record, the site is in a maintainable state for future drops. The drop state UI (active / sold out / between drops) ships in this phase because it reads from the same data.

**Delivers:** Live drop config from Supabase replacing `lib/config.ts` `PICKUP_OPTIONS`. `OrderLanding` renders pickup options, order cutoff date, and drop state from the active drop. "No active drop" and "sold out" states are handled. `CheckoutClient` sends `dropId` in the checkout payload.

**Addresses:** Features 1 (database-driven drop config), 6 (drop state UI)

**Avoids:** Pitfall 6 (drop closed state only gated client-side — server validation added here), Pitfall 11 (JSONB shape validated with Zod at read time)

### Phase 3: Checkout Integration + Email

**Rationale:** The checkout route is the integration seam — it must wire Supabase capacity enforcement, order logging, mailing list opt-in, and Resend confirmation email into the existing Square flow. All four concerns are coupled at the API boundary, so they ship together rather than in separate phases. Resend domain DNS verification must be initiated before this phase begins (up to 48-hour propagation).

**Delivers:** Extended checkout route that: (1) reserves a pickup slot via Postgres RPC before Square ops, (2) writes an order record to Supabase after Square succeeds, (3) handles mailing list opt-in as a fire-and-forget write, (4) sends a branded confirmation email via Resend with cart summary + pickup details + pay-at-pickup instructions. `email_logs` table updated on every send attempt regardless of outcome.

**Addresses:** Features 2 (atomic inventory enforcement), 3 (confirmation email), 5 (checkout mailing list opt-in)

**Avoids:** Pitfall 3 (Supabase write ordering), Pitfall 4 (email failure rolling back checkout), Pitfall 7 (duplicate Square objects on retry), Pitfall 9 (Resend domain not verified), Pitfall 10 (mailing list opt-in coupled to checkout success)

### Phase 4: Mailing List + Static Pages + Navigation

**Rationale:** These features are independent of the checkout pipeline and can be built in parallel with Phase 3, but ship last because they depend on navigation links pointing to pages that must exist. The mailing list standalone route reuses the same Supabase functions established in earlier phases. Static pages have no data dependencies. This phase completes the milestone.

**Delivers:** Standalone `POST /api/mailing-list` endpoint with duplicate-safe upsert. Mailing list signup sections on homepage and footer. `/catering`, `/about`, and `/contact` static pages. `<SiteNav>` component added to `app/layout.tsx` with links to all pages. `mailing_list` schema includes `unsubscribed_at` column and `source` tracking from day one.

**Addresses:** Features 4 (mailing list home + footer), 7 (site-wide navigation), 8 (catering page), 9 (about page), 10 (contact page)

**Avoids:** Pitfall 5 (duplicate email constraint violations), Pitfall 14 (no unsubscribe mechanism before broadcast emails are sent)

### Phase Ordering Rationale

- Phase 1 must come first: schema and RLS errors cascade into every feature. Fixing them post-facto requires migration rewrites.
- Phase 2 must follow Phase 1: the drops route cannot be built without the `drops` and `drop_pickup_options` tables and generated types.
- Phase 3 must follow Phase 2: the extended checkout must validate `dropId` against a live Supabase drop. The Supabase order insert also requires the drops and pickup options to exist.
- Phase 4 can begin in parallel with Phase 3 for static pages, but the mailing list route requires the schema from Phase 1.
- Resend domain DNS verification must be initiated at the start of Phase 3 work, not after the code is written.

### Research Flags

Phases with standard patterns — skip research-phase:
- **Phase 1 (Supabase schema):** Standard Postgres + Supabase patterns, well-documented. ARCHITECTURE.md and STACK.md provide exact SQL and client setup code.
- **Phase 2 (drop config):** Standard Next.js data fetching pattern, same as existing `GET /api/frozen-items`. No novel integration.
- **Phase 4 (static pages + nav):** Pure React component work against established patterns in the existing codebase.

Phases that may benefit from targeted research during planning:
- **Phase 3 (checkout integration):** The Supabase-first ordering and idempotency key derivation are non-trivial. PITFALLS.md documents the exact approach, but the implementation detail of the idempotency hash and the Postgres RPC call warrants careful review of the existing `app/api/checkout/route.ts` before writing code. No external research needed — the patterns are documented — but plan for a focused implementation session.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Package versions based on training data through August 2025; verify exact patch versions before `npm install`. Core integration patterns (service role key, `@supabase/ssr`, react-email render flow) are HIGH confidence. |
| Features | HIGH | Derived from direct codebase analysis + established drop-model e-commerce patterns. Table stakes are unambiguous. |
| Architecture | HIGH | Component boundaries derived directly from codebase inspection. Build order determined by unambiguous dependency graph. Checkout extension strategy is clear from existing route structure. |
| Pitfalls | HIGH | 13 of 15 pitfalls derived from direct code inspection + known behavioral properties of Supabase, Postgres, Resend, and Next.js. Two (Supabase connection pooling, Resend domain verification) from well-documented platform behaviors. |

**Overall confidence:** HIGH

### Gaps to Address

- **Exact package versions:** `@supabase/supabase-js`, `@supabase/ssr`, `resend`, `react-email`, `@react-email/components` — verify current latest patch versions before installing. The major versions (supabase-js v2, resend v4) are reliable; patch versions may have advanced.
- **Square API version deprecation:** `lib/square.ts` pins `SQUARE_VERSION = "2024-12-18"`, which reaches end-of-life approximately June 2026. This should be bumped to the current stable version as a housekeeping step before or during Phase 3 work. Add a calendar reminder.
- **Inventory atomicity (Square-side):** ARCHITECTURE.md notes that the real fix for per-item overselling is a Square inventory decrement call during checkout — currently missing (flagged in CONCERNS.md). This is separate from the Supabase per-drop capacity enforcement. The Supabase slot reservation prevents drop-level overselling; Square inventory decrement prevents per-item overselling. The latter is not in scope for this milestone but should be a named backlog item to avoid confusion.
- **Resend `from` address domain:** Verify whether `bigmattsbbq.com` DNS records are already configured in Resend, or if this is a new setup. DNS propagation can take 48 hours — do not start Phase 3 coding without this in progress.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `app/api/checkout/route.ts`, `lib/square.ts`, `lib/config.ts`, `components/CheckoutClient.tsx`, `components/OrderLanding.tsx`, `components/NavBar.tsx`, `app/confirmation/page.tsx`, `.planning/codebase/CONCERNS.md`
- `.planning/PROJECT.md` — milestone scope and requirements
- Postgres `FOR UPDATE` row-locking semantics — standard Postgres documentation behavior
- Supabase service role key bypasses RLS — core Supabase architecture, documented behavior
- `@supabase/auth-helpers-nextjs` deprecation in favor of `@supabase/ssr` — Supabase changelog
- react-email as Resend's recommended template system — same team, documented as primary integration

### Secondary (MEDIUM confidence)
- Training data through August 2025: `@supabase/supabase-js` v2, `@supabase/ssr`, `resend` v4, `react-email` v3 — all stable mature packages by that date; patch versions require verification
- Drop-model e-commerce patterns (limited-release food brands, small-batch CSA models) — domain knowledge, HIGH confidence for table stakes, MEDIUM for differentiator sequencing

### Tertiary (LOW confidence)
- None — all low-confidence findings were excluded or flagged inline

---
*Research completed: 2026-04-03*
*Ready for roadmap: yes*
