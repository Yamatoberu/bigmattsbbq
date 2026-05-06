# Code Review — Big Matt's BBQ
**Reviewed:** May 6, 2026
**Reviewer:** Claude (Clean Code / senior dev lens)
**Scope:** All TypeScript source in `app/`, `components/`, `lib/`, and `tests/`
**Framework:** Robert C. Martin's *Clean Code* principles — SRP, DRY, minimal surface, no dead code, clear intent

---

## Severity Legend
- 🔴 **Critical** — Security risk or data-integrity bug; fix before the next drop
- 🟠 **High** — Correctness bug or significant maintainability risk
- 🟡 **Medium** — Code smell with real operational risk or will hurt the next dev
- 🟢 **Low** — Polish, clarity, or minor structural improvement

---

## Issue 1 — `/api/test-seed` Route Has No Access Control

**Severity:** 🔴 Critical
**File:** `app/api/test-seed/route.ts`

### Problem
The `/api/test-seed` GET route returns raw database rows — every drop record plus pickup option capacity — with zero authentication or environment check. Compare with `/api/dev/set-inventory`, which correctly gates on `env.environment !== "sandbox"` before executing. `test-seed` has no such guard, meaning anyone who discovers the URL can query live drop capacity and internal IDs in production.

The route also accesses the first drop row with `drops?.[0]?.id` without ordering by `created_at`, so on a multi-drop database it returns a non-deterministic record.

### Fix
Add the same sandbox guard used in `dev/set-inventory`:

```ts
export async function GET() {
  const requestId = crypto.randomUUID();
  try {
    const env = getSquareEnv();
    if (env.environment !== "sandbox") {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    // ... rest of handler
  }
}
```

If this route is no longer needed, delete it entirely. Developer scaffolding that ships to production is a recurring source of information leakage.

---

## Issue 2 — Capacity Release Logic Is Duplicated Four Times in the Checkout Route

**Severity:** 🔴 Critical (DRY + correctness)
**File:** `app/api/checkout/route.ts`

### Problem
The pattern of releasing all reserved capacity slots appears four times (approximately lines 137, 195, 265, 315, and inside the outer catch at 345). Each copy is:

```ts
for (const r of reserved) {
  await supabase.rpc("release_pickup_slot", {
    p_drop_id: parsed.data.dropId,
    p_pickup_option_id: parsed.data.pickupOptionId,
    p_product_name: r.productName,
    p_quantity: r.quantity
  });
}
```

Two compounding problems:

1. **DRY violation** — adding a field to the RPC (e.g., a request ID for audit logging) requires editing four places. They've already started to drift: the outer catch block uses the same structure, but the in-function copies are slightly different call sites.

2. **Sequential `await` in a loop** — releases run one at a time. If any individual RPC call fails mid-loop, the remaining slots are not released and remain permanently reserved. There's no error handling on the release calls; failures are silently swallowed.

### Fix
Extract a helper that runs all releases in parallel and logs any failures:

```ts
async function releaseReserved(
  supabase: ReturnType<typeof getSupabaseClient>,
  reserved: Array<{ productName: string; quantity: number }>,
  dropId: string,
  pickupOptionId: string,
  requestId: string
) {
  const results = await Promise.allSettled(
    reserved.map((r) =>
      supabase.rpc("release_pickup_slot", {
        p_drop_id: dropId,
        p_pickup_option_id: pickupOptionId,
        p_product_name: r.productName,
        p_quantity: r.quantity
      })
    )
  );
  for (const result of results) {
    if (result.status === "rejected") {
      logError("release_pickup_slot failed", result.reason, requestId);
    }
  }
}
```

Replace all four callsites with `await releaseReserved(supabase, reserved, ...)`.

---

## Issue 3 — Nested `<main>` Elements Remain on Three Pages

**Severity:** 🟠 High
**Files:** `app/layout.tsx:41`, `app/checkout/page.tsx:21`, `app/confirmation/page.tsx:13`, `app/orders/page.tsx:5`
**Status:** Previously logged as "DONE" in UI_review.md — this is a regression

### Problem
`app/layout.tsx` wraps `{children}` in `<main>`:

```tsx
<main>{children}</main>
```

Three page components then render their own `<main>` as their root element, creating invalid nested `<main>` markup:

- `app/checkout/page.tsx` — `<main className="bg-ember-radial bg-grain">`
- `app/confirmation/page.tsx` — `<main className="section-spacing bg-ember-radial bg-grain">`
- `app/orders/page.tsx` — `<main className="section-spacing bg-ember-radial bg-grain">`

The HTML5 spec allows only one `<main>` per document. The UI review (Issue 2) noted this as fixed, but the layout still uses `<main>` while these pages retained their own.

### Fix (two options — pick one consistently)

**Option A** — Change the layout wrapper to `<div>`:
```diff
- <main>{children}</main>
+ <div id="page-content">{children}</div>
```
Keep the per-page `<main>` elements as-is. This is the pattern the UI review described.

**Option B** — Remove `<main>` from the individual page files:
Replace `<main className="...">` with `<div className="...">` in checkout, confirmation, and orders pages. The layout's `<main>` becomes the single landmark.

Both are valid; Option A is the more common convention in Next.js App Router projects. Pick one and apply it consistently — the About, Contact, and Catering pages currently use `<section>` as their root (which is fine), so Option A only requires fixing the three pages above.

---

## Issue 4 — `CartContext` `useMemo` Has an Incomplete Dependency Array

**Severity:** 🟠 High
**File:** `components/cart/CartContext.tsx:75-78`

### Problem
```ts
const value = useMemo(
  () => ({ items, isReady, selectedPackageId, addItem, addItems, setQuantity, removeItem, setPackage, clear }),
  [items, isReady, selectedPackageId]   // ← six functions are missing
);
```

Six callback functions (`addItem`, `addItems`, `setQuantity`, `removeItem`, `setPackage`, `clear`) are captured in the memoized value but are not in the dependency array. React's exhaustive-deps rule flags this as a bug. When the component re-renders, the callbacks are recreated as new function references, but the memoized `value` object is not updated because the listed dependencies haven't changed.

This currently doesn't cause visible bugs only because all callbacks either close over `setItems` (a stable `useState` setter) or `setSelectedPackageId`. But it is a latent correctness issue — if any callback is refactored to close over a stateful value, it will silently read stale state.

### Fix
Either wrap each callback in `useCallback` and add them to the dependency array, or switch to `useReducer`, which produces stable dispatch references:

```ts
// Option A: useCallback + correct deps
const addItem = useCallback((item: CartItem) => {
  setItems((prev) => mergeCartItems(prev, [item]));
}, []); // empty deps: only closes over stable setter

const value = useMemo(
  () => ({ items, isReady, selectedPackageId, addItem, addItems, setQuantity, removeItem, setPackage, clear }),
  [items, isReady, selectedPackageId, addItem, addItems, setQuantity, removeItem, setPackage, clear]
);
```

---

## Issue 5 — `CheckoutClient` Compares an Item ID Against a Variation ID

**Severity:** 🟠 High
**File:** `components/CheckoutClient.tsx:66-71`

### Problem
```ts
if (item.itemId === sauceVariationId) {
```

`sauceVariationId` (from `SQUARE_SAUCE_VARIATION_ID`) is a **variation** ID in Square's catalog — the specific SKU. `item.itemId` is a **catalog item** ID — the parent product. These are different namespaces and will never be equal. The inner loop (adding variation IDs to `ids`) therefore never executes via this branch.

The `sauceVariationId` is already added to `ids` on the previous line, so there is no current functional bug. However, this is confused reasoning about Square's data model: the code thinks it is collecting all variations of the sauce item but never actually does that search. It relies silently on the env var being a complete source of truth.

### Fix
Remove the dead `item.itemId === sauceVariationId` branch entirely. The name-based search below it (`normalizeMatch(item.name).includes("sauce")`) is the correct approach:

```ts
const sauceVariationIds = useMemo(() => {
  const ids = new Set<string>([sauceVariationId].filter(Boolean));
  for (const item of frozenItems) {
    if (normalizeMatch(item.name).includes("sauce")) {
      for (const variation of item.variations) {
        ids.add(variation.variationId);
      }
    }
  }
  return Array.from(ids);
}, [frozenItems, sauceVariationId]);
```

