---
phase: 10-core-browsing-dashboard-competitions-cook-detail
reviewed: 2026-08-24T00:00:00Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - app/sca/competitions/[id]/page.tsx
  - app/sca/competitions/page.tsx
  - app/sca/cooks/[id]/page.tsx
  - app/sca/cooks/page.tsx
  - app/sca/not-found.tsx
  - app/sca/page.tsx
  - components/sca/ComparisonTable.tsx
  - components/sca/ScaNavBar.tsx
  - components/sca/SummaryCards.tsx
  - components/sca/WhatStandsOut.tsx
  - lib/sca/aggregates.ts
  - lib/sca/comparison.ts
  - lib/sca/cookDetailFields.ts
  - lib/sca/format.ts
  - lib/sca/insights.ts
  - lib/sca/queries.ts
  - lib/sca/types.ts
  - tests/sca-aggregates.test.ts
  - tests/sca-comparison.test.ts
  - tests/sca-cook-detail-fields.test.ts
  - tests/sca-format.test.ts
  - tests/sca-insights.test.ts
  - tests/sca-queries.test.ts
findings:
  critical: 0
  warning: 3
  info: 7
  total: 10
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-08-24T00:00:00Z
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

Reviewed the full Phase 10 deliverable: the read-only `/sca` App Router surface (dashboard, competitions list/detail, cooks list/detail, nav, not-found) and its supporting `lib/sca/*` modules and Vitest coverage. No SQL/command injection, XSS, hardcoded secrets, or auth-bypass issues were found — Supabase access goes through the typed query builder with a strictly validated integer ID parser (`parseScaId`), and all rendered text goes through React's default escaping (no `dangerouslySetInnerHTML`). The `lib/sca` unit layer (aggregates, comparison, insights, format, cookDetailFields) is well tested and its edge cases (empty arrays, null scores, ties, zero-vs-null) match the implementation.

The issues found are concentrated in two places: (1) a real display bug in the cook detail page's heading fallback that diverges from the `cookColumnLabel` normalization used everywhere else, and (2) a set of maintainability/robustness gaps — duplicated constants across page files, an SSR logging convention (documented in `CLAUDE.md`) that isn't followed in this phase's pages, and date-formatting helpers with no defense against invalid input in a route segment that has no `error.tsx` boundary.

## Warnings

### WR-01: Cook detail heading renders blank for an empty-string `steak_label`

**File:** `app/sca/cooks/[id]/page.tsx:82`
**Issue:** The heading is computed as:
```ts
const heading = cook.steak_label ?? cookColumnLabel(cook.competition?.name, cook.steak_label);
```
`??` only falls through on `null`/`undefined`, not on an empty or whitespace-only string. Every other call site in this phase (`SummaryCards.CookLink`, `ComparisonTable` column labels via `comparison.ts`, `app/sca/cooks/page.tsx`) goes through `cookColumnLabel`, which explicitly treats empty/whitespace-only strings as absent via the private `nonEmpty()` helper in `lib/sca/format.ts`. `steak_label` is typed `string | null` with no non-empty constraint visible at the type level, so a row with `steak_label: ""` (or `"   "`) will render a blank `<h1>` here instead of falling back to the competition name or "Untitled Cook" as it would everywhere else. `tests/sca-cook-detail-fields.test.ts` and `tests/sca-format.test.ts` both demonstrate the team is aware whitespace-only DB values are a real possibility (they test for it explicitly in other fields), but this exact page has no test covering its own heading logic.
**Fix:**
```ts
const trimmedLabel = cook.steak_label?.trim();
const heading = trimmedLabel
  ? cook.steak_label
  : cookColumnLabel(cook.competition?.name, cook.steak_label);
```

### WR-02: `formatEventDate` / `formatCookDate` throw on invalid date input, and `/sca` has no error boundary

