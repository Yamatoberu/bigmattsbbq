# Phase 8: Mailing List & Email Platform — Research

**Researched:** 2026-05-07
**Domain:** Resend Contacts API, Resend Broadcasts API, React Email
**Confidence:** HIGH

## Summary

Phase 8 migrates the subscriber list from Supabase to Resend Contacts, upgrades the broadcast flow from a sequential per-subscriber for-loop to Resend's native Broadcasts API, converts the drop notification email to a React Email component, and removes the custom JWT unsubscribe flow entirely.

The Resend SDK installed in the project (`resend@6.12.2`) already contains the Contacts and Broadcasts APIs. No major SDK upgrade is needed. React Email packages (`@react-email/components@1.0.12`, `@react-email/render@2.0.8`) are not yet installed and must be added.

One critical finding affects the CONTEXT.md's D-04 decision: Resend has deprecated the `audienceId` concept in favor of Segments. For `contacts.create()`, no audience/segment identifier is needed at all — contacts are now global. For `broadcasts.create()`, a `segmentId` is required (not `audienceId`). The env var named `RESEND_AUDIENCE_ID` in D-04 should be renamed `RESEND_SEGMENT_ID` to accurately describe its purpose.

**Primary recommendation:** Use `resend.broadcasts.create({ segmentId, from, subject, html: rendered, send: true })` for a single-call broadcast. Render the React Email component server-side to a string before passing it as `html`. Embed the literal string `{{{RESEND_UNSUBSCRIBE_URL}}}` in the rendered HTML — Resend replaces it per recipient.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Resend Contacts (within a Resend Audience) becomes the source of truth for mailing list subscribers. Supabase `mailing_list` table is archived — left read-only, not deleted.
- **D-02:** No migration of existing Supabase subscribers to Resend. Start fresh in Resend — only new signups go into Resend Contacts.
- **D-03:** `/api/mailing-list` POST route is updated to call the Resend Contacts API (`resend.contacts.create()`) instead of inserting into Supabase. Supabase insert is removed.
- **D-04:** A `RESEND_AUDIENCE_ID` env var is added — the Resend Audience ID to associate new contacts with. Add to `.env.example`. (**Research note:** Resend has migrated from audiences to segments; see Open Questions for env var naming clarification.)
- **D-05:** `/api/admin/broadcast` route is updated to call Resend's native Broadcasts API in a single API call (no more `for` loop sending one email at a time).
- **D-06:** `email_logs` writes are dropped from the broadcast flow. Resend's dashboard is the audit trail for broadcast sends.
- **D-07:** React Email (`@react-email/components` and `@react-email/render`) is adopted for all email templates in this phase. Install both packages.
- **D-08:** The broadcast drop notification email is converted to a React Email `.tsx` component, rendered to HTML string before passing to the Resend API.
- **D-09:** The custom JWT unsubscribe flow is removed entirely. Resend Broadcasts auto-include a `List-Unsubscribe` header that Resend handles natively.
- **D-10:** Delete `lib/unsubscribeToken.ts`, `app/api/unsubscribe/route.ts`, and `app/unsubscribe/page.tsx`.
- **D-11:** Remove the `jose` package from `package.json` — it is only used by `lib/unsubscribeToken.ts` (verified).
- **D-12:** Remove `UNSUBSCRIBE_SECRET` from `.env.example` and add a comment that unsubscribes are now handled natively by Resend.
- **D-13:** `sanitize-html` can also be removed if HTML inputs are replaced by structured React Email props — researcher should verify this during implementation planning.

### Claude's Discretion

(None specified in CONTEXT.md)

### Deferred Ideas (OUT OF SCOPE)

