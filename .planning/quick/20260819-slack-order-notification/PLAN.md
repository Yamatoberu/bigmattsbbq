---
slug: slack-order-notification
title: Add Slack order notification to checkout route
date: 2026-08-19
status: in-progress
---

# Add Slack Order Notification

After `publishInvoice` succeeds in `app/api/checkout/route.ts`, fire a fire-and-forget POST to `SLACK_ORDERS_WEBHOOK_URL` with a plain text message.

## Message Format

```
New Order — Big Matt's BBQ

Customer: {firstName} {lastName} · {email}
Order:
  • {readable item name} × {quantity}
  • ...
Pickup: {location_label} — {pickupDateLabel}
Order ID: {orderId}
```

## Tasks

### Task 1 — Add `notifySlackNewOrder` helper to checkout route

Add a module-scoped helper function `notifySlackNewOrder` inside `app/api/checkout/route.ts` that:
- Reads `process.env.SLACK_ORDERS_WEBHOOK_URL`; returns immediately if not set
- Accepts `{ customer, cart, locationLabel, pickupDateLabel, orderId }` params
- Maps `productName` snake_case to readable labels:
  - `pulled_pork` → `Pulled Pork`
  - `brisket` → `Brisket`
  - `sauce` → `Sauce`
  - `family_night` → `Family Night Bundle`
  - `backyard_host` → `Backyard Host Bundle`
  - `freezer_filler` → `Freezer Filler Bundle`
- Skips cart items with no `productName`
- Builds the plain text message
- POSTs to the webhook URL via `fetch()` with `Content-Type: application/json` and `{ text: message }`
- On failure: logs a warning via `console.warn`, never throws

### Task 2 — Call `notifySlackNewOrder` after `publishInvoice`

After the `await publishInvoice(...)` call and before the `return NextResponse.json(...)`, add:

```ts
notifySlackNewOrder({
  customer,
  cart: parsed.data.cart,
  locationLabel: pickupRow.location_label,
  pickupDateLabel,
  orderId: orderId ?? ""
});
```

No `await` — fire and forget.

### Task 3 — Update `.env.example`

Add below the existing Resend block:

```
# Slack notifications
# SLACK_ORDERS_WEBHOOK_URL: Incoming Webhook URL for order notifications. Get from api.slack.com/apps.
# Optional — if not set, Slack notifications are silently skipped.
SLACK_ORDERS_WEBHOOK_URL=
```

## Commit Message

```
feat(checkout): add fire-and-forget Slack notification on new order
```
