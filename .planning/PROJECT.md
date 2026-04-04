# Big Matt's BBQ — Website Refresh & Frozen Drops

## What This Is

A mobile-first website for Big Matt's BBQ that serves as a sales funnel for limited-run frozen BBQ drops and a catering presence. Customers preorder frozen BBQ products (sold in 0.5 lb bags), select a pickup location, and receive a Square invoice via email. The site also captures mailing list subscribers for drop notifications and provides static catering/about/contact pages.

## Core Value

Customers can preorder frozen BBQ from a live drop without overselling — capacity is enforced, pickup is clear, and confirmation is immediate.

## Requirements

### Validated

- ✓ Frozen product catalog pulled from Square API — existing
- ✓ Live inventory counts from Square Inventory API — existing
- ✓ Cart with localStorage persistence — existing
- ✓ Pre-configured package bundles (Family, Backyard Host, Freezer Stock-Up) — existing
- ✓ Checkout with customer info, pickup selection, and Square invoice creation — existing
- ✓ Confirmation page after order placement — existing
- ✓ Sauce bump logic (auto-add sauce when meat ordered without it) — existing
- ✓ Dark, smoky visual theme with ember/smoke color palette — existing
- ✓ Mobile-first responsive design — existing

### Active

- [ ] Supabase integration for drops, orders, mailing list, and email logs
- [ ] Database-driven drops model (configurable products, capacity, pickup options per drop)
- [ ] Mailing list signup (home page section + site-wide footer)
- [ ] Resend integration for confirmation emails and mailing list
- [ ] Catering page with static menu/pricing and email CTA (catering@bigmattsbbq.com)
- [ ] About page (static)
- [ ] Contact page (static)
- [ ] Site-wide navigation (Home, Frozen Drops, Catering, About, Contact)
- [ ] Confirmation email with order summary, pickup details, and pay-at-pickup reminder
- [ ] Mailing list opt-in during checkout flow
- [ ] Atomic inventory enforcement against overselling

### Out of Scope

- Online payment processing — payment collected at pickup (Square invoices for tracking only)
- Admin dashboard — manage drops directly in Supabase for MVP
- Shipping frozen products — pickup only
- Subscriptions or recurring billing — not part of the drop model
- Complex catering scheduling — static page with email CTA instead
- SMS notifications or waitlists — future consideration
- Accounting system integrations — not needed for MVP

## Context

- **Existing codebase**: Next.js 16 App Router with TypeScript, Tailwind CSS, React 18
- **Current state**: Working frozen ordering flow with Square as sole backend (catalog, inventory, customers, invoices)
- **Expanding to**: Hybrid approach — Square for catalog/inventory/payments, Supabase for drops config, order tracking, mailing list, email logs
- **Pickup locations**: Cache Valley and Utah County, with predefined dates/time windows per drop
- **Design system**: Custom Tailwind theme with `ember` (warm orange-red) and `smoke` (dark browns) palettes, Playfair Display + Source Sans 3 fonts
- **PRD**: Approved for MVP build, target Q1 2026 (see `public/PRD.pdf`)

## Constraints

- **Tech stack**: Next.js App Router, TypeScript, Tailwind CSS — already established
- **Payment**: Square invoices (keep existing integration) — no new payment processing
- **Inventory**: Square Inventory API remains source of truth — no migration to Supabase
- **Database**: Supabase (Postgres) for new data models (drops, orders, mailing list, email logs)
- **Email**: Resend for transactional and mailing list emails
- **Hosting**: Vercel (implicit from Next.js stack)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep Square invoices | Already working, familiar flow, PRD non-goal is online *payment processing* not invoicing | — Pending |
| Supabase for new data | Need structured drops/orders/mailing list without overloading Square | — Pending |
| Square stays for inventory | Atomic inventory is already handled by Square API; avoid dual-source complexity | — Pending |
| Resend for email | Simple API, good for both transactional confirmations and mailing list | — Pending |
| Database-driven drops (no admin UI) | Flexibility to configure drops without redeploy; admin dashboard deferred to post-MVP | — Pending |
| Home page keeps ordering focus | Current layout works well as a sales funnel; catering/about/contact are secondary nav | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-03 after initialization*
