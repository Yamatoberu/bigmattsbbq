---
phase: 260901-eul
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/square.ts
  - scripts/check-order-attribution.mjs
  - README.md
  - docs/checkout-attribution.md
  - .planning/STATE.md
autonomous: true
requirements:
  - STATE-DEFERRED-square-api-version

must_haves:
  truths:
    - "Every outbound Square API request sends Square-Version: 2026-07-15"
    - "The standalone attribution check script sends the same version as the app, not a stale one"
    - "No file in lib/, scripts/, README.md, or docs/ still claims the pin is 2026-04-21"
    - "The docs/checkout-attribution.md re-verification trigger records that it fired and what the outcome was"
    - "STATE.md no longer lists a pending Square API version bump that was already done"
  artifacts:
    - path: "lib/square.ts"
      provides: "The single SQUARE_VERSION pin consumed by squareFetch"
      contains: "2026-07-15"
    - path: "scripts/check-order-attribution.mjs"
      provides: "Sandbox attribution verification using the matching API version"
      contains: "2026-07-15"
    - path: "docs/checkout-attribution.md"
      provides: "Order.metadata BETA risk record + re-verification trigger, now updated"
      contains: "2026-07-15"
  key_links:
    - from: "lib/square.ts"
      to: "Square API Square-Version header"
      via: "squareFetch headers"
      pattern: "\"Square-Version\": SQUARE_VERSION"
    - from: "scripts/check-order-attribution.mjs"
      to: "lib/square.ts SQUARE_VERSION"
      via: "hand-maintained sync comment (no import possible in .mjs)"
      pattern: "Must stay in sync with SQUARE_VERSION"
---

<objective>
Bump the pinned Square API version from `2026-04-21` to `2026-07-15` (the latest
release), everywhere it is stated, and clear the stale STATE.md deferred item
that claims this bump is still pending from `2024-12-18`.

Purpose: `2024-12-18` was EOL ~June 2026 and was already bumped to `2026-04-21`
on 2026-05-07, but STATE.md still tracks it as pending. Moving to `2026-07-15`
puts the app on the current release and lets the deferred item be closed
truthfully rather than corrected-then-left-open.

Output: One version literal changed in two source files, three docs corrected,
one stale STATE.md row removed.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

@lib/square.ts
@scripts/check-order-attribution.mjs
@docs/checkout-attribution.md

<research_findings>
The Square changelog between 2026-04-21 and 2026-07-15 was reviewed before this
plan was written. Do NOT re-research this; the conclusion is load-bearing and
already settled:

- 2026-05-20 release: Payments API and Refunds API only. This app calls neither.
- 2026-07-15 release:
  - Catalog: new beta vendor-info field. Unused by this app.
  - Inventory: beta cost/vendor tracking (unused) PLUS one breaking change —
    the `TRANSFER` inventory-change type and the `RetrieveInventoryTransfer`
    endpoint were retired in favor of `ADJUSTMENT`. This app's
    `batchSetInventoryCounts` in `lib/square.ts` only ever sends
    `type: "PHYSICAL_COUNT"` and never `TRANSFER`, so it is unaffected. A
    repo-wide grep for `TRANSFER` and `RetrieveInventoryTransfer` across
    `.ts`/`.tsx`/`.mjs` returned zero source matches.
  - Orders: added a closed-beta `IN_STORE` fulfillment type. Opt-in, irrelevant.
  - Customers and Invoices: no changes.

Net: only the version string literal changes. No request body, no endpoint, and
no response-parsing code needs to change.
</research_findings>

<current_state>
`grep -rn "2026-04-21"` across source and docs (excluding `.planning/` history
and `.next/`) returns exactly four in-scope occurrences:

1. `lib/square.ts:3` — `export const SQUARE_VERSION = "2026-04-21";`
   This is the real pin; `squareFetch` sends it as the `Square-Version` header
   on every Square call.

2. `scripts/check-order-attribution.mjs:16` — a hand-duplicated
   `const SQUARE_VERSION = "2026-04-21";` carrying the comment
   `// Must stay in sync with SQUARE_VERSION in lib/square.ts.`
   It is duplicated rather than imported because `.mjs` scripts in this repo
   deliberately have no `lib/` imports. If this is not bumped alongside
   `lib/square.ts`, the verification script would probe Square with a different
   API version than the app actually uses, which quietly invalidates the very
   check being used to confirm the bump.

3. `README.md:44` — restates the value: "pinned at the top of `lib/square.ts`
   (currently `2026-04-21`). Update there if needed — this line intentionally
   doesn't restate the value to avoid drifting out of sync." The sentence
   contradicts itself: it *does* restate the value, and it has now drifted.

