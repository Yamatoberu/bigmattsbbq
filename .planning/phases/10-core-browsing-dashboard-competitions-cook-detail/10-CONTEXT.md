# Phase 10: Core Browsing — Dashboard, Competitions & Cook Detail - Context

**Gathered:** 2026-08-23
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase ships the actual browsing surface of the SCA Tracker: the Dashboard (summary cards + comparison table + data-driven "what stands out" insights), the Competitions list and detail pages, and the Cook Detail page — reading live `chef`/`competition`/`cook`/`cook_detail`/`score`/`cook_ai_review` rows via the Phase 9 service-role client (`getScaSupabaseClient()`) and `deriveScoreMetrics()`. One shared comparison-table module is used by both the Dashboard and Competition detail. It does NOT ship Analytics trend views or the AI Reviews list/detail (Phase 11), and ships no write/create/edit/delete flows or new auth (out of scope for the whole v2.0 milestone).

</domain>

<decisions>
## Implementation Decisions

### Gray-area discussion — not completed interactively
A multi-select gray-area question (comparison table scope/behavior, "what stands out" insights, chef/team scope, missing/sparse data handling) was presented via AskUserQuestion but received no user response. Per the project's `mode: yolo` config and Auto Mode guidance — the same situation Phase 9's discussion hit — Claude proceeded with the following documented defaults instead of blocking. The user can redirect any of these after reviewing this file or the shipped result.

### Comparison table scope & behavior
- **D-01:** The shared comparison-table module (used by both Dashboard and Competition detail) takes a list of cooks + which aggregate columns to compute as props/args — one component, two call sites, no duplicated table markup or column logic.
- **D-02:** Dashboard shows ALL cooks recorded (not a rolling "last N") as named columns, plus `Worst Cook`, `Best Cook`, and `Cook Averages` aggregate columns per DASH-02. Rationale: this is a single-chef competition history expected to stay small (dozens, not hundreds, of cooks) for the life of this milestone — pagination/truncation would be premature complexity. Competition detail scopes the same module to only the cooks entered in that one event (naturally bounded, no extra logic needed).
- **D-03:** Wide table handles mobile/narrow viewports via a horizontally-scrolling container (`overflow-x-auto`) around the table, not a stacked/card-per-cook mobile layout — keeps row-to-row comparison intact at any width, consistent with the project's existing "wide content scrolls in its own container" pattern.
- **D-04:** Missing score fields inside the table render as an em dash (`—`), never `0` or blank — a null score reads as "not scored," not "scored zero." This applies to any table cell (comparison table or cook detail breakdown) backed by a nullable `score` column.

### "What stands out" insights
- **D-05:** Compute exactly the three insight types named in DASH-03 — biggest score swing (largest cook-over-cook `total_score` delta, ordered by `cooked_at`), closest gap to first (minimum `distance_from_winning` across all cooks via `deriveScoreMetrics`), and most recent placement change (latest cook's `placement` vs. the previous cook's). No additional insight types invented beyond these three.
- **D-06:** Each insight is real data-driven copy (e.g. "Cook #12 closed the gap to first place by 8.5 points over the prior cook") — never a static/generic sentence. If fewer than 2 scored cooks exist, delta-based insights (swing, placement change) are simply omitted rather than shown broken or as a fallback stub; the closest-gap insight still renders off a single cook if one exists.

### Chef/team scope
- **D-07:** No chef filter is applied in Phase 10 queries — all cooks are read and shown regardless of `chef_id`. The `chef` table's multi-chef support (`auth_user_id`, per PLAT-01) is explicitly a v2 requirement; building a chef-picker or hard-coded single-chef filter now would be premature since only one chef is expected to have data during this milestone and no chef-switching UI exists. If a second chef's data appears before PLAT-01 ships, this is Claude's discretion to revisit, not a blocker for this phase.

### Missing/sparse data handling
- **D-08:** Nullable competition fields (`city`, `state`, `elevation_ft`, `organizer`, `notes`) are omitted from display entirely when null — no "City: —" placeholder clutter on the list or detail page, consistent with the project's minimal, no-filler UI style.
- **D-09:** Cook Detail process variables (all 13 `cook_detail` columns, e.g. `trimmed_weight_oz`, `turn_interval_seconds`, `meatrix_peak_percent`) render only the non-null fields present. If a cook has no `cook_detail` row at all (the FK is nullable-by-absence, one-to-one), the whole process-variables section shows a single "No process detail recorded for this cook" message instead of an empty/broken section.
- **D-10:** Cook AI review history (COOK-02) always renders its own section on Cook Detail — even with zero `cook_ai_review` rows — showing "No AI reviews yet" rather than hiding the section, so the feature's existence is discoverable ahead of Phase 11's dedicated AI Reviews pages.

### Navigation
- **D-11:** Per Phase 9's D-08/D-10, `ScaNavBar`'s `scaNavLinks` gains a `Competitions` entry (`{ label: "Competitions", href: "/sca/competitions" }`) alongside the existing `Dashboard` link. Cook Detail stays drill-down-only (reached via a cook row/link, not top-level nav), matching the original IA decision.

