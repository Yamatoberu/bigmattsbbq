# Phase 5: Content & Mailing List — Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete the site: lift NavBar/Footer to layout.tsx for site-wide navigation, add 5 nav links with mobile hamburger drawer, build three static pages (Catering, About, Contact), add mailing list signup to the home page and footer, wire up Resend for drop notification broadcast (MAIL-06) with a signed-token unsubscribe flow (MAIL-05).

MAIL-01 (branded Resend confirmation email at checkout) remains deferred — Square invoice email is sufficient for MVP.

</domain>

<decisions>
## Implementation Decisions

### Site-wide Navigation (NAV-01)

- **D-01:** NavBar and Footer both move from `OrderLanding.tsx` to `layout.tsx`. All pages get them automatically. OrderLanding stops rendering them.
- **D-02:** Desktop layout: Logo anchored left, nav links (Home, Frozen Drops, Catering, About, Contact) centered, Cart button right.
- **D-03:** Mobile layout: Hamburger icon in header; tapping opens a full-height slide-in drawer with all 5 links. Cart badge stays visible in the header at all times (never hidden by the drawer trigger).
- **D-04:** The existing "Order Now" CTA button is kept alongside Cart — it's a primary action, not a nav link. Both sit on the right side of the header.
- **D-05:** Nav links: Home → `/`, Frozen Drops → `/` or `/#order`, Catering → `/catering`, About → `/about`, Contact → `/contact`.

### Mailing List Signup — Home Page (MAIL-02)

- **D-06:** Dedicated full-width section on the home page (not a compact callout). Styled in the smoke/ember theme. Headline framing: "Be first to know about the next drop." Single email input + submit button.
- **D-07:** Success state: form is replaced inline by a confirmation message (e.g., "You're on the list! We'll let you know about the next drop."). No page navigation.
- **D-08:** If the email is already subscribed: show the same success message silently — no error, no "already subscribed" copy. Prevents email enumeration.

### Mailing List Signup — Footer (MAIL-03)

- **D-09:** Inline signup in the footer: email input + button on one row, alongside the existing copyright/contact text. Minimal footprint.
- **D-10:** Same success/error behavior as home page section (D-07, D-08).

### Resend Integration — Drop Broadcast (MAIL-06)

- **D-11:** Resend is set up for drop notification broadcast only. MAIL-01 (checkout confirmation email) remains deferred.
- **D-12:** Broadcast is triggered via a protected admin API route: `POST /api/admin/broadcast`. Matt calls this manually (curl or similar) when a drop goes live.
- **D-13:** Route is protected with a shared secret header: `Authorization: Bearer <BROADCAST_SECRET>` where `BROADCAST_SECRET` is an env var.
- **D-14:** Broadcast sends a drop notification email to all active (non-unsubscribed) mailing list subscribers via Resend.
- **D-15:** Email logs (`email_logs` table in Supabase) are written after each broadcast send — one row per email sent, capturing recipient, drop ID, send timestamp, and Resend message ID.

### Unsubscribe Flow (MAIL-05)

