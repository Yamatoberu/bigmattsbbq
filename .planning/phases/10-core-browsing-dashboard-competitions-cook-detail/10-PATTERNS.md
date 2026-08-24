# Phase 10: Core Browsing — Dashboard, Competitions & Cook Detail - Pattern Map

**Mapped:** 2026-08-23
**Files analyzed:** 15
**Analogs found:** 15 / 15 (all role-match or better; no dynamic `[id]` route precedent exists yet in this repo, noted below)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/sca/page.tsx` (rewrite) | route (Server Component page) | request-response (SSR read) | itself (`app/sca/page.tsx`, current placeholder) | exact — same file, same shell/export contract, body replaced |
| `app/sca/competitions/page.tsx` | route (Server Component page, list) | request-response (SSR read) | `app/sca/page.tsx` | exact — same fetch/try-catch/logError shape, new query |
| `app/sca/competitions/[id]/page.tsx` | route (Server Component page, dynamic detail) | request-response (SSR read, single-row) | `app/sca/page.tsx` (data-fetch shape) + `app/confirmation/page.tsx` (`Promise` params/searchParams pattern) | role-match — no `[id]` dynamic route exists yet in this repo; params-as-Promise precedent taken from `searchParams` in `app/confirmation/page.tsx` |
| `app/sca/cooks/[id]/page.tsx` | route (Server Component page, dynamic detail) | request-response (SSR read, single-row + nested embeds) | same as above | role-match — same reasoning |
| `components/sca/ScaNavBar.tsx` (modify) | component (client nav) | event-driven (route highlighting) | itself | exact — one-line array edit (D-11) |
| `components/sca/ComparisonTable.tsx` | component (server, shared) | transform (rows/columns from cook+score data) | `lib/normalizers.ts` (`joinInventoryCounts`, transform shape) for the underlying row-building logic; `app/sca/page.tsx`'s `.glass-card` usage for markup/styling | role-match — no existing table component in the repo; closest transform-shaped analog is `joinInventoryCounts` |
| `components/sca/SummaryCards.tsx` | component (server, presentational) | transform | `app/sca/page.tsx`'s existing stat-card block (lines 33-49) | exact — literally the same `.glass-card` stat-card pattern, extracted and repeated |
| `components/sca/WhatStandsOut.tsx` | component (server, presentational) | transform | `app/sca/page.tsx`'s stat-card block + `lib/sca/insights.ts` output | role-match |
| `lib/sca/queries.ts` | service (server-only data access) | request-response (Supabase embedded `select()`) | `app/sca/page.tsx`'s inline query block (lines 10-24) + `lib/supabase-sca.ts` (`server-only` discipline) | role-match — first extraction of query logic out of a page into `lib/sca/`; no prior `lib/sca/queries.ts` exists, but the try/catch-free query shape and `server-only` import discipline are directly precedented |
| `lib/sca/aggregates.ts` | utility (pure function) | transform / batch | `lib/cart.ts` (`aggregateByProduct`, `mergeCartItems`) | exact — same "pure function module with `Map`/`reduce` over an array" shape |
| `lib/sca/insights.ts` | utility (pure function) | transform / batch | `lib/cart.ts` (`isSauceBumpNeeded` — conditional derived-value logic) | role-match |
| `lib/sca/comparison.ts` | utility (pure function) | transform | `lib/normalizers.ts` (`joinInventoryCounts`) | exact — same "map input rows + a lookup into a normalized output shape" pattern |
| `lib/sca/format.ts` (or extend `lib/format.ts`) | utility (pure function) | transform | `lib/format.ts` (`formatMoney`, `formatDenverDateTime`) | exact — same module, same `Intl`-based formatting convention |
| `lib/sca/cookDetailFields.ts` | utility (pure function) | transform | `lib/cart.ts` (`aggregateByProduct` — filter+map over a fixed field list) | role-match |
| `tests/sca-aggregates.test.ts`, `tests/sca-comparison.test.ts`, `tests/sca-insights.test.ts`, `tests/sca-cook-detail-fields.test.ts` | test | batch (pure function assertions) | `tests/sca-scoring.test.ts` | exact — identical `describe`/`it`/`expect` structure, same `Database["sca"]["Tables"][...]["Row"]` typing convention for fixtures |

## Pattern Assignments

### `app/sca/page.tsx` (route, request-response) — Dashboard rewrite

**Analog:** `app/sca/page.tsx` itself (current placeholder body)

**Full current file** (`app/sca/page.tsx:1-56`) — this is the exact shape every new/rewritten `app/sca/**/page.tsx` must follow:
```typescript
import { getScaSupabaseClient } from "../../lib/supabase-sca";
import { logError } from "../../lib/logger";

