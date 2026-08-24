# Phase 11: Analytics & AI Reviews - Pattern Map

**Mapped:** 2026-08-24
**Files analyzed:** 10
**Analogs found:** 10 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|---------------|
| `lib/sca/trends.ts` (NEW) | utility | transform | `lib/sca/aggregates.ts` | exact (pure fn over `CookWithScore[]`, no I/O) |
| `components/sca/TrendChart.tsx` (NEW) | component | transform (render) | `components/sca/SummaryCards.tsx` | role-match (server component, `glass-card` small-multiple) |
| `lib/sca/queries.ts` (EDIT — add `getAllAiReviews`, `getAiReviewById`) | service/query | CRUD (read) | `lib/sca/queries.ts` :: `getCompetitionWithCooks` / `getCookWithDetails` (same file) | exact |
| `lib/sca/types.ts` (EDIT — add `AiReviewWithCook`, `AiReviewCookSummary`) | model | — | `lib/sca/types.ts` :: `CompetitionWithCooks`, `CookCompetitionSummary` (same file) | exact |
| `app/sca/analytics/page.tsx` (NEW) | route/controller | request-response | `app/sca/cooks/page.tsx` | role-match (list-shaped SSR page; adapted for charts instead of a list) |
| `app/sca/ai-reviews/page.tsx` (NEW) | route/controller | request-response | `app/sca/cooks/page.tsx` | exact (list SSR page, same shape) |
| `app/sca/ai-reviews/[id]/page.tsx` (NEW) | route/controller | request-response | `app/sca/cooks/[id]/page.tsx` | exact (detail SSR page, `parseScaId` + `notFound()`) |
| `components/sca/ScaNavBar.tsx` (EDIT — extend `scaNavLinks`) | component/nav | — | itself (same file, one-line array edit) | exact |
| `tests/sca-trends.test.ts` (NEW) | test | — | `tests/sca-queries.test.ts` (structure/mocking conventions) | role-match |
| `tests/sca-queries.test.ts` (EDIT — add `describe("getAllAiReviews")` / `describe("getAiReviewById")`) | test | — | itself, mirroring `describe("getCompetitionWithCooks")` / `describe("getCookWithDetails")` blocks | exact |

## Pattern Assignments

### `lib/sca/queries.ts` (service, CRUD-read) — add `getAllAiReviews()` / `getAiReviewById()`

**Analog:** `lib/sca/queries.ts` :: `getCompetitionWithCooks` (lines 51-71) and `getCookWithDetails` (lines 73-90), same file.

**Imports pattern** (lines 1-9):
```typescript
import "server-only";
// Server-only data access. Import only from API routes and Server Components.
import { getScaSupabaseClient } from "../supabase-sca";
import type {
  CompetitionWithCooks,
  CookWithDetails,
  CookWithScore,
  ScaCompetitionRow
} from "./types";
```
Add `AiReviewWithCook` to this type-only import block when implementing.

**List-query core pattern** (mirrors `getAllCooksWithScores`, lines 21-35 — embed select string + `.order()`, no `.eq`/`.single`):
```typescript
export async function getAllCooksWithScores(): Promise<CookWithScore[]> {
  const supabase = getScaSupabaseClient();
  const { data, error } = await supabase
    .from("cook")
    .select(
      "id, steak_label, cooked_at, competition_id, competition:competition_id(id, name, event_date, city, state), score(*)"
    )
    .order("cooked_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as CookWithScore[];
}
```
For `getAllAiReviews()`: same shape, `.from("cook_ai_review")`, embed `cook:cook_id(id, steak_label, competition:competition_id(id, name, event_date, city, state))`, `.order("created_at", { ascending: false })` per D-06.

