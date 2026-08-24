# Phase 10: Core Browsing — Dashboard, Competitions & Cook Detail - Research

**Researched:** 2026-08-23
**Domain:** Next.js 16 Server Components reading Supabase embedded/relational queries (`sca` schema), pure aggregation/insight logic, shared comparison-table UI
**Confidence:** HIGH — core data shapes and query patterns verified by running live queries against the actual `sca` schema data in this session (not just docs); a handful of UI-semantics decisions not covered by CONTEXT.md are flagged ASSUMED with explicit recommendations.

## Summary

This phase is almost entirely a **read-and-shape** problem, not a framework problem. Phase 9 already solved every hard infrastructure question (schema-scoped client, types, theme, nav shell); Phase 10's job is to query `sca` tables with Supabase's relational embedding syntax, reduce the results into a shared comparison-table shape, and render four Server Component pages. The single most valuable finding from this research is empirical, not documentary: **querying the live data directly** revealed the exact shape every join produces (one-to-one FKs embed as single objects, one-to-many as arrays — confirmed against the real `score`, `cook_detail`, `cook_ai_review`, and `competition` relationships) and surfaced **real edge cases already present in production data** that the plan must handle correctly on day one: one cook (`id: 7`) has no `score` row at all, and that cook is the *only* entry in its competition — meaning a competition detail page's Best/Worst/Average aggregation must not divide by zero or throw when its scored-cook set is empty. Only 2 of 20 cooks have a `cook_detail` row and only 2 of 20 have `cook_ai_review` rows, confirming D-09/D-10's "no data" fallback UI is the *common* case, not a rare edge case.

The second key finding is that this repo's Next.js 16 pin (confirmed via `app/confirmation/page.tsx`) makes **route `params` a `Promise`**, exactly like `searchParams` already is — this must be followed exactly for the two new dynamic routes (`/sca/competitions/[id]`, `/sca/cooks/[id]`) or the pages won't compile/type-check correctly.

The third finding is a naming-convention confirmation: REQUIREMENTS.md's example column headers (`Wurst - A`, `Wurst - Jackpot`) are not placeholder text — they are the literal output of `competition.name + " - " + cook.steak_label` against real data (competition 13, "The Wurst Butcher Shop", cooks 19/20 with `steak_label` "A" and "Jackpot"). This confirms the exact column-header formula the comparison table module must use.

**Primary recommendation:** Extract every piece of non-trivial logic (comparison-row building, best/worst/average aggregation, "what stands out" insight computation, cook-detail non-null-field selection, column-header formatting) into small pure functions under `lib/sca/`, unit-tested with fixtures modeled on the real data shapes captured below (including the zero-scored-cooks edge case). Keep all four page components as async Server Components that call one query function each from a new `lib/sca/queries.ts`, mirroring `app/sca/page.tsx`'s existing try/catch + `logError` + generic-message pattern (never re-introduce WR-02's raw-error-to-user mistake).

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** The shared comparison-table module (used by both Dashboard and Competition detail) takes a list of cooks + which aggregate columns to compute as props/args — one component, two call sites, no duplicated table markup or column logic.
- **D-02:** Dashboard shows ALL cooks recorded (not a rolling "last N") as named columns, plus `Worst Cook`, `Best Cook`, and `Cook Averages` aggregate columns per DASH-02. Competition detail scopes the same module to only the cooks entered in that one event.
- **D-03:** Wide table handles mobile/narrow viewports via a horizontally-scrolling container (`overflow-x-auto`) around the table, not a stacked/card-per-cook mobile layout.
- **D-04:** Missing score fields inside the table render as an em dash (`—`), never `0` or blank. Applies to any table cell backed by a nullable `score` column.
- **D-05:** Compute exactly three insight types — biggest score swing (largest cook-over-cook `total_score` delta, ordered by `cooked_at`), closest gap to first (minimum `distance_from_winning` across all cooks via `deriveScoreMetrics`), and most recent placement change (latest cook's `placement` vs. the previous cook's). No additional insight types.
- **D-06:** Each insight is real data-driven copy, never static/generic. If fewer than 2 scored cooks exist, delta-based insights are omitted rather than shown broken; the closest-gap insight still renders off a single cook if one exists.
- **D-07:** No chef filter is applied in Phase 10 queries — all cooks are read and shown regardless of `chef_id`.
- **D-08:** Nullable competition fields (`city`, `state`, `elevation_ft`, `organizer`, `notes`) are omitted from display entirely when null.
- **D-09:** Cook Detail process variables render only non-null fields. If a cook has no `cook_detail` row at all, the whole section shows "No process detail recorded for this cook."
- **D-10:** Cook AI review history always renders its own section on Cook Detail — even with zero rows — showing "No AI reviews yet."
- **D-11:** `ScaNavBar`'s `scaNavLinks` gains a `Competitions` entry (`{ label: "Competitions", href: "/sca/competitions" }`). Cook Detail stays drill-down-only.

