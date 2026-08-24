# Phase 11: Analytics & AI Reviews - Research

**Researched:** 2026-08-24
**Domain:** Next.js Server Components reading Supabase (`sca` schema) — hand-built server-rendered SVG trend charts + a new read-only list/detail query pair. No new npm dependencies.
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Trend charts are hand-built lightweight inline SVG (a shared `TrendChart`-style component), not a new charting library dependency. Rationale: the app currently has zero UI/charting dependencies beyond `next`/`react`/`zod`/`resend`/`@react-email/*`/`@supabase/supabase-js` (confirmed via `package.json`); data volume is small (21 cooks, 20 scores live today per Phase 10's re-verification) so a simple polyline/points SVG is trivial to build and fully themeable with the existing `ember`/`smoke`/`gold` tokens, with no bundle-size or new-dependency tradeoff to accept.
- **D-02:** Charts render server-side as static SVG (Server Components, no client-side charting JS) with no hover/tooltip interactivity in this phase — consistent with the rest of `app/sca` being server-rendered with no client components beyond `ScaNavBar`. Axis labels and key data points (e.g. the value at each point) are shown directly on/near the chart rather than requiring hover.
- **D-03:** The AI Reviews list (AIRV-01) shows **every** `cook_ai_review` row regardless of `review_type`, not filtered to rows literally typed `"appearance"`. A live data check found only 3 stored rows: two `review_type = "appearance"`, one `review_type = "photo_review"` — filtering out the third would hide real content the requirement's own COOK-02 precedent (Phase 10 D-10) already treats generically as "AI review history," not appearance-specific. `review_type` renders as a badge/label on each list item and on the detail page (falling back to em dash per the project's existing null-handling convention, D-04/Phase 10, if `review_type` is null).
- **D-04:** AIRV-02's "prompt if present" is handled the same way: render the `prompt` field when non-null, omit the row/section entirely when null — no "Prompt: —" placeholder, matching Phase 10's D-08 no-filler convention for nullable fields.
- **D-05:** ANLY-03's five judging categories (appearance, doneness, texture, taste, overall impression) render as five separate small single-metric trend charts (small multiples), not one combined multi-line chart. Rationale: mobile-first is a hard project constraint (CLAUDE.md); five overlapping lines in one chart is hard to read at phone width, while five stacked single-metric charts scan cleanly and mirror the existing small-card pattern already established by `SummaryCards` on the Dashboard.
- **D-06:** The AI Reviews list is a flat list sorted most-recent-first by `created_at`, each item showing its linked cook (`cookColumnLabel`) and competition inline — no grouping by cook or competition. This matches the existing `sortCooksByRecencyDesc` most-recent-first convention from Phase 10's Cooks index (10-10-PLAN) rather than introducing a new grouped-list pattern.
- **D-07:** `ScaNavBar`'s `scaNavLinks` gains `Analytics` (`/sca/analytics`) and `AI Reviews` (`/sca/ai-reviews`) entries, completing the five-item nav originally scoped by Phase 9's D-08 (Dashboard, Competitions, Analytics, AI Reviews) plus Phase 10's added `Cooks` entry. Final nav order: Dashboard, Competitions, Cooks, Analytics, AI Reviews. AI Review Detail stays drill-down-only (reached via a list item link), matching the Cook Detail / Competition Detail precedent.

> Note: the gray-area multi-select question behind D-01..D-06 was presented via AskUserQuestion but received no user response — Claude proceeded per `mode: yolo`/Auto Mode with the documented defaults above. The user can redirect any of these after reviewing CONTEXT.md or the shipped result.

### Claude's Discretion