**Detail-query core + PGRST116 pattern** (mirrors `getCompetitionWithCooks`, lines 51-71 and `getCookWithDetails`, lines 73-90):
```typescript
export async function getCompetitionWithCooks(
  id: number
): Promise<CompetitionWithCooks | null> {
  const supabase = getScaSupabaseClient();
  const { data, error } = await supabase
    .from("competition")
    .select(
      "*, cook(id, steak_label, cooked_at, competition_id, competition:competition_id(id, name, event_date, city, state), score(*))"
    )
    .eq("id", id)
    .single();

  if (error?.code === "PGRST116") {
    return null;
  }
  if (error) {
    throw error;
  }

  return data as unknown as CompetitionWithCooks;
}
```
For `getAiReviewById(id)`: same shape, `.from("cook_ai_review")`, same embed as the list query, `.eq("id", id).single()`, same `PGRST116 → null` branch. `getCookWithDetails` (lines 73-90) additionally shows the "normalize nullable embedded array" pattern (`cook_ai_review: row.cook_ai_review ?? []`) — not needed here since the new embed is a single nested object, not an array, but keep in mind if a defensive default is ever needed.

**Error handling pattern:** identical `if (error?.code === "PGRST116") return null; if (error) throw error;` for single-row fetches, or plain `if (error) throw error;` for list fetches — no custom error class, the thrown Postgrest error propagates to the page's `try/catch` (see page pattern below), never rendered directly (WR-02).

---

### `lib/sca/types.ts` (model) — add `AiReviewWithCook`, `AiReviewCookSummary`

**Analog:** `lib/sca/types.ts` (same file) :: `CookCompetitionSummary` (lines 9-12) and `CompetitionWithCooks` (line 85).

**Pattern** (`Pick<>` summary type + composed embed type):
```typescript
export type CookCompetitionSummary = Pick<
  ScaCompetitionRow,
  "id" | "name" | "event_date" | "city" | "state"
>;
```
```typescript
export type CompetitionWithCooks = ScaCompetitionRow & { cook: CookWithScore[] };
```
New types follow the same idiom:
```typescript
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
Note existing `ScaCookAiReviewRow` (line 7: `Database["sca"]["Tables"]["cook_ai_review"]["Row"]`) is already defined and imported by `CookWithDetails` (line 91) — reuse its field names for consistency rather than re-typing column names by hand. Keep `cook: AiReviewCookSummary | null` nullable per Pitfall 3 in RESEARCH.md, matching every other single-embed field in this file (`CookWithScore.competition`, `CookWithDetails.competition`).

---

### `lib/sca/trends.ts` (utility, transform) — NEW file

**Analog:** `lib/sca/aggregates.ts` (full file read).

**Imports pattern** (lines 1-2):
```typescript
import { deriveScoreMetrics } from "./scoring";
import type { CookWithScore, SummaryStats } from "./types";
```

**Core pure-transform pattern** (mirrors `computeCategoryAverages`, lines 85-118 — reads `cook.score[key]`, filters nulls, calls `deriveScoreMetrics` for the derived gap metric):
```typescript
export function computeCategoryAverages(cooks: CookWithScore[]): Record<CategoryKey, number | null> {
  const scored = scoredCooks(cooks);

  const directAverage = (
    key: "appearance" | "doneness" | "texture" | "taste" | "overall_impression" | "placement" | "total_score"
  ): number | null =>
    average(
      scored
        .map((cook) => cook.score[key])
        .filter((value): value is number => value != null)
    );

  const distances = scored.map((cook) => deriveScoreMetrics(cook.score));

  return {
    appearance: directAverage("appearance"),
    ...
    distance_from_winning: average(
      distances
        .map((metrics) => metrics.distance_from_winning)
        .filter((value): value is number => value != null)
    ),
    ...
  };
}
```
**Null-filtering guard pattern** (mirrors `scoredCooks`, lines 50-54 — filter to only cooks where the relevant field is non-null, using a type-predicate):
```typescript
export function scoredCooks(cooks: CookWithScore[]): ScoredCook[] {
  return cooks.filter(
    (cook): cook is ScoredCook => cook.score != null && cook.score.total_score != null
  );
}
```
`buildTrendSeries(cooks, metric)` (RESEARCH.md Pattern 1, already fully drafted) should follow this exact idiom: iterate the already-ordered `cooks` array (no re-sort, same as `computeCategoryAverages` never re-sorts), guard on `cook.score == null`, dispatch to `deriveScoreMetrics(cook.score).distance_from_winning` for the one derived metric exactly like `computeCategoryAverages` does, and use `cook.score[metric]` directly for the five raw category fields + `total_score`. No new sorting helper is needed — `sortCooksByRecencyDesc` (lines 146-156) is NOT the pattern to copy here since trends need ascending chronological order, which `getAllCooksWithScores()` already provides.

**No error handling needed** — this file is 100% pure functions over already-fetched, already-typed data (no I/O, no try/catch), same as all of `aggregates.ts`.

---

### `components/sca/TrendChart.tsx` (component, transform/render) — NEW file

**Analog:** `components/sca/SummaryCards.tsx` (full file read, 71 lines).

**Imports pattern** (lines 1-4):
```typescript
import Link from "next/link";

