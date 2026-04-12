# Roadmap: Big Matt's BBQ v1.0

**Milestone:** v1.0 — Website Refresh & Frozen Drops  
**Core Value:** Customers can preorder frozen BBQ from a live drop without overselling — capacity is enforced, pickup is clear, and confirmation is immediate.

---

## Phase 1: Foundation
**Status:** Complete  
**Goal:** Establish Supabase as the persistence layer for drops, orders, mailing list, and email logs — with RLS enforced and atomic reservation RPCs ready for Phase 2+ callers.  
**Requirements:** DATA-01, DATA-02  
**Directory:** `.planning/phases/01-foundation/`

---

## Phase 2: Drop Config & Storefront
**Status:** Complete (gaps closed in Phase 3)  
**Goal:** Wire the storefront to a database-driven drops model — live pickup options from Supabase, drop state controls ordering availability, real-time sold-out indicators.  
**Requirements:** DATA-03 (partial → Phase 3), DATA-04, DATA-05, ORD-04, ORD-05 (partial → Phase 3)  
**Directory:** `.planning/phases/02-drop-config-storefront/`

---

## Phase 3: Capacity Enforcement (Gap Closure)
**Status:** Planning  
**Goal:** Close the critical gap from the v1.0 audit — wire `reserve_pickup_slot` into the checkout flow so capacity counters are atomically updated after each order, satisfying the core value of no overselling. Also resolves a Phase 3 blocking type mismatch and cleans up stale artifacts.  
**Requirements:** DATA-03, ORD-05  
**Gap Closure:** Closes gaps from v1.0-MILESTONE-AUDIT.md  
**Plans:** 2 plans  
**Directory:** `.planning/phases/03-capacity-enforcement/`

Plans:
- [x] 03-01-PLAN.md — Wire reserve_pickup_slot RPC into checkout route with tests and CheckoutClient productName mapping
- [x] 03-02-PLAN.md — Fix place_preorder types, remove dead getSupabaseEnv code, update Phase 1/2 planning artifacts

---

## Phase 4: Checkout & Email
**Status:** Pending  
**Goal:** Save orders to Supabase, use atomic pre-reservation before Square API calls (ORD-01), send branded confirmation emails via Resend, and add mailing list opt-in at checkout.  
**Requirements:** ORD-01, ORD-02, ORD-03, MAIL-01, MAIL-04  
**Directory:** `.planning/phases/04-checkout-email/` *(to be created)*

---

## Phase 5: Content & Mailing List
**Status:** Pending  
**Goal:** Complete the site — site-wide navigation, catering/about/contact static pages, mailing list signup on home page and footer, unsubscribe flow, and drop notification broadcast via Resend.  
**Requirements:** MAIL-02, MAIL-03, MAIL-05, MAIL-06, NAV-01, PAGE-01, PAGE-02, PAGE-03  
**Directory:** `.planning/phases/05-content-mailing/` *(to be created)*

---

## Summary

| Phase | Name | Status | Requirements |
|-------|------|--------|-------------|
| 1 | Foundation | Complete | DATA-01, DATA-02 |
| 2 | Drop Config & Storefront | Complete (gaps) | DATA-03–05, ORD-04, ORD-05 |
| 3 | Capacity Enforcement | Planning | DATA-03, ORD-05 (gap closure) |
| 4 | Checkout & Email | Pending | ORD-01–03, MAIL-01, MAIL-04 |
| 5 | Content & Mailing List | Pending | MAIL-02–06, NAV-01, PAGE-01–03 |

---
*Last updated: 2026-04-12 — Phase 3 plans created*
