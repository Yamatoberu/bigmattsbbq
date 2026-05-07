# Roadmap: Big Matt's BBQ

## Milestones

- ✅ **v1.0 — Website Refresh & Frozen Drops** — Phases 1–5 (shipped 2026-04-22)
- 📋 **v1.1** — Phases 6+ (planned)

---

## Phases

<details>
<summary>✅ v1.0 — Website Refresh & Frozen Drops (Phases 1–5) — SHIPPED 2026-04-22</summary>

- [x] Phase 1: Foundation (2/2 plans) — Supabase schema, RLS, atomic reservation RPCs
- [x] Phase 2: Drop Config & Storefront (5/5 plans) — database-driven drops, live pickup options, sold-out indicators
- [x] Phase 3: Capacity Enforcement (2/2 plans) — reserve_pickup_slot wired into checkout
- [x] Phase 4: Checkout & Email (2/2 plans) — deterministic idempotency, order persistence, mailing list opt-in
- [x] Phase 5: Content & Mailing List (8/8 plans) — NavBar, static pages, mailing list signup/unsubscribe/broadcast

Full archive: `.planning/milestones/v1.0-ROADMAP.md`

</details>

---

### 📋 v1.1 (Planned)

#### Phase 6: Code Review Wave 1

**Goal:** Fix the four pre-drop issues from the code review before the next active drop opens.

**Issues addressed:**
- Issue 1 — `/api/test-seed` has no access control (🔴 Critical)
- Issue 2 — Capacity release logic duplicated 4× in checkout route (🔴 Critical)
- Issue 5 — `CheckoutClient` compares item ID to variation ID (🟠 High)
- Issue 8 — `confirmation/page.tsx` uses synchronous `searchParams` (🟡 Medium)

**Files in scope:** `app/api/test-seed/route.ts`, `app/api/checkout/route.ts`, `components/CheckoutClient.tsx`, `app/confirmation/page.tsx`

**Plans:** 3 plans

Plans:
- [x] 06-01-PLAN.md — Add sandbox guard to /api/test-seed (Issue 1)
- [x] 06-02-PLAN.md — Extract releaseReserved helper in checkout route, parallelize via allSettled (Issue 2)
- [x] 06-03-PLAN.md — Remove dead branch in CheckoutClient sauceVariationIds + async searchParams in confirmation page (Issues 5 & 8)

---

#### Phase 7: Code Review Wave 2

**Goal:** Fix the four correctness and safety issues from Wave 2 of the code review — nested `<main>` regression, stale-closure risk in CartContext, UNSUBSCRIBE_SECRET coupling, and runaway polling in useActiveDrop.

**Issues addressed:**
- Issue 3 — Nested `<main>` elements on checkout/confirmation/orders pages (🟠 High)
- Issue 4 — `CartContext` `useMemo` has incomplete dependency array (🟠 High)
- Issue 7 — `UNSUBSCRIBE_SECRET` falls back to `BROADCAST_SECRET` (🟡 Medium)
- Issue 12 — `useActiveDrop` polls indefinitely even when drop is inactive (🟡 Medium)

**Files in scope:** `app/layout.tsx`, `app/checkout/page.tsx`, `app/confirmation/page.tsx`, `app/orders/page.tsx`, `components/cart/CartContext.tsx`, `lib/unsubscribeToken.ts`, `.env.example`, `components/hooks/useActiveDrop.ts`

**Plans:** 4/4 plans complete

Plans:
- [x] 07-01-PLAN.md — Replace `<main>` wrapper in app/layout.tsx with `<div id="page-content">` (Issue 3)
- [x] 07-02-PLAN.md — Wrap CartContext callbacks in useCallback and complete useMemo dep array (Issue 4)
- [x] 07-03-PLAN.md — Decouple UNSUBSCRIBE_SECRET from BROADCAST_SECRET fallback + .env.example docs (Issue 7)
- [x] 07-04-PLAN.md — Stop useActiveDrop polling when drop is null/closed/inactive (Issue 12)

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|---------------|--------|-----------|
| 1. Foundation | v1.0 | 2/2 | Complete | 2026-04-04 |
| 2. Drop Config & Storefront | v1.0 | 5/5 | Complete | 2026-04-12 |
| 3. Capacity Enforcement | v1.0 | 2/2 | Complete | 2026-04-12 |
| 4. Checkout & Email | v1.0 | 2/2 | Complete | 2026-04-17 |
| 5. Content & Mailing List | v1.0 | 8/8 | Complete | 2026-04-22 |
| 6. Code Review Wave 1 | v1.1 | 3/3 | Complete | 2026-05-06 |
| 7. Code Review Wave 2 | v1.1 | 4/4 | Complete   | 2026-05-07 |

---
*Last updated: 2026-05-06 — Phase 7 (Code Review Wave 2) plans created (4 plans, all Wave 1 parallel)*
