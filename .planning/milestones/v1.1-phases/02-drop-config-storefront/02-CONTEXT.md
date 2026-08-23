# Phase 2: Drop Config & Storefront - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace hardcoded ordering config with live Supabase drop data. The ordering page reads drop state, pickup options, and capacity from the database. When no drop is active, visitors see a teaser page with mailing list CTA. When active, products display with sold-out indicators driven by global capacity. Checkout validates drop state server-side.

</domain>

<decisions>
## Implementation Decisions

### Drop State UI
- **D-01:** When no drop is active (or drop is closed), show a teaser page with Big Matt's branding, a "next drop coming soon" message, and a mailing list signup CTA.
- **D-02:** When a drop is active, show the drop title (e.g. "April 2026 Drop") and order cutoff date/time. Creates urgency without being pushy.
- **D-03:** A closed drop shows the same teaser page as no-drop — functionally equivalent.
- **D-04:** Drop state is checked server-side in page.tsx and passed to the client component. No flash of wrong state. Mirrors the existing checkout pattern (sauceVariationId passed from server).

### Pickup Option Display
- **D-05:** Pickup options displayed as selectable cards showing location name, date, and time window. Tappable on mobile. Follows the existing PackageCard visual pattern.
- **D-06:** No capacity counts shown on pickup cards. Only indicate when a location is fully sold out (disabled card).
- **D-07:** Customer selects pickup location at checkout, not on the ordering page. Keeps browsing simple — matches current flow.

### Sold-Out Behavior
- **D-08:** Sold-out products show a greyed/muted card with a "Sold Out" badge overlay. Add-to-cart button disabled. Product stays visible so customers see what was available.
- **D-09:** Sold-out status is based on global per-product capacity (not per-location). Customer hasn't selected a location while browsing, so global is the right scope.
- **D-10:** Server-side checkout validation rejects orders when the drop is not active or has no capacity remaining.

### Data Migration
- **D-11:** Preset packages (Family Night, Backyard Host, Freezer Stock-Up) stay hardcoded in lib/config.ts. They're a UI convenience that maps to Square catalog items — moving to Supabase adds complexity with no MVP benefit.
- **D-12:** Delete PICKUP_OPTIONS from lib/config.ts entirely. All pickup data comes from Supabase. Clean break, no dead code.
- **D-13:** New `/api/drop` endpoint serves drop state + pickup options from Supabase. Separate from existing `/api/frozen-items` (which stays Square-only). Keeps concerns clean.

### Claude's Discretion
- Live update mechanism for sold-out detection (polling interval, approach, frequency)
- Exact layout and spacing of pickup option cards
- Loading skeleton design for drop data fetch
- Error handling when Supabase drop query fails
- PickupOption type definition shape in lib/types.ts

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Spec
- `public/PRD.pdf` — Approved PRD for MVP build; defines the full product scope and drop model
- `.planning/PROJECT.md` — Project context, constraints, and key decisions
- `.planning/REQUIREMENTS.md` — DATA-03, DATA-04, DATA-05, ORD-04, ORD-05 are this phase's requirements

### Phase 1 Foundation
- `.planning/phases/01-foundation/01-CONTEXT.md` — Capacity model decisions (D-01 through D-10), schema design
- `.planning/phases/01-foundation/01-01-SUMMARY.md` — Migration SQL details, Supabase client pattern
- `supabase/migrations/0001_foundation.sql` — Live schema with drops, drop_pickup_options tables

### Existing Codebase Patterns
- `lib/config.ts` — Current hardcoded PACKAGES and PICKUP_OPTIONS (PICKUP_OPTIONS to be deleted)
- `lib/square.ts` — API client pattern; new Supabase queries follow this centralized approach
- `lib/supabase.ts` — Server-only singleton client created in Phase 1
- `components/OrderLanding.tsx` — Current ordering page composite component (will be modified)
- `components/CheckoutClient.tsx` — Current checkout flow (pickup selection moves here from config)
- `components/hooks/useFrozenItems.ts` — Data-fetching hook pattern to mirror for drop data
- `components/PackageCard.tsx` — Card visual pattern to follow for pickup option cards

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/PackageCard.tsx` — Card component pattern for selectable options; pickup cards can follow this
- `components/SectionHeader.tsx` — Section header with eyebrow/title/subtitle for teaser and drop header
- `components/hooks/useFrozenItems.ts` — Hook pattern with loading/error states; mirror for `useActiveDrop`
- `components/NavBar.tsx` — Sticky nav with cart badge; unchanged
- `components/Footer.tsx` — Page footer; teaser page reuses this
- `lib/supabase.ts` — `getSupabaseClient()` singleton for all new API routes
- `lib/logger.ts` — `logError()` for new API route error handling

### Established Patterns
- Server components pass env/config to client components (checkout pattern)
- API routes use try/catch + logError + requestId tracing
- Client hooks fetch from API routes with loading/error/data state
- Named exports throughout; no default exports in lib/ or components/
- Tailwind CSS with ember/smoke custom palette

### Integration Points
- `app/page.tsx` — Will need to fetch drop state server-side and pass to OrderLanding
- `app/api/drop/route.ts` — New API route for drop state + pickup options
- `components/OrderLanding.tsx` — Conditional rendering based on drop state
- `components/CheckoutClient.tsx` — Pickup selection switches from config to Supabase data
- `lib/config.ts` — Remove PICKUP_OPTIONS export; update PickupOption type if needed
- `lib/types.ts` — Add drop-related types (DropDTO, PickupOptionDTO)

</code_context>

<specifics>
## Specific Ideas

- Teaser page should feel on-brand (smoky/ember palette) and capture emails for the mailing list — this bridges to Phase 4's mailing list work
- Pickup option cards should be visually consistent with PackageCard but simpler (no price, just location + date + time)
- The 5-bag buffer between global capacity (200) and sum of per-location capacity (195) means global sold-out triggers before all locations are individually full
- Drop title is human-readable (e.g. "April 2026 Drop") — comes from drops.title column

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-drop-config-storefront*
*Context gathered: 2026-04-10*