- MAIL-01: Branded Resend order confirmation email — explicitly deferred again; Square invoice email remains the customer confirmation
- Admin UI for managing mailing list (view subscribers, trigger broadcasts, check delivery) — Admin Dashboard (future milestone)
- Migrating existing Supabase subscribers to Resend — user chose to start fresh
</user_constraints>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Subscriber creation | API (POST /api/mailing-list) | — | Server-side only; API key must not reach client |
| Broadcast triggering | API (POST /api/admin/broadcast) | — | Bearer-auth protected; external curl caller |
| Email template rendering | API tier (server-side render) | — | React Email render() runs on Node, not browser |
| Unsubscribe handling | Resend platform | — | Fully delegated; no app-layer involvement |
| Contact deduplication | Resend platform | — | contacts.create() is upsert — idempotent by design |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| resend | 6.12.2 (installed), 6.12.3 (latest) | Contacts API, Broadcasts API, email send | Already installed; contains Contacts + Broadcasts APIs |
| @react-email/components | 1.0.12 | Email-safe React components (Html, Body, Container, Text, Button, Hr, Link) | Official React Email component library; published 2026-04-17 |
| @react-email/render | 2.0.8 | Render React Email component → HTML string | Official renderer; published 2026-04-28 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | ^3.24.2 (installed) | Validate broadcast route body | Already in use; keep Zod at API boundary |

### Packages to Remove

| Package | Reason |
|---------|--------|
| jose | Only used by `lib/unsubscribeToken.ts` (D-11). Verified: no other imports. |
| sanitize-html | Only used in broadcast route's raw HTML sanitization (D-13). Broadcast route no longer accepts raw HTML. |
| @types/sanitize-html | devDependency companion to sanitize-html; remove alongside it. |

**Installation:**
```bash
npm install @react-email/components @react-email/render
npm uninstall jose sanitize-html
npm uninstall --save-dev @types/sanitize-html
```

