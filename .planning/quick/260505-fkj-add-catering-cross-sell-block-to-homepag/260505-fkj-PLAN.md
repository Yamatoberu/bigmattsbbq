---
phase: quick-260505-fkj
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/OrderLanding.tsx
autonomous: false
requirements:
  - QUICK-260505-FKJ-01
must_haves:
  truths:
    - "Homepage shows a catering cross-sell block immediately after the Individual Items grid and before the FAQ section"
    - "The new catering block uses dark background and display font (visually matching The Pitmaster origin story block)"
    - "The catering block heading reads 'Feeding a crowd?' (or close per copy spec)"
    - "The catering block CTA reads 'See Catering Packages →' and links to /catering"
    - "The redundant minimal catering section that previously rendered after MailingListSection is removed"
    - "No other sections (hero, packages, individual items, FAQ, pitmaster, mailing list) are reordered or altered"
  artifacts:
    - path: "components/OrderLanding.tsx"
      provides: "Repositioned catering cross-sell block + removal of redundant trailing catering section"
      contains: "Feeding a crowd?"
  key_links:
    - from: "components/OrderLanding.tsx (catering cross-sell block)"
      to: "/catering"
      via: "<Link href=\"/catering\">"
      pattern: "href=\"/catering\""
---

<objective>
Reposition and rewrite the catering cross-sell block on the homepage so it sits between the Individual Items grid and the FAQ section, styled like The Pitmaster origin story block. Remove the now-redundant minimal catering section currently rendered after the mailing list.

Purpose: Surface catering earlier in the funnel where engaged buyers are scrolling, give it the editorial weight that matches the Pitmaster section, and eliminate duplication at the page bottom.

Output: A single edit to `components/OrderLanding.tsx` that moves + restyles + rewrites the catering block and deletes the trailing duplicate.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@components/OrderLanding.tsx

<interfaces>
<!-- Existing patterns to mirror. Extracted from components/OrderLanding.tsx. -->

The Pitmaster block (lines ~275-299) is the visual template to copy:
```tsx
<section className="section-spacing bg-[#120c09]">
  <div className="mx-auto max-w-2xl text-center">
    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f0c16a]">
      The Pitmaster
    </p>
    <h2
      className="mt-4 text-3xl font-semibold text-smoke-900"
      style={{ fontFamily: "var(--font-display)" }}
    >
      One smoker. Twelve-hour cooks. Real BBQ.
    </h2>
    <p className="mt-4 text-base leading-relaxed text-smoke-700">
      ...body copy...
    </p>
    <a
      href="/about"
      className="mt-6 inline-block text-sm font-semibold text-[#f0c16a] underline-offset-4 hover:underline"
    >
      Read the full story →
    </a>
  </div>
</section>
```

Existing trailing catering block to REMOVE (lines ~303-316):
```tsx
<section className="section-spacing bg-[#0f0b08]">
  <div className="mx-auto max-w-5xl">
    <SectionHeader
      eyebrow="Catering"
      title="Event-ready BBQ"
      subtitle="Simple pricing tiers and a direct line to us."
    />
    <div className="mt-6 text-center">
      <Link href="/catering" className="button-secondary text-sm">
        See full catering menu →
      </Link>
    </div>
  </div>
</section>
```

Insertion point: between the Individual Items section (closes ~line 262) and the FAQ section (opens ~line 264).

`Link` from `next/link` is already imported at line 3. `SectionHeader` import at line 5 may become unused after this edit if it isn't referenced elsewhere — re-check after the edit.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Reposition + restyle catering block; remove trailing duplicate</name>
  <files>components/OrderLanding.tsx</files>
  <action>
Edit `components/OrderLanding.tsx`:

1. **Insert a new catering cross-sell `<section>`** between the Individual Items section (which closes around line 262 with `</section>`) and the FAQ section (which opens with `<section className="section-spacing">` containing the `<Faq />`).

   Use this exact structure, mirroring The Pitmaster block's styling (dark bg, display font, centered, max-w-2xl, ember accent eyebrow + link):

   ```tsx
   <section className="section-spacing bg-[#120c09]">
     <div className="mx-auto max-w-2xl text-center">
       <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f0c16a]">
         Catering
       </p>
       <h2
         className="mt-4 text-3xl font-semibold text-smoke-900"
         style={{ fontFamily: "var(--font-display)" }}
       >
         Feeding a crowd?
       </h2>
       <p className="mt-4 text-base leading-relaxed text-smoke-700">
         We cater events across Utah — weddings, reunions, corporate lunches, rodeos. Simple per-person pricing, fresh-cooked the day of, and the same low-and-slow brisket and pulled pork you get from the drops.
       </p>
       <Link
         href="/catering"
         className="mt-6 inline-block text-sm font-semibold text-[#f0c16a] underline-offset-4 hover:underline"
       >
         See Catering Packages →
       </Link>
     </div>
   </section>
   ```

   Use `<Link>` (already imported from `next/link` at line 3), not a raw `<a>` — the existing `/about` link uses `<a>` but Next.js convention for internal routes here favors `Link` and the trailing duplicate already used `Link`.

