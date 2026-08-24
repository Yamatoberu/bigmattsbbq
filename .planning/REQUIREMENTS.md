# Requirements: Big Matt's BBQ — v2.0 SCA Tracker

**Defined:** 2026-08-23
**Core Value:** A chef/spectator can browse, compare, and understand Big Matt's SCA steak cookoff history — cooks, scores, process detail, and AI appearance reviews — in one place that looks and feels like it belongs on bigmattsbbq.com.

## v1 Requirements

Requirements for this milestone. Each maps to a roadmap phase. Read-only only — no create/edit/delete in this milestone.

### Infrastructure (INFRA)

- [x] **INFRA-01**: Server-side Supabase client reads the `sca` schema using the service-role key; the key is never sent to or usable from the browser
- [x] **INFRA-02**: `lib/database.types.ts` includes generated types for the `sca` schema (via Supabase MCP `generate_typescript_types`), alongside the existing `public` schema types
- [x] **INFRA-03**: Requests to `sca.bigmattsbbq.com` are served by this same Next.js app/Vercel project via host-based middleware routing into a dedicated `app/sca` route group, without changing existing bigmattsbbq.com routes or behavior
- [x] **INFRA-04**: SCA Tracker pages reuse the site's existing Tailwind theme (ember/smoke palettes, Playfair Display + Source Sans 3 fonts, existing card/shadow/spacing conventions) rather than introducing a new visual system
- [x] **INFRA-05**: Derived score values (`distance_from_winning = first_place_score - total_score`, `distance_from_perfect = 254.5 - total_score`) are computed by one shared lib function, not duplicated per page

### Dashboard (DASH)

- [x] **DASH-01**: User can view summary cards for latest cooks, best cook, worst cook, average total score, and average gap to first
- [x] **DASH-02**: User can view a comparison table with named-cook columns (e.g. `Wurst - A`, `Wurst - Jackpot`) plus `Worst Cook`, `Best Cook`, and `Cook Averages` aggregate columns, with rows for Competition, Cook, Cook Placement, each judging category, Total Score, Distance From Winning, and Distance From Perfect Score
- [x] **DASH-03**: User can view a data-driven "what stands out" summary derived from real score data (e.g. biggest score swing, closest gap to first, most recent placement change) — not static copy

### Competitions (COMP)

- [x] **COMP-01**: User can view a list of competitions ordered by event date, with city/state/organizer at a glance
- [x] **COMP-02**: User can open a competition detail page showing event metadata (date, city, state, elevation, organizer, notes) and every cook entered at that event
- [x] **COMP-03**: User can compare all cooks within a single competition side-by-side (reusing the comparison table module)

### Cook Detail (COOK)

- [x] **COOK-01**: User can view a single cook's detail page showing its competition, steak label, process variables (trimmed weight, thickness, temps, turn interval, meatrix percentages, rest duration, seasoning/prep/cook notes), and full score breakdown
- [x] **COOK-02**: User can view the AI review history attached to that cook, if any exists, from the cook detail page

### Analytics (ANLY)

- [x] **ANLY-01**: User can view a trend view of total score over time across cooks
- [x] **ANLY-02**: User can view a trend view of gap-to-first (`distance_from_winning`) over time
- [x] **ANLY-03**: User can view trends for key judging categories (appearance, doneness, texture, taste, overall impression) over time

### AI Reviews (AIRV)

- [x] **AIRV-01**: User can view a list of all stored AI appearance reviews across cooks
- [x] **AIRV-02**: User can open a single AI review's detail (model, review type, prompt if present, full comments) linked back to its cook and competition

## v2 Requirements

Deferred to a future milestone. Tracked but not in this roadmap.

### Write Flows

- **WRITE-01**: Chef can log in (Supabase Auth against `chef.auth_user_id`) and create/edit their own cooks, scores, and cook detail
- **WRITE-02**: Chef can request or trigger a new AI appearance review for a cook
- **WRITE-03**: Admin/chef can edit competition metadata

### Platform

- **PLAT-01**: Multi-chef support with per-chef filtering once more than one chef has `auth_user_id` linked
- **PLAT-02**: Public share links for individual cook or competition pages

## Out of Scope

Explicitly excluded from this milestone. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Any create/edit/delete flow (cooks, scores, competitions, AI reviews) | Read-only phase per user directive; RLS/write-auth work belongs to a future milestone |
| New authentication system / chef login | No frontend auth flow exists yet; server-side service-role reads are the sanctioned approach for this phase |
| Exposing the Supabase service-role key to the browser, or any browser-side `sca` schema access | Security constraint — service-role bypasses RLS entirely |
| Changes to existing bigmattsbbq.com storefront functionality (cart, checkout, drops) | Out of scope; only the shared visual language is reused |
| A separate/second Next.js app, Vercel project, or design system for the tracker | Explicitly directed to feel like a natural bigmattsbbq.com subdomain, not a separate product |
| Full DNS cutover / final subdomain activation | DNS is managed outside the repo (Hostinger); this milestone prepares Vercel + app for it and documents the exact remaining manual steps |
| cook_weather display | Table exists in schema but currently has 0 rows live; not part of the requested IA — can be added later if populated |

## Traceability

Populated by the roadmapper during phase creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 9 | Complete |
| INFRA-02 | Phase 9 | Complete |
| INFRA-03 | Phase 9 | Complete |
| INFRA-04 | Phase 9 | Complete |
| INFRA-05 | Phase 9 | Complete |
| DASH-01 | Phase 10 | Complete |
| DASH-02 | Phase 10 | Complete |
| DASH-03 | Phase 10 | Complete |
| COMP-01 | Phase 10 | Complete |
| COMP-02 | Phase 10 | Complete |
| COMP-03 | Phase 10 | Complete |
| COOK-01 | Phase 10 | Complete |
| COOK-02 | Phase 10 | Complete |
| ANLY-01 | Phase 11 | Complete |
| ANLY-02 | Phase 11 | Complete |
| ANLY-03 | Phase 11 | Complete |
| AIRV-01 | Phase 11 | Complete |
| AIRV-02 | Phase 11 | Complete |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 18/18 ✓
- Unmapped: 0

---
*Requirements defined: 2026-08-23*
*Last updated: 2026-08-23 — traceability mapped to Phases 9-11 (roadmap created)*