- **D-16:** Broadcast emails include a signed unsubscribe link: `/unsubscribe?token=<signed-jwt>`. The JWT encodes the subscriber email and is signed with a server secret.
- **D-17:** Visiting `/unsubscribe?token=...` renders a simple page that verifies the token and marks the subscriber as unsubscribed in Supabase (soft delete or `unsubscribed_at` timestamp — Claude's discretion on schema approach, but the `mailing_list` table already has an `unsubscribed_at` column from Phase 1 schema).
- **D-18:** No login required — the signed token is sufficient proof of identity.

### Catering Page (PAGE-01)

- **D-19:** A new `/catering` route that expands the existing `CateringSection` content — same tiers (Basic/Plus/Ultra), same email CTA (`catering@bigmattsbbq.com`), plus additional detail: what's included per tier, how far in advance to book, service area.
- **D-20:** The home page `CateringSection` component remains as a teaser/preview. It gets a "See full catering menu →" link to `/catering`.

### About Page (PAGE-02)

- **D-21:** Thin but real content — 2-3 paragraphs. Claude drafts copy covering who Big Matt is, BBQ philosophy, and brief origin story. Matt reviews and edits before launch.

### Contact Page (PAGE-03)

- **D-22:** Thin but real content — general inquiry email, catering email (`catering@bigmattsbbq.com`), and service area (Cache Valley and Utah County). Claude drafts the copy. No contact form — email CTAs only.

### MAIL-01 Scope (Confirmed Deferred)

- **D-23:** MAIL-01 (branded Resend confirmation email at checkout) stays deferred from Phase 4 decision. Square's invoice email covers customer confirmation for MVP. Phase 5 does not touch the checkout flow for email purposes.

### Claude's Discretion

- Exact text for mailing list section headline, CTA button label, and success message
- Exact text for About and Contact page copy (Claude drafts, Matt reviews)
- Unsubscribe page copy and visual treatment
- Broadcast email template design (subject line, body structure, BBQ brand voice)
- Whether `unsubscribed_at` timestamp or a boolean flag is used to track unsubscribe state (check existing schema in `0001_foundation.sql`)
- JWT signing library/algorithm for unsubscribe tokens (Node crypto or lightweight JWT)
- Active link highlighting in the nav (underline, color, or weight change for current route)
- Hamburger animation / drawer close behavior

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Spec
- `public/PRD.pdf` — Approved PRD for MVP build
- `.planning/PROJECT.md` — Project context, constraints, key decisions
- `.planning/REQUIREMENTS.md` — MAIL-02, MAIL-03, MAIL-05, MAIL-06, NAV-01, PAGE-01, PAGE-02, PAGE-03 are this phase's requirements

### Prior Phase Context
- `.planning/phases/01-foundation/01-CONTEXT.md` — Supabase schema decisions, `mailing_list` and `email_logs` table design, server-only Supabase client
- `.planning/phases/04-checkout-email/04-CONTEXT.md` — D-10: MAIL-01 deferred rationale; D-06/D-07/D-08/D-09: mailing list opt-in pattern at checkout (fire-and-forget, ON CONFLICT DO NOTHING)

### Schema
- `supabase/migrations/0001_foundation.sql` — Live schema for `mailing_list` and `email_logs` tables; check `unsubscribed_at` column presence and type

### Existing Components
- `components/NavBar.tsx` — Current NavBar; to be refactored for multi-page nav and moved to layout
- `components/Footer.tsx` — Current Footer; to gain inline mailing list signup and move to layout
- `components/CateringSection.tsx` — Existing catering teaser; extended for /catering page and updated with link
- `app/layout.tsx` — Root layout; NavBar and Footer will be added here
- `components/OrderLanding.tsx` — Must remove NavBar and Footer renders after they move to layout

### Environment
- `.env.example` — Add BROADCAST_SECRET and RESEND_API_KEY to required vars

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `NavBar.tsx` — Refactor in place; add nav links array, hamburger state, drawer overlay
- `Footer.tsx` — Refactor in place; add mailing list inline signup form
- `CateringSection.tsx` — Reuse as the content core of `/catering` page; add "full menu" link to home page version
- `lib/supabase.ts` — Supabase client for mailing list inserts and unsubscribe updates
- `lib/logger.ts` — Use for broadcast and unsubscribe route logging
- `app/api/checkout/route.ts` — Pattern reference for API route structure, error handling, and env var usage

### Established Patterns
- Fire-and-forget for non-critical async ops (mailing list insert failures don't surface to user)
- `INSERT ... ON CONFLICT DO NOTHING` for duplicate email handling in `mailing_list`
- Zod `safeParse` at API boundaries — use for broadcast route body validation
- Named exports everywhere; no default exports in lib/ or components/
- `try/catch` with `logError` + `requestId` in all route handlers
- Static pages: Next.js App Router convention, `app/<route>/page.tsx`, default export

### Integration Points
- `app/layout.tsx` — Where NavBar and Footer land; wraps all pages
- `app/api/` — Where broadcast route lives (`app/api/admin/broadcast/route.ts`)
- `app/unsubscribe/page.tsx` — New page; reads `?token=` query param, verifies, updates Supabase
- New pages: `app/catering/page.tsx`, `app/about/page.tsx`, `app/contact/page.tsx`
- Resend SDK: new dependency — `npm install resend`
- `lib/env.ts` — Add RESEND_API_KEY and BROADCAST_SECRET to required vars

</code_context>

<specifics>
## Specific Ideas

- Nav desktop layout confirmed via ASCII mockup: `[ Logo ]  Home  Frozen Drops  Catering  About  Contact  [ Order Now ] [ Cart ]`
- Mobile nav confirmed via ASCII mockup: hamburger + cart in header; full-height slide-in drawer on tap
- Home mailing list section confirmed via ASCII mockup: full-width band with email input + "Notify Me" button
- Footer mailing list confirmed: `[ email@example.com ] [ Join ]   © 2026 Big Matt's BBQ`
- Broadcast protection: `Authorization: Bearer <BROADCAST_SECRET>` header check

</specifics>

<deferred>
## Deferred Ideas

- MAIL-01: Branded Resend confirmation email at checkout — explicitly deferred from Phase 4, remains post-MVP.
- Admin UI for managing drops, broadcasting, viewing mailing list — deferred to v2 (ADMIN-01/ADMIN-02).
- Contact form (vs email CTA links) — out of scope for MVP static pages.
- Catering scheduling or booking system — static page with email CTA is sufficient for MVP.

</deferred>

---

*Phase: 05-content-mailing-list*
*Context gathered: 2026-04-14*