export const dynamic = "force-dynamic";

export default async function ScaIndexPage() {
  let competitionCount: number | null = null;
  let errorMessage: string | undefined;

  try {
    const supabase = getScaSupabaseClient();
    const { count, error } = await supabase
      .from("competition")
      .select("*", { count: "exact", head: true });

    if (error) {
      throw error;
    }

    competitionCount = count ?? 0;
  } catch (error) {
    logError("ScaIndexPage competition count query failed", error, "sca-index-ssr");
    errorMessage = error instanceof Error ? error.message : "Unknown error loading SCA data.";
  }
  // ... renders errorMessage directly — this is WR-02, DO NOT COPY into new pages
```

**What to copy:** the `export const dynamic = "force-dynamic";` export, the `async function` Server Component shape, the `try { getScaSupabaseClient(); ... } catch { logError(...) }` structure, relative import paths (`../../lib/...`).

**What to fix, not copy (WR-02):** line 23 assigns `error.message` to `errorMessage` and line 37 renders it directly (`<p>{errorMessage}</p>`). Per `10-RESEARCH.md` Pitfall 4 and the UI-SPEC's locked error copy, every new page must instead render the generic string `"We couldn't load this page right now. Please try again in a moment."` and never surface `error.message` to the browser. Corrected pattern:
```typescript
} catch (error) {
  logError("DashboardPage query failed", error, "sca-dashboard-ssr");
  errorMessage = "We couldn't load this page right now. Please try again in a moment.";
}
```

**Empty-state copy to reuse verbatim** (UI-SPEC, matches line 40's existing precedent): `"No competitions have been recorded yet."` → UI-SPEC's locked variant for the Competitions list is `"No competitions recorded yet."` / `"Check back after Big Matt's next SCA cookoff."` (two-line heading+body, slightly reworded from this placeholder — use the UI-SPEC wording for new pages).

---

### `app/sca/competitions/page.tsx` (route, list) — NEW

**Analog:** `app/sca/page.tsx` (fetch/error shape) — no list-page precedent exists yet, so the Dashboard's data-fetch skeleton is the template; markup/empty-state comes from UI-SPEC.

**Core pattern to build:**
```typescript
import { getCompetitions } from "../../../lib/sca/queries";
import { logError } from "../../../lib/logger";

export const dynamic = "force-dynamic";

