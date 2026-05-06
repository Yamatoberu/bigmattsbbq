# Feature Landscape

**Domain:** Limited-run frozen food drop / preorder e-commerce with pickup fulfillment
**Project:** Big Matt's BBQ
**Researched:** 2026-04-03
**Confidence:** HIGH — Based on existing codebase analysis + established domain patterns for preorder/drop-model food commerce

---

## Context: What Already Exists

The following features are **already built and working**. They are not included in the
table stakes analysis below — they are baseline. Do not rebuild them.

- Frozen product catalog from Square API
- Live inventory counts from Square Inventory API
- Cart with localStorage persistence
- Package bundles (Family, Backyard Host, Freezer Stock-Up)
- Checkout with customer info, pickup selection, Square invoice creation
- Confirmation page (on-screen only — no email yet)
- Sauce bump logic (auto-suggest sauce when meat ordered without it)
- Dark, smoky visual theme — ember/smoke palette, Playfair + Source Sans 3

---

## Table Stakes

Features that users expect in a drop/preorder food ordering context. Missing any of
these breaks trust or causes abandonment. Listed in dependency order.

### 1. Database-Driven Drop Configuration

**Why expected:** Hardcoded pickup options and product configs (current `PICKUP_OPTIONS`,
`PACKAGES` in `lib/config.ts`) cannot support rotating drops. Customers expect the site
to reflect the *current* drop accurately — wrong dates or closed drops that still appear
open destroy trust immediately.

**What it means:** A drop record in Supabase defines: which products are in scope, per-drop
capacity per pickup location, pickup date/time windows, and an open/closed state. The
ordering UI reads from the active drop. If no drop is active, the UI shows a "sold out /
notify me" state.

**Complexity:** Medium. Supabase schema is straightforward; the complexity is in the API
layer reading drop config and the UI branching on drop state (active vs. closed vs.
between drops).

**Dependencies:** Requires Supabase. Blocks: drop-scoped inventory enforcement, mailing
list "next drop" messaging.

---

### 2. Atomic Inventory Enforcement Against Overselling

**Why expected:** A drop-model site lives or dies on this. If two customers submit
simultaneously and both get confirmed for the last available slot, one of them shows up
to an empty cooler. This is an unrecoverable trust failure for a small food brand.

**What it means:** Order placement must atomically check and decrement drop capacity
(Supabase) AND Square inventory. Square already handles per-item inventory; Supabase
adds per-drop-per-location capacity limits. The double-write must be handled defensively:
if Square succeeds but Supabase write fails (or vice versa), the order must be rolled
back or flagged for reconciliation. A Supabase Postgres function (RPC) is the right tool
— run capacity decrement inside a transaction, reject if the result would go below zero.

**Complexity:** High. Distributed write across two systems with no native two-phase
commit. Requires careful ordering (check Supabase capacity first, then call Square) and
compensating actions on partial failure.

**Dependencies:** Requires Supabase drop records. Blocks: nothing downstream, but must
be correct before any drop goes live.

---

### 3. Confirmation Email with Order Summary

**Why expected:** The current confirmation page says "Check your email for the invoice."
Square sends the invoice email, but there is no separate confirmation email from Big
Matt's BBQ. Customers expect a branded email that summarizes what they ordered, when and
where to pick up, and what to bring (cash/Venmo, since payment is at pickup). Without
this, customers open their inbox expecting something, find nothing from Big Matt's, and
either panic or forget about the order entirely.

**What it means:** After a successful order placement, send a Resend email to the
customer's address containing: itemized cart summary, pickup location and date/time
window, pay-at-pickup reminder with accepted payment methods, and a contact email for
questions. Plain-text fallback required. Does not replace the Square invoice email —
complements it.

**Complexity:** Low-Medium. Resend API integration is simple. The content is well-defined.
The work is in the email template and ensuring the API call is non-blocking (do not let
email failure abort the order).

**Dependencies:** Requires Supabase order log (email log is recorded alongside the order).
The email send should be triggered server-side from the checkout API route after Square
invoice is published.

---

### 4. Mailing List Signup — Home Page + Footer

