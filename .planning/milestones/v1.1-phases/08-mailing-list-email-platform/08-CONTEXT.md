# Phase 8: Mailing List & Email Platform — Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate the mailing list from Supabase to Resend Contacts/Audiences as the source of truth, upgrade the broadcast from a sequential per-subscriber loop to Resend's native Broadcasts API, convert email templates to React Email components, and remove the custom JWT-based unsubscribe flow in favor of Resend's native List-Unsubscribe handling.

MAIL-01 (branded order confirmation email) remains deferred — not in scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### Resend Contacts as Subscriber Source of Truth

- **D-01:** Resend Contacts (within a Resend Audience) becomes the source of truth for mailing list subscribers. Supabase `mailing_list` table is archived — left read-only, not deleted.
- **D-02:** No migration of existing Supabase subscribers to Resend. Start fresh in Resend — only new signups go into Resend Contacts.
- **D-03:** `/api/mailing-list` POST route is updated to call the Resend Contacts API (`resend.contacts.create()`) instead of inserting into Supabase. Supabase insert is removed.
- **D-04:** A `RESEND_AUDIENCE_ID` env var is added — the Resend Audience ID to associate new contacts with. Add to `.env.example`.

### Broadcast Upgrade

- **D-05:** `/api/admin/broadcast` route is updated to call Resend's native Broadcasts API in a single API call (no more `for` loop sending one email at a time).
- **D-06:** `email_logs` writes are dropped from the broadcast flow. Resend's dashboard is the audit trail for broadcast sends.

### Email Template Format

- **D-07:** React Email (`@react-email/components` and `@react-email/render`) is adopted for all email templates in this phase. Install both packages.
- **D-08:** The broadcast drop notification email is converted to a React Email `.tsx` component, rendered to HTML string before passing to the Resend API.

### Unsubscribe Strategy

- **D-09:** The custom JWT unsubscribe flow is removed entirely. Resend Broadcasts auto-include a `List-Unsubscribe` header that Resend handles natively.
- **D-10:** Delete `lib/unsubscribeToken.ts`, `app/api/unsubscribe/route.ts`, and `app/unsubscribe/page.tsx`.
- **D-11:** Remove the `jose` package from `package.json` — it is only used by `lib/unsubscribeToken.ts` (verified).
- **D-12:** Remove `UNSUBSCRIBE_SECRET` from `.env.example` and add a comment that unsubscribes are now handled natively by Resend.
- **D-13:** `sanitize-html` can also be removed if HTML inputs are replaced by structured React Email props — researcher should verify this during implementation planning.

### Out of Scope

- MAIL-01 — Branded order confirmation email remains deferred (D-10/D-23 from Phases 4/5).
- Admin UI for mailing list management or broadcast triggering — future milestone.
- Migrating existing Supabase subscribers — start fresh decision (D-02).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Prior Decisions
- `.planning/PROJECT.md` — Project constraints, architecture decisions, deferred items
- `.planning/phases/05-content-mailing-list/05-CONTEXT.md` — Phase 5 decisions that established the current mailing list and broadcast infrastructure (D-11 through D-18)
- `.planning/phases/04-checkout-email/04-CONTEXT.md` — D-10 original MAIL-01 deferral rationale

### Files Being Modified or Deleted
- `app/api/mailing-list/route.ts` — Subscribe route; currently inserts to Supabase, needs to call Resend Contacts API
- `app/api/admin/broadcast/route.ts` — Broadcast route; sequential loop needs replacement with Resend native Broadcasts
- `app/api/unsubscribe/route.ts` — TO BE DELETED (D-10)
- `app/unsubscribe/page.tsx` — TO BE DELETED (D-10)
- `lib/unsubscribeToken.ts` — TO BE DELETED (D-10, D-11)

### Environment
- `.env.example` — Remove `UNSUBSCRIBE_SECRET`, add `RESEND_AUDIENCE_ID`

### Schema (for understanding what's being archived)
- `supabase/migrations/0001_foundation.sql` — `mailing_list` and `email_logs` table definitions; understand what's being left read-only

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/api/admin/broadcast/route.ts` — Bearer token auth pattern (`authorize()` function) stays; only the send logic changes
- `lib/supabase.ts` — Supabase client; no longer needed for mailing list, but `email_logs` table may still be referenced elsewhere
- `lib/logger.ts` — `logError()` pattern continues in all route handlers
- `lib/env.ts` — Add `RESEND_AUDIENCE_ID` as a required env var here

### Established Patterns
- Zod `safeParse` at API boundaries — keep in subscribe and broadcast routes
- `try/catch` + `logError` + `requestId` in all route handlers
- Named exports everywhere in `lib/` and `components/`
- `BROADCAST_SECRET` Bearer token auth on `/api/admin/broadcast` — keep as-is

### Integration Points
- `components/MailingListSection.tsx` — Calls `POST /api/mailing-list`; no change needed if the route's external interface stays the same (same request/response shape)
- `components/Footer.tsx` — Inline mailing list signup; same as above
- `components/CheckoutClient.tsx` — Mailing list opt-in at checkout; also calls `POST /api/mailing-list`; no change needed
- `package.json` — Add `@react-email/components`, `@react-email/render`; remove `jose`; check `sanitize-html` removal eligibility

### Removal Checklist
- `jose` — only imported in `lib/unsubscribeToken.ts` (verified via grep)
- `UNSUBSCRIBE_SECRET` — only referenced in `lib/unsubscribeToken.ts` and `.env.example`
- `sanitize-html` — currently in `/api/admin/broadcast/route.ts`; check if React Email approach removes need

</code_context>

<specifics>
## Specific Ideas

- Resend native `List-Unsubscribe` is the chosen unsubscribe mechanism — no custom /unsubscribe page
- Resend dashboard is the audit trail — `email_logs` Supabase writes are dropped for broadcast
- Start fresh in Resend (no migration script), Supabase mailing_list table archived not deleted

</specifics>

<deferred>
## Deferred Ideas

- MAIL-01: Branded Resend order confirmation email — explicitly deferred again; Square invoice email remains the customer confirmation
- Admin UI for managing mailing list (view subscribers, trigger broadcasts, check delivery) — Admin Dashboard (future milestone)
- Migrating existing Supabase subscribers to Resend — user chose to start fresh

</deferred>

---

*Phase: 08-mailing-list-email-platform*
*Context gathered: 2026-05-07*
