---
phase: 08-mailing-list-email-platform
plan: "01"
subsystem: email-platform
tags:
  - mailing-list
  - email
  - cleanup
  - resend
  - dependencies
dependency_graph:
  requires: []
  provides:
    - "@react-email/components installed"
    - "@react-email/render installed"
    - "getResendEnv() helper in lib/env.ts"
    - "RESEND_SEGMENT_ID in .env.example"
  affects:
    - "app/api/admin/broadcast/route.ts (intentionally broken until Plan 03)"
tech_stack:
  added:
    - "@react-email/components@1.0.12"
    - "@react-email/render@2.0.8"
  removed:
    - "jose@6.2.2"
    - "sanitize-html@2.17.3"
    - "@types/sanitize-html@2.16.1"
  patterns:
    - "fail-fast env helper pattern extended to Resend (mirrors getSquareEnv)"
key_files:
  created:
    - "lib/env.ts (ResendEnv interface + getResendEnv() appended)"
  modified:
    - "package.json"
    - "package-lock.json"
    - ".env.example"
  deleted:
    - "lib/unsubscribeToken.ts"
    - "tests/unsubscribeToken.test.ts"
    - "app/api/unsubscribe/route.ts"
    - "app/unsubscribe/page.tsx"
    - "app/api/unsubscribe/ (dir)"
    - "app/unsubscribe/ (dir)"
decisions:
  - "React Email 1.x deprecation warnings accepted (npm shows 'no longer supported') — version pins match RESEARCH.md spec; Plan 02 builds the email template against these versions"
  - "broadcast/route.ts intentionally left broken (imports signUnsubscribeToken from deleted module + sanitize-html) — fixed atomically in Plan 03 as part of Wave 2"
  - "UNSUBSCRIBE_SECRET comment reference removed from .env.example to satisfy acceptance criteria (string must be entirely absent)"
metrics:
  duration: "~16 minutes"
  completed: "2026-05-19T22:27:02Z"
  tasks_completed: 3
  files_changed: 8
---

# Phase 08 Plan 01: Dependency cleanup and Resend env helper Summary

React Email packages installed, jose/sanitize-html removed, custom JWT unsubscribe surface deleted, and getResendEnv() fail-fast helper added to prepare for Phase 8 Resend Contacts/Broadcasts migration.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Update dependencies — install React Email packages, uninstall jose/sanitize-html | 8d678b4 | package.json, package-lock.json |
| 2 | Add getResendEnv() helper to lib/env.ts | 24f47ea | lib/env.ts |
| 3 | Delete JWT unsubscribe surface and update .env.example | 56d814c | lib/unsubscribeToken.ts, tests/unsubscribeToken.test.ts, app/api/unsubscribe/route.ts, app/unsubscribe/page.tsx, .env.example |

## Dependency Changes

**Installed:**
- `@react-email/components@^1.0.12` — email component library (Body, Button, Container, Hr, Heading, Html, Img, Link, Preview, Section, Text)
- `@react-email/render@^2.0.8` — renders React email components to HTML strings for Resend API

**Removed:**
- `jose@^6.2.2` — JWT signing/verification (deprecated per D-09; Resend handles unsubscribe natively)
- `sanitize-html@^2.17.3` — HTML sanitization (was used by broadcast route; removed in Plan 03)
- `@types/sanitize-html@^2.16.1` — TypeScript types for sanitize-html

**Unchanged:**
- `resend@^6.12.2` — Resend SDK (preserved)

npm deprecation warnings from React Email 1.x sub-packages are expected and acceptable per plan spec.

## File Deletions

| File | Reason |
|------|--------|
| `lib/unsubscribeToken.ts` | Custom JWT unsubscribe replaced by Resend native List-Unsubscribe header (D-09) |
| `tests/unsubscribeToken.test.ts` | Orphan test would break npm test with ERR_MODULE_NOT_FOUND (RESEARCH Pitfall 6) |
| `app/api/unsubscribe/route.ts` | Endpoint deprecated per D-10; old links get 404 (acceptable per T-08-04) |
| `app/unsubscribe/page.tsx` | Page deprecated per D-11 |
| `app/api/unsubscribe/` (dir) | Empty after route.ts deletion |
| `app/unsubscribe/` (dir) | Empty after page.tsx deletion |

