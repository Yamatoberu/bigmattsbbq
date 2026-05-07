# Phase 8: Mailing List & Email Platform — Pattern Map

**Mapped:** 2026-05-07
**Files analyzed:** 9 (6 modified/rewritten, 3 deleted)
**Analogs found:** 6 / 6 (all modified/created files have strong in-codebase analogs)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/api/mailing-list/route.ts` | API route | request-response | `app/api/mailing-list/route.ts` (self — modify in place) | exact (same file) |
| `app/api/admin/broadcast/route.ts` | API route | request-response | `app/api/admin/broadcast/route.ts` (self — modify in place) | exact (same file) |
| `lib/env.ts` | utility/config | — | `lib/env.ts` (self — add var) + `lib/supabase.ts` (fail-fast guard pattern) | exact |
| `emails/DropNotificationEmail.tsx` | component (email) | transform | no existing email component — use RESEARCH.md pattern | none |
| `tests/mailingList.test.ts` | test | — | `tests/mailingList.test.ts` (self — rewrite) + `tests/drops.test.ts` (mock pattern) | exact |
| `tests/broadcast.test.ts` | test | — | `tests/broadcast.test.ts` (self — rewrite) + `tests/drops.test.ts` (mock pattern) | exact |
| `lib/unsubscribeToken.ts` | utility | — | DELETE — no replacement needed | N/A |
| `app/api/unsubscribe/route.ts` | API route | — | DELETE | N/A |
| `app/unsubscribe/page.tsx` | page component | — | DELETE | N/A |

---

## Pattern Assignments

### `app/api/mailing-list/route.ts` (API route, request-response — modify in place)

**Analog:** `app/api/mailing-list/route.ts` (current file, lines 1–48) — keep all structure, swap the data call only.

**Imports to keep** (lines 1–4):
```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
// REMOVE: import { getSupabaseClient } from "../../../lib/supabase";
import { logError } from "../../../lib/logger";
// ADD:
import { Resend } from "resend";
```

**Runtime declaration to keep** (line 6):
```typescript
export const runtime = "nodejs";
```

**Schema to keep unchanged** (lines 8–10):
```typescript
const schema = z.object({
  email: z.string().trim().toLowerCase().email()
});
```

**requestId pattern to keep** (line 13):
```typescript
const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
```

**Zod safeParse + 400 pattern to keep** (lines 17–24):
```typescript
const parsed = schema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json(
    { error: "Invalid email.", requestId },
    { status: 400 }
  );
}
```

**Data call — REPLACE lines 26–38** (remove Supabase insert, replace with):
```typescript
const resend = new Resend(process.env.RESEND_API_KEY);
const { error } = await resend.contacts.create({
  email: parsed.data.email
  // No audienceId — contacts are global in current Resend API (SDK verified)
});

if (error) {
  logError("mailing-list contact create failed", error, requestId);
  return NextResponse.json(
    { error: "Signup failed. Please try again.", requestId },
    { status: 500 }
  );
}
```

**Success response to keep** (line 40):
```typescript
return NextResponse.json({ ok: true }, { status: 200 });
```

**Outer try/catch + logError to keep** (lines 41–47):
```typescript
} catch (err) {
  logError("mailing-list signup failed", err, requestId);
  return NextResponse.json(
    { error: "Signup failed. Please try again.", requestId },
    { status: 500 }
  );
}
```

**Key change summary:** Remove `getSupabaseClient` import and Supabase `.insert()` call. Remove the `23505` unique-violation check (Resend contacts.create is a silent upsert — duplicate = no error). Add `Resend` import and `resend.contacts.create()` call.

---

### `app/api/admin/broadcast/route.ts` (API route, request-response — modify in place)

**Analog:** `app/api/admin/broadcast/route.ts` (current file, lines 1–153) — keep auth and outer structure, gut the sending logic.

**Imports — REPLACE lines 1–8**:
```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { DropNotificationEmail } from "../../../emails/DropNotificationEmail";
import { logError } from "../../../../lib/logger";
// REMOVE: sanitize-html, getSupabaseClient, signUnsubscribeToken
```

**Runtime declaration to keep** (line 9):
```typescript
export const runtime = "nodejs";
```

**Schema — REPLACE lines 11–15** (drop `html` field — HTML is now generated internally):
```typescript
const schema = z.object({
  subject: z.string().min(1).max(200),
  dropId: z.string().optional()
  // html removed: generated from DropNotificationEmail component
});
```

**`authorize()` function — KEEP AS-IS** (lines 31–37):
```typescript
function authorize(requestHeaders: Headers): boolean {
  const secret = process.env.BROADCAST_SECRET;
  if (!secret || secret.length < 16) return false;
  const authHeader = requestHeaders.get("authorization");
  if (!authHeader) return false;
  return authHeader === `Bearer ${secret}`;
}
```

**Auth check to keep** (lines 42–46):
```typescript
if (!authorize(request.headers)) {
  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 401 }
  );
}
```

**requestId + body parse pattern to keep** (lines 39–58):
```typescript
const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
// ...
const body = await request.json();
const parsed = schema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json(
    { error: "Invalid broadcast payload.", requestId },
    { status: 400 }
  );
}
```

**Sending logic — REPLACE lines 60–145** (remove for-loop, Supabase fetch, email_logs, signUnsubscribeToken):
```typescript
const { subject, dropId } = parsed.data;

