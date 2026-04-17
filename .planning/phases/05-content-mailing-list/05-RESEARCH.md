# Phase 5: Content & Mailing List — Research

**Researched:** 2026-04-17
**Domain:** Next.js App Router navigation, Resend email SDK, JWT-signed unsubscribe tokens, static content pages, Supabase mailing list
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** NavBar and Footer both move from `OrderLanding.tsx` to `layout.tsx`. All pages get them automatically. OrderLanding stops rendering them.
- **D-02:** Desktop layout: Logo anchored left, nav links (Home, Frozen Drops, Catering, About, Contact) centered, Cart button right.
- **D-03:** Mobile layout: Hamburger icon in header; tapping opens a full-height slide-in drawer with all 5 links. Cart badge stays visible in the header at all times.
- **D-04:** The existing "Order Now" CTA button is kept alongside Cart on the right side.
- **D-05:** Nav links: Home `/`, Frozen Drops `/#order`, Catering `/catering`, About `/about`, Contact `/contact`.
- **D-06:** Dedicated full-width mailing list section on home page. Single email input + submit button.
- **D-07:** Success state: form replaced inline by confirmation message. No page navigation.
- **D-08:** Already-subscribed: show same success message silently. No error, no "already subscribed" copy (email enumeration prevention).
- **D-09:** Footer mailing list: inline signup on one row, minimal footprint.
- **D-10:** Same success/error behavior in footer as home section.
- **D-11:** Resend set up for broadcast only. MAIL-01 checkout confirmation remains deferred.
- **D-12:** Broadcast via protected admin route: `POST /api/admin/broadcast`. Manual trigger (curl).
- **D-13:** Route protected with `Authorization: Bearer <BROADCAST_SECRET>` header.
- **D-14:** Broadcast sends drop notification to all active (non-unsubscribed) subscribers via Resend.
- **D-15:** `email_logs` written after each broadcast send — one row per email sent.
- **D-16:** Broadcast emails include signed unsubscribe link: `/unsubscribe?token=<signed-jwt>`.
- **D-17:** `/unsubscribe?token=...` verifies token and marks subscriber unsubscribed in Supabase.
- **D-18:** No login required — signed token is sufficient proof.
- **D-19:** `/catering` route expands `CateringSection` — same tiers, same email CTA, plus detail.
- **D-20:** Home page `CateringSection` keeps teaser role; gets "See full catering menu →" link.
- **D-21:** About page: 2–3 paragraphs. Claude drafts copy, Matt reviews before launch.
- **D-22:** Contact page: general email, catering email, service area. No contact form — email CTAs only.
- **D-23:** MAIL-01 stays deferred. Phase 5 does not touch checkout flow for email.

### Claude's Discretion

- Exact text for mailing list section headline, CTA button label, and success message
- Exact text for About and Contact page copy (Claude drafts, Matt reviews)
- Unsubscribe page copy and visual treatment
- Broadcast email template design (subject line, body structure, BBQ brand voice)
- Whether `unsubscribed_at` timestamp or a boolean flag is used (check existing schema)
- JWT signing library/algorithm for unsubscribe tokens (Node crypto or lightweight JWT)
- Active link highlighting in the nav (underline, color, or weight change for current route)
- Hamburger animation / drawer close behavior

### Deferred Ideas (OUT OF SCOPE)