### Claude's Discretion
- Exact route/file names beyond the IA implied by REQUIREMENTS.md (e.g. `/sca` remains Dashboard per Phase 9's D-10, `/sca/competitions` and `/sca/competitions/[id]` for Competitions, `/sca/cooks/[id]` or similar for Cook Detail — planner's call).
- Exact comparison-table column widths, sticky-column behavior beyond D-03's scroll-container requirement, and typography/spacing details within the established ember/smoke design tokens.
- Whether "most recent placement change" insight (D-05) reads "improved by N places" / "dropped N places" wording, or a neutral numeric delta — Claude's call at write time, should read naturally either way.
- Sort order for the Dashboard comparison table's cook columns (chronological by `cooked_at` is the obvious default, matching the Competitions list ordering already required by COMP-01).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & requirements
- `.planning/PROJECT.md` — Current Milestone: v2.0 SCA Tracker section
- `.planning/REQUIREMENTS.md` — DASH-01..03, COMP-01..03, COOK-01..02 (this phase's requirements)
- `.planning/ROADMAP.md` — Phase 10 entry (goal, success criteria)

### Phase 9 foundation (built by, and must be reused, not re-implemented)
- `lib/supabase-sca.ts` — `getScaSupabaseClient()`, the server-only service-role client scoped to the `sca` schema
- `lib/database-sca.types.ts` — generated types for `chef`, `competition`, `cook`, `cook_ai_review`, `cook_detail`, `cook_weather`, `score`. Use the `{ schema: "sca" }`-qualified `Tables<>` form or `Database["sca"]["Tables"][...]["Row"]` directly — the bare `Tables<"chef">` form silently resolves to `any` for this file (known issue, `09-REVIEW.md` WR-04)
- `lib/sca/scoring.ts` — `deriveScoreMetrics()` / `PERFECT_SCORE` — the ONE place `distance_from_winning`/`distance_from_perfect` are computed; every page/component needing these imports this function, never recomputes inline
- `lib/sca/routing.ts` — host-based routing resolver (not touched by this phase, but explains why `app/sca/*` renders under the subdomain)
- `app/sca/layout.tsx`, `components/sca/ScaNavBar.tsx`, `components/sca/ScaFooter.tsx` — the on-brand shell this phase's pages render inside; `ScaNavBar`'s `scaNavLinks` array is the integration point for D-11
- `app/sca/page.tsx` — current placeholder Dashboard index (a bare competition-count read); this phase replaces its body with the real Dashboard while keeping the route

### Known Phase 9 code-review findings relevant to this phase
- `.planning/phases/09-foundation-subdomain-routing/09-REVIEW.md` — WR-02 (raw Supabase error messages should not be rendered to public visitors; follow the same `logError` + generic-message pattern for any new SSR data fetch in this phase) and WR-04 (generated `Tables<>` helper caveat, see above). Not blocking for Phase 10, but new pages should not repeat WR-02's mistake.

### Existing patterns to follow
- `lib/env.ts` — established env-var validation convention; if this phase needs no new env vars (expected — it only reads via the existing `getScaSupabaseClient()`), no action needed
- `lib/logger.ts` — `logError()` pattern for any caught SSR fetch error
- `tailwind.config.ts` / `app/globals.css` — `ember`/`smoke`/`gold`/`pit` tokens, `.glass-card`, `.badge`, `.section-spacing` utility classes — reuse as-is per Phase 9's D-09, no new visual system

No external specs beyond the above — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getScaSupabaseClient()` (`lib/supabase-sca.ts`) — the only way this phase's pages should read `sca` schema data; already proven end-to-end by `app/sca/page.tsx`'s count query
- `deriveScoreMetrics()` (`lib/sca/scoring.ts`) — required for every Distance From Winning / Distance From Perfect Score cell in the comparison table and Cook Detail score breakdown
- `ScaNavBar` (`components/sca/ScaNavBar.tsx`) — `scaNavLinks` const array is a one-line edit point to add the `Competitions` nav entry (D-11)
- `.glass-card`, `.badge`, `.section-spacing` (`app/globals.css`) — used by the existing `/sca` page for its stat card; directly reusable for Dashboard summary cards

### Established Patterns
- `app/sca/page.tsx` demonstrates the phase's data-fetching shape: `async` Server Component, `try/catch` around the Supabase call, `logError(...)` on failure, `export const dynamic = "force-dynamic"` — mirror this for every new `app/sca/**/page.tsx`
- Server-only imports enforced via the `server-only` package for `lib/supabase-sca.ts` — any new `lib/sca/*` data-access helper this phase adds should follow the same discipline
- No client components exist yet under `app/sca` beyond `ScaNavBar` (which needs `usePathname`) — Dashboard/Competitions/Cook Detail pages can likely stay Server Components unless interactive filtering/sorting is added

### Integration Points
- `components/sca/ScaNavBar.tsx` `scaNavLinks` array — add `Competitions` entry here (D-11)
- `app/sca/page.tsx` — this phase overwrites its body (Dashboard content) while keeping the route and `dynamic = "force-dynamic"` export
- New routes needed: Competitions list, Competition detail, Cook detail (exact paths are Claude's discretion, see `<decisions>`)

</code_context>

<specifics>
## Specific Ideas

No specific literal references beyond what's in REQUIREMENTS.md (comparison table shape, insight examples, IA) — those are fully captured in the Decisions section above and don't need to be re-derived here.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (The gray-area question was presented but unanswered; no scope-creep ideas were raised.)

</deferred>

---

*Phase: 10-Core Browsing — Dashboard, Competitions & Cook Detail*
*Context gathered: 2026-08-23*
