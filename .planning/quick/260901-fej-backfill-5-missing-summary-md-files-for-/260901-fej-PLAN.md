---
phase: quick-260901-fej
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/20260501-hero-redesign-full-bleed/SUMMARY.md
  - .planning/quick/20260505-catering-page-hook-trust-restructure/SUMMARY.md
  - .planning/quick/20260505-homepage-funnel-copy/SUMMARY.md
  - .planning/quick/260505-fus-when-there-is-no-active-drop-hide-only-t/260505-fus-SUMMARY.md
  - .planning/quick/260507-fix-bundle-variation-ids-and-orderitems/SUMMARY.md
  - .planning/STATE.md
autonomous: true
requirements: [QUICK-FEJ-01, QUICK-FEJ-02]
must_haves:
  truths:
    - "All five previously-unsummarized quick-task directories contain a SUMMARY.md"
    - "Each backfilled SUMMARY.md describes what the real commit actually changed, not just the plan's proposal"
    - "Each backfilled SUMMARY.md frontmatter `completed:` is the historical commit date, not 2026-09-01"
    - "STATE.md no longer lists the three stale `missing summary` deferred rows"
    - "STATE.md Quick Tasks Completed table gains rows for tasks A, C, D, E (B already present, not duplicated)"
    - "No file under app/, components/, lib/, tests/ or scripts/ is modified"
  artifacts:
    - path: ".planning/quick/20260501-hero-redesign-full-bleed/SUMMARY.md"
      provides: "Backfilled summary for the full-bleed hero redesign (feef870)"
      contains: "feef870"
    - path: ".planning/quick/20260505-catering-page-hook-trust-restructure/SUMMARY.md"
      provides: "Backfilled summary for the catering Hook→Trust→Offer→CTA restructure (3d89fcf)"
      contains: "3d89fcf"
    - path: ".planning/quick/20260505-homepage-funnel-copy/SUMMARY.md"
      provides: "Backfilled summary for homepage funnel copy issues 1/3/8 (845099e)"
      contains: "845099e"
    - path: ".planning/quick/260505-fus-when-there-is-no-active-drop-hide-only-t/260505-fus-SUMMARY.md"
      provides: "Backfilled summary for the targeted no-active-drop section gating (dde136a)"
      contains: "dde136a"
    - path: ".planning/quick/260507-fix-bundle-variation-ids-and-orderitems/SUMMARY.md"
      provides: "Backfilled summary for bundle variation ID + orderItems expansion fix (c753abb, 80942a7)"
      contains: "c753abb"
    - path: ".planning/STATE.md"
      provides: "Deferred Items cleaned of stale missing-summary rows; Quick Tasks Completed extended with 4 backfilled rows"
  key_links:
    - from: ".planning/STATE.md"
      to: ".planning/quick/20260501-hero-redesign-full-bleed/"
      via: "Quick Tasks Completed table relative directory link"
      pattern: "20260501-hero-redesign-full-bleed"
    - from: ".planning/STATE.md"
      to: ".planning/quick/260507-fix-bundle-variation-ids-and-orderitems/"
      via: "Quick Tasks Completed table relative directory link"
      pattern: "260507-fix-bundle-variation-ids-and-orderitems"
---

<objective>
Backfill the five missing `SUMMARY.md` files for quick tasks that already shipped, and clean up the now-stale bookkeeping rows in `.planning/STATE.md`.

Purpose: `.planning/quick/` currently has five directories with a plan but no summary, so the project's own audit trail claims work is unfinished when the code shipped months ago. Three `Deferred Items` rows in STATE.md also claim "missing summary" for tasks whose summaries exist on disk (or whose directory never existed), which makes the deferred-items table actively misleading.

Output: 5 new `SUMMARY.md` files + 1 edited `.planning/STATE.md`. Zero source-code changes.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Reference summary to match style and section ordering exactly:
@.planning/quick/260831-s0z-fix-square-invoice-due-date-to-use-selec/260831-s0z-SUMMARY.md