---

## Issue 6 — Broadcast Emails Are Sent Sequentially (Will Time Out at Scale)

**Severity:** 🟡 Medium
**File:** `app/api/admin/broadcast/route.ts:93`

### Problem
```ts
for (const subscriber of list) {
  // ...
  const { data, error: sendErr } = await resend.emails.send({ ... });
  // ...
  await supabase.from("email_logs").insert({ ... });
}
```

Each subscriber's email is sent and logged one at a time before moving to the next. At 200ms per send + 50ms per log write, 100 subscribers takes ~25 seconds. Vercel's default serverless timeout is 10 seconds on the hobby plan. At current small list size this works; once the list grows past ~30–40 subscribers it will start timing out mid-broadcast, leaving the list partially notified with no way to know who received it.

### Fix
Parallelize with `Promise.allSettled`, then batch-insert the log records:

```ts
const results = await Promise.allSettled(
  list.map(async (subscriber) => {
    const token = await signUnsubscribeToken(subscriber.email);
    const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
    const finalHtml = buildEmailHtml(html, unsubscribeUrl);
    const { data, error: sendErr } = await resend.emails.send({ ... });
    return { subscriber, resendId: data?.id ?? null, failed: Boolean(sendErr) };
  })
);

// Batch log insert
const logRows = results.map((r) =>
  r.status === "fulfilled"
    ? { recipient: r.value.subscriber.email, template, status: r.value.failed ? "failed" : "sent", resend_id: r.value.resendId }
    : { recipient: "unknown", template, status: "failed", resend_id: null }
);
await supabase.from("email_logs").insert(logRows);
```

Note: Resend's free tier has a rate limit of ~10 req/s. If the list grows large, implement batching with a small delay between groups.

---

## Issue 7 — `UNSUBSCRIBE_SECRET` Falls Back to `BROADCAST_SECRET`

**Severity:** 🟡 Medium
**File:** `lib/unsubscribeToken.ts:7`

### Problem
```ts
const secret = process.env.UNSUBSCRIBE_SECRET || process.env.BROADCAST_SECRET;
```

`BROADCAST_SECRET` controls who can call the admin broadcast API. `UNSUBSCRIBE_SECRET` signs JWTs that are emailed to subscribers with a 30-day expiry. These two secrets have fundamentally different rotation semantics:

- Rotating `BROADCAST_SECRET` is routine and should happen whenever the secret is suspected compromised.
- Rotating `UNSUBSCRIBE_SECRET` immediately invalidates every unsubscribe link sent in the last 30 days, causing subscribers who try to unsubscribe to see "This link has expired" — the worst possible UX for someone trying to opt out.

Coupling them means a forced rotation of `BROADCAST_SECRET` (e.g., after a credential leak) silently breaks all outstanding unsubscribe links.

### Fix
Require `UNSUBSCRIBE_SECRET` as a separate, independent variable:

```ts
function getSecret(): Uint8Array {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "Missing or too-short UNSUBSCRIBE_SECRET. Set it in .env.local (min 32 chars). Do NOT reuse BROADCAST_SECRET."
    );
  }
  return new TextEncoder().encode(secret);
}
```

Update `.env.example` to document both secrets with a note explaining they must be independent.

---

## Issue 8 — `confirmation/page.tsx` Uses Synchronous `searchParams` (Next.js 15+ Breaking Change)

**Severity:** 🟡 Medium
**File:** `app/confirmation/page.tsx:6-9`

### Problem
```ts
interface ConfirmationPageProps {
  searchParams: { orderId?: string; pickupNote?: string };
}

export default function ConfirmationPage({ searchParams }: ConfirmationPageProps) {
  const pickupNote = searchParams.pickupNote || "Pickup scheduled";
```

In Next.js 15+, `searchParams` is a `Promise` that must be awaited. CLAUDE.md states the project is on Next.js `^16.1.6`. Accessing `searchParams` synchronously without `await` will generate a build warning in 15 and is deprecated — in future major versions it becomes an error.