4. `docs/checkout-attribution.md:74-76` — the recorded re-verification trigger:
   "re-check `x-release-status` on `Order.metadata` before any Square API
   version bump past the pinned `2026-04-21` in `lib/square.ts`."
   This plan is exactly the event that trigger was written for.
</current_state>

<environment_note>
There is no `.env.local` in this repo checkout — only `.env.example`. Both
`npm run check:sca` and `npm run check:attribution` load credentials via
`node --env-file-if-exists=.env.local`, so with the file absent they will fail
on missing environment variables before ever reaching Square or Supabase.
That failure mode is expected here and is NOT a failure of this change. See
Task 1 for how to distinguish it from a real API failure.
</environment_note>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Bump the version pin in both source locations and verify</name>
  <files>lib/square.ts, scripts/check-order-attribution.mjs</files>
  <action>
    Change the version string literal from `2026-04-21` to `2026-07-15` in
    exactly two places:

    1. `lib/square.ts` line 3 — the exported `SQUARE_VERSION` const.
    2. `scripts/check-order-attribution.mjs` line 16 — the duplicated
       `SQUARE_VERSION` const. Leave its
       "Must stay in sync with SQUARE_VERSION in lib/square.ts" comment intact;
       that comment is the only mechanism keeping these two in sync and must
       survive the edit.

    Change nothing else. Do not touch `batchSetInventoryCounts`, request bodies,
    endpoints, or response parsing — the research findings above establish that
    no such change is required. Do not add a compatibility shim or a fallback to
    the old version.

    Then verify, in this order:

    a. Run `npm run test`. All Vitest suites must pass. No test asserts on the
       version string, so this is a regression check on the surrounding code,
       not a direct assertion of the bump.

    b. Attempt the two live-Sandbox checks: `npm run check:attribution` and
       `npm run check:sca`. These hit real Square and Supabase Sandbox APIs.

       Interpret their output carefully:
       - If they fail with a *missing environment variable* error (expected in
         this checkout, since `.env.local` is absent), that is NOT a failure of
         this change. Record it as a follow-up for the user to run manually in
         an environment that has real Sandbox credentials. Do not fabricate a
         pass, and do not create a `.env.local` or invent credentials.
       - If they actually reach Square and fail with an HTTP or API error, stop
         and report it — that would be a genuine incompatibility with
         `2026-07-15` and contradicts the research findings.
       - If they pass, record that the bump was confirmed against live Sandbox.

    Capture which of these three outcomes occurred; Task 2 and the SUMMARY both
    depend on knowing whether live verification actually happened.
  </action>
  <verify>
    <automated>grep -c '2026-07-15' lib/square.ts scripts/check-order-attribution.mjs && grep -rn '2026-04-21' lib/ scripts/ ; test -z "$(grep -rn '2026-04-21' lib/ scripts/)" && npm run test</automated>
  </verify>
  <done>
    `lib/square.ts` and `scripts/check-order-attribution.mjs` each contain
    `2026-07-15` and neither contains `2026-04-21`; the sync comment in the
    `.mjs` script is unchanged; `npm run test` passes; the outcome of the two
    live Sandbox checks is recorded as one of pass / missing-credentials /
    real-API-failure.
  </done>
</task>

<task type="auto">
  <name>Task 2: Correct the two repo docs that state the old pin</name>
  <files>README.md, docs/checkout-attribution.md</files>
  <action>
    Fix both places in repo documentation that assert the old version.

    1. `README.md` line 44, under "## Square version header". The current
       sentence restates `2026-04-21` while simultaneously claiming it
       "intentionally doesn't restate the value to avoid drifting out of sync" —
       self-contradictory, and it drifted. Rewrite it so it genuinely does not
       restate the value: point the reader at the `SQUARE_VERSION` constant at
       the top of `lib/square.ts` as the single source of truth, and note that
       `scripts/check-order-attribution.mjs` keeps a hand-synced copy that must
       be updated together with it. Do not put any version number in this
       sentence.

    2. `docs/checkout-attribution.md` lines 74-76, the "Re-verification trigger"
       paragraph. This trigger has now fired. Update it to:
       - Re-point the pinned version reference to `2026-07-15`, so the trigger
         stays armed for the *next* bump rather than referring to a version the
         app no longer uses.
       - Record that the trigger was honored at the 2026-04-21 → 2026-07-15
         bump, and state the finding: the 2026-07-15 release contained no
         Orders API changes affecting `Order.metadata` (its only Orders change
         was a closed-beta `IN_STORE` fulfillment type), so the field-level
         BETA risk documented above it is unchanged and still knowingly
         accepted.
       Leave the surrounding rationale about Order Custom Attributes vs.
       `Order.metadata` (lines ~55-72) untouched — it is still accurate.

    If Task 1 recorded that live Sandbox verification could not run for lack of
    credentials, do not claim in either doc that the bump was verified against
    live Sandbox.
  </action>
  <verify>
    <automated>test -z "$(grep -rn '2026-04-21' README.md docs/)" && grep -c '2026-07-15' docs/checkout-attribution.md</automated>
  </verify>
  <done>
    Neither `README.md` nor anything under `docs/` mentions `2026-04-21`; the
    README's Square-version sentence contains no version literal at all and
    names both files that hold the pin; `docs/checkout-attribution.md` records
    the re-verification outcome and its trigger now references `2026-07-15`.
  </done>
