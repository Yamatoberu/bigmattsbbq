---
slug: slack-order-notification
status: complete
completed: 2026-08-19
commit: 7c3918a
---

# Summary: Slack Order Notification

## What was done

Added a fire-and-forget Slack notification to the checkout route. After `publishInvoice` succeeds, a plain text message is POSTed to `SLACK_ORDERS_WEBHOOK_URL`. If the env var is not set, the call is silently skipped. Failures are logged via `console.warn` and never surface to the customer.

## Files changed

- `app/api/checkout/route.ts` — added `PRODUCT_NAME_LABELS` map and `notifySlackNewOrder()` helper; wired call after `publishInvoice`
- `.env.example` — documented `SLACK_ORDERS_WEBHOOK_URL`

## Message format

```
New Order — Big Matt's BBQ

Customer: {firstName} {lastName} · {email}
Order:
  • {readable item name} × {quantity}
Pickup: {location_label} — {pickupDateLabel}
Order ID: {orderId}
```

## Test results

84/84 tests green. No new tests required (fire-and-forget; no return value to assert).