**Why expected:** Drop-model businesses run on their list. A customer who discovers the
site between drops needs a way to be notified when the next drop opens. Without signup,
that visitor is gone forever. This is the primary organic growth mechanism for a small
food brand. Users who have bought from a similar brand (Goldbelly, small-batch hot sauce
drops, local meat CSAs) expect a newsletter signup to exist.

**What it means:** A signup form section on the home page (prominent, above or near the
FAQ) and a smaller signup in the site footer. Field requirements: email address only.
Name is optional (adds friction, reduces conversion). Success state: inline "You're on
the list" confirmation — no page redirect. Store the record in Supabase `mailing_list`
table with `email`, `source` (homepage | footer | checkout), and `subscribed_at`.

**Complexity:** Low. Supabase insert + basic duplicate handling (upsert on email). The
form is simple. The only trap is handling the race condition where a user submits from
both the homepage and footer sections — upsert prevents duplicates.

**Dependencies:** Requires Supabase. Does not block any other feature.

---

### 5. Mailing List Opt-In During Checkout

**Why expected:** The customer is already giving their email address. Not offering a
one-click "notify me about future drops" checkbox at that point is a missed acquisition.
Best practice in preorder/drop e-commerce is to default the checkbox to checked (or
unchecked with prominent placement) and write to the mailing list on submit.

**What it means:** A single checkbox in the checkout form, labeled something like "Notify
me about future drops." If checked, insert their email into `mailing_list` with
`source: 'checkout'` at the same time the order is written. Pre-fill the checkbox as
checked (opt-out model is fine given the context — they're a customer, not a cold email
target).

**Complexity:** Low. Single additional field in the checkout payload, single additional
write at order time.

**Dependencies:** Requires Supabase mailing list table. Shares infrastructure with the
standalone signup form.

---

### 6. Drop State UI (Active / Closed / Between Drops)

**Why expected:** If a drop is closed or not yet open, showing an ordering UI with
disabled buttons is confusing. Users expect a clear signal about drop availability:
countdown if opening soon, "sold out" if capacity is gone, "subscribe to be notified" if
no drop is active.

**What it means:** The ordering UI (home page and `/` route) reads the active drop from
Supabase. Three states need UI treatment:
- **Active drop:** Current behavior — products visible, ordering enabled.
- **Sold out / closed:** Products visible but greyed out, clear "sold out" messaging,
  mailing list signup prominent.
- **No active drop:** No products shown, "Be the first to know about our next drop"
  section with signup form. No dead/empty product grid.

**Complexity:** Low-Medium. Conditional rendering based on drop state. The state machine
is simple; the UI branches need design care.

**Dependencies:** Requires database-driven drop config (Feature 1).

---

### 7. Site-Wide Navigation

**Why expected:** The current NavBar has only "Order Now" and "Cart." Adding Catering,
About, and Contact pages without navigation links is broken information architecture.
Users expect to find these pages. A missing nav link for "Catering" means potential
catering customers never find the page.

**What it means:** Add navigation links to NavBar: Home (or logo), Frozen Drops, Catering,
About, Contact. On mobile, this collapses to a hamburger or a compact horizontal scroll.
Given the existing NavBar structure, a simple horizontal link row on desktop and a
hamburger drawer on mobile is appropriate for the scale of this site.

**Complexity:** Low. React component work. The existing NavBar is already a sticky header.

**Dependencies:** Requires Catering, About, and Contact pages to exist (otherwise the
links are dead).

---

### 8. Catering Page (Static)

**Why expected:** The existing CateringSection component on the home page is a teaser.
A real catering inquiry requires more space: pricing tiers, what's included, minimum
headcount, lead time, and a clear CTA. Sending catering inquiries to a Gmail address
buried in the footer is the current state; a dedicated page with a mailto CTA to
`catering@bigmattsbbq.com` sets appropriate expectations.

**What it means:** A `/catering` route with: pricing tiers (per-person or flat), what's
included in each tier, typical lead time and booking process, and a prominent "Get a
Quote" button that opens the user's email client pre-addressed to
`catering@bigmattsbbq.com` with a subject line template. Static content — no form
submission, no CRM integration.

**Complexity:** Low. Static Next.js page. Content is known.

