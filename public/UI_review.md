# UI Review — Big Matt's BBQ
**Site:** https://bigmattsbbq.vercel.app
**Review Date:** 2026-05-02
**Reviewer:** Claude (UI/Accessibility Audit)
**Intended Consumer:** Claude Code (automated fix implementation)

---

## Severity Legend
- 🔴 **Critical** — Broken functionality or invalid HTML; fix immediately
- 🟠 **High** — Accessibility violation or significant UX failure
- 🟡 **Medium** — Noticeable UX degradation or contrast/layout issue
- 🟢 **Low** — Polish, consistency, or semantic improvement

---

## Issue 1 — Mobile Hamburger Menu Not Visible - TODO
**Severity:** 🔴 Critical
**Affected Pages:** All pages
**Viewport:** ≤ ~768px (mobile breakpoints)

### Problem
At mobile viewport widths (e.g. 390px), the desktop nav links correctly disappear but the hamburger/menu toggle button is also invisible. The mobile navigation DOM node exists (`<nav aria-label="Mobile primary">` inside a `<aside>`) and the trigger button exists (`<button aria-label="Open navigation menu">`), but neither is visible. Users cannot navigate to any page other than Home on mobile.

### Root Cause (likely)
The hamburger button likely has a CSS class that hides it at all breakpoints, or the responsive show/hide logic has the desktop and mobile visibility rules swapped or missing.

### Fix
1. Locate the `<button>` with `aria-label="Open navigation menu"` in the header component.
2. Ensure it has a CSS class such as `block md:hidden` (Tailwind) or equivalent — visible on mobile, hidden on desktop.
3. Ensure the desktop `<nav aria-label="Primary">` has `hidden md:flex` or equivalent — hidden on mobile, visible on desktop.
4. Verify the button's click handler toggles the mobile nav open/closed and that the mobile nav panel transitions in correctly.
5. Test at 390px, 430px, and 768px widths.

---

## Issue 2 — Nested `<main>` Elements (Invalid HTML) - TODO
**Severity:** 🔴 Critical
**Affected Pages:** Home page (/)

### Problem
The accessibility tree on the homepage shows a `<main>` element (ref_17) that contains another `<main>` element (ref_18). Nesting `<main>` inside `<main>` is invalid HTML per the HTML5 spec. Screen readers announce the "main" landmark twice or behave unpredictably. Browser landmark navigation breaks.

### Root Cause (likely)
A global layout component (e.g. `Layout.tsx` or `_layout.tsx`) wraps content in `<main>`, and an individual page component (e.g. `index.tsx`) also renders its own `<main>`.

### Fix
1. Search for all `<main>` tags across the codebase.
2. Keep only one `<main>` per page. Typically, the page-level `<main>` is correct and the layout wrapper should use `<div>` instead.
3. Validate with an HTML validator or axe-core after the change.

```jsx
// Before (in Layout component — WRONG):
<main>{children}</main>

// After:
<div id="layout-wrapper">{children}</div>

// Keep <main> in the individual page component only
```

---

## Issue 3 — Excessive Blank Whitespace at Bottom of Every Page - TODO
**Severity:** 🟠 High
**Affected Pages:** All pages

### Problem
Every page has a large black empty section at the bottom (approximately 30–50% of the last viewport height) between the last content block and the footer. This makes the page appear broken or unfinished.

### Root Cause (likely)
A container element has an incorrect `min-height` (e.g. `min-h-screen`) applied to a section or page wrapper that extends the layout beyond the content. Could also be an unfilled CSS Grid row or an unclosed flex column with `flex-grow`.

### Fix
1. Inspect the last section on each page (likely the catering CTA section on Home, or the bio section on About).
2. Look for `min-h-screen`, `h-screen`, `flex-1`, or `grow` on containers that should not fill the full viewport.
3. Remove or scope those height utilities so they only apply when the content needs to fill the viewport (e.g. a true full-screen hero).
4. Check for unclosed CSS Grid templates where a row track has no content.

---

## Issue 4 — FAQ Accordion Has No Keyboard or ARIA Support - TODO
**Severity:** 🟠 High
**Affected Pages:** Home (/), Catering (/catering)

### Problem
The FAQ items render with a ► toggle indicator but the trigger elements are plain `<div>` containers. The accessibility tree shows no `role="button"`, no `aria-expanded`, and no `aria-controls`. Keyboard users cannot discover or operate the accordion. Screen reader users receive no state change feedback.

**WCAG Failure:** 2.1 SC 4.1.2 (Name, Role, Value)

### Fix — Option A (Recommended): Use Native `<details>`/`<summary>`
Replace the custom accordion with native HTML — zero JS required for basic functionality:

```html
<details>
  <summary>How do frozen drops work?</summary>
  <p>Order during the drop, choose your pickup window...</p>
</details>
```

Style `summary` to match the existing visual design and remove the default triangle with `list-style: none` / `::marker { display: none }`.

### Fix — Option B: Custom Accessible Accordion - TODO
If a custom implementation is required:

