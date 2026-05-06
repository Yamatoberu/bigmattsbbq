# Milestones — Big Matt's BBQ

---

## v1.0 — Website Refresh & Frozen Drops

**Shipped:** 2026-04-22
**Phases:** 1–5 | **Plans:** 19
**Timeline:** 2026-04-03 → 2026-04-22 (19 days)
**LOC:** ~3,730 TypeScript

### Delivered

Transformed a hardcoded Next.js/Square storefront into a fully database-driven frozen BBQ drop platform with Supabase persistence, atomic capacity enforcement, and a complete mailing list system.

### Key Accomplishments

1. **Supabase foundation** — 5-table PostgreSQL schema with RLS, atomic `reserve_pickup_slot` RPC, typed Node.js client
2. **Database-driven drops** — live pickup options from Supabase replace hardcoded config; drop state gates ordering
3. **Atomic capacity enforcement** — `reserve_pickup_slot` called before Square API; no overselling possible
4. **Deterministic idempotency** — SHA-256 keys derived from order data prevent duplicate Square calls on retry
5. **Order persistence** — JSONB cart snapshot saved to Supabase `orders` after each successful checkout
6. **Mailing list system** — signup (home + footer + checkout opt-in), Jose HS256 unsubscribe JWT, Resend broadcast with email audit trail
7. **Site-wide navigation** — NavBar in layout.tsx with 5 links, mobile drawer, active-route highlight
8. **Static pages** — /catering (tiers + booking), /about, /contact
9. **56 tests green** — unit tests covering inventory join, cart logic, idempotency, mailing list, broadcast, unsubscribe token

### Requirements Coverage

19/20 v1 requirements satisfied. 1 deferred:
- MAIL-01 (branded Resend confirmation) — Square invoice covers MVP; deferred to v1.1 via D-10

### Known Deferred Items at Close: 7

(See STATE.md Deferred Items for full list)
- 2 phases with partial human UAT (Phases 4 and 5)
- 2 verification files at human_needed status
- 3 quick task directories missing closing summaries

### Archive

- Full roadmap: `.planning/milestones/v1.0-ROADMAP.md`
- Requirements archive: `.planning/milestones/v1.0-REQUIREMENTS.md`
- Milestone audit: `.planning/milestones/v1.0-MILESTONE-AUDIT.md`