Plans being summarized (read each one immediately before writing its summary, not all up front):
- `.planning/quick/20260501-hero-redesign-full-bleed/PLAN.md`
- `.planning/quick/20260505-catering-page-hook-trust-restructure/PLAN.md`
- `.planning/quick/20260505-homepage-funnel-copy/PLAN.md`
- `.planning/quick/260505-fus-when-there-is-no-active-drop-hide-only-t/260505-fus-PLAN.md`
- `.planning/quick/260507-fix-bundle-variation-ids-and-orderitems/PLAN.md`
</context>

<conventions>
These rules apply to every SUMMARY.md written in this plan. Read once, apply to all five.

**Filename convention (derived from existing on-disk precedent — do not invent a new one):**
- Directories whose plan is named `PLAN.md` get a sibling named `SUMMARY.md` (matches `20260502-ui-review-quick-batch/`, `20260505-sold-out-capture/`, `20260520-fix-pickup-issoldout/`).
- Directories whose plan is named `{quick_id}-PLAN.md` get `{quick_id}-SUMMARY.md` (matches `260831-s0z-.../260831-s0z-SUMMARY.md`).

**Ground truth is the commit, not the plan.** For every task, run `git show --stat <hash>` and then `git show <hash>` before writing a single line of the summary. Write the `## Files Created/Modified` and `## Accomplishments` sections from the real diff hunks. If the diff does something the plan did not describe, or omits something the plan proposed, say so explicitly under `## Deviations from Plan` with the concrete difference. If the diff matches the plan 1:1, write `None - plan executed as written (verified by diffing commit <hash> against PLAN.md).`

**Frontmatter rules:**
- `phase:` — `quick-{directory-derived-id}` (e.g. `quick-20260501-hero-redesign-full-bleed`, `quick-260505-fus`).
- `plan: 01`
- `completed:` — the **commit author date**, in `YYYY-MM-DD`. Never `2026-09-01`. These are historical backfills.
- `duration:` — unknown for backfills. Write `unknown (backfilled)`. Do not fabricate a number.
- `requirements-completed:` — copy from the plan's frontmatter if it has a `requirements` field; otherwise use `[]`.
- Include `subsystem`, `tags`, `requires`, `provides`, `affects`, `tech-stack`, `key-files`, `key-decisions`, `patterns-established` per the template.

**Backfill disclosure (mandatory, every file).** Immediately after the one-liner, add:

> **Backfilled summary.** This task shipped on {commit date}; the summary was written retroactively on 2026-09-01 from the implementing commit(s), not recorded at execution time. Timing metrics are unavailable.

**Sections to write:** one-liner, backfill note, Performance (with `unknown` durations — do not invent timestamps), Accomplishments, Task Commits, Files Created/Modified, Decisions Made, Deviations from Plan, Issues Encountered, User Setup Required, Next Phase Readiness, footer, Self-Check.

**Do NOT:** create commits for the already-shipped work, amend or rebase history, touch any file under `app/`, `components/`, `lib/`, `tests/`, or `scripts/`, or run `npm run test` (nothing testable changes).
</conventions>

<tasks>

<task type="auto">
  <name>Task 1: Backfill hero redesign and catering restructure summaries</name>
  <files>.planning/quick/20260501-hero-redesign-full-bleed/SUMMARY.md, .planning/quick/20260505-catering-page-hook-trust-restructure/SUMMARY.md</files>
  <action>
For each of the two tasks below: read its `PLAN.md`, run `git show --stat <hash>` then `git show <hash>`, and write the SUMMARY.md from the real diff per the `<conventions>` block above.