- MAIL-01: Branded Resend confirmation email at checkout — explicitly deferred, remains post-MVP.
- Admin UI for managing drops, broadcasting, viewing mailing list — deferred to v2 (ADMIN-01/ADMIN-02).
- Contact form (vs email CTA links) — out of scope for MVP static pages.
- Catering scheduling or booking system — static page with email CTA is sufficient for MVP.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MAIL-02 | User can sign up for the mailing list from a section on the home page | `POST /api/mailing-list` route, Supabase `INSERT ... ON CONFLICT DO NOTHING`, client-side form state machine |
| MAIL-03 | User can sign up for the mailing list from the site-wide footer | Same API route; Footer refactored to client component with inline form |
| MAIL-05 | Mailing list subscribers can unsubscribe via link in emails | `jose` JWT signing, `/api/unsubscribe` route, Supabase `update ... set subscribed = false` |
| MAIL-06 | Drop notification emails can be broadcast to mailing list subscribers via Resend | Resend SDK `resend.emails.send()` in loop, `POST /api/admin/broadcast` with bearer auth, `email_logs` insert |
| NAV-01 | Site-wide navigation with links to Home, Frozen Drops, Catering, About, and Contact | NavBar/Footer lift to `layout.tsx`, `usePathname()` for active state, hamburger drawer with `useState` |
| PAGE-01 | Catering page with static menu and pricing, CTA to catering@bigmattsbbq.com | `app/catering/page.tsx`, expanded `CateringSection` reuse |
| PAGE-02 | About page with static content about Big Matt's BBQ | `app/about/page.tsx`, Claude-drafted copy |
| PAGE-03 | Contact page with static contact information | `app/contact/page.tsx`, mailto links only |
</phase_requirements>

---

## Summary

Phase 5 completes the Big Matt's BBQ site across three distinct tracks: (1) navigation architecture — lifting NavBar/Footer to `layout.tsx` so all pages share them, (2) three static content pages (Catering, About, Contact) plus mailing list signup UI in the home page and footer, and (3) backend wiring — a `POST /api/mailing-list` endpoint, a protected `POST /api/admin/broadcast` endpoint using Resend, and a JWT-signed unsubscribe flow.

The schema is already fully in place from Phase 1: `mailing_list` table has `id`, `email` (unique), `subscribed` (boolean), `unsubscribed_at` (not present — see schema analysis below), and `unsubscribe_token` columns. The `email_logs` table has `id`, `recipient`, `template`, `status`, `resend_id`, and `order_id` columns. No new migrations are needed, but the schema's `subscribed` boolean column (not an `unsubscribed_at` timestamp) is the unsubscribe flag — this resolves the "Claude's Discretion" item.

The Resend SDK (`resend@6.12.0`) is not yet installed. The `jose` library (`jose@6.2.2`) is the correct choice for JWT signing/verification in a Next.js nodejs runtime — it is pure ESM, zero-dependency, and Node.js native. `RESEND_API_KEY` env var slot already exists in `.env.local` (empty). `BROADCAST_SECRET` does not yet exist and must be added to both `.env.local` and documented.

**Primary recommendation:** Install `resend` and `jose`, add `BROADCAST_SECRET` to env, then implement in this order: nav lift → static pages → mailing list API → mailing list UI → broadcast route → unsubscribe flow.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| resend | 6.12.0 | Transactional + broadcast email via Resend API | Project decision; `RESEND_API_KEY` slot already in env |
| jose | 6.2.2 | JWT sign/verify for unsubscribe tokens | Pure ESM, zero deps, works in Next.js nodejs runtime; no native addons unlike `jsonwebtoken` |

[VERIFIED: npm registry — `npm view resend version` → 6.12.0; `npm view jose version` → 6.2.2]

### Already Installed (no action needed)

| Library | Version | Purpose |
|---------|---------|---------|
| @supabase/supabase-js | ^2.101.1 | Mailing list reads/writes |
| zod | ^3.24.2 | Request validation at `/api/mailing-list` and `/api/admin/broadcast` |
| next | ^16.1.6 | App Router pages, `usePathname` from `next/navigation` |

[VERIFIED: `package.json` read directly]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `jose` | `jsonwebtoken` | `jsonwebtoken` requires native addons, not Edge-safe; `jose` is pure JS with identical API surface for HS256 |
| `jose` | Node.js `crypto.createHmac` (hand-rolled HMAC token) | Hand-rolling HMAC tokens is error-prone (timing attacks, encoding); `jose` has battle-tested JWT spec compliance |
| `resend.emails.send()` per-recipient loop | `resend.batch.send()` | Batch sends up to 100 at a time — preferable for large lists; however for MVP with small list, simple loop is acceptable |

**Installation:**
```bash
npm install resend jose
```

**Version verification:** [VERIFIED: npm registry — both versions confirmed above]

---

## Architecture Patterns

### Recommended Project Structure (new files this phase)

