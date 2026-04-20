---
phase: 05-content-mailing-list
reviewed: 2026-04-19T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - .env.example
  - app/about/page.tsx
  - app/api/admin/broadcast/route.ts
  - app/api/mailing-list/route.ts
  - app/api/unsubscribe/route.ts
  - app/catering/page.tsx
  - app/contact/page.tsx
  - app/layout.tsx
  - app/unsubscribe/page.tsx
  - components/CateringSection.tsx
  - components/Footer.tsx
  - components/MailingListSection.tsx
  - components/NavBar.tsx
  - components/OrderLanding.tsx
  - lib/unsubscribeToken.ts
  - tests/broadcast.test.ts
  - tests/mailingList.test.ts
  - tests/unsubscribeToken.test.ts
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-04-19T00:00:00Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

This phase adds the mailing list signup flow, broadcast admin route, unsubscribe token system, static content pages (about, contact, catering), and updated NavBar/Footer. The token-signing logic and route authorization patterns are solid. One critical issue was found: the broadcast route appends the unsubscribe URL via raw string interpolation, which allows XSS if a malicious subscriber email were ever inserted into the database. Four warnings cover missing validation on the `html` broadcast payload, a `rejectUnauthorized`-style silent-failure path in the unsubscribe route, a non-functional inline form in `OrderLanding`, and a secret fall-through in `unsubscribeToken.ts`. Three informational items round out the review.

---

## Critical Issues

### CR-01: Unescaped email address in HTML string template (broadcast route)

**File:** `app/api/admin/broadcast/route.ts:98-103`
**Issue:** The `unsubscribeUrl` is built from `subscriber.email` pulled directly from the database, then interpolated into a raw HTML template string. Although `encodeURIComponent` is applied to the token (good), the email is not used directly in the URL; the concern is the broader pattern: `html` passed in the POST body is also appended verbatim without sanitization. More concretely, if an attacker ever manages to insert a crafted email value (e.g., `"></a><script>...` escaped past Supabase's validation), it would be written directly into every recipient's email. Even ignoring attacker-controlled emails, the caller-supplied `html` body is rendered without any sanitization whatsoever — a compromised admin credential results in full HTML injection into every subscriber's inbox.

Both surfaces should be tightened:
1. The `html` field should be treated as untrusted content and at minimum stripped of `<script>` tags server-side, or the API contract should document that only pre-approved templates are accepted.
2. The token URL interpolation is safe as-is, but the pattern of building raw HTML via string templates is fragile.

**Fix:**
```typescript
// Minimal: strip script tags from caller-supplied html before appending footer
function sanitizeHtml(raw: string): string {
  return raw.replace(/<script[\s\S]*?<\/script>/gi, "");
}

// In the send loop:
const safeHtml = sanitizeHtml(html);
const finalHtml = `${safeHtml}\n<hr .../>...`;
```

For a more robust solution, consider restricting the broadcast payload to a whitelist of template IDs rather than accepting raw HTML from the caller.

---

## Warnings

### WR-01: broadcast `html` field has no maximum length, enabling oversized payloads

**File:** `app/api/admin/broadcast/route.ts:10-14`
**Issue:** The Zod schema enforces `min(1)` on `html` but sets no upper bound. A large payload would be sent to every subscriber, potentially hitting Resend's per-email size limit and causing silent failures for the whole batch. The `subject` field is capped at 200 characters but `html` is unconstrained.

**Fix:**
```typescript
const schema = z.object({
  subject: z.string().min(1).max(200),
  html: z.string().min(1).max(100_000), // ~100 KB is a generous but reasonable ceiling
  dropId: z.string().optional()
});
```

### WR-02: `unsubscribeToken.ts` silently falls back to `BROADCAST_SECRET`

**File:** `lib/unsubscribeToken.ts:7-13`
**Issue:** `getSecret()` falls back to `BROADCAST_SECRET` when `UNSUBSCRIBE_SECRET` is not set. This means accidentally deleting `UNSUBSCRIBE_SECRET` from `.env.local` does not throw — it silently uses a different secret. Any tokens signed before and after the key rotation would both verify, but with different keys, causing tokens to fail in production unexpectedly. The fallback also means `BROADCAST_SECRET` effectively becomes a second signing key, widening the attack surface.

**Fix:**
```typescript
function getSecret(): Uint8Array {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "Missing or too-short UNSUBSCRIBE_SECRET. Set it in .env.local to a 32+ character value."
    );
  }
  return new TextEncoder().encode(secret);
}
```

### WR-03: Unsubscribe route uses `await headers()` pattern inconsistently with other routes

**File:** `app/api/unsubscribe/route.ts:15-16`
**Issue:** This route imports and awaits `headers()` from `next/headers` to read `x-request-id`, while every other API route in the project reads headers directly from `request.headers` (e.g., `request.headers.get("x-request-id")`). The `await headers()` pattern will cause the route to opt out of any static optimization and is inconsistent with project conventions. More importantly, `request.headers` is already available on the `Request` parameter — the `next/headers` import is unnecessary.

**Fix:**
```typescript
// Remove: import { headers } from "next/headers";
// Remove: const headerList = await headers();

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  // ...
}
```

### WR-04: Inline mailing list form in `OrderLanding` "no active drop" state is non-functional

**File:** `components/OrderLanding.tsx:59-72`
**Issue:** When there is no active drop, a "Notify Me" form is rendered. Its `onSubmit` handler only calls `event.preventDefault()` — it never posts to `/api/mailing-list`. Users who submit this form will see no feedback and will not be subscribed. This is a silent failure path that defeats the page's stated purpose.

**Fix:**
Replace the stub form with the existing `<MailingListSection />` component, or wire the form to call `/api/mailing-list` the same way `Footer` and `MailingListSection` do:

```tsx
// Simplest fix — reuse the working component:
import { MailingListSection } from "./MailingListSection";

// Replace the inline form block with:
<MailingListSection />
```

---

## Info

### IN-01: Draft copy comment left in production file

**File:** `app/about/page.tsx:28-30`
**Issue:** A `<p>` tag with the text "Draft copy — Matt will revise before launch." is rendered on the live `/about` page. This is visible to users and should be removed before the page goes live.

**Fix:** Remove lines 28-30 before launch.

### IN-02: `NEXT_PUBLIC_SITE_URL` used in broadcast but missing from `.env.example`

**File:** `app/api/admin/broadcast/route.ts:17` / `.env.example`
**Issue:** `getBaseUrl()` checks `process.env.NEXT_PUBLIC_SITE_URL` first. This variable is never mentioned in `.env.example`, so developers will not know to set it. Without it, the fallback reads `x-forwarded-proto` and `host` headers, which is reasonable for production Vercel deployments, but can silently produce wrong URLs in local development or behind certain proxies.

**Fix:** Add to `.env.example`:
```
# Optional: override base URL for unsubscribe links in broadcast emails
NEXT_PUBLIC_SITE_URL=
```

### IN-03: `SupabaseClient` singleton may carry stale credentials across hot-reloads in development

**File:** `lib/supabase.ts:5`
**Issue:** The `_client` module-level singleton is initialized once and cached for the lifetime of the Node process. In Next.js dev mode with hot module replacement, the module can be re-evaluated but the singleton pattern does not guard against env var changes between reloads. This is a low-risk dev-only concern, but it has tripped teams up when rotating credentials locally. Not a production bug.

**Fix:** No change required for production. If it causes friction during development, consider reading `process.env` on every call instead of caching, or document the "restart dev server after credential change" requirement in `CLAUDE.md`.

---

_Reviewed: 2026-04-19T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