**Dependencies:** Requires site-wide navigation to link to it (Feature 7).

---

### 9. About Page (Static)

**Why expected:** Food brands sell on story and trust. "Who is Big Matt?" is a legitimate
question from a first-time visitor. A small-batch BBQ drop with no About page feels
anonymous and untrustworthy. The about page is also the SEO anchor for brand-name
searches.

**What it means:** A `/about` route with: origin story, how the BBQ is made (wood-smoked,
vacuum sealed), and what makes the drops worth preordering. Photo of Matt/the operation
if available. No complex interactivity.

**Complexity:** Low. Static content page.

**Dependencies:** Requires site-wide navigation.

---

### 10. Contact Page (Static)

**Why expected:** Users who can't find an answer in the FAQ need a clear path to reach
the business. A contact page consolidates: email for orders/questions, email for
catering, response time expectations. Prevents the "just email bigmattsbarbecue@gmail.com
buried in the footer" discovery problem.

**What it means:** A `/contact` route with: order question email, catering inquiry email,
and a note about typical response time. A simple mailto link is sufficient — no contact
form, no ticketing system. Static page.

**Complexity:** Low. Static content page.

**Dependencies:** Requires site-wide navigation.

---

## Differentiators

Features that go beyond expectation and create loyalty or word-of-mouth in the
drop/preorder food model. These are not in scope for the current milestone but should
inform future roadmap phases.

### Drop Countdown Timer

**Value:** Creates urgency and re-engagement. A "Drop opens in 3 days 14 hours" timer on
the home page (when a drop is scheduled but not yet open) drives return visits and
social sharing. Common in limited-release product categories (sneakers, hot sauce, BBQ
clubs).

**Complexity:** Low. Client-side countdown with a target timestamp from the drop record.

**When to build:** Post-MVP, once database-driven drops are stable and Matt has
predictable drop cadence.

---

### Sold-Out Waitlist per Drop

**Value:** Captures demand that would otherwise evaporate. When a drop sells out, a
secondary "Waitlist for this drop" signup (separate from the general mailing list) lets
Matt gauge true excess demand. If a cancellation opens a slot, the waitlist gets first
notice.

**Complexity:** Medium. Requires waitlist table, position tracking, and a triggered
notification flow.

**When to build:** Once drop cadence is established and oversell demand is confirmed.

---

### Order Reminder Email (Day Before Pickup)

**Value:** Reduces no-shows at pickup. A "Your order is ready tomorrow at [location]"
reminder email sent 24 hours before pickup improves the customer experience and reduces
the awkward moment where someone forgets and Matt has product nobody claimed.

**Complexity:** Medium. Requires a scheduled job (Vercel Cron or Supabase pg_cron) and
a query against the orders table filtered by pickup date.

**When to build:** After order logging in Supabase is stable and at least one successful
drop cycle has completed.

---

### Past Drops Archive / Gallery

**Value:** Social proof for new visitors. A "Previous Drops" page showing what sold out
and testimonials builds credibility that the drops are real and desirable. Reinforces
FOMO for the mailing list.

**Complexity:** Low. Read-only display of past drop records from Supabase.

**When to build:** After 2-3 successful drops have run through the database.

---

## Anti-Features

Features to explicitly NOT build in this milestone or the next. Most are already in the
PROJECT.md "Out of Scope" section; this expands on why.

### Admin Dashboard / CMS

**Why avoid:** Building a custom admin UI before the data model is proven wastes
significant development time on tooling rather than customer-facing value. Managing drops
directly in Supabase Studio is sufficient for MVP. The admin UI's requirements will
become clearer after Matt has operated 2-3 drops through the system.

**What to do instead:** Use Supabase Studio for drop configuration. Document the exact
rows to insert in a runbook.

---

### Online Payment / Stripe Integration

**Why avoid:** Payment at pickup is the existing model, the customers are already
accustomed to it, and it eliminates chargeback risk entirely for a perishable product.
Adding online payment introduces refund flows, failed payment states, and card-not-present
fraud risk — all significant complexity for no customer benefit (they're local, they're
coming to pick up anyway).

**What to do instead:** Keep Square invoices for tracking. Accept cash/Venmo at pickup.
State payment method clearly in the confirmation email.