**Version verification:**
- `@react-email/components@1.0.12` — verified via `npm view` (published 2026-04-17) [VERIFIED: npm registry]
- `@react-email/render@2.0.8` — verified via `npm view` (published 2026-04-28) [VERIFIED: npm registry]
- `resend@6.12.2` — installed; `6.12.3` latest (patch), not required to upgrade [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```
Subscribe flow (new):
  Component (POST /api/mailing-list)
    → resend.contacts.create({ email })         ← Resend API (contacts are global, no segment needed)
    → return { ok: true }

Broadcast flow (new):
  External curl → POST /api/admin/broadcast (Bearer auth)
    → render(<DropNotificationEmail />) → html string (with {{{RESEND_UNSUBSCRIBE_URL}}} literal)
    → resend.broadcasts.create({ segmentId, from, subject, html, send: true })
    → return { id, requestId }

Unsubscribe (new — fully delegated):
  Recipient clicks Resend-managed List-Unsubscribe link
    → Resend marks contact unsubscribed
    → No app-layer involvement
```

### Recommended Project Structure

```
app/
├── api/
│   ├── mailing-list/route.ts    # Updated: Resend contacts.create() instead of Supabase
│   ├── admin/broadcast/route.ts # Updated: Resend broadcasts.create() single call
│   └── unsubscribe/             # DELETED (D-10)
├── unsubscribe/                 # DELETED (D-10)
emails/
└── DropNotificationEmail.tsx    # NEW: React Email component for drop broadcasts
lib/
├── env.ts                       # Updated: add RESEND_SEGMENT_ID validation
├── unsubscribeToken.ts          # DELETED (D-10, D-11)
└── supabase.ts                  # No change (still used by other routes)
```

### Pattern 1: Resend contacts.create() — Subscribe Route

**What:** Replace Supabase insert with a Resend Contacts API call. The API is now upsert-based — duplicate emails are silently updated, not rejected.
**When to use:** Any time a user submits their email to the mailing list.

```typescript
// Source: resend@6.12.2 SDK type definitions (verified)
// In app/api/mailing-list/route.ts

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const { data, error } = await resend.contacts.create({
  email: parsed.data.email,
  // firstName, lastName, unsubscribed are optional — omit for email-only signup
});

if (error) {
  logError("mailing-list contact create failed", error, requestId);
  return NextResponse.json(
    { error: "Signup failed. Please try again.", requestId },
    { status: 500 }
  );
}

return NextResponse.json({ ok: true }, { status: 200 });
```

**Key behavior changes vs. current Supabase flow:**
- No `audienceId` needed — contacts are global in new Resend API [VERIFIED: SDK type `CreateContactOptions` — no audienceId field]
- Duplicate email = silent upsert (Resend docs: "creates a new contact or updates an existing one") rather than PostgreSQL `23505` unique violation [VERIFIED: Resend docs]
- No Supabase `getSupabaseClient()` import needed in this route

### Pattern 2: Resend broadcasts.create() — Broadcast Route

**What:** Replace the sequential for-loop with a single Resend Broadcasts API call targeting a segment.
**When to use:** Admin triggers a drop notification broadcast.

```typescript
// Source: resend@6.12.2 SDK type definitions (verified)
// In app/api/admin/broadcast/route.ts

import { render } from "@react-email/render";
import { DropNotificationEmail } from "../../../emails/DropNotificationEmail";

// Render the React Email component to a static HTML string
const html = await render(
  <DropNotificationEmail subject={subject} dropId={dropId} />
);

const resend = new Resend(process.env.RESEND_API_KEY);
const segmentId = process.env.RESEND_SEGMENT_ID;

const { data, error } = await resend.broadcasts.create({
  segmentId,                          // required (see Open Questions on naming)
  from: process.env.EMAIL_FROM ?? "Big Matt's BBQ <orders@bigmattsbbq.com>",
  subject,
  html,                               // pre-rendered; includes {{{RESEND_UNSUBSCRIBE_URL}}} literal
  send: true,                         // send immediately, no separate /send call needed
});

if (error) {
  logError("broadcast failed", error, requestId);
  return NextResponse.json({ error: "Broadcast failed.", requestId }, { status: 500 });
}

return NextResponse.json({ id: data?.id, requestId }, { status: 200 });
```

**Key behavior changes vs. current flow:**
- Single API call replaces N sequential `resend.emails.send()` calls
- `segmentId` targets all contacts in the named segment (user must create this in Resend dashboard)
- `send: true` combines create + send in one call [VERIFIED: SDK type `SendBroadcastOnCreationOptions`]
- No Supabase subscriber list fetch
- No `email_logs` insert (D-06)
- No `signUnsubscribeToken()` (D-09)

### Pattern 3: React Email Component

**What:** A server-rendered `.tsx` component that produces email-safe HTML.
**When to use:** The broadcast route renders this before calling the Broadcasts API.

```tsx
// Source: @react-email/components documentation (Context7: /resend/react-email)
// emails/DropNotificationEmail.tsx

import {
  Html, Head, Body, Container, Text, Button, Hr
} from "@react-email/components";

interface DropNotificationEmailProps {
  subject: string;
  dropId?: string;
}

export function DropNotificationEmail({ subject, dropId }: DropNotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#1a1a1a", fontFamily: "sans-serif" }}>
        <Container style={{ maxWidth: "600px", margin: "auto", padding: "24px" }}>
          <Text style={{ color: "#f5f5f5", fontSize: "24px" }}>
            Big Matt&apos;s BBQ Drop is Live
          </Text>
          <Text style={{ color: "#d1d1d1", fontSize: "16px" }}>
            {subject}
          </Text>
          <Button
            href="https://bigmattsbbq.com"
            style={{ backgroundColor: "#c84b11", color: "#fff", padding: "12px 24px" }}
          >
            Order Now
          </Button>
          <Hr style={{ borderColor: "#444", margin: "24px 0" }} />
          <Text style={{ color: "#888", fontSize: "12px" }}>
            {/* Resend replaces this with a per-recipient unsubscribe URL */}
            <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style={{ color: "#888" }}>
              Unsubscribe
            </a>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

**Rendering in the route:**

```typescript
// Source: @react-email/render docs (Context7: /resend/react-email)
import { render } from "@react-email/render";
import { DropNotificationEmail } from "../../../emails/DropNotificationEmail";

const html = await render(<DropNotificationEmail subject={subject} dropId={dropId} />);
// html is now a complete DOCTYPE HTML string with email-safe inline styles
```

### Pattern 4: getResendClient() Helper

**What:** Centralize Resend client construction to avoid inline `new Resend(key)` checks.
**When to use:** Both `/api/mailing-list` and `/api/admin/broadcast` need a Resend client.

```typescript
// lib/resend.ts (new file, following lib/ module pattern)
import { Resend } from "resend";

export function getResendClient(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("Missing RESEND_API_KEY");
  }
  return new Resend(key);
}
```

This follows the pattern of `getSquareEnv()` in `lib/env.ts` — fail-fast with a clear error.

### Anti-Patterns to Avoid

- **Passing raw HTML as broadcast route input:** The new route generates HTML from the React Email component. Accepting raw HTML from the caller brings back the XSS surface that `sanitize-html` was mitigating. The route's schema changes from `{ subject, html, dropId }` to `{ subject, dropId }`. [ASSUMED — this is the implied consequence of D-08; user confirmed CONTEXT intent]
- **Calling resend.broadcasts.send() separately:** The `send: true` option on `create()` handles both in one call. Calling `resend.broadcasts.send(id)` as a second step is unnecessary and fragile. [VERIFIED: SDK type `SendBroadcastOnCreationOptions`]
- **Using audienceId in contacts.create():** The new `CreateContactOptions` interface (in the installed SDK) does not include `audienceId`. Using the deprecated `LegacyCreateContactOptions` with `audienceId` still works but is explicitly marked `@deprecated`. [VERIFIED: SDK type definitions]
- **Importing React Email components in test files with .test.ts extension:** The vitest config processes `.test.ts` files without JSX transform. Email component tests (if any) must use `.test.tsx` extension OR test the route handlers directly via mocking.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Unsubscribe link generation | Custom JWT + `/unsubscribe` page | `{{{RESEND_UNSUBSCRIBE_URL}}}` in broadcast HTML | Resend generates unique per-recipient links, handles compliance headers automatically |
| Email HTML sanitization | `sanitize-html` against raw HTML input | React Email structured props | Component author controls allowed markup; no arbitrary HTML input |
| Batch email sending | For-loop over `resend.emails.send()` | `resend.broadcasts.create({ send: true })` | Resend handles deliverability, throttling, and retry internally |
| Contact deduplication | Check-before-insert logic | Let `resend.contacts.create()` upsert | Resend's create is idempotent by design — duplicate = silent update |
| Bounce/unsubscribe tracking | `email_logs` Supabase writes | Resend dashboard | Resend tracks delivery, bounces, and unsubscribes natively |

**Key insight:** Resend Broadcasts is a first-class sending primitive, not just a wrapper around `emails.send()`. The architectural shift is from "send N emails" to "send one broadcast to a segment."

## Common Pitfalls

### Pitfall 1: audienceId vs. segmentId Confusion

**What goes wrong:** D-04 says to add `RESEND_AUDIENCE_ID`. The Resend Contacts API no longer uses `audienceId` for `contacts.create()`. The Broadcasts API uses `segmentId` (not `audienceId`, which is `@deprecated` in `SegmentOptions`). Using `audienceId` in a broadcast will still work (legacy support) but triggers TypeScript deprecation warnings.

**Why it happens:** Resend renamed "Audiences" to "Segments" in their data model. The SDK kept `audienceId` as deprecated for backward compatibility. The CONTEXT.md was written before this distinction was verified.

**How to avoid:** Name the env var `RESEND_SEGMENT_ID`. Use `segmentId` in `broadcasts.create()`. The user must obtain the segment ID from their Resend dashboard (Audiences → Segments section). No code change is needed for `contacts.create()` — no segment ID required there at all.

**Warning signs:** TypeScript shows `@deprecated` warning on `audienceId` in `resend.broadcasts.create({})`.

### Pitfall 2: RESEND_SEGMENT_ID Must Exist in Resend Dashboard

**What goes wrong:** `resend.broadcasts.create({ segmentId: '...' })` fails at runtime with a 404 or 422 if the segment ID doesn't exist in the Resend account.

**Why it happens:** The segment must be created in the Resend dashboard before the code can reference it. There's no API call to create a segment programmatically in this phase.

**How to avoid:** Document in `.env.example` that `RESEND_SEGMENT_ID` must be obtained from the Resend dashboard. The planner should include a Wave 0 setup step: "Create segment in Resend dashboard and copy ID to `.env.local`."

**Warning signs:** Broadcast route returns 500 with Resend error payload on first call after deployment.

### Pitfall 3: {{{RESEND_UNSUBSCRIBE_URL}}} Escaping in JSX

**What goes wrong:** React's JSX renders `{{{RESEND_UNSUBSCRIBE_URL}}}` with special characters escaped (as `&lbrace;&lbrace;&lbrace;...`), breaking the Resend template substitution.

**Why it happens:** JSX string content is HTML-escaped by default. `render()` may escape curly braces.

**How to avoid:** Pass the unsubscribe URL placeholder as a raw `href` attribute on a React Email `<Link>` component with the literal string, OR render the unsubscribe anchor via `dangerouslySetInnerHTML`. Alternatively, do not embed the placeholder in the React component — instead append it to the rendered HTML string after `render()` returns.

**Warning signs:** Recipients see literal `{{{RESEND_UNSUBSCRIBE_URL}}}` text in emails, or the anchor's `href` shows the escaped version.

**Safe pattern:**
```typescript
// After render(), append unsubscribe footer to the body
const baseHtml = await render(<DropNotificationEmail subject={subject} dropId={dropId} />);
// Inject before </body> if needed, or structure the component to include it
// and test in Resend's email preview to confirm substitution works
```

### Pitfall 4: Broadcast Route Request Schema Breaking Change

**What goes wrong:** Tests and any external callers (curl scripts) that send `{ subject, html, dropId }` to the broadcast route will break if the route no longer accepts `html`.

**Why it happens:** The route schema changes from `{ subject, html, dropId? }` to `{ subject, dropId? }` because `html` is now generated internally from the React Email component.

**How to avoid:** Update `tests/broadcast.test.ts` to match the new schema. The two tests that assert on `sanitize-html` behavior (`strips <script>`, `strips javascript: href`) must be removed or replaced with tests that verify the Resend Broadcasts API is called correctly.

**Warning signs:** Test file still imports `sanitize-html` logic; existing broadcast tests fail with 400 "Invalid broadcast payload."

### Pitfall 5: mailing-list route still imports getSupabaseClient

**What goes wrong:** After switching to `resend.contacts.create()`, the Supabase client import remains. This causes a runtime failure if `NEXT_PUBLIC_SUPABASE_URL` or other Supabase env vars are missing in a non-Supabase deployment, even though the route no longer uses Supabase.

**Why it happens:** Leaving dead imports in the route.

**How to avoid:** Remove the Supabase import from `app/api/mailing-list/route.ts` entirely after switching to the Resend Contacts API.

### Pitfall 6: unsubscribeToken.test.ts Left Orphaned

**What goes wrong:** After deleting `lib/unsubscribeToken.ts`, the test file `tests/unsubscribeToken.test.ts` still exists. Running `npm test` fails because the import path resolves to a missing module.

**Why it happens:** The test file deletion is easily missed when deleting the source file.

**How to avoid:** Include deletion of `tests/unsubscribeToken.test.ts` in the same task that deletes `lib/unsubscribeToken.ts`. [VERIFIED: `tests/unsubscribeToken.test.ts` imports `../lib/unsubscribeToken`]

### Pitfall 7: broadcast.test.ts Mocks Supabase for subscriber fetch

**What goes wrong:** The current `broadcast.test.ts` mocks `getSupabaseClient` to return a subscriber list. After removing the Supabase fetch from the broadcast route, these mocks have no effect — but will not cause an error by themselves. However, the test assertions will be wrong (e.g., `sent: 0, failed: 0` on empty subscriber mock still passes but covers the wrong behavior).

**Why it happens:** The test was written for the Supabase-loop pattern.

**How to avoid:** Rewrite `tests/broadcast.test.ts` to mock `resend.broadcasts.create` instead of `resend.emails.send` and `getSupabaseClient`. The mock for `mailing_list` table can be removed entirely.

## Code Examples

### Resend contacts.create() Full Signature (verified from installed SDK)

```typescript
// Source: resend@6.12.2 node_modules/resend/dist/index.d.mts
interface CreateContactOptions {
  email: string;
  unsubscribed?: boolean;
  firstName?: string;
  lastName?: string;
  properties?: { [key: string]: string | number | null };
  segments?: { id: string }[];
  topics?: { id: string; subscription: 'opt_in' | 'opt_out' }[];
}