import { cookColumnLabel, formatScoreValue, EM_DASH } from "../../lib/sca/format";
import type { CookWithScore, SummaryStats } from "../../lib/sca/types";
```
`TrendChart` needs `formatScoreValue` from `lib/sca/format` and `TrendPoint` type from the new `lib/sca/trends.ts` — no `Link`/`cookColumnLabel` needed since this component takes pre-shaped `points`, not raw cooks.

**Card-wrapper + typography-token pattern** (lines 6-11, applied throughout the file):
```typescript
const LABEL_CLASSES = "text-xs font-semibold uppercase tracking-[0.25em] text-smoke-800";
const VALUE_CLASSES = "text-4xl font-semibold text-[#f7f1e6] font-[var(--font-display)]";
const BODY_CLASSES = "mt-3 text-sm text-smoke-800";
```
```typescript
<div className="glass-card p-6">
  <p className={LABEL_CLASSES}>Latest Cooks</p>
  <p className={VALUE_CLASSES}>...</p>
  ...
</div>
```
`TrendChart` should wrap its `<svg>` in the same `glass-card p-6` container, use `LABEL_CLASSES`-equivalent styling for the `<h3>{title}</h3>` heading and a `BODY_CLASSES`-equivalent caption paragraph below the chart, exactly matching this card idiom (per D-05's explicit instruction to mirror `SummaryCards`' small-multiple layout).

**Empty-state / conditional-render pattern** (lines 26-38, ternary + `EM_DASH` fallback):
```typescript
<p className={VALUE_CLASSES}>
  {stats.latestCooks.length > 0 ? stats.latestCooks.length : EM_DASH}
</p>
{stats.latestCooks.length > 0 ? (
  <ul className={BODY_CLASSES}>
    ...
  </ul>
) : null}
```
`TrendChart` should follow the same `points.length === 0` / `points.length === 1` / normal-path conditional structure described in RESEARCH.md Pattern 2, reusing `EM_DASH`-equivalent "No data" messaging style already established by the cooks empty-card idiom in `app/sca/cooks/page.tsx` (lines 40-48: `"No cooks recorded yet."` heading pattern inside a `glass-card`).

**Design tokens for SVG styling** (from `tailwind.config.ts`, confirmed):
- `ember.500 = #e64622` (primary line/accent), `gold.300 = #f0c16a` (point/label highlight), `smoke.800 = #e8ddd1` (axis text, matches `text-smoke-800` used everywhere), `pit.card = #16100c` (matches `.glass-card` background — no separate SVG background needed).
- `.glass-card` (globals.css lines 35-38): `rounded-lg border border-[#3a2a20] bg-[#16100c] shadow-soft` — the chart's outer wrapper.
- `.badge` (globals.css lines 40-42) is the reusable pill-badge class — reuse for AI Review `review_type`/`model` badges instead of inventing new badge markup.