### Fix
```ts
export default async function ConfirmationPage({
  searchParams
}: {
  searchParams: Promise<{ orderId?: string; pickupNote?: string }>;
}) {
  const { orderId = "", pickupNote = "Pickup scheduled" } = await searchParams;
```

Apply the same fix to any other pages that access `searchParams` (currently only `confirmation`).

---

## Issue 9 — `normalizeMatch` Is Duplicated Between `lib/cart.ts` and `CheckoutClient.tsx`

**Severity:** 🟡 Medium
**Files:** `lib/cart.ts:17`, `components/CheckoutClient.tsx:16`

### Problem
An identical private function exists in both files:

```ts
// lib/cart.ts
function normalizeMatch(value: string) {
  return value.trim().toLowerCase();
}

// components/CheckoutClient.tsx
function normalizeMatch(value: string) {
  return value.trim().toLowerCase();
}
```

If the normalization logic changes (e.g., adding `.replace(/\s+/g, " ")` to collapse internal whitespace), both copies need to be updated. `lib/cart.ts` already exports `resolvePackageToCartItems`, which uses this function internally — the next caller (`CheckoutClient`) duplicated instead of exporting.

### Fix
Export the function from `lib/cart.ts` and import it in `CheckoutClient.tsx`:

```ts
// lib/cart.ts
export function normalizeMatch(value: string) {
  return value.trim().toLowerCase();
}
```

---

## Issue 10 — IIFE Inside Order Payload Obscures Business Logic

**Severity:** 🟡 Medium
**File:** `app/api/checkout/route.ts:236-243`

### Problem
```ts
line_items: [
  ...cart.map((item) => ({ ... })),
  ...((() => {
    const pkg = parsed.data.packageId
      ? PACKAGES.find((p) => p.id === parsed.data.packageId)
      : undefined;
    return pkg?.bundleVariationId
      ? [{ quantity: "1", catalog_object_id: pkg.bundleVariationId, base_price_money: { amount: 0, currency: "USD" } }]
      : [];
  })())
]
```

An immediately-invoked function expression nested inside an array spread inside an object literal inside a function argument is the maximum legal nesting of complexity in one expression. The reader must unwind four levels of indirection to understand: "if this checkout has a package ID and that package has a bundle variation, include a $0 bundle line item."

This is a single, simple conditional that deserves a named variable.

### Fix
```ts
const bundleLineItems = (() => {
  if (!parsed.data.packageId) return [];
  const pkg = PACKAGES.find((p) => p.id === parsed.data.packageId);
  if (!pkg?.bundleVariationId) return [];
  return [{ quantity: "1", catalog_object_id: pkg.bundleVariationId, base_price_money: { amount: 0, currency: "USD" } }];
})();

// Then in the order body:
line_items: [...cart.map((item) => ({ ... })), ...bundleLineItems]
```

Or eliminate the IIFE entirely:

```ts
const pkg = parsed.data.packageId
  ? PACKAGES.find((p) => p.id === parsed.data.packageId)
  : undefined;
const bundleLineItems = pkg?.bundleVariationId
  ? [{ quantity: "1", catalog_object_id: pkg.bundleVariationId, base_price_money: { amount: 0, currency: "USD" } }]
  : [];
```

---

## Issue 11 — Catering FAQ Section Duplicates `SectionHeader` Inline

**Severity:** 🟡 Medium
**File:** `app/catering/page.tsx:315-325`

### Problem
```tsx
<div className="mb-8 text-center">
  <p className="text-xs font-semibold uppercase tracking-[0.45em] text-[#f0c16a]">FAQs</p>
  <div className="section-title-wrap mt-3">
    <span className="section-title-line hidden md:block" />
    <h2 className="text-2xl font-semibold text-smoke-900 md:text-3xl" style={fontDisplay}>
      Everything you need to know
    </h2>
    <span className="section-title-line hidden md:block" />
  </div>
</div>
```

This is a verbatim copy of what `SectionHeader` renders. The component exists precisely for this. The `Faq` component on the homepage uses `<SectionHeader>` correctly; the catering page bypasses it.

