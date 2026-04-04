# Requirements: Big Matt's BBQ

**Defined:** 2026-04-03
**Core Value:** Customers can preorder frozen BBQ from a live drop without overselling — capacity is enforced, pickup is clear, and confirmation is immediate.

## v1 Requirements

### Data Foundation

- [ ] **DATA-01**: Supabase schema created with tables for drops, drop_pickup_options, orders, mailing_list, and email_logs
- [ ] **DATA-02**: Row-level security enabled on all Supabase tables from initial creation
- [ ] **DATA-03**: Drops are managed in Supabase with configurable products, capacity, and pickup options per drop
- [ ] **DATA-04**: Each drop has a state (upcoming/active/closed) that controls ordering availability
- [ ] **DATA-05**: Drop pickup options (dates, locations, time windows) are stored in Supabase and replace hardcoded config

### Ordering & Checkout

- [ ] **ORD-01**: Capacity reservation uses atomic Supabase slot reservation before Square API calls to prevent overselling
- [ ] **ORD-02**: Order record is saved to Supabase with a JSONB cart snapshot at time of purchase
- [ ] **ORD-03**: Idempotency keys are deterministic (derived from order data) to prevent duplicate orders
- [ ] **ORD-04**: Checkout validates that the drop is active before accepting orders
- [ ] **ORD-05**: Products display sold-out indicators in real-time when capacity is reached

### Email & Mailing List

- [ ] **MAIL-01**: Branded confirmation email sent via Resend with order summary, pickup details, and pay-at-pickup reminder
- [ ] **MAIL-02**: User can sign up for the mailing list from a section on the home page
- [ ] **MAIL-03**: User can sign up for the mailing list from the site-wide footer
- [ ] **MAIL-04**: User can opt into the mailing list during checkout
- [ ] **MAIL-05**: Mailing list subscribers can unsubscribe via link in emails
- [ ] **MAIL-06**: Drop notification emails can be broadcast to mailing list subscribers via Resend

### Content & Navigation

- [ ] **NAV-01**: Site-wide navigation with links to Home, Frozen Drops, Catering, About, and Contact
- [ ] **PAGE-01**: Catering page displays static menu and pricing with CTA to email catering@bigmattsbbq.com
- [ ] **PAGE-02**: About page displays static content about Big Matt's BBQ
- [ ] **PAGE-03**: Contact page displays static contact information

## v2 Requirements

### Administration

- **ADMIN-01**: Admin dashboard to manage drops, view orders, and manage mailing list
- **ADMIN-02**: Admin can create/edit/close drops without editing the database directly

### Notifications

- **NOTF-01**: SMS notifications for order confirmation
- **NOTF-02**: Waitlist signup when a product is sold out

## Out of Scope

| Feature | Reason |
|---------|--------|
| Online payment processing | Payment collected at pickup; Square invoices are for tracking only |
| Shipping frozen products | Pickup-only model for freshness and logistics |
| Subscriptions / recurring billing | Not part of the drop model |
| Complex catering scheduling | Static page with email CTA is sufficient for MVP |
| Accounting system integrations | Not needed for MVP operations |
| Admin dashboard | Manage drops directly in Supabase for MVP (deferred to v2) |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 2 | Pending |
| DATA-04 | Phase 2 | Pending |
| DATA-05 | Phase 2 | Pending |
| ORD-01 | Phase 3 | Pending |
| ORD-02 | Phase 3 | Pending |
| ORD-03 | Phase 3 | Pending |
| ORD-04 | Phase 2 | Pending |
| ORD-05 | Phase 2 | Pending |
| MAIL-01 | Phase 3 | Pending |
| MAIL-02 | Phase 4 | Pending |
| MAIL-03 | Phase 4 | Pending |
| MAIL-04 | Phase 3 | Pending |
| MAIL-05 | Phase 4 | Pending |
| MAIL-06 | Phase 4 | Pending |
| NAV-01 | Phase 4 | Pending |
| PAGE-01 | Phase 4 | Pending |
| PAGE-02 | Phase 4 | Pending |
| PAGE-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-03*
*Last updated: 2026-04-03 after roadmap creation*