**Task A — `.planning/quick/20260501-hero-redesign-full-bleed/SUMMARY.md`**
- Plan title: "Hero Section Redesign — Full-Bleed Atmospheric". Plan frontmatter status is `in-progress` — this is stale; the work shipped. Note the stale status explicitly in Issues Encountered.
- Implementing commit: `feef870b87bb076bc50a48c4cbb517b7df3f8f22` — "style: replace striped hero panel with full-bleed atmospheric design" — 2026-05-01 (author date `2026-05-01 20:42:07 -0600`).
- Files touched: `app/globals.css`, `components/OrderLanding.tsx` (~90 insertions / ~91 deletions).
- `subsystem: ui`; suggested `tags: [tailwind, css, hero, landing-page]`.
- Describe the actual `.hero-panel` rule as it exists in the diff — the radial ember glow layer, dark base, bottom fade, and the removal of `rounded-lg` / `border` / the striped gradient. Quote real declarations from the diff, not the plan's prose.
- Also describe what changed in `components/OrderLanding.tsx` — the diff is substantial (163 lines touched), so summarize the actual markup/class restructuring rather than assuming it was a one-liner.

**Task B — `.planning/quick/20260505-catering-page-hook-trust-restructure/SUMMARY.md`**
- Plan title: "Catering Page Hook → Trust → Offer → CTA Restructure". Plan frontmatter status is `in-progress` — stale, note it.
- Implementing commit: `3d89fcfdd1e5ce607ebfa0b109a1547938b1a678` — "feat(catering): restructure hero to Hook → Trust → Offer → CTA flow" — 2026-05-05 (author date `2026-05-05 11:06:38 -0600`).
- File touched: `app/catering/page.tsx` (30 insertions / 5 deletions).
- `subsystem: ui`; suggested `tags: [catering, copywriting, conversion, landing-page]`.
- In Next Phase Readiness, record the standing verification anchor: the hook headline "Your guests rave about the food. You stress about nothing." is live in `app/catering/page.tsx`. Do not hardcode a line number in the summary — line numbers drift; grep for the string instead when verifying.
- Note in this summary that its STATE.md row already existed at write time (commit `3d89fcf`, row present under Quick Tasks Completed); only the directory summary was missing.
  </action>
  <verify>
    <automated>test -f .planning/quick/20260501-hero-redesign-full-bleed/SUMMARY.md &amp;&amp; test -f .planning/quick/20260505-catering-page-hook-trust-restructure/SUMMARY.md &amp;&amp; grep -q 'feef870' .planning/quick/20260501-hero-redesign-full-bleed/SUMMARY.md &amp;&amp; grep -q 'completed: 2026-05-01' .planning/quick/20260501-hero-redesign-full-bleed/SUMMARY.md &amp;&amp; grep -q '3d89fcf' .planning/quick/20260505-catering-page-hook-trust-restructure/SUMMARY.md &amp;&amp; grep -q 'completed: 2026-05-05' .planning/quick/20260505-catering-page-hook-trust-restructure/SUMMARY.md &amp;&amp; ! grep -q 'completed: 2026-09-01' .planning/quick/20260501-hero-redesign-full-bleed/SUMMARY.md .planning/quick/20260505-catering-page-hook-trust-restructure/SUMMARY.md</automated>
  </verify>
  <done>Both SUMMARY.md files exist, each cites its real commit hash, each has a historical `completed:` date, neither claims 2026-09-01 as the completion date, and both content bodies describe diff-observed changes (not plan prose).</done>
</task>

<task type="auto">
  <name>Task 2: Backfill homepage funnel copy and no-active-drop gating summaries</name>
  <files>.planning/quick/20260505-homepage-funnel-copy/SUMMARY.md, .planning/quick/260505-fus-when-there-is-no-active-drop-hide-only-t/260505-fus-SUMMARY.md</files>
  <action>
Same procedure as Task 1: read plan, `git show --stat <hash>`, `git show <hash>`, write from the diff.

**Task C — `.planning/quick/20260505-homepage-funnel-copy/SUMMARY.md`**
- Plan title: "Homepage Funnel Copy — Issues 1, 3, 8". Plan frontmatter status is `pending` — stale, note it in Issues Encountered.
- Implementing commit: `845099eb44f763b012d95f80dbf7a363d6eeae2f` — "feat(homepage): add funnel copy — hero hook, pre-sell block, origin story" — 2026-05-05 (author date `2026-05-05 10:32:08 -0600`).
- File touched: `components/OrderLanding.tsx` (38 insertions / 1 deletion).
- `subsystem: ui`; suggested `tags: [copywriting, conversion, landing-page, funnel]`.
- The commit message matches the plan's proposed commit message verbatim and all three copy blocks landed as written — this is a clean 1:1 execution. Under Deviations from Plan write `None - plan executed as written (verified by diffing commit 845099e against PLAN.md).`
- Record the three shipped copy anchors as grep-verifiable strings (not line numbers): "Real Pit-Smoked BBQ — Straight to Your Freezer.", "Every batch starts the night before", "One smoker. Twelve-hour cooks. Real BBQ."