- Exact route/file names beyond `/sca/analytics` and `/sca/ai-reviews` + `/sca/ai-reviews/[id]` implied by the IA above — planner's call if a different segment name reads more naturally.
- Exact SVG chart dimensions, point/line styling, and typography within the established ember/smoke/gold design tokens.
- Whether trend charts share one `TrendChart` component parameterized by metric, or per-metric wrapper components — planner's call, but per D-01 there should be no duplicated SVG-path-building logic across the 3 (score, gap) + 5 (category) = up to 7 chart instances rendered by this phase.
- Whether the new AI Reviews query lives in `lib/sca/queries.ts` alongside the existing query functions, or a new sibling file — likely `lib/sca/queries.ts` for consistency, but planner's call.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope. (The gray-area question was presented but unanswered; no scope-creep ideas were raised.)

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| ANLY-01 | User can view a trend view of total score over time across cooks | `getAllCooksWithScores()` (no new query) + new `buildTrendSeries(cooks, "total_score")` helper (Pattern 1) + `TrendChart` component (Pattern 2) |
| ANLY-02 | User can view a trend view of gap-to-first (`distance_from_winning`) over time | Same data source; `buildTrendSeries(cooks, "distance_from_winning")` calls the existing `deriveScoreMetrics()` (INFRA-05's single shared implementation) per point |
| ANLY-03 | User can view trends for key judging categories (appearance, doneness, texture, taste, overall impression) over time | Same data source; `buildTrendSeries(cooks, <category>)` × 5, confirmed field names match `score` table's real generated `Row` type exactly; rendered as 5 small-multiple `TrendChart` instances per D-05 |
| AIRV-01 | User can view a list of all stored AI appearance reviews across cooks | New `getAllAiReviews()` query (Pattern 3) joining `cook_ai_review` → `cook` → `competition`, ordered `created_at` desc per D-06, unfiltered by `review_type` per D-03 |
| AIRV-02 | User can open a single AI review's detail (model, review type, prompt if present, full comments) linked back to its cook and competition | New `getAiReviewById()` query (Pattern 3) + `parseScaId()` reuse; detail page mirrors `app/sca/cooks/[id]/page.tsx`'s existing AI-review-comments rendering (model/review_type badges, conditional prompt block) already proven in that file |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

Root `CLAUDE.md` documents the storefront (Square/cart/checkout), not the SCA tracker — but its repo-wide TypeScript/style/testing conventions apply equally to `app/sca`/`lib/sca` and are already followed by every existing file this research read:

- **Named exports only** in `lib/` and `components/` — no default exports (Next.js page/layout files are the sole framework-mandated exception, e.g. `app/sca/analytics/page.tsx`'s `export default async function`). All new `lib/sca/trends.ts` and `TrendChart` exports must be named.
- **No JSDoc / inline explanatory comments** in production code — confirmed zero comments in every `lib/sca/*.ts` file read this session; new code should match.
- **2-space indentation, final newline, trimmed trailing whitespace** — enforced via `.editorconfig`, no Prettier config exists to auto-fix this.
- **`strict: true` TypeScript** — the only enforcement mechanism (no ESLint rules configured); new code must type-check cleanly with no `any`/non-null-assertion escape hatches (see Pitfall 3 above).
- **Error handling pattern**: route handlers wrap logic in `try/catch`; `logError(message, error, requestId)` called before returning/rendering a generic message; never surface raw error messages (WR-02, Pitfall 4 above).
- **Test commands**: `npm run test` (full Vitest run), `npx vitest run tests/<file>.test.ts` (single file) — both already used verbatim in this research's Validation Architecture section.
- **GSD workflow enforcement**: CLAUDE.md requires file-changing work to go through a GSD entry point (`/gsd:execute-phase` for planned phase work); this is an execution-time constraint for the planner/executor, not a research-time constraint, noted here for completeness.

## Summary

This phase adds two new SCA Tracker surfaces on top of infrastructure that is already fully built and proven in Phase 9/10: Analytics (`/sca/analytics`, three trend requirements ANLY-01..03 rendered as up to 7 small-multiple SVG charts) and AI Reviews (`/sca/ai-reviews` list + `/sca/ai-reviews/[id]` detail, AIRV-01/02). Every claim in CONTEXT.md's canonical-refs section was verified directly against the current source files during this research pass and all of it holds: `getAllCooksWithScores()` really does return every cook with joined `score(*)` and a `competition:competition_id(...)` summary, ordered ascending by `cooked_at`, with zero query changes needed for the three Analytics trends; `deriveScoreMetrics()` really is the one place `distance_from_winning` is computed; the five judging category field names on `score` really are `appearance`, `doneness`, `texture`, `taste`, `overall_impression` (confirmed against the live generated `Database["sca"]["Tables"]["score"]["Row"]` type, not just CONTEXT.md's prose); and `ScaNavBar`'s `scaNavLinks` array currently has exactly 3 entries (Dashboard, Competitions, Cooks) — Analytics and AI Reviews are not yet present, confirming D-07 is a real, un-done one-line array edit.

The only genuinely new code this phase needs is (1) one small pure data-shaping helper that turns `CookWithScore[]` into a chronological `{cookId, label, value}[]` series per metric, reusable across all 7 chart instances, (2) one shared `TrendChart` server component that takes that series and renders a static, responsive, axis-labeled SVG with zero client JS, and (3) one new Supabase query `getAllAiReviews()` (list) + `getAiReviewById()` (detail) joining `cook_ai_review` → `cook` → `competition`, following the exact `PGRST116`-to-`null` and `parseScaId` conventions already established by `getCompetitionWithCooks`/`getCookWithDetails`. No gaps were found between CONTEXT.md's assumptions and the real code — every named function, type, and file exists exactly as described.

**Primary recommendation:** Add a single pure helper `buildTrendSeries(cooks, metric)` in `lib/sca/` (new file, e.g. `lib/sca/trends.ts`) shared by 7 chart instances, one `TrendChart` server component in `components/sca/` rendering static inline SVG (viewBox-based, index-spaced x-axis, min/max-scaled y-axis, first/last point + min/max labeled directly on the chart), and extend `lib/sca/queries.ts` + `lib/sca/types.ts` with `getAllAiReviews()` / `getAiReviewById()` / `AiReviewWithCook` mirroring the existing `getCompetitionWithCooks` embed pattern exactly.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Trend data shaping (score/gap/category series) | API/Backend (`lib/sca/`) | — | Pure functions operating on `CookWithScore[]` already fetched server-side; no UI concerns, must stay reusable across 7 chart instances (mirrors existing `lib/sca/aggregates.ts` pattern) |
| Trend chart rendering (SVG) | Frontend Server (SSR) | — | Static SVG built and serialized entirely server-side as part of the Server Component render tree; D-02 explicitly forbids client JS/hover here |
| AI Reviews list + detail query | Database/Storage (Supabase Postgrest embed) | API/Backend (`lib/sca/queries.ts` typed wrapper) | Join logic (`cook_ai_review` → `cook` → `competition`) is expressed as a Postgrest `select()` embed string, executed by Postgres; the wrapper function only types and error-normalizes the result, matching every existing query in the file |
| AI Reviews page rendering | Frontend Server (SSR) | — | `async` Server Component pattern identical to `app/sca/cooks/page.tsx` / `[id]/page.tsx` — fetch, catch, `logError`, render |
| Navigation (Analytics/AI Reviews links) | Browser/Client | — | `ScaNavBar` is `"use client"` (uses `usePathname()` for active-link highlighting) — the only client component in `app/sca`; D-07's edit happens inside this existing client boundary, not a new one |

## Standard Stack

### Core
No new libraries. This phase is 100% additive code inside the existing stack:

| Library | Version | Purpose | Why Standard (for this phase) |
|---------|---------|---------|--------------------------------|
| `@supabase/supabase-js` | ^2.101.1 (installed, verified in `package.json`) | `getScaSupabaseClient()` reads — already used by every `lib/sca/queries.ts` function | Already the sole data layer for `sca` schema; D-01/CLAUDE.md forbid a new database |
| `next` | ^16.1.6 (installed) | Server Components for `/sca/analytics`, `/sca/ai-reviews`, `/sca/ai-reviews/[id]` | Matches every existing `app/sca/*` route |
| `react` / `react-dom` | 18.3.1 (installed) | SVG rendered as JSX inside a Server Component (no client hooks needed for D-02's static-SVG requirement) | Standard |

### Supporting
None. `vitest` (installed, ^4.0.18) is the only dev dependency relevant to new tests for `buildTrendSeries` and the two new query functions, following the existing `tests/sca-*.test.ts` naming convention.

### Alternatives Considered
Not applicable — D-01 already locked "no charting library" as a decision, not a discretion item. Confirmed via `package.json`: zero charting/visualization packages (`recharts`, `chart.js`, `victory`, `d3`, etc.) present in `dependencies` or `devDependencies` today, so there's no existing dependency to reuse either — inline SVG is the only option consistent with D-01 and CLAUDE.md's "no new visual system" constraint.

**Installation:**
```bash
# None required — this phase adds zero packages.
```

**Version verification:** N/A — no new packages recommended. Existing versions above were read directly from the repo's `package.json`, not training data.

## Package Legitimacy Audit

**Not applicable.** This phase installs zero external packages (confirmed: D-01 locks "hand-built inline SVG, not a new charting library dependency," and a direct read of `package.json` during this research pass confirms no charting/visualization library is present to reuse or upgrade either). The Package Legitimacy Gate protocol is skipped entirely — there is nothing to run `slopcheck` or a registry check against. If a future phase discretion decision reverses D-01, that phase's research must run the full gate before recommending any package.

## Architecture Patterns

### System Architecture Diagram

```
Browser (GET /sca/analytics)
        │
        ▼
app/sca/analytics/page.tsx  (async Server Component, dynamic="force-dynamic")
        │
        ├─► lib/sca/queries.ts :: getAllCooksWithScores()  ──► Supabase (sca.cook + score + competition embed)
        │         │ (ascending by cooked_at — already the exact order trends need)
        │         ▼
        ├─► lib/sca/trends.ts :: buildTrendSeries(cooks, metric)   × 7 calls
        │         │ (total_score, distance_from_winning, appearance, doneness,
        │         │  texture, taste, overall_impression)
        │         ▼
        └─► components/sca/TrendChart.tsx  × 7 renders  ──► static inline <svg>
                  (no client JS; each instance independently scaled to its own series)

Browser (GET /sca/ai-reviews)
        │
        ▼
app/sca/ai-reviews/page.tsx  (async Server Component)
        │
        └─► lib/sca/queries.ts :: getAllAiReviews()  ──► Supabase (sca.cook_ai_review
                  │                                        → cook → competition embed,
                  │                                        ordered created_at desc)
                  ▼
            flat list, each item → Link to /sca/ai-reviews/[id]

Browser (GET /sca/ai-reviews/:id)
        │
        ▼
app/sca/ai-reviews/[id]/page.tsx
        │
        ├─► lib/sca/queries.ts :: parseScaId(id) ──► notFound() if invalid
        └─► lib/sca/queries.ts :: getAiReviewById(id) ──► Supabase (single row + embed)
                  │ null on PGRST116 ──► notFound()
                  ▼
            detail render: model, review_type badge, prompt (if present), comments,
            link back to cook (`/sca/cooks/:cookId`) and competition
```

### Recommended Project Structure
```
app/sca/
├── analytics/
│   └── page.tsx              # NEW — fetches cooks once, renders 7 TrendChart instances
├── ai-reviews/
│   ├── page.tsx               # NEW — list, mirrors app/sca/cooks/page.tsx
│   └── [id]/
│       └── page.tsx           # NEW — detail, mirrors app/sca/cooks/[id]/page.tsx
components/sca/
├── TrendChart.tsx              # NEW — shared server component, static SVG
└── ScaNavBar.tsx                # EDIT — scaNavLinks gains Analytics + AI Reviews (D-07)
lib/sca/
├── trends.ts                    # NEW — buildTrendSeries() + TrendPoint/TrendMetricKey types
├── queries.ts                    # EDIT — add getAllAiReviews(), getAiReviewById()
└── types.ts                       # EDIT — add AiReviewWithCook, AiReviewCookSummary
tests/
├── sca-trends.test.ts             # NEW
└── sca-queries.test.ts             # EDIT — add describe blocks for the two new query fns
```

### Pattern 1: Shared trend-series helper (pure function, no I/O)
**What:** One function turns the already-fetched `CookWithScore[]` into a chronological, per-metric series with nulls filtered out — used identically by all 7 chart instances.
**When to use:** Any time a new trend metric is added in the future (e.g. `field_size`), this is the only function that needs a new case.
**Example (concrete, based on real types read this session):**
```typescript
// lib/sca/trends.ts — proposed, not yet in repo
import { deriveScoreMetrics } from "./scoring";
import { formatCookDate } from "./format";
import type { CookWithScore } from "./types";

export type TrendMetricKey =
  | "total_score"
  | "distance_from_winning"
  | "appearance"
  | "doneness"
  | "texture"
  | "taste"
  | "overall_impression";

export interface TrendPoint {
  cookId: number;
  date: string;   // cook.cooked_at (ISO) — kept for potential future use, not required for rendering
  label: string;   // formatCookDate(cook.cooked_at)
  value: number;
}

function readMetric(cook: CookWithScore, metric: TrendMetricKey): number | null {
  if (cook.score == null) return null;
  if (metric === "distance_from_winning") {
    return deriveScoreMetrics(cook.score).distance_from_winning;
  }
  return cook.score[metric];
}

export function buildTrendSeries(
  cooks: CookWithScore[],
  metric: TrendMetricKey
): TrendPoint[] {
  // cooks is already ascending by cooked_at (getAllCooksWithScores order) — no re-sort needed
  const points: TrendPoint[] = [];
  for (const cook of cooks) {
    const value = readMetric(cook, metric);
    if (value == null) continue;
    points.push({ cookId: cook.id, date: cook.cooked_at, label: formatCookDate(cook.cooked_at), value });
  }
  return points;
}
```
*(Source: hand-derived from `lib/sca/types.ts` `CookWithScore`, `lib/sca/scoring.ts` `deriveScoreMetrics`, `lib/sca/format.ts` `formatCookDate` — all read directly this session, not training data.)*

### Pattern 2: Static SVG small-multiple trend chart (Server Component)
**What:** A single reusable component rendering one metric's series as a responsive, axis-labeled polyline SVG with zero client JS.
**When to use:** All 7 chart instances on `/sca/analytics` (ANLY-01: `total_score`; ANLY-02: `distance_from_winning`; ANLY-03: 5× category), stacked vertically per D-05 ("small multiples," mirroring `SummaryCards`' card-grid pattern).
**Concrete technical approach (recommended defaults — CONTEXT.md leaves exact styling to planner's discretion):**
- Component is a plain function returning JSX — no `"use client"` directive, consistent with every other file under `app/sca` except `ScaNavBar`.
- `viewBox="0 0 W H"` (e.g. `0 0 600 160`) with `width="100%"` and no fixed pixel `height` attribute on the `<svg>` itself — this is what makes it responsive/mobile-first with zero JS (CSS/viewBox scaling only).
- X positions: evenly spaced by **array index**, not by actual elapsed time between cooks (cooks are not evenly spaced in time; index-spacing is the standard sparkline/small-multiple simplification and avoids empty/crowded regions on a 21-point dataset).
- Y positions: linear scale between the series' own `min`/`max` value (10% padding top/bottom so points aren't clipped at the SVG edge), inverted for SVG's top-down y-axis. Each chart scales independently — do NOT force all 7 charts onto a shared y-domain (categories max at ~50, total_score maxes near 254.5 — a shared scale would flatten the category charts to near-invisible).
- Draw one `<polyline points="...">` for the line, one `<circle>` per point (~2.5px radius) as visible markers.
- Label only the **first point, last point, and the point(s) achieving series min/max** with a small `<text>` showing `formatScoreValue(point.value)` positioned above/below the marker (alternate above/below to reduce collision) — satisfies D-02's "key data points... shown directly on/near the chart" without needing per-point value clutter on a 21-point mobile-width chart.
- X-axis labels: render `formatCookDate` text for first and last point only, at the SVG's bottom-left/bottom-right corners — full per-point date labels are unreadable at phone width with 21+ points and are exactly the clutter D-05 is designed to avoid.
- Wrap chart + a text caption (`"{title} · {points.length} cooks · latest {formatScoreValue(last.value)}"`) in a `.glass-card p-6` matching `SummaryCards`'/`app/sca/cooks/page.tsx`'s existing card idiom.
- Empty/low-data states: `points.length === 0` → render the existing "No cooks recorded yet." empty-card idiom instead of an SVG; `points.length === 1` → render the single point as a static dot with no polyline plus a short "Not enough data yet" caption (a `<polyline>` with one coordinate pair draws nothing useful).
- Accessibility (no hover, so this matters more than usual): give the `<svg>` `role="img"` and an `aria-label` summarizing the trend in words (e.g. `"Total score trend: 21 cooks from {first.label} to {last.label}, latest {formatScoreValue(last.value)}"`), and/or a `<title>` child element — static charts with no tooltip need the text alternative baked in, not bolted on.
```typescript
// components/sca/TrendChart.tsx — proposed shape
import { formatScoreValue } from "../../lib/sca/format";
import type { TrendPoint } from "../../lib/sca/trends";

interface TrendChartProps {
  title: string;
  points: TrendPoint[];
  emptyMessage?: string;
}

export function TrendChart({ title, points, emptyMessage }: TrendChartProps) {
  // ...compute min/max, scale points to viewBox coords, pick labeled indices (0, len-1, argmin, argmax)
  // ...return <div className="glass-card p-6"> containing <h3>{title}</h3>, <svg role="img" aria-label=...>, caption <p>
}
```

### Pattern 3: New Supabase join query mirroring `getCompetitionWithCooks`
**What:** `getAllAiReviews()` / `getAiReviewById()` in `lib/sca/queries.ts`, following the exact embed-select-string and `PGRST116` conventions already used by every function in that file.
**When to use:** AIRV-01 (list) and AIRV-02 (detail).
**Concrete select strings (derived from the real FK relationships in `lib/database-sca.types.ts`):**
- `cook_ai_review` has FK `cook_ai_review_cook_id_fkey` → `cook.id`.
- `cook` has FK `cook_competition_id_fkey` → `competition.id` (same FK `getAllCooksWithScores` already embeds through).
- So the nested embed chain is `cook_ai_review → cook:cook_id(..., competition:competition_id(...))`, exactly mirroring the shape already proven in `getAllCooksWithScores`/`getCompetitionWithCooks`.
```typescript
// lib/sca/queries.ts — proposed additions
export async function getAllAiReviews(): Promise<AiReviewWithCook[]> {
  const supabase = getScaSupabaseClient();
  const { data, error } = await supabase
    .from("cook_ai_review")
    .select(
      "id, cook_id, model, review_type, prompt, comments, created_at, cook:cook_id(id, steak_label, competition:competition_id(id, name, event_date, city, state))"
    )
    .order("created_at", { ascending: false }); // D-06: most-recent-first, no client-side sort helper needed

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as AiReviewWithCook[];
}

export async function getAiReviewById(id: number): Promise<AiReviewWithCook | null> {
  const supabase = getScaSupabaseClient();
  const { data, error } = await supabase
    .from("cook_ai_review")
    .select(
      "id, cook_id, model, review_type, prompt, comments, created_at, cook:cook_id(id, steak_label, competition:competition_id(id, name, event_date, city, state))"
    )
    .eq("id", id)
    .single();

  if (error?.code === "PGRST116") {
    return null;
  }
  if (error) {
    throw error;
  }

  return data as unknown as AiReviewWithCook;
}
```
```typescript
// lib/sca/types.ts — proposed additions
export type AiReviewCookSummary = Pick<ScaCookRow, "id" | "steak_label"> & {
  competition: CookCompetitionSummary | null;
};

export interface AiReviewWithCook {
  id: number;
  cook_id: number;
  model: string | null;
  review_type: string | null;
  prompt: string | null;
  comments: string;
  created_at: string;
  cook: AiReviewCookSummary | null;
}
```
Note: unlike most other `sca` tables, `cook_ai_review` has **no `updated_at` column** (confirmed in `lib/database-sca.types.ts` — only `id`, `cook_id`, `comments`, `created_at`, `model`, `prompt`, `review_type`). `created_at` is therefore the only timestamp available and is correctly what D-06 sorts by — there is no alternative "last modified" field to consider.

### Anti-Patterns to Avoid
- **Re-fetching cooks per chart:** Fetch `getAllCooksWithScores()` once in `app/sca/analytics/page.tsx` and call `buildTrendSeries()` 7 times on the same in-memory array — do not issue 7 separate Supabase queries.
- **Duplicating SVG path-building per metric:** CONTEXT.md's discretion section explicitly flags this — one `TrendChart` component parameterized by `title`/`points`, not 7 near-identical chart components.
- **Shared y-axis domain across all 7 charts:** category scores (~0–50 range) and total score (~0–254.5 range) must NOT share one y-scale or the category trends will render as flat lines.
- **Filtering AI Reviews list to `review_type === "appearance"`:** D-03 explicitly requires showing all 3 rows including the one `review_type: "photo_review"` row — do not add a `.eq("review_type", "appearance")` filter.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Score-gap math | A second `distance_from_winning` calculation inline in the trends helper | `deriveScoreMetrics()` from `lib/sca/scoring.ts` (already imported this way by `app/sca/cooks/[id]/page.tsx`) | INFRA-05 requires exactly one shared implementation; duplicating it here would violate that requirement even though it's a one-line formula |
| Cook display naming | Ad hoc `${competitionName} - ${steakLabel}` string building on the AI Reviews list/detail | `cookColumnLabel()` from `lib/sca/format.ts` | Already handles the whitespace-only / missing-name / missing-label fallback logic (`"Untitled Cook"`) that a naive template string would miss |
| Date formatting | `new Date().toLocaleDateString()` calls in the chart or AI review views | `formatCookDate()` (America/Denver, `cooked_at`) or `formatEventDate()` (UTC, `event_date`) from `lib/sca/format.ts` | Two different timezone conventions are already established and tested; picking the wrong one is an easy silent bug (this project's cooks are timestamped, competitions are date-only) |
| Charting | A charting library or a hand-rolled generic chart abstraction beyond what these 7 instances need | The `TrendChart` component described above | D-01 is a locked decision, not a discretion area — this is not a "should we" research question |

**Key insight:** Every numeric/date formatting and derivation concern this phase touches already has exactly one canonical implementation in `lib/sca/`. The entire implementation risk in this phase is in the *new* SVG-rendering and query-joining code, not in re-deriving anything that already exists.

## Common Pitfalls

### Pitfall 1: Treating `cook.score` as always present
**What goes wrong:** `CookWithScore.score` is typed `ScaScoreRow | null` — some cooks (e.g. very recent ones not yet judged) may have no `score` row at all, and even scored cooks can have individual category fields as `null` (all `score` columns are nullable in the generated type).
**Why it happens:** `getAllCooksWithScores()` returns every cook unconditionally (by design, so `DASH-01`'s "latest cooks" group includes unscored cooks) — Analytics is the first feature to require *filtering* that array down to only cooks with a given metric present.
**How to avoid:** `buildTrendSeries()` (Pattern 1 above) already filters `null` at both the `cook.score == null` level and the individual-field level — reuse it rather than assuming every cook in the ascending-order array has every field.
**Warning signs:** A chart with fewer points than `cooks.length`, or a `NaN`/crash if a null value reaches the SVG y-scale math without being filtered first.

### Pitfall 2: Building the y-scale before checking series length
**What goes wrong:** `min`/`max` over an empty or single-element array either throws or produces `min === max`, which then causes a divide-by-zero when computing the scale factor `(value - min) / (max - min)`.
**Why it happens:** Small-multiples charts are especially prone to this because a rarely-scored category (or a newly-added metric) may legitimately have 0 or 1 data points while most charts have the full 20.
**How to avoid:** `TrendChart` must special-case `points.length === 0` and `points.length === 1` explicitly (see Pattern 2's empty/low-data states) before doing any min/max scaling math.
**Warning signs:** `NaN` appearing in SVG `points`/`cx`/`cy` attributes, which browsers silently drop — the chart would render blank with no error, easy to miss in manual QA.

### Pitfall 3: Assuming `cook_ai_review.cook_id` embed always resolves
**What goes wrong:** Typing `AiReviewWithCook.cook` as always non-null (instead of `AiReviewCookSummary | null`) because the DB's `cook_id` column is `NOT NULL` and the FK is enforced.
**Why it happens:** The FK constraint guarantees `cook_id` always points to a real row, but Postgrest embeds are still typed as nullable relations by Supabase's generator for consistency with left-join-shaped responses, and every existing single-embed field in this codebase (`CookWithScore.competition`, `CookWithDetails.competition`) is defensively typed nullable despite the same guarantee. Departing from that convention here would be inconsistent and would remove a defensive null-check the rest of the codebase always keeps.
**How to avoid:** Keep `AiReviewWithCook.cook: AiReviewCookSummary | null` and use the same `cook &&` / `cookColumnLabel(cook?.competition?.name ?? null, cook?.steak_label)` conditional-render pattern already used throughout `app/sca/cooks/[id]/page.tsx`.
**Warning signs:** A TypeScript non-null assertion (`cook!`) anywhere in the new code — this codebase has none of those in `lib/sca/` or `app/sca/` today; introducing one would be a new anti-pattern.

### Pitfall 4: Re-introducing WR-02 (raw Supabase error leakage)
**What goes wrong:** Rendering `error.message` from a failed `getAllAiReviews()`/`getAiReviewById()` call directly to the page.
**Why it happens:** It's the fastest way to debug locally, and the very first `app/sca/page.tsx` iteration did exactly this before Phase 10's Plan 06 fixed it (see `09-REVIEW.md` WR-02).
**How to avoid:** Every new route must follow the exact `try { ... } catch (error) { logError(...); errorMessage = "We couldn't load this page right now. Please try again in a moment."; }` pattern already used verbatim in `app/sca/page.tsx`, `app/sca/cooks/page.tsx`, and `app/sca/cooks/[id]/page.tsx`.
**Warning signs:** Any `{error.message}` or `{String(error)}` interpolated into JSX.

## Code Examples

### Full page skeleton for `/sca/ai-reviews` (mirrors `app/sca/cooks/page.tsx` 1:1)
```typescript
// app/sca/ai-reviews/page.tsx — proposed, structure verified against the real cooks index page
import Link from "next/link";

import { getAllAiReviews } from "../../../lib/sca/queries";
import { cookColumnLabel, formatCookDate, EM_DASH } from "../../../lib/sca/format";
import { logError } from "../../../lib/logger";
import type { AiReviewWithCook } from "../../../lib/sca/types";

export const dynamic = "force-dynamic";

export default async function ScaAiReviewsPage() {
  let reviews: AiReviewWithCook[] = [];
  let errorMessage: string | undefined;

  try {
    reviews = await getAllAiReviews(); // already created_at desc — no client-side sort needed (D-06)
  } catch (error) {
    logError("ScaAiReviewsPage query failed", error, "sca-ai-reviews-index-ssr");
    errorMessage = "We couldn't load this page right now. Please try again in a moment.";
  }

  // ...glass-card list identical in structure to app/sca/cooks/page.tsx, showing
  // review.model, review.review_type badge (EM_DASH fallback), cookColumnLabel(review.cook?.competition?.name, review.cook?.steak_label)
}
```

## State of the Art

Not applicable — this phase's technical approach (SSR SVG, Postgrest embeds) is unchanged from Phase 9/10's established patterns; there is no "old vs. new approach" delta to document within this codebase's own history.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Index-based (not time-based) x-axis spacing is the right default for the trend charts | Architecture Patterns / Pattern 2 | Low — purely visual; CONTEXT.md explicitly leaves exact chart layout to planner's discretion, so this is a recommended default, not a locked claim, and is easy to change in review |
| A2 | Labeling only first/last/min/max points (not every point) satisfies D-02's "key data points shown directly on/near the chart" | Architecture Patterns / Pattern 2 | Low-Medium — if a human reviewer expects every point labeled, this needs a one-line change to the labeled-index selection logic; does not affect data correctness |

*All other claims in this document — function signatures, table/column names, existing file structure, `ScaNavBar`'s current 3-link state, `package.json` dependency list — were read directly from the repository during this research session (tagged implicitly `[VERIFIED: local codebase]` throughout; no external registry or web lookups were needed since this phase adds no new packages).*

## Open Questions

1. **Exact chart pixel dimensions and point/label styling**
   - What we know: D-02 requires static SVG with key values labeled near the chart; ember/smoke/gold tokens must be reused (no new visual system).
   - What's unclear: Exact `viewBox` dimensions, stroke widths, point radius — purely cosmetic, explicitly left to planner/implementer discretion in CONTEXT.md.
   - Recommendation: Planner should pick concrete numeric defaults (this research proposes `0 0 600 160`, 2.5px point radius) and let plan-checker/human review the actual rendered visual in verification rather than block planning on it.

2. **Whether to also link each AI Review's cook name to `/sca/cooks/:id` on the list page (not just the detail page)**
   - What we know: AIRV-02 requires the detail page to link back to cook and competition. D-06 says the list item shows the cook inline via `cookColumnLabel`.
   - What's unclear: CONTEXT.md doesn't explicitly say whether the list item's cook name is itself a link to `/sca/cooks/:id`, or just display text (with the review's own `/sca/ai-reviews/:id` link being the only clickable target on that row).
   - Recommendation: Make the list item's cook name a secondary link to `/sca/cooks/:id` (low-risk, consistent with `app/sca/competitions/[id]/page.tsx`'s pattern of linking every cook row to its detail page) — but this is a minor UX enhancement, not a requirement gap; either choice satisfies AIRV-01/02 literally.

## Environment Availability

Skipped — this phase has no external dependencies beyond the already-configured `SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` env vars, which are already validated and in active use by every existing `app/sca/*` route (confirmed via `lib/supabase-sca.ts`, unchanged this phase).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 (installed, `node` environment) |
| Config file | `vitest.config.ts` — `include: ["tests/**/*.test.ts"]` |
| Quick run command | `npx vitest run tests/sca-trends.test.ts tests/sca-queries.test.ts` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANLY-01 | `buildTrendSeries(cooks, "total_score")` returns chronological non-null points | unit | `npx vitest run tests/sca-trends.test.ts -t "total_score"` | ❌ Wave 0 |
| ANLY-02 | `buildTrendSeries(cooks, "distance_from_winning")` matches `deriveScoreMetrics` output per cook | unit | `npx vitest run tests/sca-trends.test.ts -t "distance_from_winning"` | ❌ Wave 0 |
| ANLY-03 | `buildTrendSeries` correctly reads each of the 5 category fields and skips null values | unit | `npx vitest run tests/sca-trends.test.ts -t "category"` | ❌ Wave 0 |
| ANLY-01/02/03 (render) | `/sca/analytics` renders 7 `TrendChart` instances without throwing when `cooks=[]`, `1 cook`, and `N cooks` | manual-only | — human/browser check (no React Testing Library / jsdom installed; `vitest.config.ts` environment is `"node"`, matching the rest of this repo's test suite, which tests logic not DOM output) | — |
| AIRV-01 | `getAllAiReviews()` passes a select string containing `cook_ai_review`'s expected columns and orders `created_at` desc | unit | `npx vitest run tests/sca-queries.test.ts -t "getAllAiReviews"` | ❌ Wave 0 (append to existing file) |
| AIRV-02 | `getAiReviewById()` returns `null` on `PGRST116`, rethrows other errors, returns the row on success | unit | `npx vitest run tests/sca-queries.test.ts -t "getAiReviewById"` | ❌ Wave 0 (append to existing file) |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/sca-trends.test.ts tests/sca-queries.test.ts`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`, plus a manual browser check of `/sca/analytics`, `/sca/ai-reviews`, `/sca/ai-reviews/[id]` (no automated DOM/rendering test exists in this repo for any `app/sca` page today — `app/sca/cooks/page.tsx` and `[id]/page.tsx` also have zero rendering tests, only their data-layer functions are unit tested; this phase should follow that same established boundary, not introduce a new jsdom/RTL dependency for one phase)

### Wave 0 Gaps
- [ ] `tests/sca-trends.test.ts` — covers ANLY-01, ANLY-02, ANLY-03 (new file, no existing coverage of trend-series building)
- [ ] Extend `tests/sca-queries.test.ts` with `describe("getAllAiReviews")` / `describe("getAiReviewById")` blocks — covers AIRV-01, AIRV-02, following the exact `mockClient`/`lastCall` recorder pattern already in that file (verified this session: the mock's `order()` and `single()` chain already support the exact calls these new functions will make — no test-infra changes needed)

## Security Domain

`security_enforcement` is absent from `.planning/config.json` → treated as enabled per protocol, but this phase's actual attack surface is minimal: it is 100% read-only, adds zero new input fields (the only user-controlled input is the existing `[id]` route param, already validated by the existing `parseScaId()`), and uses the existing service-role Supabase client with no new env vars or credentials.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | No auth in this milestone (v2.0 is explicitly read-only, no new auth per REQUIREMENTS.md Out of Scope) |
| V3 Session Management | No | No sessions involved |
| V4 Access Control | No | Service-role client bypasses RLS by design (existing, unchanged INFRA-01 decision) — no new access-control surface added |
| V5 Input Validation | Yes | Reuse `parseScaId()` verbatim for the new `/sca/ai-reviews/[id]` route param — do not write a second ad hoc integer-parsing regex; `parseScaId` is already tested against SQL-injection-shaped input, exponential notation, and overflow (see `tests/sca-queries.test.ts` `describe("parseScaId")`) |
| V6 Cryptography | No | No new secrets/crypto — reuses existing `SUPABASE_SERVICE_ROLE_KEY` handling, unchanged |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| Raw Postgrest/Supabase error message leaked to the public response body | Information Disclosure | `logError()` + fixed generic error string — already the established pattern (WR-02 fix), must be followed by the two new route handlers exactly as it is by every existing `app/sca/*` route |
| Route param used unvalidated in a `.eq("id", ...)` filter | Tampering (minor — service role query, not raw SQL) | `parseScaId()` before any query call, `notFound()` on `null` — already the established pattern for `/sca/cooks/[id]` and `/sca/competitions/[id]`, must be reused verbatim for `/sca/ai-reviews/[id]` |

## Sources

### Primary (HIGH confidence — direct repository reads this session)
- `lib/sca/queries.ts` — full contents read; confirmed `getAllCooksWithScores`, `getCompetitionWithCooks`, `getCookWithDetails`, `parseScaId` signatures and behavior
- `lib/sca/scoring.ts` — full contents read; confirmed `deriveScoreMetrics`/`PERFECT_SCORE`
- `lib/sca/format.ts` — full contents read; confirmed `formatScoreValue`, `formatCookDate`, `formatEventDate`, `cookColumnLabel`, `EM_DASH`
- `lib/sca/types.ts` — full contents read; confirmed `CookWithScore`, `ComparisonRowKey` (includes all 5 category names), `CookCompetitionSummary`, `CompetitionWithCooks`, `CookWithDetails`
- `lib/sca/aggregates.ts` — full contents read; confirmed `CategoryKey` union, `scoredCooks`, `sortCooksByRecencyDesc`, `computeCategoryAverages`
- `lib/database-sca.types.ts` — full contents read; confirmed exact `score` and `cook_ai_review` table `Row` shapes, including that `cook_ai_review` has no `updated_at` column
- `lib/supabase-sca.ts` — full contents read; confirmed `getScaSupabaseClient()` env-var and schema-scoping behavior (unchanged this phase)
- `lib/logger.ts` — `logError()` signature read; confirmed `(message, error, requestId?)`
- `components/sca/ScaNavBar.tsx` — full contents read; confirmed current `scaNavLinks` has exactly 3 entries (Dashboard, Competitions, Cooks) — Analytics/AI Reviews genuinely not yet present
- `components/sca/SummaryCards.tsx` — full contents read; confirmed the small-multiple `glass-card` grid pattern D-05 asks trend charts to mirror
- `app/sca/cooks/page.tsx`, `app/sca/cooks/[id]/page.tsx`, `app/sca/page.tsx`, `app/sca/layout.tsx` — full contents read; confirmed the exact `async`/`try-catch`/`logError`/`dynamic = "force-dynamic"`/`notFound()` page pattern this phase's 3 new routes should follow
- `tailwind.config.ts`, `app/globals.css` (lines 1–90) — confirmed `ember`/`smoke`/`gold`/`pit` token names and `.glass-card`/`.badge`/`.section-spacing` utility class definitions
- `package.json` — full dependency/devDependency lists read; confirmed zero charting libraries present, confirming D-01 introduces no dependency to reconcile
- `tests/sca-queries.test.ts` — full contents read; confirmed the exact mock-client/call-recorder test pattern new query tests should extend
- `vitest.config.ts` — confirmed `environment: "node"` (not `jsdom`), which sets the Wave 0 test-type boundary (unit tests on data functions only, not component rendering)
- `.planning/config.json` — confirmed `workflow.nyquist_validation: true` and no `security_enforcement` key (→ enabled by protocol default)
- `.planning/phases/11-analytics-ai-reviews/11-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md` — read per task instructions

### Secondary (MEDIUM confidence)
None — every claim in this document was directly verifiable against local repository files; no web search was required since this phase adds no new external dependencies.

### Tertiary (LOW confidence)
None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all versions read directly from `package.json`
- Architecture: HIGH — every reused function/type/pattern verified against real source, not CONTEXT.md's prose alone
- Pitfalls: HIGH — derived from actual nullable-field shapes in the generated `Database` type and the codebase's own established error-handling conventions, not generic advice

**Research date:** 2026-08-24
**Valid until:** Effectively unbounded for this phase (no external dependency drift risk since no packages are added); re-verify `lib/database-sca.types.ts` only if the `sca` schema changes before this phase is planned/executed.
