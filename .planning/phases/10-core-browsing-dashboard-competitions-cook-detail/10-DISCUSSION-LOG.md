# Phase 10: Core Browsing — Dashboard, Competitions & Cook Detail - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-23
**Phase:** 10-core-browsing-dashboard-competitions-cook-detail
**Areas discussed:** Comparison table scope & behavior, "What stands out" insights, Chef/team scope, Missing/sparse data handling

---

## Gray-area selection

An `AskUserQuestion` multi-select was presented offering four candidate discussion areas (comparison table scope & behavior, "what stands out" insights, chef/team scope, missing/sparse data handling). The user did not respond (no answer recorded).

Per `.planning/config.json` `mode: yolo` and the session's Auto Mode guidance, Claude proceeded without blocking — the same situation Phase 9's discuss-phase session hit, where documented defaults were used instead of a stalled interactive loop.

---

## Comparison Table Scope & Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| All cooks ever recorded as Dashboard columns | Simplest; matches DASH-02 literally; dataset expected to stay small this milestone | ✓ (Claude's default, D-02) |
| Most recent N cooks with a "see more" affordance | Avoids table growing unbounded, but adds pagination complexity not requested by requirements | |
| Card-per-cook stacked layout on mobile instead of horizontal scroll | Alternative mobile pattern | |
| Horizontally-scrolling container on narrow viewports | Keeps side-by-side comparison intact at any width | ✓ (Claude's default, D-03) |

**User's choice:** No response — Claude's documented defaults (D-01 through D-04) used.
**Notes:** One shared comparison-table component/module serves both Dashboard (all cooks + aggregate columns) and Competition detail (cooks in that event only); missing score cells render as em dash, never 0.

---

## "What Stands Out" Insights

| Option | Description | Selected |
|--------|-------------|----------|
| Exactly the 3 examples named in DASH-03 (biggest swing, closest gap, most recent placement change) | Matches requirement text literally, no invented insight types | ✓ (Claude's default, D-05) |
| Broader set of additional computed insights (e.g. streaks, category-specific highlights) | More coverage but not requested and adds scope risk | |
| Static/generic fallback copy when data is thin | Explicitly disallowed by DASH-03's "not static copy" requirement | |

**User's choice:** No response — Claude's documented defaults (D-05, D-06) used.
**Notes:** Delta-based insights (swing, placement change) are omitted rather than shown broken when fewer than 2 scored cooks exist.

---

## Chef/Team Scope

| Option | Description | Selected |
|--------|-------------|----------|
| No filter — show all cooks regardless of `chef_id` | Matches current single-chef reality; avoids building unrequested chef-picker UI | ✓ (Claude's default, D-07) |
| Hard-code a filter to one specific chef row | Premature — no chef-switching UI exists, and PLAT-01 (multi-chef) is explicitly deferred to v2 | |

**User's choice:** No response — Claude's documented default (D-07) used.
**Notes:** Revisiting this is Claude's discretion if a second chef's data appears before PLAT-01 ships.

---

## Missing/Sparse Data Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Omit null fields entirely from display (no placeholder clutter) | Consistent with project's minimal, no-filler UI style | ✓ (Claude's default, D-08, D-09) |
| Show explicit "—" or "Not recorded" placeholders for every nullable field | More explicit but noisier given how many fields are nullable | |
| Hide entire sections (e.g. AI review history) when empty | Simpler, but hides feature discoverability | |
| Always render the section with an explicit "No data yet" message | Keeps feature discoverable even when empty | ✓ (Claude's default, D-10, for AI review history specifically) |

**User's choice:** No response — Claude's documented defaults (D-08 through D-10) used.
**Notes:** Cook Detail process variables render only non-null fields; a cook with zero `cook_detail` row shows one summary message instead of an empty section. AI review history always shows its section, even when empty, ahead of Phase 11.

---

## Claude's Discretion

- Exact route/file names for Competitions and Cook Detail pages (IA implied by REQUIREMENTS.md, exact paths left to planner)
- Comparison-table column widths, sticky-column behavior beyond the required scroll container, typography/spacing within existing design tokens
- Exact wording for the "most recent placement change" insight (improved/dropped by N vs. neutral delta)
- Cook column sort order on the Dashboard comparison table (chronological by `cooked_at`, matching COMP-01's competition ordering)

## Deferred Ideas

None — discussion stayed within phase scope; no scope-creep ideas were raised (no interactive discussion occurred).