const html = await render(
  <DropNotificationEmail subject={subject} dropId={dropId} />
);

const resendKey = process.env.RESEND_API_KEY;
const segmentId = process.env.RESEND_SEGMENT_ID;
if (!resendKey || !segmentId) {
  logError("broadcast missing env vars", new Error("RESEND_API_KEY or RESEND_SEGMENT_ID not set"), requestId);
  return NextResponse.json({ error: "Broadcast failed.", requestId }, { status: 500 });
}

const resend = new Resend(resendKey);
const from = process.env.EMAIL_FROM ?? "Big Matt's BBQ <orders@bigmattsbbq.com>";

const { data, error } = await resend.broadcasts.create({
  segmentId,
  from,
  subject,
  html,
  send: true
});

if (error) {
  logError("broadcast failed", error, requestId);
  return NextResponse.json({ error: "Broadcast failed.", requestId }, { status: 500 });
}

return NextResponse.json({ id: data?.id, requestId }, { status: 200 });
```

**Outer try/catch to keep** (lines 146–152):
```typescript
} catch (err) {
  logError("broadcast request failed", err, requestId);
  return NextResponse.json(
    { error: "Broadcast failed.", requestId },
    { status: 500 }
  );
}
```

**Key change summary:** Drop `sanitize-html`, `getSupabaseClient`, `signUnsubscribeToken` imports and all their usage. Drop `html` from the Zod schema. Drop the subscriber for-loop and email_logs writes. Add `@react-email/render`, `DropNotificationEmail`, and the single `resend.broadcasts.create({ segmentId, ..., send: true })` call. Keep `authorize()` and all error handling structure verbatim.

---

### `lib/env.ts` (utility/config — add `RESEND_SEGMENT_ID` validation)

**Analog:** `lib/env.ts` (current file, lines 1–33) — self-analog. Follow the exact `getSquareEnv()` pattern for a new `getResendEnv()` function or add the var inline.

**Existing fail-fast pattern to copy** (lines 10–28):
```typescript
export function getSquareEnv(): SquareEnv {
  const host = process.env.SQUARE_HOST || "https://connect.squareup.com";
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  // ...
  if (!accessToken || !locationId || !frozenCategoryId || !sauceVariationId) {
    throw new Error(
      "Missing Square environment variables. Check SQUARE_ACCESS_TOKEN, ..."
    );
  }
  return { host, accessToken, ... };
}
```

**Alternate analog — `lib/supabase.ts` inline guard** (lines 10–15):
```typescript
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  throw new Error(
    "Missing Supabase environment variables. Check SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY."
  );
}
```

**Pattern to apply:** Add a `getResendEnv()` function (or add `RESEND_SEGMENT_ID` to an existing getter) following the same shape: read from `process.env`, check for presence, throw a descriptive `Error` if missing, return typed object. Named export, no default export. Do NOT inline raw `process.env.RESEND_SEGMENT_ID` access in the route — validate at startup via this helper.

**Interface shape to add**:
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

---

### `emails/DropNotificationEmail.tsx` (React Email component — new file, no codebase analog)

**No codebase analog exists.** Use the RESEARCH.md Pattern 3 (lines 215–268) as the template.

**Key conventions to follow from existing components:**
- Named export (not default export) — consistent with all `lib/` and `components/` files
- PascalCase component name + `Props` interface suffix — `DropNotificationEmail`, `DropNotificationEmailProps`
- No JSDoc comments
- Props interface declared without `export` (internal-only)
- File extension `.tsx` (required for JSX; vitest warning in RESEARCH.md — do NOT use `.ts`)

**Tailwind color palette reference** (from `tailwind.config.ts`): Use inline styles matching the site's `ember` (warm orange-red) and `smoke` (dark browns) palette — React Email components use inline `style` objects, not Tailwind classes.

**Critical JSX escaping concern for `{{{RESEND_UNSUBSCRIBE_URL}}}`** (RESEARCH.md Pitfall 3): Pass the unsubscribe href as a string literal via React Email's `<Link>` component. Test in Resend's email preview to confirm the placeholder survives `render()` unescaped. If escaping occurs, append the unsubscribe footer to the rendered HTML string after `render()` returns, outside the component.

**Structure skeleton from RESEARCH.md** (lines 215–258):
```tsx
import {
  Html, Head, Body, Container, Text, Button, Hr, Link
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
          <Text style={{ color: "#d1d1d1", fontSize: "16px" }}>{subject}</Text>
          <Button
            href="https://bigmattsbbq.com"
            style={{ backgroundColor: "#c84b11", color: "#fff", padding: "12px 24px" }}
          >
            Order Now
          </Button>
          <Hr style={{ borderColor: "#444", margin: "24px 0" }} />
          <Text style={{ color: "#888", fontSize: "12px" }}>
            <Link href="{{{RESEND_UNSUBSCRIBE_URL}}}" style={{ color: "#888" }}>
              Unsubscribe
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

**Rendering call (in broadcast route)**:
```typescript
// render() is async, returns Promise<string>
const html = await render(<DropNotificationEmail subject={subject} dropId={dropId} />);
```

---

### `tests/mailingList.test.ts` (test — rewrite)

**Primary analog:** `tests/mailingList.test.ts` (current file, lines 1–80) — keep the describe/it structure and request construction; replace mock implementation.

**Secondary analog:** `tests/drops.test.ts` (lines 1–74) — best example of `vi.doMock` + `vi.resetModules()` + dynamic import pattern for a non-Supabase module.

**Mock structure to keep** (current file, lines 18–24):
```typescript
describe("POST /api/mailing-list", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => {
    vi.doUnmock("../lib/supabase"); // CHANGE: doUnmock("resend") instead
    vi.doUnmock("server-only");
  });
```

**Request construction pattern to keep** (current file, lines 28–33):
```typescript
const req = new Request("http://localhost/api/mailing-list", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "test@example.com" })
});
const res = await POST(req);
```

**Dynamic import pattern to keep** (current file, line 27):
```typescript
const { POST } = await import("../app/api/mailing-list/route");
```

**Mock to REPLACE — swap Supabase mock for Resend mock**:
```typescript
// OLD (remove):
function buildMockClient(insertResult: InsertResult) { ... }
function mockSupabase(client) { vi.doMock("../lib/supabase", ...); }

// NEW:
const contactsCreateMock = vi.fn();

function mockResend(result: { data: { object: string; id: string } | null; error: { message: string } | null }) {
  contactsCreateMock.mockResolvedValue(result);
  vi.doMock("resend", () => ({
    Resend: class { contacts = { create: contactsCreateMock }; }
  }));
  vi.doMock("server-only", () => ({}));
}
```

**Tests to REPLACE** (current lines 25–79):

| Old test | New test |
|----------|----------|
| "returns 200 on successful insert" | "returns 200 when Resend contacts.create succeeds" |
| "returns 200 silently on duplicate email (23505)" | "returns 200 silently on duplicate (Resend upsert returns no error)" |
| "returns 400 on invalid email" | KEEP AS-IS — Zod validation unchanged |
| "returns 500 on unexpected Supabase error" | "returns 500 when Resend contacts.create returns an error" |

**afterEach cleanup — CHANGE**:
```typescript
afterEach(() => {
  vi.doUnmock("resend"); // was: vi.doUnmock("../lib/supabase")
  vi.doUnmock("server-only");
});
```

---

### `tests/broadcast.test.ts` (test — rewrite)

**Primary analog:** `tests/broadcast.test.ts` (current file, lines 1–149) — keep auth tests and request construction; replace subscriber/email mock infrastructure.

**Secondary analog:** `tests/drops.test.ts` (lines 1–74) — `vi.doMock` pattern for module-level mocking.

**Mock infrastructure to REPLACE — lines 3–27**:
```typescript
// OLD: resendSendMock, mockDeps with Supabase mailing_list + email_logs tables
// NEW:
const broadcastsCreateMock = vi.fn();

function mockDeps() {
  vi.doMock("resend", () => ({
    Resend: class { broadcasts = { create: broadcastsCreateMock }; }
  }));
  // Also mock @react-email/render to avoid JSX transform requirement in .test.ts
  vi.doMock("@react-email/render", () => ({
    render: vi.fn().mockResolvedValue("<html>mock</html>")
  }));
  vi.doMock("../emails/DropNotificationEmail", () => ({
    DropNotificationEmail: () => null
  }));
  vi.doMock("server-only", () => ({}));
}
```

**beforeEach to UPDATE** (lines 30–38) — remove `UNSUBSCRIBE_SECRET`, add `RESEND_SEGMENT_ID`:
```typescript
beforeEach(() => {
  vi.resetModules();
  broadcastsCreateMock.mockReset();
  broadcastsCreateMock.mockResolvedValue({ data: { id: "bcast_123" }, error: null });
  process.env.BROADCAST_SECRET = "correct-secret-xxxxxxxxxxxxxxxxxxxxxxxxx";
  process.env.RESEND_API_KEY = "re_test";
  process.env.RESEND_SEGMENT_ID = "seg_test_123";
  process.env.EMAIL_FROM = "Big Matt's BBQ <orders@bigmattsbbq.com>";
  // REMOVE: process.env.UNSUBSCRIBE_SECRET
});
```

**afterEach to UPDATE** (lines 40–44) — remove Supabase unmock, add react-email unmocks:
```typescript
afterEach(() => {
  vi.doUnmock("resend");
  vi.doUnmock("@react-email/render");
  vi.doUnmock("../emails/DropNotificationEmail");
  vi.doUnmock("server-only");
});
```

**Auth tests to KEEP** (lines 46–73, 133–148) — "returns 401 when Authorization header is missing", "returns 401 when bearer value is wrong", "returns 401 when BROADCAST_SECRET env var is unset". These are pure auth logic that does not touch the send path.

**Tests to DELETE** (lines 91–131): "strips `<script>` tags from html before sending" and "strips javascript: href from links before sending" — these test sanitize-html behavior on raw HTML input, which is removed entirely.

**Test "passes auth with correct bearer" to REWRITE** (lines 75–89) — now must include `subject` (required field), drop `html`:
```typescript
body: JSON.stringify({ subject: "Drop live" }) // was: { subject: "Drop live", html: "<p>Order now</p>" }
```

**Tests to ADD**:
```typescript
it("calls resend.broadcasts.create with segmentId, subject, and html on success", async () => {
  mockDeps();
  const { POST } = await import("../app/api/admin/broadcast/route");
  const req = new Request("http://localhost/api/admin/broadcast", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.BROADCAST_SECRET}`
    },
    body: JSON.stringify({ subject: "Drop is live" })
  });
  const res = await POST(req);
  expect(res.status).toBe(200);
  expect(broadcastsCreateMock).toHaveBeenCalledOnce();
  const call = broadcastsCreateMock.mock.calls[0][0];
  expect(call.segmentId).toBe("seg_test_123");
  expect(call.subject).toBe("Drop is live");
  expect(call.send).toBe(true);
  const body = await res.json();
  expect(body.id).toBe("bcast_123");
});

