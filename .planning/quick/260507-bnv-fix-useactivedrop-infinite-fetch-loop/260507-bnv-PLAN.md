---
phase: quick-260507-bnv
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/hooks/useActiveDrop.ts
  - tests/useActiveDrop.test.ts
autonomous: true
requirements:
  - QUICK-260507-BNV-01
must_haves:
  truths:
    - "load() fires exactly once on mount (no infinite loop)"
    - "Polling interval is set up only when drop is non-null and status !== 'closed'"
    - "Status transitions (e.g., open -> closed) tear down and re-evaluate the interval correctly"
    - "reload() callback returned from the hook still triggers a fresh load() call"
  artifacts:
    - path: "components/hooks/useActiveDrop.ts"
      provides: "Two-effect hook implementation that prevents fetch loop"
      contains: "useEffect"
    - path: "tests/useActiveDrop.test.ts"
      provides: "Static analysis tests aligned with two-effect structure"
      contains: "describe"
  key_links:
    - from: "components/hooks/useActiveDrop.ts mount effect"
      to: "load() callback"
      via: "useEffect with [load] deps"
      pattern: "void load\\(\\)"
    - from: "components/hooks/useActiveDrop.ts polling effect"
      to: "setInterval/clearInterval"
      via: "useEffect with [load, state.drop?.status] deps"
      pattern: "setInterval"
---

<objective>
Fix the infinite fetch loop in `useActiveDrop` by splitting its single `useEffect` into two effects — one for the initial load on mount, one for setting up conditional polling based on drop status. Update the existing static-analysis tests to match the new structure so the test suite continues to enforce the fix.

Purpose: The current hook has dependency `[load, state.drop, state.drop?.status]` and calls `load()` unconditionally at the top of the effect. Because `load()` updates `state.drop`, the effect re-runs on every fetch — producing a tight infinite request loop against `/api/drop`.

Output: Two-effect hook implementation; updated tests that assert the two-effect structure; passing `npm run test`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@components/hooks/useActiveDrop.ts
@tests/useActiveDrop.test.ts

<interfaces>
<!-- Key contracts the executor needs. Extracted from the codebase. -->

From components/hooks/useActiveDrop.ts (current buggy version):
```typescript
interface ActiveDropState {
  drop: DropDTO | null;
  isLoading: boolean;
  error?: string;
}

const POLL_INTERVAL_MS = 30_000;

export function useActiveDrop(initialDrop: DropDTO | null = null): {
  drop: DropDTO | null;
  isLoading: boolean;
  error?: string;
  reload: () => Promise<void>;
};
```

The `load` callback is wrapped in `useCallback(async () => { ... }, [])` — its identity is stable across renders.

DropDTO (from lib/types.ts) has a `status` field that includes `"closed"` among its values. The existing polling guard is `state.drop !== null && status !== "closed"`. This guard MUST be preserved.