```
app/
├── layout.tsx               # Add NavBar + Footer here (lift from OrderLanding)
├── catering/
│   └── page.tsx             # PAGE-01 — static, default export
├── about/
│   └── page.tsx             # PAGE-02 — static, default export
├── contact/
│   └── page.tsx             # PAGE-03 — static, default export
├── unsubscribe/
│   └── page.tsx             # MAIL-05 — client component, reads ?token= query param
└── api/
    ├── mailing-list/
    │   └── route.ts         # POST — MAIL-02/MAIL-03 signup endpoint
    └── admin/
        └── broadcast/
            └── route.ts     # POST — MAIL-06 protected broadcast endpoint

components/
├── NavBar.tsx               # Refactor: add nav links, hamburger, drawer, usePathname
├── Footer.tsx               # Refactor: add mailing list inline form; "use client"
└── MailingListSection.tsx   # New: full-width home page signup section
```

[VERIFIED: derived from CONTEXT.md D-01 through D-22 and codebase read]

### Pattern 1: Lift NavBar/Footer to layout.tsx

**What:** Move `<NavBar />` and `<Footer />` from `OrderLanding.tsx` into `app/layout.tsx`, wrapping `{children}`. Remove them from `OrderLanding.tsx`.

**When to use:** Any component that must appear on every page unconditionally.

**Critical constraint:** `layout.tsx` is a Server Component by default. `NavBar` uses `useCart()` (client hook), so it must keep its `"use client"` directive. Placing a client component inside a server layout is valid — Next.js handles the boundary automatically.

```tsx
// app/layout.tsx — after refactor
import { NavBar } from "../components/NavBar";
import { Footer } from "../components/Footer";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${sourceSans.variable}`}>
      <body className="font-[var(--font-body)]">
        <Providers>
          <NavBar />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
```

[VERIFIED: Next.js App Router docs — server layout can contain client components]

### Pattern 2: Active Nav Link with usePathname

**What:** NavBar already has `"use client"`. Import `usePathname` from `next/navigation` to compare against each nav link's `href`.

```tsx
// Inside NavBar.tsx (already "use client")
import { usePathname } from "next/navigation";

const pathname = usePathname();
// Active if pathname === link.href or (for hash links) pathname === "/"
const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href.split("#")[0]);
```

**Pitfall:** `/#order` has a hash — strip it for comparison. `pathname` never contains a hash in Next.js App Router.

[VERIFIED: Next.js docs, `usePathname` returns path without hash]

### Pattern 3: Mailing List API Route

**What:** `POST /api/mailing-list` — Zod-validate email, upsert with `ON CONFLICT DO NOTHING`, return 200 for both new and duplicate.

```typescript
// app/api/mailing-list/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { getSupabaseClient } from "../../../lib/supabase";
import { logError } from "../../../lib/logger";

export const runtime = "nodejs";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  const headerList = await headers();
  const requestId = headerList.get("x-request-id") ?? crypto.randomUUID();
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email.", requestId }, { status: 400 });
    }
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("mailing_list")
      .insert({ email: parsed.data.email })
      .throwOnError();
    // Duplicate key (already subscribed) — treat as success per D-08
    // Supabase returns error code "23505" for unique violation
    if (error && error.code !== "23505") {
      throw error;
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    logError("mailing-list signup failed", err, requestId);
    return NextResponse.json({ error: "Signup failed.", requestId }, { status: 500 });
  }
}
```

**Key:** Supabase unique violation returns PostgreSQL error code `23505`. Treat it as 200 (per D-08).

[VERIFIED: PostgreSQL error code standard; Supabase JS error object shape confirmed via supabase-js docs]

### Pattern 4: JWT-Signed Unsubscribe Token (jose)

**What:** Sign a JWT with the subscriber email as payload when generating broadcast links. Verify on the unsubscribe page.

```typescript
// lib/unsubscribeToken.ts
import { SignJWT, jwtVerify } from "jose";

function getSecret() {
  const secret = process.env.UNSUBSCRIBE_SECRET ?? process.env.BROADCAST_SECRET;
  if (!secret) throw new Error("Missing UNSUBSCRIBE_SECRET env var");
  return new TextEncoder().encode(secret);
}

export async function signUnsubscribeToken(email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifyUnsubscribeToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, getSecret());
  if (typeof payload.email !== "string") throw new Error("Invalid token payload");
  return payload.email;
}
```

