---
slug: sold-out-capture
created: 2026-05-05
status: in-progress
---

# Quick Task: Sold-Out Email Capture

Add an inline email capture form that replaces the disabled "Sold Out" button in FrozenItemCard and PackageCard. When a variation or package is sold out, show a compact `[email] [Notify Me →]` form that submits to the existing `/api/mailing-list` endpoint. Each card instance manages its own form state independently.

## Tasks

### 1. Create `components/SoldOutCapture.tsx`
Self-contained component with local `email`/`state` ("idle" | "submitting" | "success" | "error").
- Compact inline layout: email input + submit button side-by-side
- Submit to `POST /api/mailing-list` with `{ email }`
- Success state: replace form with confirmation message
- Error state: show brief error text below form
- Match existing input/button class patterns from MailingListSection

### 2. Modify `components/FrozenItemCard.tsx`
In the variation loop, when `isSoldOut` is true:
- Replace the disabled `<button>` with `<SoldOutCapture />`
- No other changes to the component

### 3. Modify `components/PackageCard.tsx`
When `soldOut` is true:
- Replace the disabled `<button>` with `<SoldOutCapture />`
- No other changes to the component

### 4. Commit
Single atomic commit covering all three files.
