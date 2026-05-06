---
slug: sold-out-capture
status: complete
completed: 2026-05-05
commit: 733199f
---

# Summary: Sold-Out Email Capture

## What was done
Created `components/SoldOutCapture.tsx` — a self-contained inline email capture form. Wired it into `FrozenItemCard` and `PackageCard` to replace the disabled "Sold Out" button when a variation or package has zero stock.

## Files changed
- `components/SoldOutCapture.tsx` — new component (created)
- `components/FrozenItemCard.tsx` — import + conditional render per variation
- `components/PackageCard.tsx` — import + conditional render for package button

## Outcome
When the drop is sold out, every product card now shows a compact `[email] [Notify Me →]` form that submits to `/api/mailing-list`. Converts high-intent dead-end clicks into list subscribers. Addresses Funnel Issue 2 (Priority #1) from the Russell Brunson review.