export default async function CompetitionsPage() {
  let competitions: Awaited<ReturnType<typeof getCompetitions>> | null = null;
  let errorMessage: string | undefined;

  try {
    competitions = await getCompetitions();
  } catch (error) {
    logError("CompetitionsPage query failed", error, "sca-competitions-ssr");
    errorMessage = "We couldn't load this page right now. Please try again in a moment.";
  }
  // render list ordered by event_date descending (COMP-01), .glass-card row per competition,
  // omit null city/state/organizer per D-08, Link to /sca/competitions/[id]
}
```
Reuses `.glass-card` (`app/globals.css:35-38`) for each competition row card, per UI-SPEC's "most recent competition row card, positioned first" focal point.

---

### `app/sca/competitions/[id]/page.tsx` and `app/sca/cooks/[id]/page.tsx` (dynamic detail routes) — NEW

**Analog for the data-fetch/error shape:** `app/sca/page.tsx` (as above).
**Analog for the `Promise` params pattern:** `app/confirmation/page.tsx:4-9` (this repo's only existing `Promise<{...}>`-typed page prop, for `searchParams` — no `[id]` dynamic segment exists anywhere in the repo yet, confirmed via `find app -type d -name "[*]"` returning nothing before this phase).

**`app/confirmation/page.tsx:4-9`** — the literal precedent to mirror for `params`:
```typescript
export default async function ConfirmationPage({
  searchParams
}: {
  searchParams: Promise<{ orderId?: string; pickupNote?: string }>;
}) {
  const { orderId = "", pickupNote = "Pickup scheduled" } = await searchParams;
```

**Correct pattern for the new `[id]` routes** (per `10-RESEARCH.md` Pattern 2/3 — apply the same `await`-a-Promise idiom to `params` instead of `searchParams`, plus `.single()` + `notFound()`):
```typescript
import { notFound } from "next/navigation";
import { getCompetitionWithCooks } from "../../../../lib/sca/queries";
import { logError } from "../../../../lib/logger";

export const dynamic = "force-dynamic";

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

  let errorMessage: string | undefined;
  let competition: Awaited<ReturnType<typeof getCompetitionWithCooks>> | null = null;
  try {
    competition = await getCompetitionWithCooks(competitionId);
  } catch (error) {
    if ((error as { code?: string }).code === "PGRST116") {
      notFound();
    }
    logError("CompetitionDetailPage query failed", error, "sca-competition-detail-ssr");
    errorMessage = "We couldn't load this page right now. Please try again in a moment.";
  }
  // render competition metadata (omit null city/state/elevation_ft/organizer/notes per D-08)
  // + <ComparisonTable cooks={competition.cook} ... /> scoped to this competition (D-02/COMP-03)
}
```
Same shape applies to `app/sca/cooks/[id]/page.tsx`, querying via `getCookWithDetails(id)` and rendering Score Breakdown (D-04 em-dash rule), Process Variables (D-09 fallback), and AI Reviews (D-10 fallback, always rendered).

---

### `components/sca/ScaNavBar.tsx` (modify, D-11)

**Analog:** itself — one-line array edit.

**Current** (`components/sca/ScaNavBar.tsx:7`):
```typescript
const scaNavLinks = [{ label: "Dashboard", href: "/sca" }] as const;
```

**Required change (D-11, exact array shape locked by CONTEXT.md):**
```typescript
const scaNavLinks = [
  { label: "Dashboard", href: "/sca" },
  { label: "Competitions", href: "/sca/competitions" }
] as const;
```
Nothing else in this file changes — `isActive()` (lines 12-15) already handles any `href` via its `pathname.startsWith(href + "/")` fallback, so `/sca/competitions/[id]` will correctly highlight the `Competitions` link with zero further edits.

---

### `lib/sca/queries.ts` (NEW — server-only data access)

**Analog:** `app/sca/page.tsx`'s inline query block (lines 10-24) for the Supabase call shape; `lib/supabase-sca.ts:1-2` for the `server-only` import discipline.

**`lib/supabase-sca.ts:1-2`** — the discipline every new `lib/sca/*` data-access module must copy:
```typescript
import "server-only";
// Server-only singleton. Import only from API routes and Server Components.
```

**Core pattern** (per `10-RESEARCH.md` Pattern 1 — embedded `select()`, one round trip):
```typescript
import "server-only";
import { getScaSupabaseClient } from "../supabase-sca";

export async function getAllCooksWithScores() {
  const supabase = getScaSupabaseClient();
  const { data, error } = await supabase
    .from("cook")
    .select(
      "id, steak_label, cooked_at, competition:competition_id(id, name, event_date, city, state), score(*)"
    )
    .order("cooked_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getCookWithDetails(id: number) {
  const supabase = getScaSupabaseClient();
  return supabase
    .from("cook")
    .select(
      "*, competition:competition_id(*), score(*), cook_detail(*), cook_ai_review(*)"
    )
    .eq("id", id)
    .single();
  // caller checks error?.code === "PGRST116" -> notFound()
}
```
Note the generated-types caveat flagged by CONTEXT.md's canonical refs (Phase 9 WR-04): use the `{ schema: "sca" }`-qualified `Tables<>` form or `Database["sca"]["Tables"][...]["Row"]` directly for return types — the bare `Tables<"cook">` form silently resolves to `any` in this file.

---

### `lib/sca/aggregates.ts`, `lib/sca/comparison.ts`, `lib/sca/insights.ts`, `lib/sca/cookDetailFields.ts` (NEW — pure functions)

**Analog:** `lib/cart.ts` (module shape, named exports, no I/O) and `lib/normalizers.ts` (`joinInventoryCounts` — map+lookup transform shape).

**`lib/cart.ts:54-64`** (`aggregateByProduct`) — the closest existing "reduce an array into aggregate values" pattern:
```typescript
export function aggregateByProduct(
  items: Array<{ variationId: string; quantity: number; productName?: ... }>
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of items) {
    if (item.productName) {
      totals.set(item.productName, (totals.get(item.productName) ?? 0) + item.quantity);
    }
  }
  return totals;
}
```

**`lib/normalizers.ts:8-27`** (`joinInventoryCounts`) — the closest existing "map input rows through a lookup into a normalized output shape" pattern, directly analogous to `buildComparisonRows(cooks, columns)`:
```typescript
export function joinInventoryCounts(
  items: FrozenItemDTO[],
  counts: InventoryCount[]
): FrozenItemDTO[] {
  const countMap = new Map<string, number>();
  for (const count of counts) { /* build lookup */ }
  return items.map((item) => ({ ...item, variations: item.variations.map((variation) => ({ ...variation, remaining: countMap.get(variation.variationId) ?? 0 })) }));
}
```

**Empty-set guard convention to apply (Pitfall 1 / Pitfall 2 from RESEARCH.md — no existing analog for this specific guard, write fresh but keep the module's pure-function style):**
```typescript
// lib/sca/aggregates.ts
import { deriveScoreMetrics } from "./scoring";