// Response on success:
interface CreateContactResponseSuccess {
  object: 'contact';
  id: string;
}
```

### Resend broadcasts.create() Full Signature (verified from installed SDK)

```typescript
// Source: resend@6.12.2 node_modules/resend/dist/index.d.mts
// Simplified from: RequireAtLeastOne<EmailRenderOptions> & RequireAtLeastOne<SegmentOptions> & ...

// Effective call pattern for this phase:
const { data, error } = await resend.broadcasts.create({
  segmentId: string,          // required (or deprecated audienceId)
  from: string,               // required
  subject: string,            // required
  html: string,               // required (OR react: ReactNode, OR text: string)
  send: true,                 // send immediately
  // optional: name, previewText, replyTo, topicId, scheduledAt
});

// Response on success:
interface CreateBroadcastResponseSuccess {
  id: string;
}
```

### React Email render() usage

```typescript
// Source: @react-email/render docs (Context7: /resend/react-email)
import { render } from "@react-email/render";

// render() is async, returns Promise<string>
const html: string = await render(<MyEmailComponent prop={value} />);

// Options:
const pretty: string = await render(<MyEmailComponent />, { pretty: true });
const text: string = await render(<MyEmailComponent />, { plainText: true });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Resend Audiences | Resend Segments (audiences → segments rename) | Late 2024 / early 2025 | `audienceId` deprecated in SDK; `segmentId` is the current field |
| `resend.emails.send()` loop | `resend.broadcasts.create({ send: true })` | Broadcasts API GA | Single API call; platform handles delivery, throttling, unsubscribe |
| Custom JWT unsubscribe flow | Resend native List-Unsubscribe + `{{{RESEND_UNSUBSCRIBE_URL}}}` | Resend Broadcasts feature | Compliance headers automatic; no app code needed |
| Raw HTML sanitization via `sanitize-html` | Structured React Email props | This phase | No arbitrary HTML accepted; components define the allowed structure |