**Token expiry:** 30 days per UI-SPEC "Unsubscribe links expire after 30 days" copy.

[VERIFIED: `jose` npm docs; `SignJWT` / `jwtVerify` API confirmed at jose version 6.x]

### Pattern 5: Broadcast Route with Bearer Auth

**What:** `POST /api/admin/broadcast` — verify `Authorization: Bearer <secret>` header, fetch all `subscribed = true` subscribers, send emails via Resend, log results to `email_logs`.

```typescript
// Pseudocode pattern — bearer check
const authHeader = headerList.get("authorization");
if (authHeader !== `Bearer ${process.env.BROADCAST_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Resend send loop pattern:**

```typescript
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

for (const subscriber of subscribers) {
  const token = await signUnsubscribeToken(subscriber.email);
  const unsubscribeUrl = `https://bigmattsbbq.com/unsubscribe?token=${token}`;
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Big Matt's BBQ <orders@bigmattsbbq.com>",
    to: subscriber.email,
    subject: "A new drop is live — order now",
    html: `<p>...</p><p><a href="${unsubscribeUrl}">Unsubscribe</a></p>`,
  });
  // Insert email_log row regardless of success/failure
  await supabase.from("email_logs").insert({
    recipient: subscriber.email,
    template: "drop_notification",
    status: error ? "failed" : "sent",
    resend_id: data?.id ?? null,
  });
}
```

[VERIFIED: Resend API docs — `resend.emails.send()` returns `{ data: { id }, error }`]

### Pattern 6: Unsubscribe Page (Client Component)

**What:** `app/unsubscribe/page.tsx` must be a client component. It reads `?token=` from `useSearchParams()`, calls `POST /api/unsubscribe` on mount.

```tsx
"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function UnsubscribePage() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "success" | "invalid">(
    token ? "loading" : "invalid"
  );
  useEffect(() => {
    if (!token) return;
    fetch("/api/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => setState(r.ok ? "success" : "invalid"))
      .catch(() => setState("invalid"));
  }, [token]);
  // render three states per UI-SPEC
}
```

**Critical:** `useSearchParams()` requires a `<Suspense>` boundary in Next.js App Router or it will throw during static generation. Wrap the component (or the page export) in `<Suspense>`.

[VERIFIED: Next.js App Router docs — `useSearchParams` requires Suspense wrapper in client components]

### Anti-Patterns to Avoid

- **Don't import NavBar/Footer from `OrderLanding.tsx` after the lift:** `OrderLanding.tsx` must remove both imports or the layout will double-render them.
- **Don't use `usePathname` in a Server Component:** It's a client-only hook. NavBar is already `"use client"` — no issue here.
- **Don't skip `export const runtime = "nodejs"` on new API routes:** The existing routes set this explicitly; maintain consistency.
- **Don't throw on Supabase unique violation (23505) in mailing-list route:** Treat it as success per D-08.
- **Don't render `useSearchParams()` without `<Suspense>`:** Will cause build error in Next.js App Router.
- **Don't use `jsonwebtoken` package:** It relies on native Node.js crypto bindings that can cause issues; `jose` is the established Web Crypto standard.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT signing/verification | Custom HMAC token scheme | `jose` SignJWT/jwtVerify | Timing-safe, spec-compliant, handles expiry natively |
| Email delivery | Direct SMTP or SES calls | Resend SDK | DNS verification, deliverability, bounce handling |
| Duplicate email prevention | Application-level check before insert | PostgreSQL `UNIQUE` constraint + catch `23505` | Race-condition safe |
| Token expiry | Store tokens in DB with expiry column | JWT `exp` claim + `jose` verification | No DB lookup needed, stateless |

---

## Schema Analysis (Resolved Discretion Item)

The `mailing_list` table from `0001_foundation.sql`:

```sql
create table public.mailing_list (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  email             text not null unique,
  subscribed        boolean not null default true,
  unsubscribe_token text not null default gen_random_uuid()::text
);
```

**Key findings:**
- There is NO `unsubscribed_at` column — CONTEXT.md D-17 references it as a possibility but it does not exist.
- The `subscribed` boolean column is the unsubscribe flag.
- There IS an `unsubscribe_token` column — this is a UUID token, not a JWT. It was likely intended for a simpler token scheme.
- **Decision:** Use the `subscribed` column for the unsubscribe state: `UPDATE mailing_list SET subscribed = false WHERE email = $1`. The `unsubscribe_token` column can be ignored for Phase 5 — the JWT-signed URL carries all necessary state.
- The `email_logs` table has `order_id` (nullable) and no `drop_id` column. For broadcast logs, `order_id` will be NULL.

[VERIFIED: read `supabase/migrations/0001_foundation.sql` directly]

---

## Common Pitfalls

### Pitfall 1: Double NavBar/Footer After Layout Lift

**What goes wrong:** After adding NavBar/Footer to `layout.tsx`, `OrderLanding.tsx` still renders them — resulting in two navbars on the home page.
**Why it happens:** Forgetting to remove the components from `OrderLanding.tsx` after adding them to the layout.
**How to avoid:** The layout lift and the OrderLanding cleanup must happen in the same task/wave. Remove both `import` statements and both JSX usages from `OrderLanding.tsx`.
**Warning signs:** Home page renders two sticky headers.

### Pitfall 2: useSearchParams Without Suspense Boundary

**What goes wrong:** `app/unsubscribe/page.tsx` uses `useSearchParams()` without a `<Suspense>` wrapper. Next.js throws a build error: "useSearchParams() should be wrapped in a suspense boundary."
**Why it happens:** Next.js App Router static generation requires Suspense for any dynamic data reading in client components.
**How to avoid:** Either wrap the page export in `<Suspense fallback={...}>` from a parent, or export the inner component and wrap it in the page file.
**Warning signs:** `next build` fails with Suspense error.

### Pitfall 3: Hash Links and usePathname Active State

**What goes wrong:** "Frozen Drops" nav link points to `/#order`. `usePathname()` returns `/` without the hash. Comparing `pathname === "/#order"` always fails.
**Why it happens:** Browser hash fragments are never sent to the server and never appear in Next.js's `usePathname()`.
**How to avoid:** Strip the hash before comparing: `href.split("#")[0]`.