export function computeBestWorstAverage(scoredCooks: Array<{ id: number; total_score: number }>) {
  if (scoredCooks.length === 0) {
    return { best: null, worst: null, averageTotalScore: null };
  }
  const best = scoredCooks.reduce((a, b) => (b.total_score > a.total_score ? b : a));
  const worst = scoredCooks.reduce((a, b) => (b.total_score < a.total_score ? b : a));
  const averageTotalScore = scoredCooks.reduce((sum, c) => sum + c.total_score, 0) / scoredCooks.length;
  return { best, worst, averageTotalScore };
}
```
Always filter to cooks with a non-null `score` object (not just non-null `total_score` field) before calling this — cook `id: 7` has `score: null` entirely (Pitfall 2).

---

### `lib/sca/format.ts` (or extend `lib/format.ts`)

**Analog:** `lib/format.ts:1-22` (`formatMoney`, `formatDenverDateTime`) — same module, same `Intl`-based approach, no date library.

```typescript
export function formatDenverDateTime(isoDate: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: "America/Denver"
  }).formatToParts(new Date(isoDate));
  const values = Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, p.value]));
  return `${values.month} ${values.day}, ${values.year} at ${values.hour}:${values.minute} ${values.dayPeriod}`;
}
```
New `cookColumnLabel(competitionName, steakLabel)` (verified formula, `10-RESEARCH.md` Pattern 4) and any event-date-only formatter (no time component needed for `competition.event_date`, unlike `cook.cooked_at`) should live alongside this, following the same no-external-dependency, `Intl`-only convention.

---

### Test files: `tests/sca-aggregates.test.ts`, `tests/sca-comparison.test.ts`, `tests/sca-insights.test.ts`, `tests/sca-cook-detail-fields.test.ts`

**Analog:** `tests/sca-scoring.test.ts` (full file, 94 lines) — exact structural template for every new `lib/sca/*` pure-function test.

**Imports + typed-fixture convention** (`tests/sca-scoring.test.ts:1-5`):
```typescript
import { describe, expect, it } from "vitest";
import { deriveScoreMetrics, PERFECT_SCORE } from "../lib/sca/scoring";
import type { Database } from "../lib/database-sca.types";

type ScaScoreRow = Database["sca"]["Tables"]["score"]["Row"];
```

**Core assertion pattern** (`tests/sca-scoring.test.ts:13-19`):
```typescript
describe("deriveScoreMetrics", () => {
  it("computes both distances for a mid-pack score", () => {
    expect(deriveScoreMetrics({ total_score: 220, first_place_score: 240 })).toEqual({
      distance_from_winning: 20,
      distance_from_perfect: 34.5
    });
  });
```

**Real-row fixture pattern** (`tests/sca-scoring.test.ts:69-92`) — build a fully-typed `Row` fixture and pass it straight to the function under test, to catch type-narrowing regressions:
```typescript
it("accepts a real sca score row with no mapping or narrowing at the call site", () => {
  const row: ScaScoreRow = {
    id: 1, cook_id: 1, appearance: 9, /* ...all Row fields... */
  };
  expect(deriveScoreMetrics(row)).toEqual({ distance_from_winning: 20, distance_from_perfect: 34.5 });
});
```
Apply this same "typed real-row fixture + edge case per test" structure to the new aggregate/comparison/insight tests, explicitly covering the two documented real edge cases: competition `id: 4` / cook `id: 7` (one cook, zero `score` rows — empty scored-cook set) and cook `id: 19` (mixed-null `cook_detail` row, for `getPresentProcessFields`).

Run via: `npx vitest run tests/sca-<module>.test.ts` (per-file) and `npm run test` (full suite), matching `10-RESEARCH.md`'s Validation Architecture section — Vitest `environment: "node"`, no React Testing Library, so `.tsx` page/component files are not unit-testable as rendered output; only the `lib/sca/*` functions are.

---

## Shared Patterns

### Server Component data-fetch + error handling (WR-02-safe)
**Source:** `app/sca/page.tsx:1-24` (structure) — corrected per Pitfall 4 to NOT render `error.message`
**Apply to:** All four new/rewritten `app/sca/**/page.tsx` files
```typescript
export const dynamic = "force-dynamic";