**Deprecated/outdated in this phase:**
- `audienceId` in contacts.create(): removed from `CreateContactOptions`; still in deprecated `LegacyCreateContactOptions`
- `audienceId` in broadcasts.create(): still accepted as `@deprecated` in `SegmentOptions`, but `segmentId` is the current field
- `resend.emails.send()` for broadcast: still valid for transactional, but not appropriate for audience-targeted sends

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The broadcast route's new request schema drops the `html` field (accepts only `subject` and `dropId?`) | Architecture Patterns, Pitfall 4 | If the admin caller needs to pass custom HTML, the route schema needs a different design |
| A2 | `{{{RESEND_UNSUBSCRIBE_URL}}}` in a `href` attribute within a React Email component will survive render() and be substituted by Resend | Pitfall 3, Code Examples | If React Email escapes it, the unsubscribe link breaks for all recipients |
| A3 | The user has (or will create) a Resend segment before running the broadcast. There is no "all contacts" default segment | Pitfall 2 | If Resend has an implicit "all contacts" segment, RESEND_SEGMENT_ID may be optional |
| A4 | Renaming `RESEND_AUDIENCE_ID` → `RESEND_SEGMENT_ID` aligns with D-04's intent. The variable is used only for broadcasts, not for contacts | Open Questions | If user prefers to keep `RESEND_AUDIENCE_ID` name and use deprecated SDK field, no code behavior changes |