### Claude's Discretion

- Exact route/file names beyond the IA implied by REQUIREMENTS.md.
- Exact comparison-table column widths, sticky-column behavior beyond D-03's scroll-container requirement, and typography/spacing details within the established ember/smoke design tokens.
- Whether "most recent placement change" insight (D-05) reads "improved by N places" / "dropped N places" wording, or a neutral numeric delta.
- Sort order for the Dashboard comparison table's cook columns (chronological by `cooked_at` is the obvious default, matching the Competitions list ordering already required by COMP-01).

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope. (The gray-area question was presented but unanswered; no scope-creep ideas were raised.)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | Summary cards: latest cooks, best cook, worst cook, average total score, average gap to first | Live data confirms `best`/`worst` must be computed only over *scored* cooks (cook 7 has none); "latest cooks" (plural) maps cleanly onto "all cooks from the most recent competition" per real data (competition 13 has 2 same-day cooks) — see Open Questions |
| DASH-02 | Comparison table: named-cook columns + Worst/Best/Averages aggregate columns, rows for Competition/Cook/Placement/categories/Total/Distance-from-Winning/Distance-from-Perfect | Column header formula confirmed live (`competition.name + " - " + steak_label`); 5 judging-category columns confirmed (`appearance, doneness, texture, taste, overall_impression` — matches ANLY-03's list, excludes `field_size`/`ticket_number`) |
| DASH-03 | Data-driven "what stands out" summary, 3 insight types per D-05 | Verified live that all *existing* `score` rows have zero nulls in `total_score`/`placement`/`first_place_score`/category columns — but the schema still allows nulls, so insight functions must defensively skip nulls, not just assume clean data |
| COMP-01 | Competition list ordered by event date, city/state/organizer at a glance | Live data: `organizer` is `null` for all 13 real rows — D-08 omission behavior will be exercised on every row in practice, not a rare case |
| COMP-02 | Competition detail: event metadata + every cook entered | Confirmed live embedded-select syntax `competition.select("*, cook(...)")` returns `cook` as an array (reverse many-to-one) |
| COMP-03 | Compare all cooks within a competition, reusing the comparison table module | Found a real single-cook, zero-score competition (id 4) — the shared aggregation logic MUST handle an empty scored-cook set without `NaN`/crash |
| COOK-01 | Cook detail: competition, steak label, process variables, full score breakdown | Confirmed live embedded-select syntax `cook.select("*, competition:competition_id(*), score(*), cook_detail(*), cook_ai_review(*))"` — one-to-one FKs (`score`, `cook_detail`) return single objects, not arrays |
| COOK-02 | AI review history on Cook Detail | Confirmed live: `cook_ai_review` reverse relation returns an array; real row has non-null `model`, `review_type`, `prompt`, `comments` |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Dashboard/Competitions/Cook Detail data fetching | Frontend Server (Next.js Server Components) | Database / Storage (Supabase/PostgREST) | No client-side data fetching needed anywhere in this phase — all four pages are static-per-request reads, matching Phase 9's `app/sca/page.tsx` precedent |
| Aggregation (best/worst/average) & insight computation | API / Backend (shared `lib/sca/*` pure functions) | — | Pure functions with no I/O; must be importable by both the Dashboard page and (in Phase 11) Analytics without duplication |
| Comparison table rendering | Browser / Client is NOT required | Frontend Server (SSR renders full table HTML) | No interactivity (sort/filter) requested in this phase's scope — table can be a plain Server Component; no `"use client"` needed unless a later phase adds sorting |
| Score-derived math (`distance_from_winning`/`distance_from_perfect`) | API / Backend (`lib/sca/scoring.ts`, already built) | — | Reused as-is from Phase 9 per INFRA-05/D-07; this phase must not recompute the formula inline anywhere |
| Nav integration (`Competitions` link) | Browser / Client (`ScaNavBar` is already `"use client"`) | — | One-line array edit, no new client logic |

## Standard Stack

### Core

No new runtime dependencies are required. Everything needed is already installed and proven by Phase 9:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | `^16.1.6` (resolves 16.3.2) | Server Components, dynamic routes, `notFound()` | Already the project's framework |
| `@supabase/supabase-js` | `^2.101.1` | Relational/embedded `select()` queries against `sca` schema | Already the project's data client; embedding syntax confirmed live this session |
| `server-only` | `^0.0.1` | Guard for any new `lib/sca/queries.ts` | Matches `lib/supabase-sca.ts`'s existing discipline |

**Package Legitimacy Audit is not applicable — no new packages introduced.** `[VERIFIED: package.json read directly, 2026-08-23]`

### Supporting

None needed. Date formatting uses the existing native `Intl.DateTimeFormat` pattern already established in `lib/format.ts` (`formatDenverDateTime`) rather than introducing a date library (no `date-fns`/`dayjs` present in `package.json`, and none is warranted for this phase's scope — event dates and cook timestamps need only short human-readable formatting).

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase embedded `select()` joins (`table(*)` nested syntax) | Separate queries per table + manual JS-side joining | Embedding is one round trip, type-safe via the generated `Relationships` metadata, and is the officially documented pattern (`supabase.com/docs/reference/javascript/select`) — manual joining would be pure duplication of what PostgREST already does correctly |
| Pure-function aggregation/insights in `lib/sca/` | Computing best/worst/averages inline in the page JSX | Inline computation can't be unit tested (Vitest here runs in `environment: "node"`, no React Testing Library — see Validation Architecture) and risks divergence between Dashboard and Competition detail's "same aggregate logic" requirement (D-01/D-02) |

## Package Legitimacy Audit

Not applicable — no new external packages are introduced this phase. All libraries used (`@supabase/supabase-js`, `next`, `server-only`) are pre-existing dependencies already present in `package.json`. `[VERIFIED: package.json, 2026-08-23]`

## Architecture Patterns

### System Architecture Diagram

```
                         ┌───────────────────────────────────────────┐
                         │  User navigates to /sca, /sca/competitions,│
                         │  /sca/competitions/[id], or /sca/cooks/[id]│
                         └───────────────────┬───────────────────────┘
                                              ▼
                         ┌───────────────────────────────────────────┐
                         │   Server Component page (app/sca/**)       │
                         │   async function Page({ params })          │
                         │   const { id } = await params  (Next 16)   │
                         └───────────────────┬───────────────────────┘
                                              ▼
                         ┌───────────────────────────────────────────┐
                         │   lib/sca/queries.ts (NEW, server-only)     │
                         │   getScaSupabaseClient() + embedded select  │
                         │   e.g. cook.select("*, score(*), ...")      │
                         └───────────────────┬───────────────────────┘
                                              ▼
              ┌───────────────────┐   error?   ┌────────────────────────────┐
              │  logError() +      │◀──────────│  Supabase / PostgREST       │
              │  generic message   │   PGRST116 │  (sca schema, service role)│
              │  OR notFound()      │  (0 rows)  └────────────────────────────┘
              └─────────┬──────────┘
                         │ data
                         ▼
         ┌─────────────────────────────────────────────┐
         │  lib/sca/aggregates.ts + insights.ts (NEW)    │
         │  pure functions: best/worst/average,          │
         │  computeWhatStandsOut(), buildComparisonRows() │
         └─────────────────────┬─────────────────────────┘
                                ▼
         ┌─────────────────────────────────────────────┐
         │  components/sca/ComparisonTable.tsx (NEW)     │
         │  components/sca/SummaryCards.tsx (NEW)        │
         │  components/sca/WhatStandsOut.tsx (NEW)        │
         │  — plain Server Components, no client state    │
         └─────────────────────┬─────────────────────────┘
                                ▼
                    Rendered HTML inside app/sca/layout.tsx
                    (ScaNavBar / ScaFooter shell, unchanged)
```

### Recommended Project Structure
```
lib/sca/
├── scoring.ts            # EXISTING (Phase 9) — deriveScoreMetrics(), PERFECT_SCORE
├── routing.ts             # EXISTING (Phase 9) — untouched
├── queries.ts             # NEW — server-only data access, one function per page:
│                           #   getAllCooksWithScores(), getCompetitions(),
│                           #   getCompetitionWithCooks(id), getCookWithDetails(id)
├── aggregates.ts           # NEW — pure: computeBestWorstAverage(cooks), guards empty sets
├── insights.ts              # NEW — pure: computeWhatStandsOut(cooks) → insight[] (D-05/D-06)
├── comparison.ts             # NEW — pure: buildComparisonRows(cooks, columns) → row data
└── format.ts                 # NEW (or extend lib/format.ts) — formatScore(), cookColumnLabel()
components/sca/
├── ScaNavBar.tsx            # EXISTING — add Competitions entry (D-11)
├── ScaFooter.tsx             # EXISTING — untouched
├── ComparisonTable.tsx        # NEW — shared module (D-01), takes cooks[] + aggregate flags
├── SummaryCards.tsx            # NEW — Dashboard-only (DASH-01)
└── WhatStandsOut.tsx            # NEW — Dashboard-only (DASH-03)
app/sca/
├── layout.tsx                # EXISTING — untouched
├── page.tsx                   # REWRITE — Dashboard body (keeps route + dynamic export)
├── competitions/
│   ├── page.tsx                 # NEW — list (COMP-01)
│   └── [id]/page.tsx              # NEW — detail (COMP-02, COMP-03)
└── cooks/
    └── [id]/page.tsx               # NEW — cook detail (COOK-01, COOK-02)
```

### Pattern 1: Embedded/relational Supabase select — one round trip per page
**What:** Use PostgREST's nested `select()` syntax to fetch a row plus all related rows in a single query, instead of N+1 manual queries.
**When to use:** Every page in this phase.
**Verified relationship cardinalities (live query, this session, project `sca` schema):**

| Query direction | FK location | `isOneToOne` in generated types | Embedding result shape |
|---|---|---|---|
| `cook.select("competition:competition_id(...)")` | on `cook` | n/a (to-one via FK column) | single object |
| `cook.select("score(*)")` | on `score`, unique | `true` | single object |
| `cook.select("cook_detail(*)")` | on `cook_detail`, unique | `true` | single object |
| `cook.select("cook_ai_review(*)")` | on `cook_ai_review` | `false` | **array** |
| `competition.select("cook(...)")` | on `cook` | `false` | **array** |

```typescript
// Source: supabase.com/docs/reference/javascript/select
//         [VERIFIED: live query against real sca schema data, 2026-08-23]
const { data, error } = await supabase
  .from("cook")
  .select(
    "id, steak_label, cooked_at, competition:competition_id(id, name, event_date, city, state), score(*)"
  )
  .order("cooked_at", { ascending: true });
```

### Pattern 2: Dynamic route `params` as a `Promise` (Next.js 16)
**What:** Every dynamic segment page must `await` its `params` before destructuring, exactly like this repo's existing `app/confirmation/page.tsx` already does for `searchParams`.
**When to use:** `app/sca/competitions/[id]/page.tsx`, `app/sca/cooks/[id]/page.tsx`.
```typescript
// Source: nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes (Next.js 16)
//         + this repo's own app/confirmation/page.tsx (searchParams: Promise<...>) as a live precedent
import { notFound } from "next/navigation";

export default async function CompetitionDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const competitionId = Number(id);
  if (!Number.isInteger(competitionId) || competitionId <= 0) {
    notFound();
  }
  // ... query using competitionId
}
```

### Pattern 3: `.single()` + `notFound()` for detail pages
**What:** `.single()` returns `error.code === "PGRST116"` when zero rows match — this is the correct signal to call Next.js's `notFound()`, not to render a generic error state.
**Verified live** (queried `id: 99999` against real `cook` table): `{"code":"PGRST116","details":"The result contains 0 rows","hint":null,"message":"Cannot coerce the result to a single JSON object"}`.
```typescript
const { data, error } = await supabase
  .from("competition")
  .select("*, cook(id, steak_label, cooked_at, score(*))")
  .eq("id", competitionId)
  .single();

if (error?.code === "PGRST116") {
  notFound(); // renders app/not-found.tsx or the default 404, no raw error shown
}
if (error) {
  logError("CompetitionDetailPage query failed", error, "sca-competition-detail-ssr");
  // generic message per WR-02 — never render error.message to the visitor
}
```

### Pattern 4: Named-cook column header formula (verified against real data)
**What:** `${competition.name} - ${cook.steak_label}` produces exactly the format shown in REQUIREMENTS.md's DASH-02 example.
**Verified live:** competition id 13 is literally named "The Wurst Butcher Shop"; its two cooks have `steak_label` "A" and "Jackpot" — concatenated, these reproduce REQUIREMENTS.md's `Wurst - A` / `Wurst - Jackpot` examples (abbreviated in the requirements doc, full string in real data).
```typescript
// lib/sca/format.ts
export function cookColumnLabel(competitionName: string, steakLabel: string | null): string {
  return steakLabel ? `${competitionName} - ${steakLabel}` : competitionName;
}
```

### Anti-Patterns to Avoid
- **Recomputing `distance_from_winning`/`distance_from_perfect` inline:** Always import `deriveScoreMetrics()` from `lib/sca/scoring.ts` (Phase 9, INFRA-05) — never re-derive the formula in a new component.
- **Rendering `error.message` from a Supabase call directly to the page:** WR-02 already flagged this exact mistake in Phase 9's `app/sca/page.tsx`. New pages must use `logError()` + a generic message, following the pattern in Pattern 3 above.
- **Treating an empty scored-cook set as "0 average":** Averaging over zero scored cooks (a real case — competition id 4 has one cook, no score) must render as "—" / omitted, not `0` or `NaN`. Guard every aggregate function with a length check before dividing.
- **Assuming every cook has a `competition_id`:** The column is nullable in the schema even though all 20 real rows currently have one set. Comparison-table rows and the Cook Detail page should degrade gracefully (omit/dash the competition cell) rather than crash if a future cook lacks one — see Open Questions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fetching cook + related score/detail/reviews | Multiple sequential `.from()` calls joined manually in JS | Supabase's nested `select()` embedding syntax (Pattern 1) | One round trip, type-safe via generated `Relationships`, officially documented and already verified to produce the exact shapes this phase needs |
| "Not found" handling for `/competitions/[id]` and `/cooks/[id]` | Custom 404 markup per page | Next.js `notFound()` (`next/navigation`) triggered off `PGRST116` | Framework-native 404 handling, consistent status code, no bespoke error page needed |
| Score derivation math | Recomputing `first_place_score - total_score` per page | `deriveScoreMetrics()` (already built, Phase 9) | Single source of truth, already unit-tested |

**Key insight:** Every "don't hand-roll" item in this phase is about reuse, not invention — Phase 9 already built the hard infrastructure (schema client, scoring formula, theme); Phase 10's only real risk is quietly duplicating that logic across four new pages instead of centralizing it in `lib/sca/`.

## Common Pitfalls

### Pitfall 1: Zero scored cooks in an aggregation set (real, not hypothetical)
**What goes wrong:** Best/Worst/Average computation divides by zero or picks `undefined` as "best," crashing the page or rendering `NaN`/`Infinity`.
**Why it happens:** Competition id 4 ("BBQ Pit Stop St George", 2025-11-01) has exactly one cook (`id: 7`), and that cook has **no `score` row** — this is real, live data, not a contrived edge case. `[VERIFIED: live query, 2026-08-23]`
**How to avoid:** Every aggregation function (`computeBestWorstAverage`) must filter to cooks with a non-null `score` first, then explicitly handle a length-zero result (render "—" for Best/Worst/Averages columns/cards, per D-04's em-dash convention) before attempting any division or `Math.max`/`Math.min`.
**Warning signs:** `NaN` rendered anywhere in the Best Cook / Worst Cook / Cook Averages columns; a crash when opening `/sca/competitions/4`.

### Pitfall 2: Confusing "cook has no score row" with "score has a null field"
**What goes wrong:** Code that only checks individual `score.total_score == null` misses the case where the entire `score` embed is `null` (no row at all), throwing when it tries to read `.total_score` off `null`.
**Why it happens:** D-04 talks about "missing score fields" (implying a row exists with some null columns), but the real data's actual gap is a **missing row entirely** (cook 7 has `score: null` when embedded, not a `score` object with null fields).
**How to avoid:** Every function/component consuming a cook's `score` must null-check the whole `score` object before destructuring, not just individual fields. `deriveScoreMetrics` already handles `null | undefined` inputs correctly (confirmed via `tests/sca-scoring.test.ts`), but the comparison-table row builder and summary cards must do the same at the cook level.
**Warning signs:** `TypeError: Cannot read properties of null` when rendering the Dashboard comparison table (which must include cook 7 per D-02's "ALL cooks" requirement) or Competition 4's detail page.

### Pitfall 3: `params` treated as a plain object instead of a `Promise`
**What goes wrong:** `const { id } = params` (without `await`) either fails to type-check or (depending on exact Next.js patch behavior) reads a Promise object instead of the resolved value.
**Why it happens:** Next.js 16 made `params`/`searchParams` asynchronous across the board; this repo's own `app/confirmation/page.tsx` already demonstrates the correct `Promise<{...}>` + `await` pattern for `searchParams`, but this is the **first** dynamic route segment (`[id]`) in the whole repo, so there's no existing precedent for `params` specifically to copy from.
**How to avoid:** Type every new dynamic page's `params` prop as `Promise<{ id: string }>` and `await` it before use, exactly matching Pattern 2 above.
**Warning signs:** TypeScript errors on `params.id` access; `next build` warnings about sync dynamic API usage.

### Pitfall 4: Re-introducing WR-02 (raw Supabase error rendered to visitors)
**What goes wrong:** A caught Supabase error's `.message` gets rendered directly in the page body, potentially leaking internal schema/query details to a public spectator.
**Why it happens:** `app/sca/page.tsx` (Phase 9) already does exactly this and was flagged as WR-02 in `09-REVIEW.md` — not yet fixed, and the easiest path for new pages is to copy the existing file's pattern verbatim.
**How to avoid:** New pages should `logError()` (structured, server-side only) and render a generic user-facing message (e.g., "We couldn't load this page right now.") — never `error.message` — while `notFound()` handles the distinct "no such id" case separately (Pattern 3).
**Warning signs:** Any `{errorMessage}` or `{error.message}` JSX expression in a new `app/sca/**/page.tsx` file.

### Pitfall 5: Missing `cook_detail`/`cook_ai_review` treated as the exception instead of the norm
**What goes wrong:** Development/testing only exercises the "happy path" cook (id 19 or 20, which have both `cook_detail` and `cook_ai_review` rows), leaving the fallback UI (D-09 "No process detail recorded," D-10 "No AI reviews yet") unverified until it's the *majority* case in production.
**Why it happens:** It's tempting to manually test against whichever cook ID is top-of-mind, and the two "complete" records happen to be the most recently created (highest IDs).
**How to avoid:** Explicitly test/verify Cook Detail against a cook with no `cook_detail` (e.g., id 1–18) and no `cook_ai_review` (same range) as well as against 19/20. `[VERIFIED: live query — only cook_id 19 and 20 have cook_detail and cook_ai_review rows out of 20 total cooks, 2026-08-23]`
**Warning signs:** Fallback copy ("No process detail recorded," "No AI reviews yet") never actually renders during manual review because only the two fully-populated cooks were checked.

## Code Examples

### Aggregation guard for empty scored-cook sets (Pitfall 1)
```typescript
// lib/sca/aggregates.ts
import { deriveScoreMetrics } from "./scoring";

export interface ScoredCook {
  id: number;
  total_score: number;
}

export function computeBestWorstAverage(scoredCooks: ScoredCook[]) {
  if (scoredCooks.length === 0) {
    return { best: null, worst: null, averageTotalScore: null };
  }
  const best = scoredCooks.reduce((a, b) => (b.total_score > a.total_score ? b : a));
  const worst = scoredCooks.reduce((a, b) => (b.total_score < a.total_score ? b : a));
  const averageTotalScore =
    scoredCooks.reduce((sum, c) => sum + c.total_score, 0) / scoredCooks.length;
  return { best, worst, averageTotalScore };
}
```

### Cook-detail non-null field selection (D-09)
```typescript
// lib/sca/cookDetailFields.ts
// Verified live example (cook_id 19): grate_temp_f=500, meatrix_pull_percent=70,
// turn_interval_seconds=90, starting_internal_temp_f=96 present;
// trimmed_weight_oz, steak_thickness_in, meatrix_peak_percent, peak/pull_internal_temp_f,
// rest_duration_seconds null — real mixed-null row, not a hypothetical.
const FIELD_LABELS: Record<string, string> = {
  trimmed_weight_oz: "Trimmed Weight (oz)",
  steak_thickness_in: "Thickness (in)",
  starting_internal_temp_f: "Starting Internal Temp (°F)",
  grate_temp_f: "Grate Temp (°F)",
  turn_interval_seconds: "Turn Interval (s)",
  back_side_interval_count: "Back-Side Turns",
  presentation_side_interval_count: "Presentation-Side Turns",
  peak_internal_temp_f: "Peak Internal Temp (°F)",
  meatrix_peak_percent: "Meatrix Peak %",
  pull_internal_temp_f: "Pull Internal Temp (°F)",
  meatrix_pull_percent: "Meatrix Pull %",
  rest_duration_seconds: "Rest Duration (s)",
  seasoning: "Seasoning",
  prep_notes: "Prep Notes",
  cook_notes: "Cook Notes"
};

export function getPresentProcessFields(
  detail: Record<string, unknown> | null
): Array<{ label: string; value: unknown }> {
  if (!detail) return [];
  return Object.entries(FIELD_LABELS)
    .filter(([key]) => detail[key] !== null && detail[key] !== undefined)
    .map(([key, label]) => ({ label, value: detail[key] }));
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Synchronous `params`/`searchParams` in Server Component pages | `Promise<{...}>`, must `await` | Next.js 15.x → stable/default in 16 | Directly affects both new dynamic routes in this phase; already precedented in this repo's `app/confirmation/page.tsx` for `searchParams` |

**Deprecated/outdated:** None specific to this phase's scope beyond the Next.js 16 async-params change already covered by Phase 9's research.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | "Latest cooks" (DASH-01, plural) means "all cooks entered at the most recent competition," not a fixed rolling N | Phase Requirements / Open Questions | Low-Medium — cosmetic; easy to swap for "last N cooks by cooked_at" if the user disagrees. Both readings are supportable from real data (competition 13 has exactly 2 same-day cooks, which reads naturally as "the latest cooks") |
| A2 | Best/Worst Cook (DASH-01 cards and DASH-02/COMP-03 aggregate columns) are ranked by `total_score` (highest/lowest), not by `placement` | Common Pitfalls, Code Examples | Medium — `placement` is competition-relative (lower is better, scale varies by field size) while `total_score` is an absolute, comparable number across competitions; `total_score` is the more defensible axis for a *cross-competition* Dashboard ranking, but this exact rule isn't stated in CONTEXT.md |
| A3 | Comparison table's "Competition" row shows the full `competition.name`, and "Cook" row shows a formatted `cooked_at` date (distinct from the column header, which already encodes `competition.name - steak_label`) | Architecture Patterns / Open Questions | Low — purely a display-content choice within an already-approved table shape (D-01/D-02); any reasonable non-redundant choice satisfies the requirement text |
| A4 | Dashboard comparison table and cook columns sort ascending (oldest → newest) by `cooked_at` | User Constraints (Claude's Discretion, already granted) | Low — CONTEXT.md explicitly leaves this to Claude's discretion; ascending best supports the "score swing over time" and "placement change" insights reading naturally left-to-right |
| A5 | "Cook Averages" aggregate column's Competition/Cook rows render as em dash (not applicable), consistent with D-04's dash convention even though D-04 technically only covers missing *score* fields | Architecture Patterns | Low — cosmetic; any non-broken placeholder (dash, "Average", blank) satisfies the spirit of D-04 |

## Open Questions

1. **What exactly does the "Competition" and "Cook" row show, given the column header already encodes both?**
   - What we know: Column header = `${competition.name} - ${steak_label}` (verified live). DASH-02 separately lists "Competition" and "Cook" as table *rows*, distinct from the column header.
   - What's unclear: Whether these rows should repeat the header's info verbatim (redundant but scannable) or show something complementary (e.g., "Competition" row = full name + event date; "Cook" row = formatted `cooked_at` timestamp or just the bare `steak_label`).
   - Recommendation: "Competition" row → `competition.name` (optionally with a short date). "Cook" row → the cook's formatted `cooked_at` date (gives a distinct, useful data point rather than repeating `steak_label` from the header). Document the final choice in the plan; low risk either way.

2. **Should Best/Worst Cook rank by `total_score` or `placement`?**
   - What we know: Both exist per scored cook. `total_score` is directly comparable across all competitions (fixed 254.5-point scale). `placement` is competition-relative and its meaning shifts with field size (`field_size` column exists precisely because placement isn't universally comparable).
   - What's unclear: CONTEXT.md doesn't specify the ranking axis.
   - Recommendation: Rank by `total_score` (A2 above) — it's the only cross-competition-comparable metric, and it's consistent with DASH-01's separate "average total score" card already anchoring on the same field.

3. **What happens to a cook whose `competition_id` is `null`?**
   - What we know: The column is nullable in the schema; all 20 real rows currently have a value.
   - What's unclear: Whether this can realistically occur before this phase ships, and if so, how the comparison table's "Competition" row/column-header and the Cook Detail page's "showing its competition" (COOK-01) should degrade.
   - Recommendation: Treat as a defensive-coding concern only (optional-chain the embed, omit/dash the Competition cell) rather than a blocking design question — not worth a `checkpoint:human-verify`, since it isn't observed in current data.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase `sca` schema (service-role reads) | All 4 pages | ✓ | Live-verified this session (13 competitions, 20 cooks, 19 scores, 2 cook_detail, 2 cook_ai_review) | — |
| `getScaSupabaseClient()` (Phase 9) | All queries | ✓ | Already built, tested (`tests/supabase-sca.test.ts`) | — |
| `deriveScoreMetrics()` (Phase 9) | Distance columns | ✓ | Already built, tested (`tests/sca-scoring.test.ts`) | — |
| Next.js dynamic route `[id]` segments | Competition/Cook detail pages | ✓ | First use in this repo, but pattern precedented via `searchParams` in `app/confirmation/page.tsx` | — |

No missing dependencies. `[VERIFIED: live Supabase queries executed directly against the project in this research session, 2026-08-23]`

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 |
| Config file | `vitest.config.ts` (`environment: "node"`, no jsdom/React Testing Library installed) |
| Quick run command | `npx vitest run tests/<new-file>.test.ts` |
| Full suite command | `npm run test` |

**Constraint carried forward from the existing test suite:** No React component-rendering test infrastructure exists (`environment: "node"`, no `@testing-library/react`). New page/component `.tsx` files in this phase are **not unit-testable as rendered output** — only the pure logic they call into is. This mirrors the existing `tests/sca-scoring.test.ts` / `tests/sca-routing.test.ts` pattern (test the `lib/` function, not the page).

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | Best/Worst/Average computed correctly, including zero-scored-cook edge case | unit | `npx vitest run tests/sca-aggregates.test.ts` | ❌ Wave 0 |
| DASH-02 | Comparison row-building (categories, dashes for missing scores, column header formula) | unit | `npx vitest run tests/sca-comparison.test.ts` | ❌ Wave 0 |
| DASH-03 | Insight computation (swing, gap, placement change; <2-cook omission per D-06) | unit | `npx vitest run tests/sca-insights.test.ts` | ❌ Wave 0 |
| COMP-01, COMP-02, COMP-03 | Query shape correctness (manual/live-verified in this research session); comparison table reuse verified by shared unit tests above | unit (shared logic) + manual (page render) | `npx vitest run tests/sca-comparison.test.ts` | ❌ Wave 0 (shared with DASH-02) |
| COOK-01 | Non-null process-field selection | unit | `npx vitest run tests/sca-cook-detail-fields.test.ts` | ❌ Wave 0 |
| COOK-02 | AI review list rendering with zero rows | manual only (no interactive/branching logic beyond `.length === 0` check — trivial, but page-render itself is untestable per framework constraint above) | — | n/a |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/sca-<module>.test.ts` for whichever `lib/sca/*.ts` file changed
- **Per wave merge:** `npm run test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`; manual click-through of all 4 pages against real data (including cook 7 / competition 4's zero-score edge case, and a cook with no `cook_detail`/`cook_ai_review`) since page rendering itself has no automated coverage

### Wave 0 Gaps
- [ ] `tests/sca-aggregates.test.ts` — covers DASH-01 (best/worst/average, including the empty-set case modeled on competition 4 / cook 7)
- [ ] `tests/sca-comparison.test.ts` — covers DASH-02/COMP-03 (row building, em-dash rendering rule, column-header formula)
- [ ] `tests/sca-insights.test.ts` — covers DASH-03 (3 insight types, <2-cook omission)
- [ ] `tests/sca-cook-detail-fields.test.ts` — covers COOK-01 (non-null field selection, modeled on real cook 19's mixed-null `cook_detail` row)
- [ ] No new framework install needed — `vitest` already configured and sufficient for all of the above (pure-function tests only)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth in this milestone (explicitly out of scope) |
| V3 Session Management | No | No sessions created or read |
| V4 Access Control | No | Service-role client bypasses RLS by design (Phase 9 decision); no per-user access differentiation exists yet |
| V5 Input Validation | Yes | Dynamic route `[id]` params must be validated as a positive integer before use in a query; reject non-numeric input with `notFound()` rather than passing it through to Supabase |
| V6 Cryptography | No | No secrets/crypto introduced this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Verbose internal error message shown to a public spectator (WR-02 recurrence) | Information Disclosure | `logError()` server-side + generic user-facing message; already the established pattern this phase must not regress from |
| Malformed/non-numeric `[id]` route param passed straight into a Supabase `.eq("id", id)` call | Tampering / Denial of Service (unhandled exception) | Parse and validate `id` as `Number.isInteger` and `> 0` before querying; call `notFound()` on failure instead of letting the query throw |

## Sources

### Primary (HIGH confidence)
- Live Supabase queries executed directly against the real `sca` schema in this research session (competition, cook, score, cook_detail, cook_ai_review tables; embedded-select cardinality tests; `.single()` error-code test) — 2026-08-23
- `supabase.com/docs/reference/javascript/select` — fetched via WebFetch, confirms embedded/nested `select()` syntax, `!inner` joins, filtering embedded resources
- Direct reads of `lib/supabase-sca.ts`, `lib/database-sca.types.ts`, `lib/sca/scoring.ts`, `app/sca/page.tsx`, `app/sca/layout.tsx`, `components/sca/ScaNavBar.tsx`, `components/sca/ScaFooter.tsx`, `app/confirmation/page.tsx`, `lib/format.ts`, `tailwind.config.ts`, `app/globals.css`, `vitest.config.ts`, `tests/sca-scoring.test.ts`, `tests/sca-routing.test.ts`, `tests/supabase-sca.test.ts`, `package.json`, `.planning/phases/09-foundation-subdomain-routing/09-REVIEW.md`, `.planning/phases/09-foundation-subdomain-routing/09-RESEARCH.md` — all read directly this session

### Secondary (MEDIUM confidence)
- WebSearch confirming Next.js 16's `params`/`searchParams` are `Promise`s across pages/layouts/route handlers (multiple community + doc-summary sources agree; cross-checked against this repo's own precedent in `app/confirmation/page.tsx`)

### Tertiary (LOW confidence)
- None — all UI-semantics judgment calls (A1–A5 above) are flagged as assumptions rather than presented as researched fact.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all reused libraries already verified in Phase 9's research
- Architecture (query patterns): HIGH — verified by executing real queries against the live `sca` schema in this session, not just reading docs
- Architecture (page/routing conventions): HIGH — `params`-as-Promise confirmed both via official Next.js 16 sources and this repo's own existing `searchParams` precedent
- Pitfalls: HIGH for data-shape pitfalls (1, 2, 5 — directly observed in live data), MEDIUM for framework pitfalls (3, 4 — well-documented but not exercised live in this session since the routes don't exist yet)
- UI-semantics assumptions (A1–A5): LOW-MEDIUM — flagged explicitly, not load-bearing for correctness, only for exact display content

**Research date:** 2026-08-23
**Valid until:** ~30 days (stable Next.js 16 patterns + a live schema snapshot; re-verify row counts/edge cases if significant new data is entered before this phase is planned/executed, since D-02's "ALL cooks" scope and the zero-scored-cook edge case are data-dependent facts, not just code facts)
