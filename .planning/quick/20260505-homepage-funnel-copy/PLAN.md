---
slug: homepage-funnel-copy
title: Homepage Funnel Copy — Issues 1, 3, 8
date: 2026-05-05
status: pending
---

# Homepage Funnel Copy — Issues 1, 3, 8

Apply three copy-only changes to `components/OrderLanding.tsx` to address Issues 1, 3, and 8 from the Russell Brunson sales funnel review.

All changes are to the **active drop state** of `OrderLanding` (the `return` block starting at line 128, not the "no active drop" fallback state).

---

## Task 1 — Rewrite the Hero Headline (Issue 1)

**File:** `components/OrderLanding.tsx`
**Location:** Lines 140–142 — the `<h1>` inside the hero `<section>` (lines 130–149)

**Current:**
```tsx
<h1 className="mt-4 text-3xl font-semibold leading-tight md:text-5xl" style={{ fontFamily: "var(--font-display)" }}>
Orders are open!
          </h1>
```

**Change:** Replace the `<h1>` text with a desire-building headline, and add a `<p>` subheadline immediately after it (before the location badges `<ul>`).

**New content:**
```tsx
<h1 className="mt-4 text-3xl font-semibold leading-tight md:text-5xl" style={{ fontFamily: "var(--font-display)" }}>
  Real Pit-Smoked BBQ —<br className="hidden sm:block" /> Straight to Your Freezer.
</h1>
<p className="mt-3 text-base text-smoke-700 md:text-lg">
  Brisket and pulled pork smoked low and slow for 12–14 hours, vacuum-sealed at peak flavor, and ready to heat any night of the week.
</p>
```

The location badges `<ul>` follows unchanged. The deadline badge above the `<h1>` is kept as-is.

---

## Task 2 — Add Pre-Sell Copy Block (Issue 3)

**File:** `components/OrderLanding.tsx`
**Location:** Between the closing `</section>` of the hero (line 149) and the opening `<section id="order"` of the product grid (line 151).

**Insert a new section:**
```tsx
<section className="section-spacing bg-[#120c09]">
  <div className="mx-auto max-w-2xl text-center">
    <p className="text-base leading-relaxed text-smoke-700 md:text-lg">
      Every batch starts the night before. Pulled pork and brisket go on the smoker around midnight — cherry, oak, and pecan wood — and come off 12 to 14 hours later. Vacuum-sealed at peak flavor and frozen within hours of leaving the pit. The result: a Tuesday dinner that tastes like a weekend cookout. No restaurant markup. No grill. Just heat and eat.
    </p>
  </div>
</section>
```

---

## Task 3 — Add Origin Story Block (Issue 8)

**File:** `components/OrderLanding.tsx`
**Location:** Between the closing `</section>` of the FAQ section (line 250) and `<MailingListSection />` (line 252).

**Insert a new section:**
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
      Big Matt&apos;s BBQ started as a Covid hobby — watching <em>BBQ Pitmasters</em>, then cooking
      for friends, then requests to pay for it. One thing led to another: catering events, family
      reunions, rodeos. Eventually, frozen drops. One-man operation out of Springville, Utah,
      cooking every batch low and slow with no shortcuts.
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

---

## Execution Order

1. Task 1 (hero `<h1>` + subheadline)
2. Task 2 (pre-sell block, inserted after hero section)
3. Task 3 (origin story block, inserted before `<MailingListSection />`)

All three changes are in the same file. No new components. No new imports needed. Commit all three as a single atomic commit.

## Commit Message

```
feat(homepage): add funnel copy — hero hook, pre-sell block, origin story

Implements Issues 1, 3, and 8 from the Russell Brunson sales funnel
review: rewrites the hero headline to answer who/what/why, adds a
pre-sell sensory copy block before the product grid, and surfaces a
condensed origin story above the mailing list section.
```