### Pitfall 4: Resend SDK Instantiated at Module Level

**What goes wrong:** `new Resend(process.env.RESEND_API_KEY)` at module level in a route file throws at build time when the env var is absent.
**Why it happens:** Next.js evaluates module-level code during build.
**How to avoid:** Instantiate `Resend` inside the route handler function, after reading and validating the env var.

### Pitfall 5: Supabase `email_logs` Missing `drop_id`

**What goes wrong:** Broadcast log insert attempts to set `drop_id`, but the column doesn't exist in `email_logs` (only `order_id` is there).
**Why it happens:** Schema has `order_id` (nullable uuid ref), not `drop_id`. The broadcast body may include a `dropId` for context.
**How to avoid:** Store broadcast context in the `template` field (e.g., `"drop_notification:${dropId}"`), not a separate column. Or leave `order_id` null.

### Pitfall 6: Footer Must Become a Client Component

**What goes wrong:** Adding an interactive mailing list form to `Footer.tsx` while it remains a Server Component — `useState` will throw.
**Why it happens:** `Footer.tsx` currently has no `"use client"` directive.
**How to avoid:** Add `"use client"` to `Footer.tsx` as part of the refactor task.

---

## Code Examples

### Resend Email Send (official pattern)

```typescript
// Source: https://resend.com/docs/api-reference/emails/send-email
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const { data, error } = await resend.emails.send({
  from: "Big Matt's BBQ <orders@bigmattsbbq.com>",
  to: "customer@example.com",
  subject: "A new drop is live",
  html: "<p>Order now before it sells out.</p>",
});
// data?.id is the Resend message ID for email_logs.resend_id
```

