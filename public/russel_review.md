# Russell Brunson Sales Funnel Review — Big Matt's BBQ
> Analyzed: May 2, 2026  
> Site: https://bigmattsbbq.vercel.app  
> Reviewer POV: Russell Brunson / ClickFunnels framework

---

## Executive Summary

Big Matt's BBQ has strong brand aesthetics, a compelling origin story, and a legitimately clever drop model that creates natural scarcity. However, the site currently functions as a **menu/storefront** rather than a **sales funnel**. The persuasion work that should happen between a cold visitor landing and a purchase decision is largely absent. The fixes below are ordered by conversion impact.

---

##  Issue 1: The Hero Section Has No Hook - DONE

### Problem
The headline "Orders are open!" is a status notification, not a sales hook. A first-time visitor landing on the page has no idea what Big Matt's BBQ is, who it's for, or why they should care — before being asked to choose a package. The above-the-fold section answers none of the three critical questions a funnel headline must answer:
1. Who is this for?
2. What will they get?
3. Why now / why should they care?

There is also no sensory or emotional language — nothing that makes the visitor *feel* the product before seeing it. The location badges (Cache Valley, Utah County, Sandy) add useful context but do nothing to sell the dream outcome.

### Recommended Solution
Rewrite the hero headline and add a supporting subheadline. Place these directly in the hero section above the product grid. Example direction:

```
Headline: Real Pit-Smoked BBQ — Straight to Your Freezer.
Subheadline: Brisket and pulled pork smoked low and slow for 12–14 hours, vacuum-sealed at peak flavor, and ready to heat any night of the week. No restaurant. No grill required.
```

**Implementation Notes:**
- File: `app/page.tsx` (or equivalent homepage component)
- Replace or augment the `<h1>` / hero region content
- Keep the "Orders close" deadline badge — it's working
- Add 2–3 lines of desire-building copy *before* the "Choose Your Drop" section header

---

## Issue 2: No Email Capture at the Point of Maximum Interest (Sold-Out Dead End) - DONE

### Problem
Every "Sold Out" button is a dead end. When a visitor interacts with a sold-out product — which is the state of ALL products at the time of this review — they receive zero engagement, no retention mechanism, and no path forward. These visitors are **warm, high-intent leads** who have already signaled they want to buy. They are being silently discarded.

The two email opt-in forms that do exist (one mid-page, one in the footer) are low-visibility, low-intent placements that capture cold traffic rather than hot traffic.

### Recommended Solution
Trigger an email capture modal or inline opt-in at the moment a visitor clicks a "Sold Out" button. This converts a dead-end interaction into a list-building event.

**Option A — Modal on Sold-Out click:**
```
Heading: "This drop is sold out."
Subheading: "Join the list and you'll be the first to know when the next drop opens."
Input: Email address
Button: "Notify Me for the Next Drop"
```

**Option B — Replace Sold-Out button with inline opt-in:**
```
When stock = 0, swap the "Add to Cart" / "Sold Out" button for a compact inline form:
[your@email.com] [Notify Me →]
```

**Implementation Notes:**
- Component to create: `components/SoldOutCapture.tsx` (modal) or modify existing product card component
- Trigger: `onClick` of any disabled/sold-out button
- Store emails to the same list as the existing "Notify Me" form
- Consider tagging these subscribers with the specific product they tried to buy (useful for segmentation)
- The existing mid-page email form (`region[ref_151]`) can remain as a secondary capture

---

## Issue 3: No Pre-Sell Copy Between the Hero and the Product Grid - DONE

### Problem
The funnel jumps directly from "Orders are open!" to a product grid with no emotional bridge. There is no copy that:
- Describes what the product experience feels like
- Establishes why frozen BBQ from Big Matt's is different from anything else
- Sells the dream outcome before showing the price

Visitors who don't already know and trust Big Matt's BBQ are being asked to make a buying decision without being sold to first. A funnel pre-sells *desire* before presenting the offer.

### Recommended Solution
Add a short pre-sell block (3–5 sentences) between the hero section and the "Choose Your Drop" product grid.