## Open Questions

1. **RESEND_AUDIENCE_ID vs. RESEND_SEGMENT_ID env var name**
   - What we know: The Resend SDK deprecated `audienceId` in favor of `segmentId`. `contacts.create()` no longer uses either. `broadcasts.create()` requires `segmentId` (or deprecated `audienceId`).
   - What's unclear: The CONTEXT.md D-04 says "Add RESEND_AUDIENCE_ID env var." This name implies it's used for contacts (old behavior), but it's actually needed for broadcasts (as a segment ID).
   - Recommendation: Name the env var `RESEND_SEGMENT_ID`. Use `segmentId` in `broadcasts.create()`. Add a comment in `.env.example` explaining it must be obtained from the Resend dashboard (Audiences → Segments). If the user prefers `RESEND_AUDIENCE_ID` for familiarity, use the deprecated `audienceId` field in the SDK (TypeScript deprecation warning only — no runtime failure).

2. **{{{RESEND_UNSUBSCRIBE_URL}}} placement in React Email component**
   - What we know: Resend replaces the Mustache-style placeholder `{{{RESEND_UNSUBSCRIBE_URL}}}` in the `html` string before delivery. React Email renders JSX to a static HTML string.
   - What's unclear: Whether JSX curly braces in `href="{{{RESEND_UNSUBSCRIBE_URL}}}"` survive `render()` unescaped, or whether the string must be appended to the rendered HTML after the fact.
   - Recommendation: The planner should structure the React Email component so the unsubscribe link uses a React Email `<Link href="{{{RESEND_UNSUBSCRIBE_URL}}}">` component, which passes the href value through unescaped. Validate in Resend's email preview tool before shipping.