### Fix
```tsx
import { SectionHeader } from "../../components/SectionHeader";

// Replace the inline block with:
<SectionHeader eyebrow="FAQs" title="Everything you need to know" />
```

---

## Issue 12 — `useActiveDrop` Polls Every 30 Seconds Regardless of Drop State

**Severity:** 🟡 Medium
**File:** `components/hooks/useActiveDrop.ts:36-41`

### Problem
```ts
useEffect(() => {
  void load();
  const id = setInterval(() => {
    void load();
  }, POLL_INTERVAL_MS); // 30,000ms
  return () => clearInterval(id);
}, [load]);
```

Every browser tab that visits the site issues one API call to `/api/drop` every 30 seconds for the entire session, regardless of whether a drop is active. During the weeks between drops — the majority of time — this generates steady background load on Supabase with zero user-facing value.

The `NavBar` component also calls `useActiveDrop()` independently, meaning every page load starts two polling loops.

### Fix
1. Stop polling once the drop is confirmed closed or absent. Restart polling only if a user action might cause the state to change (e.g., when the `OrderLanding` component is mounted):

```ts
useEffect(() => {
  void load();
  // Only poll if there's a chance things will change
  if (state.drop?.status !== "closed") {
    const id = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }
}, [load, state.drop?.status]);
```

2. Consider passing the `drop` state down via props or context from `OrderLanding` to `NavBar` instead of opening a second independent polling connection.

---

## Issue 13 — `Providers` Component Is Unnecessary Indirection

**Severity:** 🟢 Low
**File:** `app/providers.tsx`

### Problem
```tsx
export function Providers({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
```

`Providers` is a one-line wrapper that serves no purpose beyond wrapping `CartProvider`. It adds an extra file, an extra import, and an extra level to read through in `layout.tsx`. The `"use client"` directive it carries exists only because `CartProvider` needs it — that directive could live directly on `CartProvider`.

### Fix
Delete `app/providers.tsx` and import `CartProvider` directly in `app/layout.tsx`:

```tsx
import { CartProvider } from "../components/cart/CartContext";

// In RootLayout:
<CartProvider>
  <NavBar />
  <main>{children}</main>
  <Footer />
</CartProvider>
```

If additional global providers are added in the future, `providers.tsx` can be reintroduced at that point.

---

## Issue 14 — Magic Hex Colors Are Scattered Across Components

**Severity:** 🟢 Low
**Files:** Multiple — `OrderLanding.tsx`, `CheckoutClient.tsx`, `NavBar.tsx`, `catering/page.tsx`, `about/page.tsx`, etc.

### Problem
Colors like `#3a2a20`, `#16100c`, `#120c09`, `#f0c16a`, `#b31414`, `#1c140f`, and `#f0b8a8` appear as inline hex strings in dozens of components. The Tailwind config defines `ember` and `smoke` palettes, but the most frequently used colors — the gold accent, the card background, the warm border, the primary red — are not registered there.

Changing the card background color currently requires grepping for `#16100c` across 8+ files. The two colors are already *almost* tokenized (the dark card background exists as `smoke-100` conceptually, but `#16100c` is used where `smoke-100` or a registered `bg-card` token would be cleaner).

### Fix
Add the high-frequency colors to `tailwind.config.ts`:

```ts
colors: {
  // existing ember/smoke palettes...
  pit: {
    card: "#16100c",       // glass-card background
    border: "#3a2a20",     // most used border color
    accent: "#f0c16a",     // gold accent / eyebrow text
    surface: "#120c09",    // section backgrounds
    deep: "#0f0b08",       // darkest background
  }
}
```

Then replace inline hex strings with Tailwind classes: `bg-pit-card`, `border-pit-border`, `text-pit-accent`.

---

## Issue 15 — `formatPickupDate` Is Exported But Only Used Internally

**Severity:** 🟢 Low
**File:** `lib/drops.ts:5`

### Problem
```ts
export function formatPickupDate(isoDate: string): string {
```