**Example copy direction:**
```
Every batch starts the night before. Pulled pork and brisket go on the smoker at midnight — 
cherry, oak, and pecan wood — and come off 12 to 14 hours later. Vacuum-sealed at peak 
flavor and frozen within hours of leaving the pit. The result: a Tuesday dinner that 
tastes like a weekend cookout. No restaurant markup. No grill. Just heat and eat.
```

**Implementation Notes:**
- File: homepage component, between the hero region and the product packages region
- Keep it short — 3–5 sentences max
- Use sensory/visual language: smoke, wood, heat, aroma, texture
- This is also a good location to surface one strong testimonial as a pull quote

---

## Issue 4: Social Proof Placement and Rendering - DONE

### Problem
The testimonials section ("Trusted by BBQ Lovers Across Utah") appears after the product grid, below the individual items section. This means social proof is doing zero work at the conversion decision point. Additionally, the testimonial cards were not rendering visually during review — appearing as an empty section — suggesting a possible CSS or hydration issue.

Social proof should surround and support the buy decision, not come after it.

### Recommended Solution

**Fix A — Rendering Bug:**
- Inspect the testimonial carousel/card component for rendering issues
- Check for JavaScript-dependent rendering that may fail on first paint
- Consider converting to static HTML/CSS if the dynamic render is unreliable

**Fix B — Repositioning:**
- Move at least one testimonial (or a condensed testimonial strip) to the hero section or immediately before the "Choose Your Drop" header
- A star-rating strip like: ★★★★★ *"Brisket that tastes like it came straight off the smoker." — Jordan P.* placed near the top builds immediate trust
- The full testimonial grid can remain lower on the page as a secondary trust block

**Implementation Notes:**
- File: homepage component
- Consider a static star-strip component for above-the-fold: `components/TestimonialStrip.tsx`
- The four existing reviews (Jordan P., Tara M., Leo R., Amelia S.) are solid — keep them, just move them up

---

## Issue 5: No Value Ladder / Customer Ascension Path - TODO

### Problem
The site has two disconnected revenue streams — frozen drops and catering — with no bridge between them. There is no mechanism to:
- Convert a one-time frozen drop customer into a recurring buyer
- Ascend a frozen drop customer to a catering inquiry
- Offer a higher-tier product at the point of purchase (upsell/order bump)

Brunson's Value Ladder framework requires a clear path: low-cost entry → mid-tier offer → high-ticket offer, with each step naturally leading to the next. Currently the frozen drop ($13–$132) and catering ($15–$21/person) exist in silos.

### Recommended Solution

**Short-Term — Add a catering cross-sell block on the homepage:**
After the product grid, add a section that bridges the two offers. Something like:

```
Heading: "Feeding a crowd?"
Copy: "Big Matt's BBQ caters events from backyard dinners to company lunches. Simple per-person pricing, no stress."
CTA: "See Catering Packages →"
```
*(Note: A version of this already exists in the current footer region — it just needs to be more prominent and visually developed.)*

**Medium-Term — Add a drop subscription / VIP early-access tier:**
```
Concept: "Drop Club — get early access to every drop before it opens to the public"
Price point: Free (email list) or paid ($5–10/month for guaranteed allocation)
Benefit: Converts episodic buyers into recurring revenue; builds predictable demand
```

**Medium-Term — Add a post-purchase upsell:**
At checkout or order confirmation, offer an add-on:
```
"Add an extra sauce bottle for $4" or "Add a pulled pork pack for $13"
```

**Implementation Notes:**
- The catering cross-sell is a homepage component change — low effort, high value
- The Drop Club would require a subscription/membership integration (or a simple paid Substack/email tier as an MVP)
- Post-purchase upsell depends on checkout implementation

---

## Issue 6: The Catering Page Sells with Price, Not Desire - TODO

### Problem
The Catering page opens with the title "Catering," a single line of subtext, and an "Email for Catering" button — then immediately presents a pricing menu. There is no:
- Emotional hook or dream-outcome headline
- Credibility/experience statement near the top
- Story of past successful events (weddings, rodeos, family reunions are mentioned on the About page but never here)
- Answer to the visitor's primary anxiety: *"Can I trust a one-man operation to deliver for my event?"*

