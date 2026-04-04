# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-03)

**Core value:** Customers can preorder frozen BBQ from a live drop without overselling — capacity is enforced, pickup is clear, and confirmation is immediate.
**Current focus:** Phase 1 — Foundation

## Current Position

Phase: 1 of 4 (Foundation)
Plan: 0 of ? in current phase
Status: Ready to plan
Last activity: 2026-04-03 — Roadmap created, ready for Phase 1 planning

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Initialization: Keep Square for catalog/inventory/payments; Supabase for drops, orders, mailing list, email logs; Resend for email
- Initialization: Enable RLS on all Supabase tables at creation time (before any app code)
- Initialization: Write Supabase slot reservation before Square API calls; email failures are fire-and-forget

### Pending Todos

None yet.

### Blockers/Concerns

- Resend domain DNS verification for bigmattsbbq.com must be initiated before Phase 3 coding begins (up to 48-hour propagation)
- Square API version `2024-12-18` reaches end-of-life ~June 2026 — bump during or before Phase 3

## Session Continuity

Last session: 2026-04-03
Stopped at: Roadmap created — Phase 1 ready to plan
Resume file: None
