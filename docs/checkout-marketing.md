# Checkout marketing consent

Checkout offers an optional checkbox below the invoicing email. It starts
unchecked, reuses that email, and sends `marketingOptIn: true` only when checked.
The endpoint treats every other value as no consent. Invoices and order
confirmation do not depend on marketing consent.

## Configuration

Set server-only `RESEND_API_KEY` (full API access), `RESEND_SEGMENT_ID` (the BBQ
marketing segment), and `RESEND_BBQ_TOPIC_ID`. Create the public BBQ-drop topic
with default subscription `opt_out` so native Resend preferences can manage it.
Select this topic as well as the segment on future BBQ broadcasts. Other
marketing campaigns must use their own topics to respect topic preferences;
a topicless broadcast only honors the global unsubscribe flag.

The checkout integration uses the current Contacts API without requiring the
legacy `RESEND_AUDIENCE_ID`. The existing standalone signup and broadcast routes
are unchanged. No campaign is sent by checkout.

## Subscription behavior

- No checked consent: no Resend reads or writes.
- New contact: normalize email, create in the configured segment and opt into the
  BBQ topic. Omit the global unsubscribe field on create so a competing upsert
  cannot reset an existing global unsubscribe. A duplicate conflict triggers a
  fresh lookup rather than a blind overwrite.
- Existing subscriber: leave profile and unrelated preferences unchanged, add
  only missing BBQ segment membership, and opt into the BBQ topic only if needed.
- Prior global unsubscribe plus fresh consent: read all pages of topic
  preferences, explicitly keep unrelated topics opted out, then opt into BBQ and
  clear the global unsubscribe. The maintainer approved this BBQ-only conversion
  in issue #59. A failed read or topic update never clears global unsubscribe.
- Repeated/concurrent consent requests converge on the same contact, segment,
  and topic. External preference changes are not transactional with checkout;
  there is no provider compare-and-swap or cross-process lock. No background
  retry replays old consent after a later unsubscribe.

## Reliability and ownership

Only after successful Square invoicing does the endpoint register Next.js
`after()` work. It does not await Resend in the checkout response path. Provider
and configuration failures are contained and logged with the request identifier,
without emails, names, credentials, or raw provider errors. Scheduling failure
also leaves the invoiced order successful.

Resend owns contacts, unsubscribe state, segment membership, and topics. There
are no Supabase subscription writes, extra subscriber directory, schema changes,
welcome automation, or durable retries. Deferred work is best effort: a runtime
termination can lose an opt-in. A future durable retry design would need recorded
explicit consent and protection against replaying it after a later unsubscribe.

## Verification

Module tests exercise consent, new/repeat contacts, topic and global opt-outs,
pagination, duplicate/concurrent creates, provider errors, and missing config.
Endpoint tests exercise the real order and marketing modules with external
providers stubbed, including successful invoices despite Resend failures.
Playwright tests exercise checked and unchecked consent through confirmation;
checkout submission is stubbed, and SSR requires an active test drop.
