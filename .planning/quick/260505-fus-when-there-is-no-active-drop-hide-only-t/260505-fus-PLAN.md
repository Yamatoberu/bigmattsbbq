---
phase: quick-260505-fus
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/OrderLanding.tsx
autonomous: true
requirements:
  - QUICK-FUS-01
must_haves:
  truths:
    - "When no active drop exists, the description blurb, testimonials, catering cross-sell, FAQ, pitmaster/about, and MailingListSection are all visible on the home page."
    - "When no active drop exists, the hero section (with drop banner/title), the 'Choose Your Drop' bundles section, and the 'Individual Items' section are NOT rendered."
    - "When an active drop exists, all sections render exactly as they did before this change (no visual or behavioral regression for the active-drop path)."
    - "The early-return block that previously rendered the stripped-down 'Next Drop' email-capture page is removed."
  artifacts:
    - path: "components/OrderLanding.tsx"
      provides: "OrderLanding component that conditionally hides only hero/bundles/individual-items when no active drop"
      contains: "drop && drop.status === \"active\""
  key_links:
    - from: "components/OrderLanding.tsx"
      to: "MailingListSection"
      via: "Always-rendered <MailingListSection /> at the bottom handles email capture for the no-drop state"
      pattern: "<MailingListSection"
---

<objective>
Change `components/OrderLanding.tsx` so that when there is no active drop, only the hero, "Choose Your Drop" bundles, and individual items sections are hidden — the rest of the page (description blurb, testimonials, catering cross-sell, FAQ, pitmaster/about, MailingListSection) renders normally.

Purpose: Today's behavior is an all-or-nothing early return that strips the page down to a single email-capture hero when there is no active drop. The user wants visitors to still see the brand story, catering CTA, FAQ, pitmaster section, and full mailing list section even between drops — only the drop-specific UI should disappear.

Output: A single modified `components/OrderLanding.tsx` with the early return removed and three sections wrapped in a `drop && drop.status === "active"` guard.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@components/OrderLanding.tsx

<interfaces>
<!-- Key contracts the executor needs. The relevant ones are already in OrderLanding.tsx. -->

The component reads `drop` from `useActiveDrop(initialDrop)`:
- `drop` is `DropDTO | null`
- The active-drop guard used elsewhere is exactly: `drop && drop.status === "active"`

Inside the active-drop branch, the existing code references `drop.title`, `drop.orderCutoffAt`, `drop.pickupOptions`, and `drop.soldOut.{pulledPork,brisket}`. These are ONLY used inside the three sections being conditionally rendered, so the guard keeps TypeScript happy without further narrowing.