Consumers (do not need changes): components/NavBar.tsx, components/OrderLanding.tsx — they call `useActiveDrop(initialDrop?)` and read `{ drop, isLoading, error, reload }`. The public return shape MUST NOT change.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Update useActiveDrop tests to assert two-effect structure</name>
  <files>tests/useActiveDrop.test.ts</files>
  <behavior>
    The current test file (tests/useActiveDrop.test.ts) asserts the BUGGY structure — specifically that `[load, state.drop, state.drop?.status]` is the single effect's dep array, and that `[load]` does NOT appear as a standalone dep array. After the fix, the hook will have TWO effects, one of which uses `[load]` as its deps. The tests must be updated to assert the FIXED structure before the implementation changes.

    Updated assertions (replace the existing "Issue 12 — conditional polling" describe block; keep file path, imports, and source-loading boilerplate identical):

    - Test 1 (mount-only load effect exists): source contains the exact substring `}, [load]);` (the mount effect's dep array). This was previously NEGATED — now it MUST be present.
    - Test 2 (polling effect dep array): source contains the exact substring `}, [load, state.drop?.status]);` (polling effect deps — drop status only, NOT the full drop object). The old `[load, state.drop, state.drop?.status]` dep array MUST NOT appear.
    - Test 3 (exactly two useEffect calls): `(source.match(/useEffect\(/g) ?? []).length === 2`.
    - Test 4 (load is called exactly once at top level — mount effect only): count of `void load()` occurrences === 2 (one in mount effect, one inside the setInterval callback). The polling effect MUST NOT call `load()` at its top level.
    - Test 5 (shouldPoll guard preserved): source contains `state.drop !== null && status !== "closed"` (unchanged from current).
    - Test 6 (setInterval/clearInterval): exactly one `setInterval` and one `clearInterval`, both inside the polling effect (setInterval index > shouldPoll index).
    - Test 7 (reload still works): source contains `reload: load`.
    - Test 8 (POLL_INTERVAL_MS unchanged): source contains `POLL_INTERVAL_MS = 30_000`.
    - Test 9 (cache no-store unchanged): source contains `cache: "no-store"`.
    - Test 10 (export signature unchanged): source contains `export function useActiveDrop`.
    - Test 11 (no reference to "inactive"): source does not contain `"inactive"`.

    The describe block heading should be updated to "useActiveDrop — two-effect structure (fix infinite fetch loop)" to reflect the new intent.
  </behavior>
  <action>
    Rewrite the describe block in tests/useActiveDrop.test.ts to match the behavior above. Keep the file's import block, `HOOK_PATH`, and `source` constant exactly as they are. Run the tests AFTER this change — they SHOULD FAIL (RED) because the implementation still has the old single-effect structure. This is the expected TDD red state. Do NOT modify the implementation in this task.
  </action>
  <verify>
    <automated>npx vitest run tests/useActiveDrop.test.ts</automated>
  </verify>
  <done>tests/useActiveDrop.test.ts contains the eleven assertions described above; running the test file fails with assertions about the new structure (RED state expected). No production code modified.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Split useActiveDrop into mount-load effect and conditional-polling effect</name>
  <files>components/hooks/useActiveDrop.ts</files>
  <behavior>
    After this task, the hook MUST satisfy:
    - `load()` is invoked exactly once when the component mounts (no infinite refetch loop).
    - When `state.drop` becomes non-null AND `state.drop.status !== "closed"`, an interval is registered that calls `load()` every `POLL_INTERVAL_MS` ms.
    - When the drop status transitions to `"closed"` (or back to non-closed), the previous interval is cleaned up via `clearInterval` and re-evaluated.
    - The hook's public return shape (`{ drop, isLoading, error, reload }`) and the `load` useCallback (empty deps) remain unchanged.
    - All eleven assertions in tests/useActiveDrop.test.ts (from Task 1) pass.
    - Existing project tests (`npm run test`) all pass.
  </behavior>
  <action>
    Replace the single `useEffect` (lines 35–46 in the current file) with two separate effects:

    Effect 1 — mount-only load:
    ```typescript
    useEffect(() => {
      void load();
    }, [load]);
    ```

    Effect 2 — conditional polling on status:
    ```typescript
    useEffect(() => {
      const status = state.drop?.status;
      const shouldPoll = state.drop !== null && status !== "closed";
      if (!shouldPoll) {
        return;
      }
      const id = setInterval(() => {
        void load();
      }, POLL_INTERVAL_MS);
      return () => clearInterval(id);
    }, [load, state.drop?.status]);
    ```

    Important details:
    - The polling effect's dep array is `[load, state.drop?.status]` — NOT `[load, state.drop, state.drop?.status]`. We only want the interval to be re-evaluated on status transitions, not on every drop object identity change (which would happen on every successful fetch since `load()` always calls `setState({ drop: data, ... })` with a fresh object). Keying on `state.drop?.status` (a primitive) prevents re-evaluation when the same drop is refetched with the same status.
    - Do NOT call `load()` at the top of the polling effect — that would reintroduce the loop.
    - Do NOT change the `load` useCallback or its empty dep array.
    - Do NOT change imports, the `ActiveDropState` interface, the `POLL_INTERVAL_MS` constant, or the return statement.
    - Keep the `"use client"` directive.

    After editing, run the targeted test file first to confirm GREEN, then run the full test suite to confirm no regressions.
  </action>
  <verify>
    <automated>npx vitest run tests/useActiveDrop.test.ts &amp;&amp; npm run test</automated>
  </verify>
  <done>tests/useActiveDrop.test.ts passes all eleven assertions; `npm run test` exits 0 with all suites green; the file contains exactly two `useEffect(` calls; the dep arrays are `[load]` and `[load, state.drop?.status]`; `load()` is called exactly twice in the source (mount effect + setInterval callback).</done>
</task>

</tasks>

<verification>
- `npx vitest run tests/useActiveDrop.test.ts` exits 0 with eleven passing assertions.
- `npm run test` exits 0 with all existing suites green (no regressions in checkout, mailing list, drops, etc.).
- Manual smoke (optional, not required by automation): `npm run dev`, open the homepage, watch the Network tab — exactly one `GET /api/drop` request fires on mount; subsequent requests appear at 30-second intervals only when a non-closed drop is active. No tight loop.
- Source file `components/hooks/useActiveDrop.ts` contains exactly two `useEffect(` invocations; the public return shape is unchanged; consumers (`NavBar.tsx`, `OrderLanding.tsx`) continue to compile without modification.
</verification>

<success_criteria>
The infinite fetch loop is eliminated. `useActiveDrop` calls `/api/drop` once on mount and then only on the 30-second polling cadence (when a non-closed drop is active). Test suite enforces the two-effect structure to prevent regression. No consumer changes required. All existing tests pass.
</success_criteria>

<output>
After completion, create `.planning/quick/260507-bnv-fix-useactivedrop-infinite-fetch-loop/260507-bnv-SUMMARY.md` documenting the diff, the test update, and the verified outcome.
</output>