```jsx
<button
  aria-expanded={isOpen}
  aria-controls={`faq-answer-${id}`}
  onClick={() => setIsOpen(!isOpen)}
>
  {question}
</button>
<div
  id={`faq-answer-${id}`}
  role="region"
  aria-labelledby={`faq-trigger-${id}`}
  hidden={!isOpen}
>
  {answer}
</div>
```

Also add keyboard handler for Enter and Space keys if not using `<button>`.

---

## Issue 5 — Individual Item Product Descriptions Use Raw Dash-Text Instead of Lists - TODO
**Severity:** 🟠 High
**Affected Pages:** Home (/) — Individual Items section

### Problem
Several product cards in the "Individual Items" section use plain text with inline dashes for their content lists, e.g.:
`"- 3 Brisket Packs - 2 Pulled Pork Pack - 1 Bottle Barbecue Sauce"`

This is rendered as a single `<div>` string. By contrast, the package cards above correctly use `<ul>`/`<li>`. This is visually inconsistent and screen-reader-unfriendly.

### Fix
Replace the plain-text descriptions with structured lists, matching the package card pattern:

```jsx
// Before:
<div>- 3 Brisket Packs - 2 Pulled Pork Pack - 1 Bottle Barbecue Sauce</div>

// After:
<ul>
  <li>3 Brisket Packs</li>
  <li>2 Pulled Pork Packs</li>
  <li>1 Bottle Barbecue Sauce</li>
</ul>
```

This likely requires updating the product data source (CMS, JSON, or hardcoded array) to store contents as an array rather than a single string.

---

## Issue 6 — Location Pickup Badges Have No Semantic Context - TODO
**Severity:** 🟡 Medium
**Affected Pages:** Home (/) — Hero section

### Problem
The three pickup location pills (Cache Valley, Utah County, Sandy) are separate `<div>` elements with no accessible grouping or label. A screen reader announces them individually with no context about what they represent.

### Fix
```jsx
// Before:
<div>Cache Valley</div>
<div>Utah County</div>
<div>Sandy</div>

// After:
<ul aria-label="Pickup locations">
  <li>Cache Valley</li>
  <li>Utah County</li>
  <li>Sandy</li>
</ul>
```

Alternatively, wrap in a `<p>` with a visually hidden prefix:
```jsx
<p>
  <span className="sr-only">Pickup locations: </span>
  <span>Cache Valley</span>
  <span>Utah County</span>
  <span>Sandy</span>
</p>
```

---

## Issue 7 — "Regular" Price Label Has Low Contrast and Zero Informational Value - TODO
**Severity:** 🟡 Medium
**Affected Pages:** Home (/) — Individual Items section

### Problem
Each product card displays a muted grey "Regular" label above the price. This label:
1. Likely fails WCAG AA contrast ratio (4.5:1 minimum for normal text) against the dark card background.
2. Provides no useful information when every product shows the same label and there is no sale/compare price present.

Additionally, the "· 0 left" stock count is a child element *inside* the price element in the DOM, causing screen readers to read "Regular $16.00 · 0 left" as one run-on string.

### Fix
1. **Remove the "Regular" label** entirely unless a sale/original price is being displayed alongside it. If a compare-at price is added in the future, re-introduce the label then.
2. **Separate the stock count** into its own element with a clear accessible label:

```jsx
// Before:
<div>Regular</div>
<div>
  $16.00
  <span> · 0 left</span>
</div>

// After:
<p className="price">$16.00</p>
<p aria-live="polite">
  <span aria-label="0 items left in stock">0 left</span>
</p>
```

3. If the "Regular" label must stay, ensure its color meets a 4.5:1 contrast ratio. Use a tool like https://webaim.org/resources/contrastchecker/ to verify.

---

## Issue 8 — Footer Layout is Cluttered and Contains a Duplicate Email CTA - TODO
**Severity:** 🟡 Medium
**Affected Pages:** All pages

### Problem
The footer on every page packs three unrelated items into a single horizontal row:
- Copyright notice (left)
- Email signup form (center)
- "Questions? Email..." contact text (right)

These have no visual separation. The email signup is also a duplicate of the "Be first to know" email section immediately above the footer on the Home page, creating redundancy and diluting both CTAs.

### Fix
1. **Restructure the footer** into a proper multi-column or stacked layout:
```
[Logo + Copyright]    [Quick Links]    [Stay in Touch / Email signup]
```
2. **Remove the email form from the footer** if the dedicated "Be first to know" section above the footer already serves this purpose. Keep only one signup entry point per page.
3. Add a subtle `<hr>` or border-top to visually separate the footer from the page content.
4. On mobile, the footer should stack vertically with adequate padding between each group.

---

## Issue 9 — Inconsistent Email Addresses Across the Site - DONE
**Severity:** 🟡 Medium
**Affected Pages:** Contact (/contact), Catering (/catering), Footer (all pages)