2. **Delete the trailing catering section** that currently renders after `<MailingListSection />` (the `<section className="section-spacing bg-[#0f0b08]">` block with `eyebrow="Catering"`, `title="Event-ready BBQ"`, etc.). Delete the entire `<section>...</section>` and any surrounding blank lines.

3. **Verify imports remain valid** after deletion:
   - `Link` is still used by the new block — keep the `import Link from "next/link"` line.
   - `SectionHeader` is still used by the Choose Your Drop, Individual Items, and FAQ sections — keep the import.
   - No imports become unused; do not remove any imports.

4. Do NOT touch any other section: hero, origin paragraph, Testimonials strip, Choose Your Drop / packages, Individual Items grid, FAQ, The Pitmaster, MailingListSection. Their order, classes, and content stay exactly as they are.
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -40 && grep -n "Feeding a crowd?" components/OrderLanding.tsx && ! grep -n "Event-ready BBQ" components/OrderLanding.tsx && ! grep -n "See full catering menu" components/OrderLanding.tsx</automated>
  </verify>
  <done>
- `components/OrderLanding.tsx` contains exactly one catering block, located between the Individual Items section and the FAQ section.
- The new catering block uses `bg-[#120c09]`, `max-w-2xl text-center`, the display-font `<h2>`, and the ember-gold accent eyebrow + link, matching The Pitmaster section visually.
- The new block heading is "Feeding a crowd?" and the CTA reads "See Catering Packages →" linking to `/catering`.
- The previous trailing catering section (`title="Event-ready BBQ"`, `"See full catering menu →"`) is gone.
- `npm run build` succeeds with no TypeScript or lint errors.
- No other sections were reordered or modified.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Visual confirmation on /</name>
  <what-built>
Catering cross-sell block repositioned to sit immediately after the Individual Items grid and before the FAQ. Restyled to match The Pitmaster origin story block (dark bg `#120c09`, display font H2, ember-gold eyebrow + link, centered max-w-2xl). New copy: heading "Feeding a crowd?", body about catering events across Utah / per-person pricing / fresh-cooked day-of, CTA "See Catering Packages →" linking to `/catering`. Trailing minimal catering section after the mailing list has been removed.
  </what-built>
  <how-to-verify>
1. Run `npm run dev` and open `http://localhost:3000/` (during an active drop window — or use a test fixture so the active-drop branch renders).
2. Scroll the page top-to-bottom. Confirm the order is:
   Hero → origin paragraph → Testimonials strip → Choose Your Drop (packages) → Individual Items → **Catering cross-sell ("Feeding a crowd?")** → FAQ → The Pitmaster → Mailing List → (page ends; no trailing catering block).
3. Confirm the new catering block visually matches The Pitmaster section: same dark background, same eyebrow style, same display-font headline weight, same ember-gold link treatment.
4. Click "See Catering Packages →" and confirm it navigates to `/catering`.
5. Confirm there is no second/duplicate catering section anywhere on the page.
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- `npm run build` succeeds.
- `grep "Feeding a crowd?" components/OrderLanding.tsx` returns exactly one match.
- `grep "Event-ready BBQ" components/OrderLanding.tsx` returns zero matches.
- `grep "See full catering menu" components/OrderLanding.tsx` returns zero matches.
- `grep -c "href=\"/catering\"" components/OrderLanding.tsx` returns 1 (only the new cross-sell block links there now).
- Manual scroll test confirms section order and visual match to The Pitmaster block.
</verification>

<success_criteria>
- Homepage renders the catering cross-sell block between Individual Items and FAQ, styled like The Pitmaster origin story block, with the new "Feeding a crowd?" copy and a working `/catering` CTA.
- The previously redundant minimal catering section after the mailing list no longer exists.
- No other sections changed; build is green.
</success_criteria>

<output>
After completion, create `.planning/quick/260505-fkj-add-catering-cross-sell-block-to-homepag/260505-fkj-SUMMARY.md`
</output>
