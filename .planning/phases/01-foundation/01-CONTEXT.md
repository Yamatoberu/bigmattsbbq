# Phase 1: Foundation - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Set up the Supabase project with all tables (drops, drop_pickup_options, orders, mailing_list, email_logs), enforce RLS on every table, deploy the `reserve_pickup_slot` Postgres RPC function, create a typed Supabase client in `lib/supabase.ts`, and seed a test drop record. No UI work — pure infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Capacity Model
- **D-01:** Capacity is enforced at two levels: global per-product AND per-pickup-location per-product. Strictest wins — reservation fails if either cap is reached.
- **D-02:** Capacity is tracked per product (pulled pork and brisket sell out independently), not as a combined bag total.
- **D-03:** Capacity unit is bag count (integer). Each 0.5 lb bag = 1 unit of capacity.

### Reservation Behavior
- **D-04:** `reserve_pickup_slot` fails immediately (returns error/false) when capacity is reached. No hold-and-expire pattern.
- **D-05:** If the reservation succeeds but downstream Square calls fail, the reservation is automatically released (rollback function).
- **D-06:** Atomicity is enforced via conditional counter update (`UPDATE ... SET reserved_count = reserved_count + N WHERE reserved_count + N <= capacity`). No explicit row locks.

### Seed Data
- **D-07:** Test drop has 3 pickup locations: Cache Valley, Utah County, and Sandy (Salt Lake County). Sandy is a real upcoming location, not fictional.
- **D-08:** Global capacity: 200 bags pulled pork, 200 bags brisket. Per-location capacity: 65 bags of each product per location.

### Supabase Client
- **D-09:** Supabase client is server-only. All Supabase calls go through API routes, matching the existing `lib/square.ts` pattern. No client-side Supabase SDK.
- **D-10:** Types are auto-generated via `supabase gen types` CLI. Generated types live in a dedicated file, not hand-written in `lib/types.ts`.

### Claude's Discretion
- Column naming conventions, index strategy, and RLS policy specifics
- Migration file organization (single migration vs per-table)
- Generated types file location and import pattern
- Release/rollback function naming and signature

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Spec
- `public/PRD.pdf` — Approved PRD for MVP build; defines the full product scope and drop model
- `.planning/PROJECT.md` — Project context, constraints, and key decisions
- `.planning/REQUIREMENTS.md` — DATA-01 and DATA-02 are the requirements for this phase

### Existing Codebase Patterns
- `lib/square.ts` — Centralized API client pattern that `lib/supabase.ts` should mirror
- `lib/env.ts` — Environment variable validation pattern for adding Supabase credentials
- `lib/types.ts` — Shared TypeScript interfaces; new Supabase DTOs will follow existing conventions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/env.ts` (`getSquareEnv()`): Validated env loading pattern — extend for `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- `lib/logger.ts` (`logError`): Structured error logging with requestId — reuse for Supabase errors
- `lib/types.ts`: Central type registry — Supabase-related DTOs (drop, pickup option, order) will be added here or imported from generated types

### Established Patterns
- All external API calls centralized in a single `lib/` module (`square.ts`) — `supabase.ts` follows this
- API routes use `try/catch` + `logError` + `requestId` tracing
- Zod for request validation at API boundaries
- `SquareError` class wraps API failures with HTTP status — similar wrapper may be useful for Supabase errors

### Integration Points
- `lib/env.ts` — Add Supabase env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- `.env.example` — Document new required vars
- `app/api/` — Future phases will add routes that call `lib/supabase.ts`
- `vitest.config.ts` — Tests for the reservation function and seed data verification

</code_context>

<specifics>
## Specific Ideas

- Sandy (Salt Lake County) is a real planned pickup location, not a test fixture — model it as a first-class location in the seed
- Capacity numbers (200 global, 65 per location per product) reflect actual business expectations and leave a 5-bag buffer at the global level (3 × 65 = 195 < 200)
- Two products tracked independently: pulled pork and brisket — the schema must support per-product capacity at both global and location levels

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-04*