**File:** `lib/sca/format.ts:42-70`
**Issue:** Both functions do `new Intl.DateTimeFormat(...).formatToParts(new Date(input))` with no validation. If `input` fails to parse into a valid `Date` (e.g. a malformed `cooked_at`/`event_date`/`created_at` value), `formatToParts` throws `RangeError: Invalid time value` synchronously during render. Every other data-quality risk in this phase is defended against (`formatScoreValue` guards with `Number.isFinite`, `getPresentProcessFields` trims and skips empty strings), but the date formatters have no equivalent guard — and unlike the Supabase query calls (which are wrapped in `try/catch` in every page and rendered as a friendly "we couldn't load this page" message), a throw from inside JSX rendering is *not* caught by those `try/catch` blocks. There is no `app/sca/error.tsx` (or `global-error.tsx`), so a single malformed timestamp anywhere in the returned rows (competition, cook, or `cook_ai_review`) would take down the entire page with Next.js's default error UI instead of degrading gracefully.
**Fix:**
```ts
export function formatEventDate(dateOnly: string): string {
  const date = new Date(dateOnly);
  if (Number.isNaN(date.getTime())) return EM_DASH;
  // ...existing formatToParts logic using `date`
}
```
Apply the same guard in `formatCookDate`. Consider also adding `app/sca/error.tsx` as defense in depth for any other rendering-time throw.

### WR-03: SSR pages don't follow the project's per-request `requestId` logging convention

**Files:**
- `app/sca/page.tsx:20`
- `app/sca/competitions/page.tsx:32`
- `app/sca/competitions/[id]/page.tsx:68`
- `app/sca/cooks/page.tsx:21`
- `app/sca/cooks/[id]/page.tsx:64`

**Issue:** `CLAUDE.md` documents the established error-handling pattern: `logError` is called with a message, the error object, and a per-request `requestId` (via `crypto.randomUUID()` or the `x-request-id` header), and that `requestId` is surfaced back to the caller so a specific failure can be correlated between logs and the user report (see `app/api/checkout/route.ts`). All five SSR pages in this phase instead pass a fixed string literal (e.g. `"sca-dashboard-ssr"`) as the third argument. That string is identical across every request to that route, so concurrent or repeated failures on the same page are indistinguishable in `console.error` output, and the generic error message shown to the user ("We couldn't load this page right now...") carries no reference a user could give support to find the matching log line.
**Fix:**
```ts
const requestId = crypto.randomUUID();
try {
  cooks = await getAllCooksWithScores();
} catch (error) {
  logError("ScaDashboardPage cooks query failed", error, requestId);
  errorMessage = "We couldn't load this page right now. Please try again in a moment.";
}
```
Optionally render `requestId` in the error state alongside `errorMessage`, mirroring the `{ error, requestId }` shape returned by the API routes.

## Info

### IN-01: Dead branch in `ScaNavBar.isActive`

