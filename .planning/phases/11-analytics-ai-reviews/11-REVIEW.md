---
phase: 11-analytics-ai-reviews
reviewed: 2026-08-28T16:23:09Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - lib/sca/trends.ts
  - tests/sca-trends.test.ts
  - lib/sca/types.ts
  - tests/sca-queries.test.ts
  - lib/sca/queries.ts
  - components/sca/TrendChart.tsx
  - app/sca/analytics/page.tsx
  - app/sca/ai-reviews/page.tsx
  - app/sca/ai-reviews/[id]/page.tsx
  - components/sca/ScaNavBar.tsx
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-08-28T16:23:09Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 11 ships the Analytics trend-chart surface (`lib/sca/trends.ts`, `components/sca/TrendChart.tsx`, `app/sca/analytics/page.tsx`) and the AI Reviews list/detail surface (`lib/sca/queries.ts` additions, `app/sca/ai-reviews/page.tsx`, `app/sca/ai-reviews/[id]/page.tsx`), plus a two-entry `ScaNavBar` addition. This is a well-executed, TDD-built phase: `npx tsc --noEmit`, `npm run test` (247/247), and the documented `npm run build` all pass clean, every reused helper (`deriveScoreMetrics`, `formatCookDate`, `cookColumnLabel`, `parseScaId`) is delegated to rather than re-implemented, null/empty-array edge cases (0 cooks, 1 cook, null `score`, null `cook` embed, null `competition` embed) are defensively handled without any non-null assertions, and the read-only Supabase queries carry no injection or auth-bypass risk beyond the pre-existing, unchanged service-role design. No Critical/Blocker issues were found.

Two Warning-level issues were found: (1) both AI Reviews pages use `?? EM_DASH` for `review_type`/`model`, which does not catch an empty-string value (a real possibility since both are nullable, unconstrained `text` columns) — the codebase already has a stricter precedent (`.trim()`-based emptiness checks) that these two files don't follow; (2) `TrendChart`'s first/last-point value labels are center-anchored directly at the plot's outer x-bounds with only 16px of margin to the SVG viewBox edge, so wide value strings (e.g. `"254.5"`) will render partially clipped by the SVG viewport — the date labels at the same x-positions correctly use edge-anchoring (`start`/`end`) but the value labels do not. Two Info-level items (a tautological test assertion and a minor null-coalescing style inconsistency between the two new AI Review pages) round out the findings.

## Warnings

### WR-01: Empty-string `review_type`/`model` values bypass the EM_DASH fallback

**File:** `app/sca/ai-reviews/page.tsx:51,53`
**File:** `app/sca/ai-reviews/[id]/page.tsx:52,55`
**Issue:** Both AI Review pages render `review.review_type ?? EM_DASH` and `review.model ?? EM_DASH`. `??` only substitutes on `null`/`undefined` — if either column is stored as an empty string (`""`), both fields are nullable free-text `text` columns per `lib/database-sca.types.ts` with no `CHECK (length(x) > 0)` constraint, so nothing in the schema prevents this), the badge/heading renders visibly blank instead of falling back to the em dash. The codebase already has a correct precedent for this exact situation: `app/sca/cooks/[id]/page.tsx:85` uses `cook.score?.score_notes?.trim()` (a truthiness/emptiness-aware check) before deciding whether to render a nullable text field, rather than a bare `??`. The two new AI Review pages should follow that stricter convention for `review_type`/`model`.
**Fix:**
```tsx
// app/sca/ai-reviews/page.tsx and app/sca/ai-reviews/[id]/page.tsx
const reviewTypeLabel = review.review_type?.trim() || EM_DASH;
const modelLabel = review.model?.trim() || EM_DASH;
// then render {reviewTypeLabel} / {modelLabel} in place of the `?? EM_DASH` expressions
```

### WR-02: First/last-point value labels can be clipped at the SVG's horizontal edges

**File:** `components/sca/TrendChart.tsx:7-9,120-136`
**Issue:** `labelIndices` (from `findLabelIndices`) always includes index `0` and `points.length - 1`, and every labeled point — including these two edge points — is rendered with `textAnchor="middle"` at `x={xPositions[index]}` (line 131, using positions from `PLOT_X_MIN = 16` / `PLOT_X_MAX = 584`, a 16px margin to the `viewBox="0 0 600 160"` edges). A center-anchored `<text>` extends roughly half its rendered width in each direction from its `x` coordinate. For a 12px numeric label such as `"254.5"` (the total-score chart's realistic value range per `PERFECT_SCORE = 254.5` in `lib/sca/scoring.ts`), the rendered width comfortably exceeds the available 16px half-margin, so part of the first point's label will fall at `x < 0` and part of the last point's label at `x > 600` — both are clipped by the SVG viewport (browsers clip content outside a `viewBox` by default). The date labels immediately below (lines 137-142) correctly avoid this by using `textAnchor="start"` at `x="16"` for the first point and `textAnchor="end"` at `x="584"` for the last — the value labels should use the same edge-aware anchoring for the two boundary indices.
**Fix:**
```tsx
{labelIndices.map((index) => {
  const y = yPositions[index];
  const dy = y < PLOT_Y_MIN + 0.2 * PLOT_HEIGHT ? "14" : "-8";
  const anchor =
    index === 0 ? "start" : index === points.length - 1 ? "end" : "middle";
  return (
    <text
      key={`value-${points[index].cookId}`}
      x={xPositions[index]}
      y={y}
      dy={dy}
      fill="#f7f1e6"
      fontSize="12"
      textAnchor={anchor}
    >
      {formatScoreValue(points[index].value)}
    </text>
  );
})}
```

## Info

### IN-01: Tautological test assertion doesn't actually test the "no filter" requirement

**File:** `tests/sca-queries.test.ts:213-219`
**Issue:** The `"does not filter by review_type"` test asserts `expect(lastCall.select).not.toContain("review_type=")`. `lastCall.select` records the Postgrest *select column list* (e.g. `"id, cook_id, model, review_type, ..."`), which would never contain a `"review_type="` substring regardless of whether a `.eq("review_type", ...)` filter was ever added — a filter call is recorded separately in `lastCall.eq`. This half of the assertion passes trivially and provides no real regression protection against D-03 ("show every row, unfiltered by `review_type`") being violated in the future; only the second assertion (`expect(lastCall.eq).toBeNull()`) actually tests the requirement.
**Fix:** Drop the dead first assertion, or replace it with something that would actually fail if a filter were added later, e.g. asserting the exact expected select string via `toBe(AI_REVIEW_EMBED_SELECT)`-equivalent value rather than a substring check unrelated to filtering.

### IN-02: Inconsistent null-coalescing style for `steak_label` between the list and detail AI Review pages

**File:** `app/sca/ai-reviews/page.tsx:62`
**File:** `app/sca/ai-reviews/[id]/page.tsx:62`
**Issue:** The list page calls `cookColumnLabel(review.cook.competition?.name ?? null, review.cook.steak_label ?? null)`, adding a `?? null` on `steak_label` even though `AiReviewCookSummary.steak_label` is already typed `string | null` (the coalesce is a no-op). The detail page's equivalent call omits the redundant `?? null` (`cookColumnLabel(review.cook.competition?.name ?? null, review.cook.steak_label)`). Neither is wrong, but the inconsistency between two nearly-identical call sites shipped in the same plan suggests copy-paste drift rather than an intentional difference.
**Fix:** Drop the redundant `?? null` on the list page's `steak_label` argument so both call sites match exactly.

---

_Reviewed: 2026-08-28T16:23:09Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