---

### Shipping / Delivery

**Why avoid:** Shipping frozen BBQ requires dry ice, insulated packaging, carrier
coordination, and dramatically increases unit economics complexity. It is not part of the
brand promise ("local, small-batch, pickup"). Adding it would dilute the brand and add
operational burden that Matt is not set up to handle.

**What to do instead:** Pickup only, two locations. If demand from outside Cache Valley /
Utah County is strong, evaluate shipping as a separate future initiative.

---

### SMS Notifications

**Why avoid:** SMS requires a separate provider (Twilio, etc.), opt-in compliance
(TCPA), and per-message cost. For a small-batch operation with infrequent drops, email
achieves the same goal without the compliance surface area.

**What to do instead:** Email-only for all notifications in MVP. Revisit SMS if open rates
fall below acceptable thresholds post-launch.

---

### Subscription / Recurring Orders

**Why avoid:** Frozen BBQ drops are event-based, not recurring. Subscriptions imply
predictable cadence, predictable supply, and automated billing — none of which matches
the "limited run" model. Subscriptions also create cancellation management complexity.

**What to do instead:** Mailing list is the subscription model. Subscribers get first
notice of each drop, then decide drop-by-drop.

---

### Contact Form with Backend Submission

**Why avoid:** A static mailto link is sufficient for the volume of inquiries a local BBQ
operation receives. A backend contact form adds a spam vector, requires storage/logging
of messages, and creates an obligation to build a message management interface.

**What to do instead:** mailto links with pre-filled subject lines. Clear response time
expectations on the contact page.

---

## Feature Dependencies

```
Supabase setup
  └── Drop configuration schema
        ├── Database-driven drop config (Feature 1)
        │     └── Drop state UI — active/closed/between drops (Feature 6)
        ├── Atomic inventory enforcement (Feature 2)
        └── Order log table
              └── Confirmation email (Feature 3)

Resend setup
  └── Confirmation email (Feature 3)

Mailing list table (Supabase)
  ├── Mailing list signup — home + footer (Feature 4)
  └── Mailing list opt-in at checkout (Feature 5)

Static pages (Features 8, 9, 10)
  └── Site-wide navigation (Feature 7) — links must exist before nav is built
```

**Critical path for this milestone:**

1. Supabase project + schema (drops, orders, mailing_list, email_logs)
2. Database-driven drop config replaces hardcoded `PICKUP_OPTIONS` / `PACKAGES`
3. Atomic inventory enforcement (Supabase capacity check added to checkout route)
4. Resend integration + confirmation email template
5. Mailing list signup form (home + footer + checkout opt-in)
6. Drop state UI (active / sold out / between drops)
7. Static pages: Catering, About, Contact
8. Site-wide navigation with links to all pages

---

## MVP Recommendation

**Build in this milestone (all Active requirements from PROJECT.md):**

Priority 1 — Core data integrity:
- Supabase schema
- Database-driven drops
- Atomic oversell protection

Priority 2 — Customer communication:
- Confirmation email (Resend)
- Mailing list signup (home + footer + checkout opt-in)

Priority 3 — Content and navigation:
- Catering, About, Contact pages
- Site-wide navigation
- Drop state UI

**Defer confidently:**
- Admin dashboard: manage drops in Supabase Studio
- Countdown timers: adds polish but not required for first database-driven drop
- Order reminder emails: valuable, but requires scheduled jobs — add after first drop cycle
- Waitlist: not needed until a drop actually sells out

---

## Sources

- Existing codebase analysis: `app/api/checkout/route.ts`, `components/CheckoutClient.tsx`,
  `components/OrderLanding.tsx`, `components/Footer.tsx`, `components/NavBar.tsx`,
  `app/confirmation/page.tsx`
- Project requirements: `.planning/PROJECT.md`
- Domain knowledge: preorder/drop commerce patterns (limited-release food brands, CSA
  models, batch-production e-commerce). Confidence: HIGH for table stakes, MEDIUM for
  differentiator sequencing.
- Note: WebSearch was unavailable. All analysis is derived from codebase + domain
  knowledge. No low-confidence WebSearch-only claims present.
