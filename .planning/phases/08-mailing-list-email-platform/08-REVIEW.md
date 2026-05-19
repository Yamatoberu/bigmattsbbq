---
phase: 08-mailing-list-email-platform
reviewed: 2026-05-19T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - app/api/admin/broadcast/route.tsx
  - app/api/mailing-list/route.ts
  - emails/DropNotificationEmail.tsx
  - lib/env.ts
  - tests/broadcast.test.ts
  - tests/mailingList.test.ts
  - package.json
  - .env.example
findings:
  critical: 2
  warning: 3
  info: 2
  total: 7
status: issues_found
---

# Phase 08: Code Review Report

**Reviewed:** 2026-05-19
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Phase 08 migrates the mailing-list signup to Resend's global contacts API and the broadcast path to `resend.broadcasts.create` with a React Email template. The security-sensitive pieces — no vendor error leakage, generic 500 strings, no HTML accepted from callers, and `{{{RESEND_UNSUBSCRIBE_URL}}}` preserved as a literal — are all implemented correctly and confirmed by the test suite.

Two blockers were found: the `resend.contacts.create` call omits the mandatory `audienceId` field (the call will silently fail or behave unexpectedly at runtime), and a timing-based timing side-channel exists in the `authorize()` function's plain string comparison. Three warnings cover a stale `@supabase/supabase-js` dependency left in `package.json`, the `send: true` flag inside `broadcasts.create` (which makes every create immediately irreversible), and a missing `audienceId`/`RESEND_AUDIENCE_ID` env var in `.env.example` and `getResendEnv()`. Two info items cover the `.tsx` file extension on a pure API route and the `EMAIL_FROM` fallback hardcoding a production email address.

---

## Critical Issues

### CR-01: `resend.contacts.create` called without `audienceId` — will not add subscriber to any audience

**File:** `app/api/mailing-list/route.ts:40`

**Issue:** The Resend SDK's `contacts.create` method without an `audienceId` posts to `/contacts` — a global endpoint that exists in the SDK but is not the standard path for adding a subscriber to a named audience. In production the call may return a success response but the contact may not appear in the intended audience segment, making all broadcast targeting broken. The `resend.contacts.create` docs require an `audienceId` to associate a new contact with an audience from which broadcasts can be sent. The test mocks the SDK entirely and therefore cannot catch this mismatch.

**Fix:**
```typescript
// Add RESEND_AUDIENCE_ID to env and thread it through getResendEnv()
// Then pass it here:
const { error } = await resend.contacts.create({
  audienceId: env.audienceId,   // required to land in the correct audience
  email: parsed.data.email
});
```

The `mailing-list` route currently reads `RESEND_API_KEY` directly from `process.env` rather than using `getResendEnv()`. Consolidate into `getResendEnv()` and add `audienceId` alongside `segmentId` — both come from the same Resend audience.

---

### CR-02: Timing side-channel in `authorize()` — plain string equality comparison

**File:** `app/api/admin/broadcast/route.tsx:21`

**Issue:** The authorization check uses JavaScript's `===` operator to compare the incoming `Authorization` header against the secret:

```typescript
return authHeader === `Bearer ${secret}`;
```

JavaScript string comparison is not constant-time. An attacker who can make many rapid requests and measure response latency can distinguish correct-prefix guesses from wrong ones character by character. Although network jitter makes this harder than in-process attacks, it is a real side-channel for a route that triggers bulk email sends. The minimum-length check (`secret.length < 16`) mitigates brute force but does not address timing.

**Fix:**
```typescript
import { timingSafeEqual } from "crypto";

function authorize(requestHeaders: Headers): boolean {
  const secret = process.env.BROADCAST_SECRET;
  if (!secret || secret.length < 16) return false;
  const authHeader = requestHeaders.get("authorization");
  if (!authHeader) return false;
  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  const provided = Buffer.from(authHeader, "utf8");
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}
```

---

## Warnings

### WR-01: `@supabase/supabase-js` and `supabase` CLI remain in `package.json` after Supabase removal

**File:** `package.json:16,31`

**Issue:** Phase 08 migrated away from Supabase entirely, but `@supabase/supabase-js` (production dependency, line 16) and `supabase` (devDependency CLI, line 31) are still declared. These are dead weight that will be bundled / installed on every `npm ci`. More importantly, leaving a Supabase client package in `dependencies` is misleading — future contributors (and security scanners) will assume Supabase is still in use and may look for exposed credentials.

**Fix:** Remove both entries and run `npm install` to regenerate the lockfile:
```json
// Remove from dependencies:
"@supabase/supabase-js": "^2.101.1",

// Remove from devDependencies:
"supabase": "^2.84.10",
```

---