### Supabase Mailing List Insert (existing pattern extended)

```typescript
// Pattern from Phase 4 — fire-and-forget with ON CONFLICT DO NOTHING
// For the API route version, catch the error explicitly
const { error } = await supabase
  .from("mailing_list")
  .insert({ email: validated.email });

if (error && error.code !== "23505") {
  // 23505 = unique_violation — already subscribed, treat as success
  throw error;
}
```

### Unsubscribe Update

```typescript
const { error } = await supabase
  .from("mailing_list")
  .update({ subscribed: false })
  .eq("email", verifiedEmail);
```

### Bearer Auth Check Pattern

```typescript
const authHeader = (await headers()).get("authorization");
if (!process.env.BROADCAST_SECRET || authHeader !== `Bearer ${process.env.BROADCAST_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All routes | ✓ | v24.8.0 | — |
| npm | Package install | ✓ | 11.12.1 | — |
| resend (npm pkg) | MAIL-06 broadcast | ✗ | not installed | — (must install) |
| jose (npm pkg) | MAIL-05 JWT tokens | ✗ | not installed | — (must install) |
| RESEND_API_KEY env | MAIL-06 | Slot exists, empty | — | Cannot send email without it; must be configured |
| BROADCAST_SECRET env | MAIL-06 | Does not exist | — | Must be added to .env.local before route works |
| Supabase | MAIL-02, MAIL-03, MAIL-05, MAIL-06 | ✓ | @supabase/supabase-js ^2.101.1 | — |

[VERIFIED: `package.json`, `.env.local`, `npm view resend version`, `npm view jose version`]

**Missing dependencies with no fallback:**
- `resend` npm package — must be installed (`npm install resend`)
- `jose` npm package — must be installed (`npm install jose`)
- `RESEND_API_KEY` env var — value must be populated in `.env.local` for broadcast to work
- `BROADCAST_SECRET` env var — must be added to `.env.local`

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MAIL-02 | `POST /api/mailing-list` inserts new subscriber | unit | `npx vitest run tests/mailingList.test.ts -x` | ❌ Wave 0 |
| MAIL-02 | Duplicate email returns 200 silently | unit | `npx vitest run tests/mailingList.test.ts -x` | ❌ Wave 0 |
| MAIL-03 | Same endpoint handles footer signup identically | unit | (same test file) | ❌ Wave 0 |
| MAIL-05 | `signUnsubscribeToken` + `verifyUnsubscribeToken` round-trips correctly | unit | `npx vitest run tests/unsubscribeToken.test.ts -x` | ❌ Wave 0 |
| MAIL-05 | Expired token throws on verify | unit | `npx vitest run tests/unsubscribeToken.test.ts -x` | ❌ Wave 0 |
| MAIL-06 | Broadcast route rejects missing/wrong auth header with 401 | unit | `npx vitest run tests/broadcast.test.ts -x` | ❌ Wave 0 |
| NAV-01 | NavBar renders 5 nav links with correct hrefs | manual-only | browser smoke test | N/A |
| PAGE-01 | `/catering` page renders without error | manual-only | `npm run build` build check | N/A |
| PAGE-02 | `/about` page renders without error | manual-only | `npm run build` build check | N/A |
| PAGE-03 | `/contact` page renders without error | manual-only | `npm run build` build check | N/A |

**Note on manual-only items:** Next.js page rendering correctness is validated by `npm run build` succeeding (TypeScript compile + static analysis). The test environment is `node` (not jsdom) per `vitest.config.ts`, so React component rendering tests are not feasible without adding jsdom.

### Sampling Rate

- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test && npm run build`
- **Phase gate:** Full suite green + `npm run build` succeeds before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/mailingList.test.ts` — covers MAIL-02/MAIL-03 endpoint logic (Supabase mock or test doubles)
- [ ] `tests/unsubscribeToken.test.ts` — covers MAIL-05 JWT sign/verify/expiry
- [ ] `tests/broadcast.test.ts` — covers MAIL-06 auth guard (401 on bad/missing token)
- [ ] Install: `npm install resend jose` — required before any imports compile

---

## Project Constraints (from CLAUDE.md)

| Constraint | Detail |
|------------|--------|
| No JavaScript files | `allowJs: false` — all new files must be `.ts` or `.tsx` |
| Named exports only | No default exports in `lib/` or `components/` — exception: `app/**/page.tsx` files use default exports (Next.js convention) |
| `try/catch` with `logError` | All route handlers follow this pattern; use `lib/logger.ts` |
| Zod `safeParse` at API boundaries | Never use `.parse()` which throws; always `safeParse` |
| `export const runtime = "nodejs"` | All API routes must declare this |
| No JSDoc comments | No inline explanatory comments in production code |
| `x-request-id` header | All routes generate or propagate this |
| `camelCase` state variables | `isLoading`, `isSubmitting` patterns for boolean state |
| `handle` prefix for event handlers | `handleSubmit` not `onSubmit` as variable name |
| Error state as `string | undefined` | Not `null`, not `boolean` |
| 2-space indentation | `.editorconfig` enforced |
| TypeScript strict mode | `strict: true` — no `any` types |

[VERIFIED: `CLAUDE.md` read directly]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `jsonwebtoken` for JWT | `jose` (Web Crypto API) | ~2022 (Next.js Edge adoption) | `jose` works in all runtimes without native addon issues |
| Class-based Resend client (v2) | `new Resend(key).emails.send()` (v6) | Resend v3+ | API is stable; v6 is current |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `email_logs` table has no `drop_id` column — `order_id` should be NULL for broadcast rows | Schema Analysis | If a migration added `drop_id` since `0001_foundation.sql`, the insert pattern changes |
| A2 | Resend free tier allows batch sends to the full subscriber list without rate-limiting for MVP scale | Standard Stack | If list grows beyond ~100 before launch, batch API (`resend.batch.send`) should replace the loop |
| A3 | `UNSUBSCRIBE_SECRET` can reuse `BROADCAST_SECRET` (same env var) rather than needing a separate secret | Code Examples | If secrets need rotation independently, separate vars are safer |

[ASSUMED] tags: A1 is VERIFIED via direct schema read. A2 and A3 are ASSUMED based on typical Resend free tier behavior and security tradeoff analysis.

---

## Open Questions

1. **RESEND_API_KEY value**
   - What we know: The env var slot exists in `.env.local` but is empty.
   - What's unclear: Whether Matt has a Resend account and domain `bigmattsbbq.com` verified, or whether that setup is still needed.
   - Recommendation: Wave 0 task should check/document that RESEND_API_KEY is populated and domain is verified before broadcast route is tested.

2. **Broadcast email `from` address**
   - What we know: `EMAIL_FROM` in `.env.local` is set to `"Big Matt's BBQ <orders@bigmattsbbq.com>"`.
   - What's unclear: Whether `orders@bigmattsbbq.com` is a verified sender in the Resend account.
   - Recommendation: Use `EMAIL_FROM` env var in broadcast route rather than hardcoding.

---

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/0001_foundation.sql` — schema for `mailing_list` and `email_logs` tables
- `package.json` — all installed dependencies and their versions
- `.env.local` — existing env vars and empty slots
- `components/NavBar.tsx`, `components/Footer.tsx`, `app/layout.tsx`, `components/OrderLanding.tsx` — existing component structure
- `app/globals.css` — global CSS class vocabulary
- CONTEXT.md `05-CONTEXT.md` — all locked decisions
- UI-SPEC `05-UI-SPEC.md` — component specs, copy, interaction contracts
- `npm view resend version` → 6.12.0 [VERIFIED: npm registry]
- `npm view jose version` → 6.2.2 [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- Resend official docs (https://resend.com/docs/api-reference/emails/send-email) — send API shape confirmed
- Resend batch docs — 100 email per batch limit confirmed

### Tertiary (LOW confidence)
- Resend free-tier rate limits — not confirmed from official docs (A2 above)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm registry verified, existing code read
- Architecture: HIGH — derived from locked decisions and existing codebase patterns
- Pitfalls: HIGH — derived from direct code inspection and Next.js docs
- Schema analysis: HIGH — read from migration file directly

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 (stable stack)