</task>

<task type="auto">
  <name>Task 3: Remove the stale deferred item from STATE.md</name>
  <files>.planning/STATE.md</files>
  <action>
    In `.planning/STATE.md`, under "## Deferred Items", delete this row from the
    table (currently line 166):

      | requirement | Square API version bump from 2024-12-18 (EOL ~June 2026) | pending |

    It is factually wrong on two counts: the app has not been on `2024-12-18`
    since 2026-05-07 (see the "Quick Tasks Completed" table row "Bump Square API
    version from 2024-12-18 to 2026-04-21"), and as of this task the pin is
    `2026-07-15`, the latest available release. There is nothing left pending,
    so remove the row outright rather than rewriting it to a new pending state.

    Delete only that one row. Leave every other Deferred Items row untouched —
    in particular the unrelated `uat_gap`, `verification_gap`, `quick_task`, and
    `tech_debt` rows, and the `MAIL-01` requirement row, all of which are still
    genuinely open.

    Do not add a "Quick Tasks Completed" row for this task and do not edit the
    frontmatter or "Session Continuity" section — the GSD quick-task completion
    flow owns those updates.
  </action>
  <verify>
    <automated>test -z "$(grep -n '2024-12-18' .planning/STATE.md | grep -v 'to 2026-04-21')" && grep -c '^| ' .planning/STATE.md</automated>
  </verify>
  <done>
    The `2024-12-18` version-bump row is gone from the Deferred Items table; the
    historical "Quick Tasks Completed" row mentioning `2024-12-18 to 2026-04-21`
    is preserved; all other Deferred Items rows remain.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| app server → Square API | Outbound authenticated calls; the `Square-Version` header selects the API contract this app is bound to |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-eul-01 | Tampering | `squareFetch` request/response contract in `lib/square.ts` | mitigate | Changelog reviewed across both intervening releases; the one breaking change (`TRANSFER` retired) does not apply since `batchSetInventoryCounts` sends only `PHYSICAL_COUNT`. `npm run test` gates regressions. |
| T-eul-02 | Tampering | Version drift between `lib/square.ts` and `scripts/check-order-attribution.mjs` | mitigate | Both literals bumped in the same task (Task 1); the sync comment is preserved; README updated to name both files so the next bumper finds the second one. |
| T-eul-03 | Information Disclosure | `Order.metadata` attribution payload | accept | `Order.metadata` remains field-level BETA and application-private. Unchanged by the 2026-07-15 release; risk was already knowingly accepted in Phase 12 and is re-recorded, not newly introduced. |

No package-manager installs occur in this plan, so no package legitimacy gate applies.
</threat_model>

<verification>
1. `npm run test` passes.
2. `grep -rn "2026-04-21" lib/ scripts/ README.md docs/` returns no matches.
3. `grep -n "SQUARE_VERSION" lib/square.ts scripts/check-order-attribution.mjs`
   shows `2026-07-15` in both, and the `.mjs` sync comment survives.
4. `npm run check:attribution` and `npm run check:sca` either pass against live
   Sandbox, or fail specifically on missing credentials and are recorded as a
   manual follow-up for the user.
5. `.planning/STATE.md` Deferred Items no longer contains a pending Square API
   version bump row.
</verification>

<success_criteria>
- Every Square API call sends `Square-Version: 2026-07-15`.
- The attribution check script probes Square with the same version the app uses.
- No source file or repo doc still asserts the pin is `2026-04-21`.
- The `Order.metadata` re-verification trigger is recorded as fired, with its
  finding, and re-armed against `2026-07-15`.
- The stale `2024-12-18` deferred item is gone from STATE.md.
- If live Sandbox verification could not run, that is stated plainly as a user
  follow-up rather than papered over.
</success_criteria>

<output>
Create `.planning/quick/260901-eul-bump-square-api-version-from-2026-04-21-/260901-eul-SUMMARY.md` when done.

The SUMMARY must state explicitly which of the three live-Sandbox outcomes
occurred (passed / skipped for missing credentials / real API failure), since
that determines whether the user has an outstanding manual verification step.
</output>