3. **Broadcast route schema change — caller compatibility**
   - What we know: The broadcast route is called externally (curl, not from app UI). The current schema is `{ subject, html, dropId? }`. The new schema drops `html`.
   - What's unclear: Whether the admin has curl scripts that pass `html` in the request body.
   - Recommendation: The new schema is `{ subject, dropId? }`. Update tests accordingly. Document the schema change in the plan so any external scripts can be updated.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | React Email render() | ✓ | 24.8.0 | — |
| resend SDK | Contacts + Broadcasts API | ✓ | 6.12.2 | — |
| @react-email/components | Email component library | ✗ (not installed) | 1.0.12 (latest) | — (must install) |
| @react-email/render | render() function | ✗ (not installed) | 2.0.8 (latest) | — (must install) |
| Resend Segment (dashboard) | broadcasts.create() segmentId | Unknown | — | Cannot broadcast without it |
| RESEND_API_KEY | Both routes | ✓ (in .env.local) | — | — |

**Missing dependencies with no fallback:**
- `@react-email/components` and `@react-email/render` — must be installed before implementation
- Resend Segment ID — must be created in the Resend dashboard; no programmatic fallback

**Missing dependencies with fallback:**
- None

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/mailingList.test.ts tests/broadcast.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-03 | POST /api/mailing-list calls Resend contacts.create() and returns 200 | unit | `npx vitest run tests/mailingList.test.ts` | ✅ (needs rewrite) |
| D-03 | POST /api/mailing-list returns 200 silently on duplicate (Resend upsert = no error) | unit | `npx vitest run tests/mailingList.test.ts` | ✅ (needs rewrite) |
| D-03 | POST /api/mailing-list returns 400 on invalid email | unit | `npx vitest run tests/mailingList.test.ts` | ✅ (keep as-is) |
| D-03 | POST /api/mailing-list returns 500 when Resend API call fails | unit | `npx vitest run tests/mailingList.test.ts` | ✅ (needs rewrite) |
| D-05 | POST /api/admin/broadcast calls resend.broadcasts.create() | unit | `npx vitest run tests/broadcast.test.ts` | ✅ (needs rewrite) |
| D-05 | POST /api/admin/broadcast returns 200 with broadcast id on success | unit | `npx vitest run tests/broadcast.test.ts` | ✅ (needs rewrite) |
| D-05 | POST /api/admin/broadcast returns 401 with missing/wrong bearer | unit | `npx vitest run tests/broadcast.test.ts` | ✅ (keep core logic) |
| D-05 | POST /api/admin/broadcast returns 400 on invalid body | unit | `npx vitest run tests/broadcast.test.ts` | ✅ (needs schema update) |
| D-11 | jose package removed — no runtime import errors | manual | `npm test` (no jose imports in any source file) | N/A |
| D-10 | Deleted routes return 404 | manual (Next.js) | — | N/A |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/mailingList.test.ts tests/broadcast.test.ts`
- **Per wave merge:** `npm test` (full suite — 87 tests currently passing)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/mailingList.test.ts` — must be rewritten: replace Supabase mock with Resend `contacts.create` mock; remove Supabase-specific error code 23505 test; add Resend API error test
- [ ] `tests/broadcast.test.ts` — must be rewritten: replace `resend.emails.send` mock with `resend.broadcasts.create` mock; remove Supabase `mailing_list` and `email_logs` mocks; remove `sanitize-html` behavior tests; add test for single API call and return shape
- [ ] `tests/unsubscribeToken.test.ts` — DELETE entirely when `lib/unsubscribeToken.ts` is deleted
- [ ] Install `@react-email/components` and `@react-email/render` before any render() call in tests

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — (no new auth flows) |
| V3 Session Management | No | — (no sessions involved) |
| V4 Access Control | Yes | Bearer token on broadcast route (existing `authorize()` — kept as-is) |
| V5 Input Validation | Yes | Zod safeParse on subscribe and broadcast routes |
| V6 Cryptography | No longer applies | jose / JWT removed; Resend handles token generation |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via raw HTML broadcast input | Tampering | React Email structured props — no raw HTML accepted from caller |
| Unauthorized broadcast trigger | Elevation of Privilege | `authorize()` Bearer token check — keep existing pattern |
| Email enumeration via subscribe API | Information Disclosure | Route returns `{ ok: true }` regardless of whether contact already exists (silent upsert) — existing behavior preserved |
| RESEND_API_KEY exposure | Information Disclosure | Server-side only; never in client components or public env vars |