The About page contains the proof and story that should be on the Catering page. The Catering page gets the traffic but not the persuasion.

### Recommended Solution
Restructure the Catering page to follow: Hook → Trust → Offer → CTA.

**Proposed page structure:**

```
1. Hero Headline: 
   "Your guests rave about the food. You stress about nothing."

2. Supporting copy (2–3 sentences):
   "Big Matt's BBQ has catered weddings, family reunions, rodeos, and corporate lunches 
   across Utah. One point of contact, clear per-person pricing, and BBQ cooked fresh 
   the day of your event."

3. Social proof / credibility signal:
   A single strong testimonial from a catering client, or a list of event types served.

4. THEN the pricing packages (existing content is good — keep it)

5. FAQ section (existing content is good — keep it)

6. Closing CTA: "Email for Catering" button (already exists — just reinforce it)
```

**Implementation Notes:**
- File: `app/catering/page.tsx` (or equivalent)
- The origin story from `/about` should be referenced or partially mirrored here
- Consider adding a catering-specific testimonial if one is available

---

## Issue 7: No Live Countdown Timer - DONE

### Problem
The deadline badge ("Orders close May 15, 2026 at 11:59 PM") is static text. Static deadlines create some urgency, but a live countdown clock creates *felt* urgency. Moving numbers trigger a loss-aversion response that static text does not.

### Recommended Solution
Replace or augment the static deadline badge with a live countdown timer component in the hero section.

**Implementation Notes:**
- Create a `components/CountdownTimer.tsx` component
- Props: `deadline` (ISO date string), e.g. `"2026-05-15T23:59:00"`
- Display format: `X days, X hours, X minutes, X seconds`
- When the drop is closed / no active drop, hide the timer or replace with "Next drop coming soon — join the list"
- Keep the existing date badge as a fallback for non-JS environments

---

## Issue 8: About Page Story is Isolated and Underused - DONE

### Problem
The About page contains the single most persuasive piece of content on the entire site — a complete origin story (BBQ Pitmasters → Covid hobby → friends paying → catering events → frozen drops). This story builds trust, explains the product model, and humanizes the brand. It is buried on a nav page that most visitors will never click.

In funnel design, your origin story should be woven into the main conversion path, not siloed behind a nav link.

### Recommended Solution
Surface the story on the homepage and the catering page in abbreviated form.

**On the homepage** — add a short "Who is Big Matt?" block between the FAQ and the email opt-in section:
```
Heading: "One smoker. Twelve-hour cooks. Real BBQ."
Copy (2–3 sentences): The condensed origin story — started as a hobby during Covid, 
turned into catering, turned into frozen drops. One-man operation out of Springville, Utah.
```

**On the catering page** — use 1–2 sentences of the story in the hero section opener (see Issue 6 above).

**Implementation Notes:**
- Do not simply link to the About page — inline the condensed story where it creates trust at the conversion point
- The full About page content is excellent as-is; this is about amplifying it, not replacing it

---

## Summary: Prioritized Fix List

| Status | Priority | Issue | Effort | Impact |
|--------|----------|-------|--------|--------|
| ✓ Done | 1 | Sold-Out email capture (Issue 2) | Medium | Very High |
| ✓ Done | 2 | Hero headline rewrite (Issue 1) | Low | High |
| ✓ Done | 3 | Pre-sell copy block before product grid (Issue 3) | Low | High |
| ✓ Done | 4 | Social proof rendering fix + repositioning (Issue 4) | Low–Medium | High |
| ✓ Done | 5 | Live countdown timer (Issue 7) | Low | Medium |
| TODO | 6 | Catering page restructure (Issue 6) | Low | Medium |
| TODO | 7 | Homepage catering cross-sell block (Issue 5) | Low | Medium |
| ✓ Done | 8 | Inline origin story on homepage (Issue 8) | Low | Medium |
| TODO | 9 | Value ladder / Drop Club / upsell (Issue 5) | High | Very High (long-term) |

---

*Analysis based on Russell Brunson's funnel framework: Hook → Story → Offer, Value Ladder, and Traffic/Conversion principles as described in DotCom Secrets and Expert Secrets.*