**Task D — `.planning/quick/260505-fus-when-there-is-no-active-drop-hide-only-t/260505-fus-SUMMARY.md`**
- Note the filename: this directory uses the `{quick_id}-` prefix convention, so the file is `260505-fus-SUMMARY.md`, NOT `SUMMARY.md`.
- Plan: `260505-fus-PLAN.md`, GSD execute-plan format, requirement `QUICK-FUS-01`. Copy that ID into `requirements-completed: [QUICK-FUS-01]`.
- Implementing commit: `dde136a1f73896ca9f8c0e41c3b82f8e2edb4266` — "feat(homepage): hide hero/bundles/items when no active drop" — 2026-05-05 (author date `2026-05-05 19:20:21 -0600`).
- File touched: `components/OrderLanding.tsx` (117 insertions / 184 deletions — a net reduction of 67 lines; describe what the diff actually removed).
- `subsystem: ui`; suggested `tags: [drops, conditional-rendering, landing-page]`.
- The load-bearing behavior to document: only hero, bundles, and individual-items sections are gated on an active drop. Blurb, testimonials, catering, FAQ, pitmaster, and mailing list all render unconditionally. This is a targeted per-section conditional, not an all-or-nothing early return — call that out as the key decision, since it is the entire point of the task title ("hide only the...").
- Cross-check the diff against the plan's `must_haves` and confirm in the summary that each must-have truth is satisfied by the shipped code.
  </action>
  <verify>
    <automated>test -f .planning/quick/20260505-homepage-funnel-copy/SUMMARY.md &amp;&amp; test -f .planning/quick/260505-fus-when-there-is-no-active-drop-hide-only-t/260505-fus-SUMMARY.md &amp;&amp; grep -q '845099e' .planning/quick/20260505-homepage-funnel-copy/SUMMARY.md &amp;&amp; grep -q 'completed: 2026-05-05' .planning/quick/20260505-homepage-funnel-copy/SUMMARY.md &amp;&amp; grep -q 'dde136a' .planning/quick/260505-fus-when-there-is-no-active-drop-hide-only-t/260505-fus-SUMMARY.md &amp;&amp; grep -q 'QUICK-FUS-01' .planning/quick/260505-fus-when-there-is-no-active-drop-hide-only-t/260505-fus-SUMMARY.md &amp;&amp; ! test -f .planning/quick/260505-fus-when-there-is-no-active-drop-hide-only-t/SUMMARY.md</automated>
  </verify>
  <done>Both summaries exist with correct filenames (Task D uses the `260505-fus-` prefix and no bare `SUMMARY.md` was created in that directory), each cites its real commit, Task D carries `QUICK-FUS-01`, and Task D's body documents the targeted-conditional behavior rather than an early return.</done>
</task>

<task type="auto">
  <name>Task 3: Backfill bundle variation ID + orderItems expansion summary</name>
  <files>.planning/quick/260507-fix-bundle-variation-ids-and-orderitems/SUMMARY.md</files>
  <action>
**Task E — `.planning/quick/260507-fix-bundle-variation-ids-and-orderitems/SUMMARY.md`**

This one has TWO implementing commits spanning two days. Read `PLAN.md`, then run `git show --stat` and `git show` on both hashes before writing.