### WR-02: `send: true` inside `broadcasts.create` makes every invocation immediately irreversible

**File:** `app/api/admin/broadcast/route.tsx:71`

**Issue:** Passing `send: true` to `resend.broadcasts.create` atomically creates and dispatches the broadcast in a single call. There is no confirmation step, no dry-run capability, and no way to cancel once the API returns. A single erroneous POST (wrong subject, wrong `dropId`, mis-aimed segment) cannot be recalled. The Resend API provides a two-step pattern — `broadcasts.create` then `broadcasts.send(id)` — specifically to allow a review window.

**Fix:** Split into two steps and return the `broadcastId` to the caller, allowing a future confirm endpoint or manual `broadcasts.send`:
```typescript
// Step 1 — create (do not pass send: true)
const { data: created, error: createError } = await resend.broadcasts.create({
  segmentId: env.segmentId,
  from,
  subject,
  html
});
if (createError || !created?.id) { /* handle */ }

// Step 2 — send (caller can make this a separate confirm step)
const { error: sendError } = await resend.broadcasts.send(created.id);
```

If the one-shot behavior is intentional and accepted by the project, document it explicitly with a comment and ensure the Zod schema is strict enough that no accidental dispatch is possible.

---

### WR-03: `RESEND_AUDIENCE_ID` missing from `.env.example` and `getResendEnv()`

**File:** `.env.example` (all lines), `lib/env.ts:39-50`

**Issue:** `resend.contacts.create` requires an `audienceId` (see CR-01). Neither `.env.example` nor `getResendEnv()` define or validate `RESEND_AUDIENCE_ID`. A developer setting up the project from `.env.example` has no indication this variable is required, meaning mailing-list signups will silently go nowhere.

**Fix:** Add to `.env.example`:
```
# Resend Audience ID — required for contacts.create (mailing list signup)
RESEND_AUDIENCE_ID=
```

Add to `getResendEnv()` in `lib/env.ts`:
```typescript
export interface ResendEnv {
  apiKey: string;
  audienceId: string;
  segmentId: string;
}

export function getResendEnv(): ResendEnv {
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  const segmentId = process.env.RESEND_SEGMENT_ID;

  if (!apiKey || !audienceId || !segmentId) {
    throw new Error(
      "Missing Resend environment variables. Check RESEND_API_KEY, RESEND_AUDIENCE_ID, and RESEND_SEGMENT_ID."
    );
  }

  return { apiKey, audienceId, segmentId };
}
```

---

## Info

### IN-01: Broadcast API route uses `.tsx` extension but contains no JSX at the module level

**File:** `app/api/admin/broadcast/route.tsx:1`

**Issue:** The file is named `route.tsx`. The `.tsx` extension is needed for the JSX expression on line 59 (`<DropNotificationEmail ... />`), but the project convention (CLAUDE.md) reserves `.tsx` for React component files. An API route is not a component. The JSX could be avoided entirely — the `render()` call from `@react-email/render` accepts a React element but the component itself can be imported and rendered from a `.ts` file if the JSX is moved into a small helper.

**Fix (optional):** Rename to `route.ts` and move the JSX invocation into a thin helper in the `emails/` directory:
```typescript
// emails/renderDropNotification.ts
import { render } from "@react-email/render";
import { createElement } from "react";
import { DropNotificationEmail } from "./DropNotificationEmail";

export function renderDropNotification(subject: string, dropId?: string): Promise<string> {
  return render(createElement(DropNotificationEmail, { subject, dropId }));
}
```

This is a style concern, not a correctness issue, given that Next.js handles `.tsx` API routes without complaint.

---

### IN-02: `EMAIL_FROM` fallback hardcodes a production email address in server code

**File:** `app/api/admin/broadcast/route.tsx:62-63`

**Issue:**
```typescript
const from =
  process.env.EMAIL_FROM ?? "Big Matt's BBQ <orders@bigmattsbbq.com>";
```

If `EMAIL_FROM` is absent (e.g., in a staging or test environment), the broadcast will be sent `from` the real production address. This is a misconfiguration footgun — forgetting to set the env var in staging means real-looking emails could be dispatched from the production identity. The project already documents `EMAIL_FROM` in `.env.example`; there is no reason to allow it to be omitted silently.

**Fix:** Treat a missing `EMAIL_FROM` as a configuration error, either by adding it to `getResendEnv()` or by guarding explicitly:
```typescript
const from = process.env.EMAIL_FROM;
if (!from) {
  logError("broadcast missing EMAIL_FROM", new Error("EMAIL_FROM not set"), requestId);
  return NextResponse.json({ error: "Broadcast failed.", requestId }, { status: 500 });
}
```

---

_Reviewed: 2026-05-19_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