`MailingListSection` is a self-contained component imported from `./MailingListSection` and already rendered at the bottom of the active-drop return block — it must be hoisted out so it renders in both states (it already does, once the early return is removed; no code change to the import is needed).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Remove early return and wrap drop-only sections with active-drop guard</name>
  <files>components/OrderLanding.tsx</files>
  <behavior>
    - When `drop` is null OR `drop.status !== "active"`:
      - Hero section (lines 131-169 in current file: the `<section className="hero-panel">` with the drop banner, h1, description, pickup options) is NOT in the rendered output.
      - "Choose Your Drop" bundles section (current lines 185-224: `<section id="order" ...>` containing `PACKAGES.map`) is NOT in the rendered output.
      - "Individual Items" section (current lines 226-262: `<section className="section-spacing">` containing `individualItems.map`) is NOT in the rendered output.
      - Description blurb (current lines 171-177), Testimonials strip (179-183), Catering cross-sell (264-285), FAQ (287-295), Pitmaster/about (297-322), and `<MailingListSection />` (324) ARE all rendered.
      - The old early-return "Next Drop" email-capture hero (current lines 80-127) is gone — there must be no `if (!drop || drop.status !== "active") { return ( ... ); }` block remaining.
    - When `drop` exists AND `drop.status === "active"`:
      - All sections render exactly as they did before, in the same order, with no visible diff.
  </behavior>
  <action>
    Edit `components/OrderLanding.tsx` to implement the conditional rendering described above (per QUICK-FUS-01).

    Steps:
    1. Delete the entire early-return block currently at lines 80-127 (the `if (!drop || drop.status !== "active") { return ( <div className="bg-ember-radial bg-grain"> ... </div> ); }`). Also remove the now-unused `mlEmail`/`mlState`/`mlError` state and the `handleMailingListSubmit` function ONLY IF they are no longer referenced anywhere in the file after the deletion. Verify with a grep before deleting — if any other code path uses them, leave them in place. (Today they appear to be used only inside the early-return block, so they should become safe to remove. The `MailingListSection` at the bottom owns mailing-list capture for the no-drop state.)

       Note on imports: after removing the early-return form, the `useState` and `type FormEvent` imports may become unused. Run `npm run build` (or `npm run lint`) at the end to confirm; if so, drop them. Do NOT remove `useMemo` — it is still used by `variationMap`, `bundleVariationIds`, and `individualItems`.

    2. In the surviving `return (...)` block (currently starting at line 129), wrap three sections with `{drop && drop.status === "active" && ( ... )}`:
       - The hero section: `<section className="hero-panel"> ... </section>` (currently lines 131-169).
       - The "Choose Your Drop" bundles section: `<section id="order" className="section-spacing bg-[#120c09]"> ... </section>` (currently lines 185-224).
       - The "Individual Items" section: `<section className="section-spacing"> ... </section>` whose body contains `individualItems.map` (currently lines 226-262).

       Wrap each independently — do NOT collapse them into a single fragment, because the description blurb (lines 171-177) and the testimonials strip (lines 179-183) sit between the hero and the bundles section and must remain unconditional.

       Example shape (illustrative):
       ```tsx
       return (
         <div className="bg-ember-radial bg-grain">
           {drop && drop.status === "active" && (
             <section className="hero-panel"> ...existing hero JSX... </section>
           )}

           <section className="section-spacing"> ...description blurb... </section>
           <section className="px-6 py-8 md:px-12"> ...Testimonials strip... </section>

           {drop && drop.status === "active" && (
             <section id="order" className="section-spacing bg-[#120c09]"> ...bundles... </section>
           )}

           {drop && drop.status === "active" && (
             <section className="section-spacing"> ...individual items... </section>
           )}

           <section className="section-spacing bg-[#120c09]"> ...catering cross-sell... </section>
           <section className="section-spacing"> ...FAQ... </section>
           <section className="section-spacing bg-[#120c09]"> ...pitmaster/about... </section>

           <MailingListSection />
         </div>
       );
       ```

       The active-drop guard `drop && drop.status === "active"` is critical: it keeps TypeScript happy because the bundles + individual-items sections reference `drop.soldOut.pulledPork` / `drop.soldOut.brisket`, which require `drop` to be non-null. Use exactly this expression — do NOT introduce a new helper boolean above the JSX, because TypeScript narrowing inside JSX requires the inline check.

    3. Do not touch any other section's JSX. Do not change classNames, copy, ordering, or imports beyond what step 1 requires for cleanup.

    4. Run `npm run build` to confirm the file type-checks (catches missing-narrowing or unused-import errors).
  </action>
  <verify>
    <automated>cd /Users/matt/Development/BigMattsBbq && npm run build 2>&1 | tail -40 && echo "---grep checks---" && grep -n 'if (!drop || drop.status !== "active")' components/OrderLanding.tsx; test $? -ne 0 && echo "OK: early return removed" && grep -c 'drop && drop.status === "active"' components/OrderLanding.tsx | grep -v '^#' | awk '{ if ($1 >= 3) print "OK: 3+ active-drop guards present ("$1")"; else { print "FAIL: expected at least 3 active-drop guards, got "$1; exit 1 } }'</automated>
  </verify>
  <done>
    - `npm run build` succeeds with no TypeScript errors.
    - `grep 'if (!drop || drop.status !== "active")' components/OrderLanding.tsx` returns no matches (early return removed).
    - `grep -c 'drop && drop.status === "active"' components/OrderLanding.tsx` returns at least 3 (one guard per hidden section).
    - Manual smoke test (executor-confirmed in summary, not part of automated gate): with no active drop, `/` shows the description blurb, testimonials, catering cross-sell, FAQ, pitmaster/about, and MailingListSection but NOT the hero, bundles, or individual items sections; with an active drop, the page looks identical to before.
  </done>
</task>

</tasks>

<verification>
- `npm run build` passes (TypeScript + Next.js compile).
- `npm run test` still passes (no test files touch `OrderLanding.tsx`, but run as a sanity check).
- Manual: load `/` with no active drop and confirm only hero/bundles/individual-items are hidden; load `/` with an active drop and confirm zero visual regressions.
</verification>

<success_criteria>
- The early-return block in `components/OrderLanding.tsx` is removed.
- Hero, "Choose Your Drop" bundles, and "Individual Items" sections render only when `drop && drop.status === "active"`.
- All other sections (description blurb, testimonials, catering cross-sell, FAQ, pitmaster/about, MailingListSection) render unconditionally.
- TypeScript build passes with no new errors.
- Active-drop rendering is byte-equivalent to before (same JSX, same order).
</success_criteria>

<output>
After completion, create `.planning/quick/260505-fus-when-there-is-no-active-drop-hide-only-t/260505-fus-01-SUMMARY.md`.
</output>