**File:** `components/sca/ScaNavBar.tsx:17`
**Issue:** `ScaNavBar` is only ever rendered by `app/sca/layout.tsx`, which only wraps routes under `/sca`. `pathname === "/"` can never be true in that context (the storefront root `/` uses a different layout entirely), so `isActive("/sca")` unconditionally falls through to the second branch. The dead check adds confusion about whether this component is meant to be reused outside `/sca`.
**Fix:** `const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");` (drop the `/sca`-specific special case, or add a comment explaining why it's kept for a hypothetical future reuse).

### IN-02: `LINK_CLASSES` duplicated verbatim across six files

**Files:** `components/sca/ComparisonTable.tsx:5-6`, `components/sca/SummaryCards.tsx:6-7`, `app/sca/competitions/page.tsx:10-11`, `app/sca/competitions/[id]/page.tsx:17-18`, `app/sca/cooks/page.tsx:11-12`, `app/sca/cooks/[id]/page.tsx:18-19`
**Issue:** The identical Tailwind class string for the focus-visible link style is copy-pasted in six places. A future change to focus ring color/offset requires editing all six in lockstep, and it's easy to miss one (as happened with the inline `hover:text-gold-300 focus-visible:outline...` class used ad hoc in `app/sca/cooks/[id]/page.tsx:99`, which is a near-duplicate of `LINK_CLASSES` rather than a reuse of it).
**Fix:** Extract to a single shared constant, e.g. `lib/sca/ui.ts` exporting `SCA_LINK_CLASSES`, imported by all six files (and reused for the inline case in the cook detail page's competition link).

### IN-03: Meta-field builders reimplement the trim/empty-string check already in `format.ts`

**Files:** `app/sca/competitions/page.tsx:13-23` (`buildMetaLine`), `app/sca/competitions/[id]/page.tsx:25-45` (`buildMetaFields`)
**Issue:** Both functions hand-roll `value !== null && value.trim().length > 0` checks for optional string fields (`city`, `state`, `organizer`, `notes`). `lib/sca/format.ts` already has this exact logic in its private `nonEmpty()` helper, just not exported.
**Fix:** Export `nonEmpty` from `lib/sca/format.ts` and reuse it in both page files instead of re-deriving the same trim/null check.

### IN-04: `as unknown as X` casts bypass compile-time checking at the Supabase response boundary

**File:** `lib/sca/queries.ts:34, 48, 70, 88`
**Issue:** Every query function casts the raw Supabase response straight to its target type via `as unknown as X`, which fully disables structural checking exactly at the point where a mismatch between the hand-written `select(...)` string and the declared TypeScript type (`CookWithScore`, `CompetitionWithCooks`, `CookWithDetails`) would most need catching. Today the select strings line up with the types, but nothing enforces that going forward — a future edit to either side won't produce a compiler error, only a runtime shape mismatch.
**Fix:** Not blocking given this is a common Supabase-embed pattern, but consider a thin runtime shape check (the project already uses Zod at API boundaries) for at least the top-level fields, or a code comment tying the select string to the type it must match so future edits stay in sync.

### IN-05: `cook_ai_review` embed has no explicit ordering

**File:** `lib/sca/queries.ts:73-90` (`getCookWithDetails`)
**Issue:** The select `"*, ... cook_ai_review(*)"` has no `.order()` applied to the embedded `cook_ai_review` relation. PostgREST does not guarantee a stable order for unordered embedded resources, so the "AI Reviews" list on `app/sca/cooks/[id]/page.tsx:153-176` could render in a different order between requests once a cook has more than one review.
**Fix:** Add an explicit order for the embed, e.g. `cook_ai_review(*)` with a referenced-table order (`.order("created_at", { referencedTable: "cook_ai_review", ascending: true })`) so review order is deterministic and chronological.

### IN-06: Page-level derived logic has no test coverage

**Files:** `app/sca/cooks/[id]/page.tsx` (`buildScoreRows`, `heading`), `app/sca/competitions/[id]/page.tsx` (`buildMetaFields`), `app/sca/competitions/page.tsx` (`buildMetaLine`)
**Issue:** Every `lib/sca/*.ts` module has a matching test file, but the equivalent non-trivial logic embedded directly in page components (heading fallback, meta-field assembly, score-row assembly) is untested. WR-01 is exactly the kind of edge case a unit test would have caught before this reached review.
**Fix:** Extract these builder functions into `lib/sca/` (e.g. `lib/sca/cookDetailView.ts`, `lib/sca/competitionDetailView.ts`) with accompanying Vitest coverage, consistent with how `cookDetailFields.ts` and `comparison.ts` are already tested.

### IN-07: `ComparisonTable`'s leading header cell has no accessible label

**File:** `components/sca/ComparisonTable.tsx:35`
**Issue:** `<th scope="col" className={HEADER_CELL_BASE} />` is empty — it's the corner cell above the row labels (Competition, Placement, Appearance, etc.). Screen readers announce an empty header for that column with no indication of what the row labels beneath it represent.
**Fix:** Add visually-hidden text: `<th scope="col" className={HEADER_CELL_BASE}><span className="sr-only">Category</span></th>`.

---

_Reviewed: 2026-08-24T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
