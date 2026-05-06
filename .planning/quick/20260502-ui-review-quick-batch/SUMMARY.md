---
status: complete
---

Resolved Issues 2, 5, 6, 7, 9, and 11 from UI_review.md in a single commit (4b0a938).

- Issue 2: Both `<main>` wrappers in OrderLanding changed to `<div>` — layout.tsx provides the sole `<main>`
- Issue 5: FrozenItemCard now detects dash-prefixed descriptions and renders them as `<ul>/<li>` lists
- Issue 6: Pickup location badges wrapped in `<ul aria-label="Pickup locations">` with `<li>` items
- Issue 7: "Regular" variation label suppressed; stock count moved to its own `<p>` with `aria-label`
- Issue 9: Email addresses consolidated via CONTACT_EMAIL/CATERING_EMAIL constants in lib/config (pre-existing changes committed here)
- Issue 11: Testimonial attribution `<div>` changed to `<p>`; estimated-total `<div>` changed to `<p>`