- Plan title: "Fix Bundle Checkout — Variation IDs + orderItems Expansion". Plan frontmatter already says `status: complete` — only the summary file was missing.
- Commit 1: `c753abb855e01247882107df18138a47cfb6d692` — "fix: correct bundle variation IDs and filter by item name" — 2026-05-06 (author date `2026-05-06 07:53:53 -0600`) — files `components/OrderLanding.tsx`, `lib/config.ts` (6 insertions / 12 deletions).
- Commit 2: `80942a7c5ed09a0e3d063262a44fe525d950b7b9` — "fix: normalize catalogName match and warn on missing bundle in CheckoutClient" — 2026-05-07 (author date `2026-05-07 13:16:28 -0600`) — file `components/CheckoutClient.tsx` (8 insertions / 2 deletions).
- Set `completed: 2026-05-07` (the date the plan's work was fully closed by the second commit). In Performance, state the span explicitly: shipped across two commits, 2026-05-06 → 2026-05-07.
- `subsystem: payments`; suggested `tags: [square, checkout, bundles, catalog]`.
- In `## Task Commits`, list both hashes with which of the plan's two described bugs each one closed (stale `bundleVariationId` values vs. `orderItems` expansion / `catalogName` matching in CheckoutClient).

**Disambiguation — this is important, state it explicitly in the summary body.** A different quick task from the same window, `260507-bcm` ("Fix bundle price showing zero in checkout order summary", commit `70aa204`), is already summarized and already has its own STATE.md row. This task is NOT that one. Add a line under `## Issues Encountered` or `## Next Phase Readiness` clarifying that `260507-bcm` covers the zero-price display bug while this task covers `bundleVariationId` staleness plus `orderItems` expansion, so a future reader does not collapse the two.
  </action>
  <verify>
    <automated>test -f .planning/quick/260507-fix-bundle-variation-ids-and-orderitems/SUMMARY.md &amp;&amp; grep -q 'c753abb' .planning/quick/260507-fix-bundle-variation-ids-and-orderitems/SUMMARY.md &amp;&amp; grep -q '80942a7' .planning/quick/260507-fix-bundle-variation-ids-and-orderitems/SUMMARY.md &amp;&amp; grep -q 'completed: 2026-05-07' .planning/quick/260507-fix-bundle-variation-ids-and-orderitems/SUMMARY.md &amp;&amp; grep -q '260507-bcm' .planning/quick/260507-fix-bundle-variation-ids-and-orderitems/SUMMARY.md</automated>
  </verify>
  <done>SUMMARY.md exists, cites both `c753abb` and `80942a7` with the bug each closed, uses `completed: 2026-05-07`, and explicitly disambiguates itself from `260507-bcm`.</done>
</task>

<task type="auto">
  <name>Task 4: Clean up STATE.md deferred items and add backfilled quick-task rows</name>
  <files>.planning/STATE.md</files>
  <action>
Edit `.planning/STATE.md` only. Make four changes. Use the Edit tool; do not rewrite the whole file.

**(1) Delete three stale rows from the `## Deferred Items` table.** Each claims "missing summary" but is no longer true:
- `| quick_task | 260417-rpl-fix-checkout-square-error-logging-update | missing summary |` — the summary exists on disk at `.planning/quick/260417-rpl-fix-checkout-square-error-logging-update/260417-rpl-SUMMARY.md`.
- `| quick_task | 260421-cs6-fix-navbar-breakpoint-from-640px-to-960p | missing summary |` — no such directory exists at all. The row was added by a manual STATE.md commit (`5a79175`) for a fix that shipped as `c44faff` ("fix(navbar): raise mobile breakpoint from 640px to 960px", 2026-04-21) without ever going through the quick workflow. There is nothing to backfill.
- `| quick_task | 260421-d21-replace-nav-custom-css-classes-with-tail | missing summary |` — the summary exists at `.planning/quick/260421-d21-replace-nav-custom-css-classes-with-tail/260421-d21-SUMMARY.md`.

Before deleting, confirm the two file-existence claims with `ls` (they were verified during planning, but a one-line `ls` is cheap and this task's whole value is accuracy).

**(2) Rewrite the aggregate deferred row.** Replace:
`| quick_task | 16 additional pre-v2.0 quick tasks missing SUMMARY.md (see \`gsd-sdk query audit-open\` for full list) | acknowledged at v2.0 close 2026-08-28, deferred |`

with a row that (a) records that 5 of those were closed by quick task `260901-fej` on 2026-09-01, naming the five directories; (b) does NOT assert a precise remaining count; and (c) warns that `gsd-sdk query audit-open`'s "missing summary" list was found to be unreliable — it flagged tasks that already had a SUMMARY.md on disk — so its output must be spot-checked against the filesystem before being trusted. Keep it as a single table row in the existing 3-column format (`| Category | Item | Status |`).

**(3) Add four rows to the `## Quick Tasks Completed` table.** Match the existing column format exactly: `| # | Description | Date | Commit | Directory |` — there is no Status column, do not add one. Insert them in chronological order relative to the existing rows where it reads naturally; do not reorder existing rows.

- `20260501-hero-redesign-full-bleed` | Hero section redesign — full-bleed atmospheric | 2026-05-01 | `feef870` | `[20260501-hero-redesign-full-bleed](./.planning/quick/20260501-hero-redesign-full-bleed/)`
- `20260505-homepage-funnel-copy` | Homepage funnel copy — hero hook, pre-sell block, origin story (Issues 1, 3, 8) | 2026-05-05 | `845099e` | `[20260505-homepage-funnel-copy](./.planning/quick/20260505-homepage-funnel-copy/)`
- `260505-fus` | Hide only hero/bundles/items when there is no active drop | 2026-05-05 | `dde136a` | `[260505-fus-when-there-is-no-active-drop-hide-only-t](./.planning/quick/260505-fus-when-there-is-no-active-drop-hide-only-t/)`
- `260507-fix-bundle-variation-ids-and-orderitems` | Fix bundle checkout — variation IDs + orderItems expansion | 2026-05-07 | `c753abb` | `[260507-fix-bundle-variation-ids-and-orderitems](./.planning/quick/260507-fix-bundle-variation-ids-and-orderitems/)`

Dates are the historical commit dates, NOT 2026-09-01.

**Do NOT add a row for the catering restructure (Task B)** — a row for `20260505-catering-page-hook-trust-restructure` (commit `3d89fcf`) already exists. Only its directory summary was missing. Adding a second row would be a duplicate.

**(4) Append a "Last activity" line** at the end of the `## Session Continuity` section, matching the existing bullet format:
`- Last activity: 2026-09-01 - Completed quick task 260901-fej: backfilled 5 missing quick-task SUMMARY.md files and cleaned 3 stale + 1 inaccurate STATE.md deferred-item rows`

Do not touch `last_updated`/`last_activity` in the STATE.md frontmatter beyond what the standard quick-task completion flow does.
  </action>
  <verify>
    <automated>! grep -q '260417-rpl-fix-checkout-square-error-logging-update | missing summary' .planning/STATE.md &amp;&amp; ! grep -q '260421-cs6-fix-navbar-breakpoint' .planning/STATE.md &amp;&amp; ! grep -q '260421-d21-replace-nav-custom-css-classes-with-tail | missing summary' .planning/STATE.md &amp;&amp; ! grep -q '16 additional pre-v2.0 quick tasks' .planning/STATE.md &amp;&amp; grep -q 'audit-open' .planning/STATE.md &amp;&amp; test "$(grep -c '20260501-hero-redesign-full-bleed' .planning/STATE.md)" = "1" &amp;&amp; test "$(grep -c '20260505-homepage-funnel-copy' .planning/STATE.md)" = "1" &amp;&amp; test "$(grep -c '260505-fus-when-there-is-no-active-drop-hide-only-t' .planning/STATE.md)" = "1" &amp;&amp; test "$(grep -c '260507-fix-bundle-variation-ids-and-orderitems' .planning/STATE.md)" = "1" &amp;&amp; test "$(grep -c '20260505-catering-page-hook-trust-restructure' .planning/STATE.md)" = "2"</automated>
  </verify>
  <done>The three stale `missing summary` rows and the stale 16-task aggregate row are gone; a replacement aggregate row referencing the audit-tool unreliability is present; exactly one new Quick Tasks Completed row exists for each of A/C/D/E with historical dates; the catering entry appears exactly twice (its pre-existing table row plus the new deferred-row mention of the five backfilled directories) and was not given a duplicate table row.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| git history → summary text | Commit diffs are the authoritative input; summary prose is derived output. Drift between them is the only real failure mode here. |
| STATE.md → future planning agents | STATE.md is read as ground truth by later GSD runs; an inaccurate row silently misleads every subsequent session. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-fej-01 | Tampering | Source code under `app/`, `components/`, `lib/` | mitigate | Docs-only scope stated in `<conventions>`; `files_modified` contains no source paths; final verification greps `git status --porcelain` for non-`.planning/` paths |
| T-fej-02 | Repudiation | Backfilled SUMMARY.md content | mitigate | Every summary must cite its real commit hash and be written from `git show` output, not plan prose; each `<verify>` greps for the hash |
| T-fej-03 | Information Disclosure | STATE.md aggregate deferred row | mitigate | Explicitly forbid asserting a precise remaining count; require the audit-tool-unreliability caveat so a wrong number is not re-enshrined |
| T-fej-04 | Tampering | Duplicate STATE.md rows | mitigate | Task 4 verify asserts `grep -c` equals exactly 1 for each new slug and 2 for the pre-existing catering slug |
| T-fej-SC | Tampering | npm/pip/cargo installs | n/a | No package installs in this plan — no dependency surface introduced |
</threat_model>

<verification>
Run after all four tasks complete:

1. All five summaries exist with the correct filenames:
   ```
   ls .planning/quick/20260501-hero-redesign-full-bleed/SUMMARY.md \
      .planning/quick/20260505-catering-page-hook-trust-restructure/SUMMARY.md \
      .planning/quick/20260505-homepage-funnel-copy/SUMMARY.md \
      .planning/quick/260505-fus-when-there-is-no-active-drop-hide-only-t/260505-fus-SUMMARY.md \
      .planning/quick/260507-fix-bundle-variation-ids-and-orderitems/SUMMARY.md
   ```

2. No summary claims today as its completion date:
   ```
   ! grep -rl 'completed: 2026-09-01' .planning/quick/20260501-hero-redesign-full-bleed .planning/quick/20260505-catering-page-hook-trust-restructure .planning/quick/20260505-homepage-funnel-copy .planning/quick/260505-fus-when-there-is-no-active-drop-hide-only-t .planning/quick/260507-fix-bundle-variation-ids-and-orderitems
   ```

3. Every summary carries the backfill disclosure:
   ```
   grep -c 'Backfilled summary' <each of the 5 files>   # each must be >= 1
   ```

4. Docs-only scope held — nothing outside `.planning/` is dirty:
   ```
   git status --porcelain | grep -v '^.. \.planning/'   # must return nothing
   ```

5. No test run required: `app/`, `components/`, `lib/`, `tests/`, and `scripts/` are untouched.
</verification>

<success_criteria>
- 5 new `SUMMARY.md` files exist, each written from `git show` output of its real implementing commit(s)
- Each summary's `completed:` frontmatter is its historical commit date; none is 2026-09-01
- Each summary carries the backfill disclosure paragraph and cites its commit hash(es)
- Task E's summary cites both `c753abb` and `80942a7` and disambiguates itself from `260507-bcm`
- Task D's summary is at `260505-fus-SUMMARY.md` (prefixed), not bare `SUMMARY.md`
- STATE.md has 3 stale `missing summary` rows removed and the 16-task aggregate row rewritten with the audit-tool caveat and no fabricated count
- STATE.md `Quick Tasks Completed` gains exactly 4 rows (A, C, D, E) with historical dates and correct 5-column format; no duplicate catering row
- `git status --porcelain` shows changes only under `.planning/`
</success_criteria>

<output>
Create `.planning/quick/260901-fej-backfill-5-missing-summary-md-files-for-/260901-fej-SUMMARY.md` when done.
</output>