## Sources

### Primary (HIGH confidence)

- `resend@6.12.2` SDK type definitions (`node_modules/resend/dist/index.d.mts`) — `CreateContactOptions`, `CreateBroadcastOptions`, `SegmentOptions`, `SendBroadcastOnCreationOptions` verified by direct inspection
- Context7 `/llmstxt/resend_llms-full_txt` — Resend Contacts API, Broadcasts API, `{{{RESEND_UNSUBSCRIBE_URL}}}` template variable
- Context7 `/resend/react-email` — `@react-email/render` usage pattern, component structure
- `npm view` registry — `@react-email/components@1.0.12`, `@react-email/render@2.0.8`, `resend@6.12.3` version and publish dates

### Secondary (MEDIUM confidence)

- `resend.com/docs/api-reference/contacts/create-contact` (WebFetch) — confirmed no `audienceId` in current API, upsert behavior
- `resend.com/docs/api-reference/broadcasts/create-broadcast` (WebFetch) — confirmed `segmentId` required, `send: true` behavior
- `resend.com/docs/dashboard/segments/migrating-from-audiences-to-segments` (WebFetch) — confirmed audience→segment terminology migration

### Tertiary (LOW confidence)

- None — all critical claims verified via SDK types or official docs

## Metadata

**Confidence breakdown:**

- Resend Contacts API: HIGH — verified via installed SDK type definitions
- Resend Broadcasts API: HIGH — verified via installed SDK type definitions
- React Email render(): HIGH — verified via Context7 official docs
- audienceId deprecation: HIGH — verified in SDK `@deprecated` JSDoc comments
- {{{RESEND_UNSUBSCRIBE_URL}}} in JSX: MEDIUM — behavior confirmed in Resend docs for raw HTML; JSX escaping risk is ASSUMED (A2)
- sanitize-html removal: HIGH — only import verified in broadcast route; D-13 confirmed

**Research date:** 2026-05-07
**Valid until:** 2026-06-07 (Resend API is stable; React Email 1.x is current major)