it("returns 500 when resend.broadcasts.create returns an error", async () => {
  mockDeps();
  broadcastsCreateMock.mockResolvedValue({ data: null, error: { message: "segment not found" } });
  const { POST } = await import("../app/api/admin/broadcast/route");
  const req = new Request("http://localhost/api/admin/broadcast", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.BROADCAST_SECRET}`
    },
    body: JSON.stringify({ subject: "Drop is live" })
  });
  const res = await POST(req);
  expect(res.status).toBe(500);
});

it("returns 400 on missing subject", async () => {
  mockDeps();
  const { POST } = await import("../app/api/admin/broadcast/route");
  const req = new Request("http://localhost/api/admin/broadcast", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.BROADCAST_SECRET}`
    },
    body: JSON.stringify({ dropId: "d1" }) // subject missing
  });
  const res = await POST(req);
  expect(res.status).toBe(400);
});
```

**Note on JSX in test file:** The broadcast route imports `DropNotificationEmail` and calls `render(<DropNotificationEmail .../>)`. The test file must be `.test.ts` (not `.tsx`). The `vi.doMock("@react-email/render", ...)` mock intercepts `render()` before JSX executes, so no JSX transform is needed in the test file itself. The `DropNotificationEmail` module mock returns `null` from the component, which the mocked `render()` ignores.

---

### Files to DELETE (no pattern needed)

| File | Deletion reason |
|------|-----------------|
| `lib/unsubscribeToken.ts` | D-10: JWT unsubscribe replaced by Resend native List-Unsubscribe |
| `app/api/unsubscribe/route.ts` | D-10: No app-layer unsubscribe handling needed |
| `app/unsubscribe/page.tsx` | D-10: No custom unsubscribe page needed |
| `tests/unsubscribeToken.test.ts` | Must be deleted alongside `lib/unsubscribeToken.ts` (RESEARCH.md Pitfall 6) |

---

## Shared Patterns

### try/catch + logError + requestId (all route handlers)
**Source:** `app/api/mailing-list/route.ts` lines 12–48 / `app/api/admin/broadcast/route.ts` lines 39–153
**Apply to:** Both modified route files
```typescript
export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    // ... handler logic ...
  } catch (err) {
    logError("<route-name> failed", err, requestId);
    return NextResponse.json(
      { error: "<User-facing message>.", requestId },
      { status: 500 }
    );
  }
}
```

### Zod safeParse at API boundary (all route handlers)
**Source:** `app/api/mailing-list/route.ts` lines 8–24
**Apply to:** Both modified route files
```typescript
const schema = z.object({ /* ... */ });
const parsed = schema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json(
    { error: "Invalid <entity>.", requestId },
    { status: 400 }
  );
}
```

### Named exports (all lib/ and emails/ files)
**Source:** Every file in `lib/` — `getSquareEnv`, `getSupabaseClient`, `logError`, etc.
**Apply to:** `lib/env.ts` additions, `emails/DropNotificationEmail.tsx`
- Use `export function` / `export interface` — never `export default`
- Exception: Next.js page files (`app/` pages) use `export default` per framework convention

### Fail-fast env validation
**Source:** `lib/env.ts` lines 10–29 (`getSquareEnv`) and `lib/supabase.ts` lines 10–15
**Apply to:** New `getResendEnv()` function in `lib/env.ts`
```typescript
// Read → check → throw → return typed object
const apiKey = process.env.RESEND_API_KEY;
const segmentId = process.env.RESEND_SEGMENT_ID;
if (!apiKey || !segmentId) {
  throw new Error("Missing Resend environment variables. Check RESEND_API_KEY and RESEND_SEGMENT_ID.");
}
return { apiKey, segmentId };
```

### vi.doMock + vi.resetModules + dynamic import (test files)
**Source:** `tests/mailingList.test.ts` lines 13–16, 19, 27 and `tests/drops.test.ts` lines 70–74, 77, 149
**Apply to:** Both rewritten test files
```typescript
beforeEach(() => vi.resetModules());  // isolate module registry per test
// mock BEFORE dynamic import:
vi.doMock("resend", () => ({ Resend: class { ... } }));
vi.doMock("server-only", () => ({}));
const { POST } = await import("../app/api/.../route");
// afterEach: doUnmock every mocked module
```

---

## `.env.example` Changes

**Source for pattern:** Existing `.env.example` lines 19–28 (Phase 5 comment block)

**Changes required:**
1. Remove `UNSUBSCRIBE_SECRET=` line
2. Replace the Phase 5 comment block:
```bash
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
With:
```bash
# Phase 5 — broadcast
# BROADCAST_SECRET gates the admin broadcast API. Rotate freely. Min 16 chars.
BROADCAST_SECRET=

# Phase 8 — Resend Contacts + Broadcasts
# RESEND_SEGMENT_ID: obtain from Resend dashboard → Audiences → Segments.
# Required for POST /api/admin/broadcast. Not needed for subscriber signups.
# Unsubscribes are handled natively by Resend (List-Unsubscribe header).
RESEND_SEGMENT_ID=
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `emails/DropNotificationEmail.tsx` | React Email component | transform | No email components exist in the codebase. Use RESEARCH.md Pattern 3 (lines 215–258) as the template. |

---

## Metadata

**Analog search scope:** `app/api/`, `lib/`, `tests/`, root config files
**Files read:** 9 source files + 2 planning docs
**Pattern extraction date:** 2026-05-07
