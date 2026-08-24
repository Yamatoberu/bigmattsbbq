# Phase 11: Analytics & AI Reviews - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-24
**Phase:** 11-Analytics & AI Reviews
**Areas discussed:** Trend chart implementation, AI Reviews scope & type badge, Category trend layout, AI Reviews list ordering (presented, unanswered — Claude proceeded with documented defaults)

---

## Trend chart implementation

| Option | Description | Selected |
|--------|-------------|----------|
| Custom lightweight SVG/CSS | Zero new dependency, matches the project's minimal-deps pattern | ✓ (Claude default) |
| Charting library (e.g. Recharts) | Richer interactivity/tooltips, but a new dependency | |

**User's choice:** No response — Claude proceeded with the documented default (D-01, D-02).
**Notes:** `package.json` has zero UI/charting dependencies today; live data volume (21 cooks, 20 scores) is small enough that a hand-built inline SVG is trivial and avoids a bundle-size/dependency tradeoff.

---

## AI Reviews scope & type badge

| Option | Description | Selected |
|--------|-------------|----------|
| Show all `cook_ai_review` rows, badge by `review_type` | Every stored review shown regardless of type | ✓ (Claude default) |
| Filter to `review_type = "appearance"` only | Matches the requirement's literal wording | |

**User's choice:** No response — Claude proceeded with the documented default (D-03, D-04).
**Notes:** Live data check found 3 stored rows: 2 `review_type = "appearance"`, 1 `review_type = "photo_review"`. Filtering would hide real content; Phase 10's D-10 already treats "AI review history" generically.

---

## Category trend layout

| Option | Description | Selected |
|--------|-------------|----------|
| Five separate small single-metric charts | Mobile-friendly, mirrors `SummaryCards` small-card pattern | ✓ (Claude default) |
| One combined multi-line chart | More compact but harder to read on narrow viewports | |

**User's choice:** No response — Claude proceeded with the documented default (D-05).
**Notes:** Mobile-first is a hard project constraint (CLAUDE.md); five overlapping lines read poorly at phone width.

---

## AI Reviews list ordering

| Option | Description | Selected |
|--------|-------------|----------|
| Flat list, most-recent-first by `created_at` | Matches `sortCooksByRecencyDesc` convention from the Cooks index | ✓ (Claude default) |
| Grouped by cook or competition | New grouped-list pattern not used elsewhere in `app/sca` | |

**User's choice:** No response — Claude proceeded with the documented default (D-06).
**Notes:** Consistent with Phase 10's Cooks index (10-10-PLAN) most-recent-first convention.

---

## Claude's Discretion

- Exact route/file names beyond `/sca/analytics`, `/sca/ai-reviews`, `/sca/ai-reviews/[id]`
- Exact SVG chart dimensions, point/line styling, typography within existing design tokens
- Whether trend charts share one parameterized `TrendChart` component or per-metric wrappers
- Whether the new AI Reviews query lives in `lib/sca/queries.ts` or a new sibling file

## Deferred Ideas

None — discussion stayed within phase scope; no scope-creep ideas were raised (the gray-area question was presented but unanswered).
