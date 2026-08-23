---
status: partial
phase: 04-checkout-email
source: [04-VERIFICATION.md]
started: 2026-04-17T19:45:00Z
updated: 2026-04-17T19:45:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Opt-in checkbox UI
expected: Checkbox renders unchecked by default, toggles correctly on click, and the POST payload includes the correct `optInMailingList` boolean (false when unchecked, true when checked)
result: [pending]

### 2. End-to-end Supabase write
expected: Complete a sandbox checkout and confirm an `orders` row appears in Supabase with all expected fields: drop_id, pickup_option_id, customer_email, customer_name, square_order_id, square_invoice_id, cart_snapshot JSONB
result: [pending]

## Summary

total: 2
passed: 2
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