export default async function SomePage() {
  let errorMessage: string | undefined;
  try {
    const data = await someQueryFn();
    // ...
  } catch (error) {
    logError("SomePage query failed", error, "sca-<page>-ssr");
    errorMessage = "We couldn't load this page right now. Please try again in a moment.";
  }
}
```

### `server-only` guard for new data-access modules
**Source:** `lib/supabase-sca.ts:1-2`
**Apply to:** `lib/sca/queries.ts` (the only new file in this phase that does I/O — `aggregates.ts`/`comparison.ts`/`insights.ts`/`cookDetailFields.ts`/`format.ts` are pure and do NOT need this guard)
```typescript
import "server-only";
```

### Score-derived math — single source of truth
**Source:** `lib/sca/scoring.ts:1-23` (`deriveScoreMetrics`, `PERFECT_SCORE`)
**Apply to:** `components/sca/ComparisonTable.tsx`, cook detail Score Breakdown, `lib/sca/insights.ts`'s closest-gap insight — never recompute `first_place_score - total_score` or `PERFECT_SCORE - total_score` inline anywhere

### Null-safe cook/score handling
**Source:** none existing — new convention required by Pitfall 2 (`10-RESEARCH.md`)
**Apply to:** every function/component consuming a cook's `score` embed
```typescript
if (!cook.score) {
  // render "—" per D-04, do not destructure
}
```

### `.glass-card` / `.badge` / `section-spacing` visual primitives
**Source:** `app/globals.css:31-42`
**Apply to:** Summary cards, comparison table container, competition list rows, Cook Detail sections — reuse as-is, no new visual system (per UI-SPEC and D-09-equivalent Phase 9 precedent)
```css
.section-spacing { @apply px-6 py-12 md:px-12; }
.glass-card { @apply rounded-lg border border-[#3a2a20] bg-[#16100c] shadow-soft; }
.badge { @apply inline-flex items-center gap-2 rounded-full bg-[#7a1a0e] px-3 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.35em] text-[#f5ddd8]; }
```

### Dynamic route `id` validation before query
**Source:** `10-RESEARCH.md` Pattern 2/3 (no existing repo precedent — first `[id]` routes in the codebase)
**Apply to:** `app/sca/competitions/[id]/page.tsx`, `app/sca/cooks/[id]/page.tsx`
```typescript
const { id } = await params;
const numericId = Number(id);
if (!Number.isInteger(numericId) || numericId <= 0) {
  notFound();
}
```

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `app/sca/competitions/[id]/page.tsx`, `app/sca/cooks/[id]/page.tsx` | route | request-response | No `[id]` dynamic segment exists anywhere in this repo yet (confirmed: `find app -type d -name "[*]"` returns nothing pre-Phase-10). Params-as-Promise pattern is borrowed from `app/confirmation/page.tsx`'s `searchParams`, and `.single()`/`notFound()` handling has no in-repo precedent — follow `10-RESEARCH.md` Patterns 2 and 3 directly. |
| `components/sca/ComparisonTable.tsx` | component | transform | No table component exists anywhere in this codebase (storefront has no comparison-table UI). Build fresh using `.glass-card`/spacing tokens and the UI-SPEC's locked column/row/em-dash rules; closest logical analog for the underlying row-building is `lib/normalizers.ts`'s map+lookup shape, not any existing component. |

## Metadata

**Analog search scope:** `app/`, `app/sca/`, `components/`, `components/sca/`, `lib/`, `lib/sca/`, `tests/`
**Files scanned:** `app/sca/page.tsx`, `app/sca/layout.tsx`, `app/confirmation/page.tsx`, `app/checkout/page.tsx` (checked, no dynamic segment), `components/sca/ScaNavBar.tsx`, `components/sca/ScaFooter.tsx`, `lib/supabase-sca.ts`, `lib/database-sca.types.ts`, `lib/sca/scoring.ts`, `lib/format.ts`, `lib/logger.ts`, `lib/normalizers.ts`, `lib/cart.ts`, `app/globals.css`, `tailwind.config.ts`, `tests/sca-scoring.test.ts`, `tests/sca-routing.test.ts`
**Pattern extraction date:** 2026-08-23
