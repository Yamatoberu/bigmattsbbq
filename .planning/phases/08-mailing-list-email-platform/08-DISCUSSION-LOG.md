# Phase 8: Mailing List & Email Platform — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 08-mailing-list-email-platform
**Areas discussed:** Resend Contacts adoption, Email template format, Unsubscribe strategy

---

## Phase Promotion

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, add as Phase 8 | Promote backlog item to Phase 8 in ROADMAP.md and continue | ✓ |
| Yes, but adjust scope first | Define scope before adding to roadmap | |
| Just discuss, skip roadmap | Have conversation without formally adding | |

**User's choice:** Yes, add as Phase 8
**Notes:** Phase was in backlog as "Mailing List / Email Management (v2.0 candidate)". User had set up Resend account and wanted to leverage it.

---

## Resend Contacts Adoption

### Sub-question: Subscriber list location

| Option | Description | Selected |
|--------|-------------|----------|
| Migrate to Resend Contacts | Resend becomes source of truth; subscribe/unsubscribe hits Resend API; broadcast is one native call | ✓ |
| Dual-write (Supabase + Resend) | Supabase stays as record of truth; new subscribers sync to Resend Contacts | |
| Supabase only, Batch API upgrade | Keep mailing_list in Supabase, replace sequential loop with resend.batch.send() | |

**User's choice:** Migrate to Resend Contacts

### Sub-question: Existing subscriber migration

| Option | Description | Selected |
|--------|-------------|----------|
| Migrate them to Resend | One-time script to read Supabase subscribers and create Resend Contacts | |
| Start fresh in Resend, archive Supabase data | No migration; new signups go to Resend only; Supabase table archived | ✓ |

**User's choice:** Start fresh in Resend, archive Supabase data

### Sub-question: Email audit trail

| Option | Description | Selected |
|--------|-------------|----------|
| Rely on Resend dashboard | Drop Supabase email_logs writes for broadcast; Resend analytics is the audit trail | ✓ |
| Keep email_logs in Supabase | Log broadcast event (broadcast-level) to Supabase; one row per broadcast | |

**User's choice:** Rely on Resend dashboard

---

## Email Template Format

| Option | Description | Selected |
|--------|-------------|----------|
| React Email components | @react-email/components + @react-email/render; type-safe, browser-previewable templates | ✓ |
| Keep raw HTML strings | Continue with template literals and sanitize-html; no new dependency | |

**User's choice:** React Email components

---

## Unsubscribe Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Keep JWT tokens, retarget to Resend Contacts | /unsubscribe page stays; JWT verified; calls Resend Contacts API to set unsubscribed | |
| Resend native unsubscribe (drop JWT flow) | Resend Broadcasts auto-include List-Unsubscribe; remove JWT token flow entirely | ✓ |

**User's choice:** Resend native unsubscribe (drop JWT flow)
**Notes:** jose package is only imported by lib/unsubscribeToken.ts (verified via grep) — safe to remove entirely.

---

## Areas Not Discussed

- **MAIL-01 order confirmation** — User explicitly skipped this area. Still deferred; Square invoice email remains the customer confirmation.

## Claude's Discretion

- Whether `sanitize-html` can be removed when using React Email (researcher to verify during planning)
- React Email component structure and brand styling for the broadcast template
- How `RESEND_AUDIENCE_ID` is documented in `.env.example`

## Deferred Ideas

- MAIL-01: Branded Resend order confirmation email — still deferred from Phases 4/5
- Admin UI for managing mailing list (view subscribers, trigger broadcasts, delivery stats) — Admin Dashboard milestone
- Migrating existing Supabase subscribers — user chose fresh start