`formatPickupDate` is exported but is only called within `fetchActiveDrop` inside the same file. Nothing else in the codebase imports it. Exporting a function expands the public API surface, signals to future readers that it is intentionally reusable, and makes future refactoring harder (removing it requires checking all importers).

### Fix
Remove the `export` keyword:
```ts
function formatPickupDate(isoDate: string): string {
```

---

## Issue 16 — Description Parsing in `FrozenItemCard` Is Fragile

**Severity:** 🟢 Low
**File:** `components/FrozenItemCard.tsx:25-37`

### Problem
```ts
item.description.startsWith("- ")
  ? item.description.split(/ - /).filter(Boolean).map(...)
```

This heuristic for detecting a list-formatted description will false-positive on any description that happens to start with `"- "` or contains ` - ` (e.g., "Pairs well with beer - great for tailgates"). The parsing is tightly coupled to a Square catalog formatting convention that has no enforcement mechanism.

### Fix
Use a controlled delimiter that won't appear in prose. Options:
- **Newline-separated**: Store multi-line descriptions in Square as separate paragraphs and split on `\n`
- **JSON structured field**: Store contents as `["3 Brisket Packs", "1 Pulled Pork Pack"]` in a custom attribute
- **Simple regex guard**: Use a more restrictive pattern that requires all list items to follow the `- ` convention, not just the first

At minimum, document the expected format in `lib/square.ts` next to `mapCatalogToFrozenItems` so future Square catalog updates don't silently break rendering.

---

## Summary: Prioritized Fix List

| Status | Priority | Issue | Severity | Effort | Files |
|--------|----------|-------|----------|--------|-------|
| TODO | 1 | `/api/test-seed` has no access control | 🔴 Critical | Low | `app/api/test-seed/route.ts` |
| TODO | 2 | Capacity release duplicated 4× in checkout route | 🔴 Critical | Medium | `app/api/checkout/route.ts` |
| TODO | 3 | Nested `<main>` persists on checkout/confirmation/orders pages | 🟠 High | Low | 3 page files + `app/layout.tsx` |
| TODO | 4 | `CartContext` `useMemo` has incomplete dependency array | 🟠 High | Low | `components/cart/CartContext.tsx` |
| TODO | 5 | `CheckoutClient` compares item ID to variation ID (dead branch / type confusion) | 🟠 High | Low | `components/CheckoutClient.tsx` |
| TODO | 6 | Broadcast emails sent sequentially — will time out at scale | 🟡 Medium | Medium | `app/api/admin/broadcast/route.ts` |
| TODO | 7 | `UNSUBSCRIBE_SECRET` falls back to `BROADCAST_SECRET` | 🟡 Medium | Low | `lib/unsubscribeToken.ts` |
| TODO | 8 | `confirmation/page.tsx` uses sync `searchParams` (deprecated in Next.js 15+) | 🟡 Medium | Low | `app/confirmation/page.tsx` |
| TODO | 9 | `normalizeMatch` duplicated in `lib/cart.ts` and `CheckoutClient.tsx` | 🟡 Medium | Low | Both files |
| TODO | 10 | IIFE inside order payload obscures intent | 🟡 Medium | Low | `app/api/checkout/route.ts` |
| TODO | 11 | Catering FAQ duplicates `SectionHeader` inline | 🟡 Medium | Low | `app/catering/page.tsx` |
| TODO | 12 | `useActiveDrop` polls indefinitely even when drop is inactive | 🟡 Medium | Low | `components/hooks/useActiveDrop.ts` |
| TODO | 13 | `Providers` is a one-line wrapper with no reason to exist | 🟢 Low | Low | `app/providers.tsx` + `app/layout.tsx` |
| TODO | 14 | Magic hex colors in components not registered in Tailwind config | 🟢 Low | Medium | Multiple components |
| TODO | 15 | `formatPickupDate` exported but only used internally | 🟢 Low | Trivial | `lib/drops.ts` |
| TODO | 16 | `FrozenItemCard` description parsing is brittle string heuristic | 🟢 Low | Medium | `components/FrozenItemCard.tsx` |

---

*Review conducted by static analysis of source files. Issues 1 and 2 are recommended for immediate attention before the next drop opens.*