## .env.example Change

**Before (lines 19–28):**
```
# Phase 5 — broadcast + unsubscribe
# These two secrets MUST be independent values (each 32+ chars).
# Rotation semantics differ:
#   - BROADCAST_SECRET gates the admin broadcast API; rotate freely.
#   - UNSUBSCRIBE_SECRET signs unsubscribe JWTs with a 30-day expiry;
#     rotating it invalidates every outstanding unsubscribe link.
# Do NOT reuse one for the other.
BROADCAST_SECRET=
UNSUBSCRIBE_SECRET=
```

**After:**
```
# Phase 5 — broadcast
# BROADCAST_SECRET gates the admin broadcast API. Rotate freely. Min 16 chars.
BROADCAST_SECRET=

# Phase 8 — Resend Contacts + Broadcasts
# RESEND_SEGMENT_ID: obtain from Resend dashboard -> Audiences -> Segments.
# Required for POST /api/admin/broadcast. Not needed for subscriber signups
# (resend.contacts.create() is global, no segment ID required).
# Unsubscribes are handled natively by Resend via List-Unsubscribe header.
RESEND_SEGMENT_ID=
```

All other env vars preserved unchanged (Supabase, Square, RESEND_API_KEY, EMAIL_FROM, EMAIL_REPLY_TO).

## getResendEnv() Implementation

Added to `lib/env.ts` after the existing `getSquareEnv()` function:

```typescript
export interface ResendEnv {
  apiKey: string;
  segmentId: string;
}

export function getResendEnv(): ResendEnv {
  const apiKey = process.env.RESEND_API_KEY;
  const segmentId = process.env.RESEND_SEGMENT_ID;

  if (!apiKey || !segmentId) {
    throw new Error(
      "Missing Resend environment variables. Check RESEND_API_KEY and RESEND_SEGMENT_ID."
    );
  }

  return { apiKey, segmentId };
}
```

Follows existing project conventions exactly: named export, PascalCase interface with Env suffix, no JSDoc, throws Error (not custom class), 2-space indentation.

## Intentionally Broken State (Expected)

`app/api/admin/broadcast/route.ts` still imports:
- `sanitize-html` (package removed)
- `signUnsubscribeToken` from `../../../../lib/unsubscribeToken` (file deleted)

This causes TypeScript errors in that file. Per the plan: "Plan 03 in Wave 2 fixes those imports." Wave 2 runs immediately after Wave 1 completes, so this broken state is short-lived and by design.

## Deviations from Plan

**1. [Rule 1 - Bug] UNSUBSCRIBE_SECRET appeared in .env.example comment**
- **Found during:** Task 3 acceptance criteria verification
- **Issue:** The replacement comment block included the text "no UNSUBSCRIBE_SECRET is needed" which caused `grep -q "UNSUBSCRIBE_SECRET" .env.example` to find a match, failing the acceptance criteria requiring the string to be entirely absent
- **Fix:** Replaced comment line "no UNSUBSCRIBE_SECRET is needed" with "Unsubscribes are handled natively by Resend via List-Unsubscribe header"
- **Files modified:** `.env.example`
- **Commit:** 56d814c (part of Task 3 commit)

## Known Stubs

None. This plan performs cleanup only — no UI components or data-binding involved.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. `getResendEnv()` is server-side only (`lib/` with no "use client" directive) — RESEND_API_KEY never exposed to client, consistent with T-08-01 mitigation.

## Self-Check: PASSED

- `package.json` contains `@react-email/components` and `@react-email/render`: VERIFIED
- `package.json` does not contain `jose`, `sanitize-html`, `@types/sanitize-html`: VERIFIED
- `lib/env.ts` exports `getResendEnv()` and `ResendEnv`: VERIFIED
- All four unsubscribe files deleted: VERIFIED
- `.env.example` contains `RESEND_SEGMENT_ID=` and does not contain `UNSUBSCRIBE_SECRET`: VERIFIED
- Commits 8d678b4, 24f47ea, 56d814c all exist: VERIFIED