### Problem
Three different email references exist across the site:
- **Contact page, General Inquiries:** `bigmattsbarbecue@gmail.com`
- **Contact page, Catering:** `catering@bigmattsbbq.com`
- **Catering page CTA button:** links to `bigmattsbarbecue@gmail.com`
- **Footer (all pages):** `bigmattsbarbecue@gmail.com`

The catering-specific address (`catering@bigmattsbbq.com`) appears only on the Contact page. All other catering touchpoints use the Gmail address.

### Fix
1. Decide on the canonical email(s) and store them in a single config/constants file:
```js
// config/contact.js (or similar)
export const CONTACT_EMAIL = 'bigmattsbarbecue@gmail.com';
export const CATERING_EMAIL = 'catering@bigmattsbbq.com';
```
2. Reference these constants everywhere instead of hardcoding email strings.
3. Ensure the Catering page CTA uses `CATERING_EMAIL` consistently.
4. Verify both inboxes are active and monitored.

---

## Issue 10 — ~~About Page Bio Paragraph Has No Heading or Section Wrapper~~ - DONE
**Severity:** 🟢 Low
**Affected Pages:** About (/about)

### Problem
At the bottom of the About page, a paragraph about Matt Gregory ("Matt Gregory grew up in Preston, Idaho...") exists as a plain `<div>` with no heading, no `<section>`, and no semantic wrapper. It does not appear in the page's heading outline. Screen reader users navigating by headings will skip it entirely.

### Fix
Wrap the bio in a section with an appropriate heading:

```jsx
<section aria-labelledby="about-matt-heading">
  <h2 id="about-matt-heading">The Pitmaster</h2>
  <p>Matt Gregory grew up in Preston, Idaho...</p>
</section>
```

Ensure the heading level (`h2`) is consistent with the rest of the page's heading hierarchy.

---

## Issue 11 — Section Label Badges Use `<div>` Instead of Semantic Inline Elements - TODO
**Severity:** 🟢 Low
**Affected Pages:** All pages

### Problem
Eyebrow/label elements like "THE STORY," "HOW IT STARTED," "THE CRAFT," "FAQS," "MAY 2026 DROP," "MOST POPULAR," "BUILD YOUR OWN" etc. are all rendered as `<div>` (generic block) elements. These carry no semantic meaning for assistive technology.

The "MAY 2026 DROP" badge in particular could benefit from a `<time>` element. The "MOST POPULAR" badge on the Backyard Host card should be readable in context by screen readers.

### Fix
```jsx
// Generic section eyebrow label:
// Before: <div className="eyebrow">THE STORY</div>
// After:  <p className="eyebrow">The Story</p>

// Date badge:
// Before: <div>MAY 2026 DROP</div>
// After:  <time dateTime="2026-05">May 2026 Drop</time>

// "Most Popular" badge — ensure it's inside the <article> before the heading:
<article>
  <p aria-label="Most popular item" className="badge">Most Popular</p>
  <h2>Backyard Host</h2>
  ...
</article>
```

---

## Issue 12 — Catering Page Content Too Narrow on Wide Viewports - TODO
**Severity:** 🟢 Low
**Affected Pages:** Catering (/catering)

### Problem
On a 1280px viewport, the catering page content sits in a narrow single column (approximately 600px wide) centered on the page, leaving large empty margins on both sides. This feels like a mobile layout on a desktop screen and makes the pricing tiers harder to compare at a glance.

### Fix
1. Increase the content container's `max-width`. If using Tailwind, try `max-w-4xl` (896px) or `max-w-5xl` (1024px) instead of `max-w-2xl`/`max-w-xl`.
2. Consider a two-column layout for the pricing tier cards on desktop (three tiers per row already works, but the surrounding prose could expand to fill the space better).
3. Ensure the `max-w` is paired with `mx-auto` and appropriate horizontal padding (`px-4` or `px-6`).

---

## Summary

| # | Issue | Severity | Pages Affected |
|---|-------|----------|----------------|
| 1 | Mobile hamburger menu not visible | 🔴 Critical | All |
| 2 | Nested `<main>` elements | 🔴 Critical | Home |
| 3 | Excessive blank whitespace at page bottom | 🟠 High | All |
| 4 | FAQ accordion missing keyboard/ARIA support | 🟠 High | Home, Catering |
| 5 | Individual item descriptions use dash-text not `<ul>` | 🟠 High | Home |
| 6 | Location badges lack semantic grouping | 🟡 Medium | Home |
| 7 | "Regular" label — low contrast + no value | 🟡 Medium | Home |
| 8 | Footer cluttered + duplicate email CTA | 🟡 Medium | All |
| 9 | ~~Inconsistent email addresses~~ | 🟡 Medium | Contact, Catering, Footer |
| 10 | ~~About page bio missing heading/section~~ | 🟢 Low | About |
| 11 | Section eyebrow labels use `<div>` not semantic elements | 🟢 Low | All |
| 12 | Catering content too narrow on desktop | 🟢 Low | Catering |

---

*This review was generated by automated browser inspection and accessibility tree analysis. Fixes should be validated with axe-core, NVDA/VoiceOver screen reader testing, and manual keyboard navigation after implementation.*