---

### `app/sca/analytics/page.tsx` (route, request-response) — NEW

**Analog:** `app/sca/cooks/page.tsx` (full file, 71 lines) — adapted from a list-of-cards page to a stack-of-charts page.

**Full page skeleton pattern** (lines 1-27, 68-71 — imports, `export const dynamic`, try/catch/logError, outer `section-spacing` wrapper):
```typescript
import Link from "next/link";

import { sortCooksByRecencyDesc } from "../../../lib/sca/aggregates";
import { getAllCooksWithScores } from "../../../lib/sca/queries";
import { cookColumnLabel, formatCookDate, formatScoreValue } from "../../../lib/sca/format";
import { logError } from "../../../lib/logger";
import type { CookWithScore } from "../../../lib/sca/types";

export const dynamic = "force-dynamic";

export default async function ScaCooksPage() {
  let cooks: CookWithScore[] = [];
  let errorMessage: string | undefined;

  try {
    cooks = await getAllCooksWithScores();
  } catch (error) {
    logError("ScaCooksPage query failed", error, "sca-cooks-index-ssr");
    errorMessage = "We couldn't load this page right now. Please try again in a moment.";
  }
  ...
  return (
    <div className="section-spacing">
      <h1 className="font-[var(--font-display)] text-4xl font-semibold text-[#f7f1e6]">
        Cooks
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-smoke-800">...</p>
      {errorMessage ? (
        <div className="glass-card mt-8 p-6">
          <p className="text-sm text-smoke-800">{errorMessage}</p>
        </div>
      ) : ...}
    </div>
  );
}
```
For `/sca/analytics`: fetch `getAllCooksWithScores()` **once** (RESEARCH.md anti-pattern warning: do not re-fetch per chart), call `buildTrendSeries(cooks, metric)` up to 7 times, and render 7 `<TrendChart>` instances stacked in the same `section-spacing` + heading structure as this analog. Use `logError("ScaAnalyticsPage query failed", error, "sca-analytics-ssr")` for the request-id string (unique per route, matching every other page's convention of `"sca-<route>-ssr"` / `"sca-<route>-index-ssr"`).

---

### `app/sca/ai-reviews/page.tsx` (route, request-response) — NEW

**Analog:** `app/sca/cooks/page.tsx` (same file as above) — near-identical shape, list of `glass-card` rows sorted by a timestamp, linking into a detail route.

Reuse the exact same skeleton (imports, `dynamic = "force-dynamic"`, try/catch/logError, error/empty/list ternary at lines 36-68) with these substitutions:
- `getAllCooksWithScores()` → `getAllAiReviews()` (already `created_at` desc from the query itself — D-06 — no client-side `sortCooksByRecencyDesc`-equivalent needed, per RESEARCH.md's `Code Examples` section which already drafts this exact page).
- Each row shows `review.model`, `review.review_type` (badge, `EM_DASH` fallback per D-03/CONTEXT.md), and `cookColumnLabel(review.cook?.competition?.name ?? null, review.cook?.steak_label ?? null)`, linking to `/sca/ai-reviews/${review.id}`.
- `formatCookDate(review.created_at)` for the timestamp, same as `formatCookDate(cook.cooked_at)` at line 54 of the analog.

---

### `app/sca/ai-reviews/[id]/page.tsx` (route, request-response) — NEW

**Analog:** `app/sca/cooks/[id]/page.tsx` (full file, 186 lines).

**`parseScaId` + `notFound()` pattern** (lines 47-56):
```typescript
export default async function CookDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookId = parseScaId(id);
  if (cookId === null) {
    notFound();
  }

  let cook: CookWithDetails | null = null;
  let errorMessage: string | undefined;

  try {
    cook = await getCookWithDetails(cookId);
  } catch (error) {
    logError("CookDetailPage query failed", error, "sca-cook-detail-ssr");
    errorMessage = "We couldn't load this page right now. Please try again in a moment.";
  }

  if (errorMessage) {
    return (
      <div className="section-spacing">
        <div className="glass-card p-6">
          <p className="text-sm text-smoke-800">{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (cook === null) {
    notFound();
  }
  ...
```
For `/sca/ai-reviews/[id]`: identical structure with `getAiReviewById(reviewId)` replacing `getCookWithDetails(cookId)`.

**AI review detail rendering pattern is already proven in this exact file** (lines 149-177 — the "AI Reviews" section of the Cook Detail page):
```typescript
{cook.cook_ai_review.map((review) => (
  <div key={review.id} className="glass-card p-6">
    <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.25em] text-smoke-800">
      {review.model && <span>{review.model}</span>}
      {review.review_type && <span>{review.review_type}</span>}
      <span>{formatCookDate(review.created_at)}</span>
    </div>
    <p className="mt-3 whitespace-pre-line text-sm text-[#f7f1e6]">{review.comments}</p>
    {review.prompt && (
      <div className="mt-3">
        <p className="text-xs uppercase tracking-[0.25em] text-smoke-800">Prompt</p>
        <p className="mt-1 whitespace-pre-line text-sm text-[#f7f1e6]">{review.prompt}</p>
      </div>
    )}
  </div>
))}
```
This is the single strongest analog in the whole codebase for AIRV-02 — it already implements the exact conditional `model`/`review_type`/`prompt` (D-04's "omit when null, no placeholder") rendering the new detail page needs; the new page just renders this same block for a single review (not `.map()`ed) plus back-links to `/sca/cooks/${cook.id}` and `/sca/competitions/${competition.id}` following the `backHref`/`backLabel` pattern at lines 86-87 and 179-183.

**Back-link pattern** (lines 86-87, 179-183):
```typescript
const backHref = cook.competition ? `/sca/competitions/${cook.competition.id}` : "/sca/competitions";
const backLabel = cook.competition ? "Back to Competition" : "Back to Competitions";
...
<div className="mt-8">
  <Link href={backHref} className={LINK_CLASSES}>
    {backLabel}
  </Link>
</div>
```
The new detail page should link back to both the cook (`/sca/cooks/${review.cook.id}`) and the competition (`/sca/competitions/${review.cook.competition.id}`), mirroring the inline `Link` at lines 96-105 (cook's competition inline link) plus the bottom back-link block.

**`LINK_CLASSES` constant** (line 18-19, repeated verbatim across every `app/sca/**/page.tsx`):
```typescript
const LINK_CLASSES =
  "min-h-[44px] inline-flex items-center text-smoke-800 hover:text-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500";
```

---

### `components/sca/ScaNavBar.tsx` (component/nav) — EDIT

**Analog:** itself (same file, full 55 lines read).

**Exact edit point** (lines 7-11):
```typescript
const scaNavLinks = [
  { label: "Dashboard", href: "/sca" },
  { label: "Competitions", href: "/sca/competitions" },
  { label: "Cooks", href: "/sca/cooks" }
] as const;
```
Per D-07, append two entries to reach the final 5-item order (Dashboard, Competitions, Cooks, Analytics, AI Reviews):
```typescript
const scaNavLinks = [
  { label: "Dashboard", href: "/sca" },
  { label: "Competitions", href: "/sca/competitions" },
  { label: "Cooks", href: "/sca/cooks" },
  { label: "Analytics", href: "/sca/analytics" },
  { label: "AI Reviews", href: "/sca/ai-reviews" }
] as const;
```
No other change needed — `isActive()` (lines 16-19) already handles new hrefs generically via `pathname.startsWith(href + "/")`, and the `.map()` render (lines 39-50) is href-list-driven. This is a pure one-line-array addition, no new logic.

---

### `tests/sca-trends.test.ts` (test) — NEW

**Analog:** `tests/sca-queries.test.ts` (full file, 228 lines) — for describe-block/assertion conventions, though `trends.ts` has no Supabase mock needed (pure functions, no `vi.mock`).

Since `lib/sca/trends.ts` has zero I/O, the mock-client scaffolding (lines 1-65 of the analog) does NOT apply — instead follow `tests/sca-queries.test.ts`'s plain assertion style (`expect(...).toEqual(...)`, `expect(...).toBeNull()`) seen throughout `describe("parseScaId", ...)` (lines 67-127), which tests a pure function with no mocking:
```typescript
describe("parseScaId", () => {
  it("accepts a plain numeric string", async () => {
    const { parseScaId } = await import("../lib/sca/queries");
    expect(parseScaId("12")).toBe(12);
  });
  ...
```
`sca-trends.test.ts` should mirror this same `describe(...) { it(...) { const { fn } = await import(...); expect(fn(input)).toEqual(expected); } }` shape for `buildTrendSeries`, with one `describe` block per metric family (`total_score`, `distance_from_winning`, category fields) per the RESEARCH.md test map.

---

### `tests/sca-queries.test.ts` (test) — EDIT, add `getAllAiReviews`/`getAiReviewById` describe blocks

**Analog:** itself, `describe("getCompetitionWithCooks")` (lines 174-195) and `describe("getCookWithDetails")` (lines 197-227), same file — the mock/call-recorder scaffolding at the top (lines 1-65) already supports `.select()`, `.order()`, `.eq()`, `.single()` chaining exactly as the new functions will call them; no test-infra changes needed.

**PGRST116 / success / non-PGRST116-rejects triad pattern** (lines 174-195):
```typescript
describe("getCompetitionWithCooks", () => {
  it("resolves to null for a PGRST116 error", async () => {
    mockResult = { data: null, error: { code: "PGRST116" } };
    const { getCompetitionWithCooks } = await import("../lib/sca/queries");
    const result = await getCompetitionWithCooks(4);
    expect(result).toBeNull();
  });

  it("rejects for a non-PGRST116 error", async () => {
    mockResult = { data: null, error: { code: "500", message: "boom" } };
    const { getCompetitionWithCooks } = await import("../lib/sca/queries");
    await expect(getCompetitionWithCooks(4)).rejects.toBeTruthy();
  });

  it("returns the row on success", async () => {
    const row = { id: 4, name: "BBQ Pit Stop St George", cook: [] };
    mockResult = { data: row, error: null };
    const { getCompetitionWithCooks } = await import("../lib/sca/queries");
    const result = await getCompetitionWithCooks(4);
    expect(result).toEqual(row);
  });
});
```
Add `describe("getAllAiReviews")` mirroring `describe("getAllCooksWithScores")` (lines 129-150 — select-string-contains assertion, `[]`-on-null-data assertion, rejects-on-error assertion) and `describe("getAiReviewById")` mirroring the triad above verbatim (swap function name and mock row shape to `{ id, cook_id, model, review_type, prompt, comments, created_at, cook: {...} }`).

---

## Shared Patterns

### SSR page skeleton (try/catch/logError/error-message)
**Source:** `app/sca/cooks/page.tsx` lines 14-23, `app/sca/cooks/[id]/page.tsx` lines 58-76 (nearly identical in every `app/sca/**/page.tsx` file)
**Apply to:** `app/sca/analytics/page.tsx`, `app/sca/ai-reviews/page.tsx`, `app/sca/ai-reviews/[id]/page.tsx`
```typescript
export const dynamic = "force-dynamic";

export default async function SomePage() {
  let data: T[] = [];
  let errorMessage: string | undefined;

  try {
    data = await someQuery();
  } catch (error) {
    logError("SomePage query failed", error, "sca-some-page-ssr");
    errorMessage = "We couldn't load this page right now. Please try again in a moment.";
  }

  if (errorMessage) {
    return (
      <div className="section-spacing">
        <div className="glass-card p-6">
          <p className="text-sm text-smoke-800">{errorMessage}</p>
        </div>
      </div>
    );
  }
  ...
}
```
Never interpolate `error.message`/`String(error)` into JSX (WR-02, Pitfall 4 in RESEARCH.md).

### `parseScaId` + `notFound()` for `[id]` routes
**Source:** `lib/sca/queries.ts` lines 11-19 (`parseScaId`), `app/sca/cooks/[id]/page.tsx` lines 47-56, 78-80 (usage)
**Apply to:** `app/sca/ai-reviews/[id]/page.tsx`
```typescript
const { id } = await params;
const reviewId = parseScaId(id);
if (reviewId === null) {
  notFound();
}
...
if (review === null) {
  notFound();
}
```

### `PGRST116` → `null` Supabase error normalization
**Source:** `lib/sca/queries.ts` lines 63-68 (`getCompetitionWithCooks`), lines 81-86 (`getCookWithDetails`)
**Apply to:** `getAiReviewById()` in `lib/sca/queries.ts`
```typescript
if (error?.code === "PGRST116") {
  return null;
}
if (error) {
  throw error;
}
```

### `glass-card` / typography token classes
**Source:** `app/globals.css` lines 31-42; `components/sca/SummaryCards.tsx` lines 6-11; used identically across every `app/sca/**` file
**Apply to:** `TrendChart.tsx`, `app/sca/analytics/page.tsx`, `app/sca/ai-reviews/page.tsx`, `app/sca/ai-reviews/[id]/page.tsx`
```typescript
const LABEL_CLASSES = "text-xs font-semibold uppercase tracking-[0.25em] text-smoke-800";
const VALUE_CLASSES = "text-4xl font-semibold text-[#f7f1e6] font-[var(--font-display)]";
const BODY_CLASSES = "mt-3 text-sm text-smoke-800";
const LINK_CLASSES =
  "min-h-[44px] inline-flex items-center text-smoke-800 hover:text-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500";
```
```css
.glass-card { @apply rounded-lg border border-[#3a2a20] bg-[#16100c] shadow-soft; box-shadow: 0 16px 30px rgba(7, 5, 4, 0.5); }
.badge { @apply inline-flex items-center gap-2 rounded-full bg-[#7a1a0e] px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.35em] text-[#f5ddd8]; }
.section-spacing { @apply px-6 py-12 md:px-12; }
```

### `EM_DASH` null-value fallback
**Source:** `lib/sca/format.ts` line 1 (`export const EM_DASH = "—";`), used in `formatScoreValue` (lines 3-9) and `components/sca/SummaryCards.tsx` line 27
**Apply to:** AI Review `review_type` badge rendering when null (D-03), any other nullable display field

### Named-exports-only, no-default-export (except page/layout files)
**Source:** repo-wide convention confirmed by every `lib/sca/*.ts` and `components/sca/*.tsx` file read this session
**Apply to:** `lib/sca/trends.ts`, `components/sca/TrendChart.tsx` — `export function` / `export const`, not `export default`

## No Analog Found

None. Every file in scope has a strong same-file or same-directory analog — this phase is purely additive within an already-established `app/sca` / `lib/sca` / `components/sca` structure from Phase 9/10.

## Metadata

**Analog search scope:** `lib/sca/`, `components/sca/`, `app/sca/`, `tests/sca-*.test.ts`, `app/globals.css`, `tailwind.config.ts`
**Files scanned:** `lib/sca/queries.ts`, `lib/sca/types.ts`, `lib/sca/aggregates.ts`, `lib/sca/format.ts`, `lib/sca/scoring.ts`, `app/sca/cooks/page.tsx`, `app/sca/cooks/[id]/page.tsx`, `components/sca/SummaryCards.tsx`, `components/sca/ScaNavBar.tsx`, `tests/sca-queries.test.ts`, `app/globals.css`, `tailwind.config.ts`, `lib/logger.ts`
**Pattern extraction date:** 2026-08-24
