# Phase 11: Analytics & AI Reviews - Context

**Gathered:** 2026-08-24
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase ships the two remaining SCA Tracker surfaces from REQUIREMENTS.md: Analytics trend views (total score over time, gap-to-first over time, key judging category trends) and AI Reviews (a list of all stored `cook_ai_review` rows plus a single review's detail page). It reads via the Phase 9 service-role client (`getScaSupabaseClient()`), reuses `deriveScoreMetrics()` for gap-to-first, and reuses `getAllCooksWithScores()` (already ordered chronologically by `cooked_at`) as the data source for all three trend charts — no new query needed for Analytics. AI Reviews needs one new query joining `cook_ai_review` → `cook` → `competition`. This phase adds the final two top-level nav entries (`Analytics`, `AI Reviews`) that Phase 9's D-08 originally scoped for the SCA shell. It does NOT ship any write/create/edit/delete flows or new auth (out of scope for the whole v2.0 milestone).

</domain>

<decisions>
## Implementation Decisions

### Gray-area discussion — not completed interactively
A multi-select gray-area question (trend chart implementation, AI Reviews scope/type badge, category trend layout, AI Reviews list ordering) was presented via AskUserQuestion but received no user response — the same situation Phase 9 and Phase 10's discussions hit. Per the project's `mode: yolo` config and Auto Mode guidance, Claude proceeded with the following documented defaults instead of blocking. The user can redirect any of these after reviewing this file or the shipped result.

### Trend chart implementation
- **D-01:** Trend charts are hand-built lightweight inline SVG (a shared `TrendChart`-style component), not a new charting library dependency. Rationale: the app currently has zero UI/charting dependencies beyond `next`/`react`/`zod`/`resend`/`@react-email/*`/`@supabase/supabase-js` (confirmed via `package.json`); data volume is small (21 cooks, 20 scores live today per Phase 10's re-verification) so a simple polyline/points SVG is trivial to build and fully themeable with the existing `ember`/`smoke`/`gold` tokens, with no bundle-size or new-dependency tradeoff to accept.
- **D-02:** Charts render server-side as static SVG (Server Components, no client-side charting JS) with no hover/tooltip interactivity in this phase — consistent with the rest of `app/sca` being server-rendered with no client components beyond `ScaNavBar`. Axis labels and key data points (e.g. the value at each point) are shown directly on/near the chart rather than requiring hover.

### AI Reviews scope & type badge
- **D-03:** The AI Reviews list (AIRV-01) shows **every** `cook_ai_review` row regardless of `review_type`, not filtered to rows literally typed `"appearance"`. A live data check found only 3 stored rows: two `review_type = "appearance"`, one `review_type = "photo_review"` — filtering out the third would hide real content the requirement's own COOK-02 precedent (Phase 10 D-10) already treats generically as "AI review history," not appearance-specific. `review_type` renders as a badge/label on each list item and on the detail page (falling back to em dash per the project's existing null-handling convention, D-04/Phase 10, if `review_type` is null).
- **D-04:** AIRV-02's "prompt if present" is handled the same way: render the `prompt` field when non-null, omit the row/section entirely when null — no "Prompt: —" placeholder, matching Phase 10's D-08 no-filler convention for nullable fields.

### Category trend layout
- **D-05:** ANLY-03's five judging categories (appearance, doneness, texture, taste, overall impression) render as five separate small single-metric trend charts (small multiples), not one combined multi-line chart. Rationale: mobile-first is a hard project constraint (CLAUDE.md); five overlapping lines in one chart is hard to read at phone width, while five stacked single-metric charts scan cleanly and mirror the existing small-card pattern already established by `SummaryCards` on the Dashboard.

### AI Reviews list ordering
- **D-06:** The AI Reviews list is a flat list sorted most-recent-first by `created_at`, each item showing its linked cook (`cookColumnLabel`) and competition inline — no grouping by cook or competition. This matches the existing `sortCooksByRecencyDesc` most-recent-first convention from Phase 10's Cooks index (10-10-PLAN) rather than introducing a new grouped-list pattern.

### Navigation
- **D-07:** `ScaNavBar`'s `scaNavLinks` gains `Analytics` (`/sca/analytics`) and `AI Reviews` (`/sca/ai-reviews`) entries, completing the five-item nav originally scoped by Phase 9's D-08 (Dashboard, Competitions, Analytics, AI Reviews) plus Phase 10's added `Cooks` entry. Final nav order: Dashboard, Competitions, Cooks, Analytics, AI Reviews. AI Review Detail stays drill-down-only (reached via a list item link), matching the Cook Detail / Competition Detail precedent.

### Claude's Discretion
- Exact route/file names beyond `/sca/analytics` and `/sca/ai-reviews` + `/sca/ai-reviews/[id]` implied by the IA above — planner's call if a different segment name reads more naturally.
- Exact SVG chart dimensions, point/line styling, and typography within the established ember/smoke/gold design tokens.
- Whether trend charts share one `TrendChart` component parameterized by metric, or per-metric wrapper components — planner's call, but per D-01 there should be no duplicated SVG-path-building logic across the 3 (score, gap) + 5 (category) = up to 7 chart instances rendered by this phase.
- Whether the new AI Reviews query lives in `lib/sca/queries.ts` alongside the existing query functions, or a new sibling file — likely `lib/sca/queries.ts` for consistency, but planner's call.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & requirements
- `.planning/PROJECT.md` — Current Milestone: v2.0 SCA Tracker section
- `.planning/REQUIREMENTS.md` — ANLY-01..03, AIRV-01..02 (this phase's requirements)
- `.planning/ROADMAP.md` — Phase 11 entry (goal, success criteria)

### Phase 9/10 foundation (built by, and must be reused, not re-implemented)
- `lib/supabase-sca.ts` — `getScaSupabaseClient()`, the server-only service-role client scoped to the `sca` schema
- `lib/database-sca.types.ts` — generated types for `chef`, `competition`, `cook`, `cook_ai_review`, `cook_detail`, `cook_weather`, `score`
- `lib/sca/scoring.ts` — `deriveScoreMetrics()` / `PERFECT_SCORE` — the ONE place `distance_from_winning`/`distance_from_perfect` are computed; every trend needing gap-to-first imports this function
- `lib/sca/queries.ts` — `getAllCooksWithScores()` already returns every cook + joined `score` + joined `competition` summary, ordered ascending by `cooked_at` — the direct data source for all three ANLY trend charts, no new query needed for Analytics. `parseScaId()` for the AI Review detail route's `[id]` validation, mirroring the Cook/Competition detail pattern.
- `lib/sca/types.ts` — `CookWithScore`, `ScaCookAiReviewRow` (aliased from generated types), `CookCompetitionSummary` — extend with an AI-review-with-cook-and-competition view type for the new query
- `lib/sca/format.ts` — `formatScoreValue()`, `formatCookDate()`, `cookColumnLabel()`, `EM_DASH` — reuse directly for trend axis labels/point values and AI Review list/detail display
- `components/sca/ScaNavBar.tsx` — `scaNavLinks` array is the integration point for D-07
- `app/sca/layout.tsx`, `components/sca/ScaFooter.tsx` — the on-brand shell this phase's pages render inside
- `components/sca/SummaryCards.tsx` — reference pattern for the small-multiple card layout D-05 asks trend charts to mirror

### Existing patterns to follow
- `app/sca/cooks/page.tsx`, `app/sca/cooks/[id]/page.tsx` — most recent list+detail pair shipped (Phase 10 gap closure); closest analog for the new `/sca/ai-reviews` list+detail pair, including `sortCooksByRecencyDesc`-style sorting and `parseScaId` + `notFound()` handling
- `lib/logger.ts` — `logError()` pattern for any caught SSR fetch error
- `tailwind.config.ts` / `app/globals.css` — `ember`/`smoke`/`gold`/`pit` tokens, `.glass-card`, `.badge`, `.section-spacing` utility classes — reuse as-is, no new visual system, no new charting dependency (D-01)

### Known Phase 9/10 code-review findings relevant to this phase
- `.planning/phases/09-foundation-subdomain-routing/09-REVIEW.md` — WR-02 (raw Supabase error messages should not be rendered to public visitors; use `logError` + a generic message for any new SSR data fetch this phase adds)

No external specs beyond the above — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getAllCooksWithScores()` (`lib/sca/queries.ts`) — returns exactly the chronological cook+score+competition data all three Analytics trends need; zero new query required for ANLY-01..03
- `deriveScoreMetrics()` (`lib/sca/scoring.ts`) — required for the gap-to-first (ANLY-02) trend's y-values
- `formatCookDate()` / `formatScoreValue()` / `cookColumnLabel()` (`lib/sca/format.ts`) — reusable for chart axis labels, point values, and AI Review list/detail display text
- `ScaNavBar` (`components/sca/ScaNavBar.tsx`) — `scaNavLinks` const array is a one-line edit point to add `Analytics`/`AI Reviews` (D-07)

### Established Patterns
- `app/sca/cooks/page.tsx` / `app/sca/cooks/[id]/page.tsx` demonstrate the exact list+detail shape this phase should mirror for AI Reviews: `async` Server Component, `try/catch` around the Supabase call, `logError(...)` on failure, `export const dynamic = "force-dynamic"`, `parseScaId` + `notFound()` for the detail route
- No client components exist under `app/sca` beyond `ScaNavBar` — trend chart pages should stay Server Components rendering static SVG per D-02, no new client-side charting JS

### Integration Points
- `components/sca/ScaNavBar.tsx` `scaNavLinks` array — add `Analytics` and `AI Reviews` entries here (D-07)
- New routes: `/sca/analytics` (trend views), `/sca/ai-reviews` (list), `/sca/ai-reviews/[id]` (detail)
- New query needed in `lib/sca/queries.ts`: a `getAllAiReviews()`-style function joining `cook_ai_review` → `cook` (for `cookColumnLabel`) → `competition` (for AIRV-02's "linked back to its cook and competition")

</code_context>

<specifics>
## Specific Ideas

Live data checked directly against Supabase during this discussion (not from REQUIREMENTS.md): 21 cooks, 20 scores, 3 `cook_ai_review` rows exist today (`review_type` values seen: `"appearance"` ×2, `"photo_review"` ×1; `model` values seen: `"GPT-5 Codex visual review"`, `"GPT-5.6 Sol"`). This confirms AI Reviews is a low-volume feature for now (D-03's "show everything, no filtering" default) and that `review_type`/`model` are free-form-ish text worth badge-style display rather than a fixed enum treatment.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (The gray-area question was presented but unanswered; no scope-creep ideas were raised.)

</deferred>

---

*Phase: 11-Analytics & AI Reviews*
*Context gathered: 2026-08-24*
