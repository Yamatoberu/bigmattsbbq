---
phase: 07-code-review-wave-2
reviewed: 2026-05-06T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - .env.example
  - app/layout.tsx
  - components/cart/CartContext.tsx
  - components/hooks/useActiveDrop.ts
  - lib/unsubscribeToken.ts
  - tests/unsubscribeToken.test.ts
  - tests/useActiveDrop.test.ts
findings:
  critical: 1
  warning: 4
  info: 1
  total: 6
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-05-06
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Seven files were reviewed covering a new `useActiveDrop` polling hook, a JWT-based unsubscribe token library, and supporting infrastructure (layout, cart context, env config, tests). The core logic in `lib/unsubscribeToken.ts` is correct. The most impactful bugs are: (1) a test isolation failure that renders the "different secret" test unreliable, and (2) a polling churn bug in `useActiveDrop` that restarts the interval on every successful fetch response. A font mismatch in the layout is also present. The `CartContext` localStorage deserialization continues to operate without runtime validation, which is a pre-existing data integrity gap.

---

## Critical Issues

### CR-01: Test for "different secret" silently passes due to missing module cache reset

**File:** `tests/unsubscribeToken.test.ts:29-36`

**Issue:** The test changes `process.env.UNSUBSCRIBE_SECRET` to a new value and then calls `await import("../lib/unsubscribeToken")` a second time, expecting the module to pick up the new secret. However, neither the vitest config (`vitest.config.ts`) nor the test file calls `vi.resetModules()` before the second import. Node's (and Vitest's) module cache returns the already-loaded module unchanged. `getSecret()` closes over `process.env` at call time — not at import time — so the *env read* actually would pick up the new value. The real bug is subtler: both the `signUnsubscribeToken` and `verifyUnsubscribeToken` destructured from these imports actually call `getSecret()` fresh on each invocation, so the env change *does* take effect at runtime. This means the test currently passes for the right reason. However, the test comment "reset module cache so verify picks up the new env" is wrong and creates a false maintenance signal: a future author may add module-level caching (e.g., caching the secret) and the test will silently continue passing while the behavior breaks, because `vi.resetModules()` was never added. This is classified Critical because the test documents a module-cache reset that never occurs, meaning it will fail to catch the bug it claims to guard against if the implementation ever caches the secret at module scope.

**Fix:**
```typescript
// tests/unsubscribeToken.test.ts — inside the "different secret" test
it("rejects a token signed with a different secret", async () => {
  const { signUnsubscribeToken } = await import("../lib/unsubscribeToken");
  const token = await signUnsubscribeToken("a@b.com");

  process.env.UNSUBSCRIBE_SECRET = "different-secret-at-least-32-characters-long-yyyyyyyyyyyyyy";
  vi.resetModules(); // actually flush the module cache before re-importing
  const { verifyUnsubscribeToken } = await import("../lib/unsubscribeToken");
  await expect(verifyUnsubscribeToken(token)).rejects.toThrow();
});
```

Add `import { vi } from "vitest";` at the top of the test file, and add `vi.resetModules()` in the `beforeEach` as well to prevent cross-test contamination from other `await import()` calls:

```typescript
beforeEach(() => {
  vi.resetModules();
  process.env.UNSUBSCRIBE_SECRET = "test-secret-at-least-32-characters-long-xxxxxxxxxxxxxxxxxxx";
});
```

---

## Warnings

### WR-01: Polling interval restarts on every successful fetch response

**File:** `components/hooks/useActiveDrop.ts:35-46`

**Issue:** The `useEffect` dep array is `[load, state.drop, state.drop?.status]`. Every time `load()` resolves successfully, `setState` is called with a new object `{ drop: data, isLoading: false, error: undefined }`. Even when the fetched `data` is identical to the previous `state.drop`, the new object reference is not the same as the old one, so React sees `state.drop` as changed and re-runs the effect. Re-running the effect calls `clearInterval` on the current interval and immediately starts a new one. The result is that the 30-second poll timer is reset to zero after every successful fetch — so the actual poll interval is `max(fetch_duration, 30s)` but the intent is `30s` between fetches. Under a fast network, this effectively never re-fetches until something external triggers a re-render.

Additionally, `state.error` is not factored into `shouldPoll`. When a fetch fails, `state.drop` retains its previous non-null value, so `shouldPoll` remains `true` and the interval keeps firing indefinitely even through repeated failures with no back-off.

**Fix:**
```typescript
useEffect(() => {
  void load();
  const status = state.drop?.status;
  const shouldPoll = state.drop !== null && status !== "closed" && !state.error;
  if (!shouldPoll) return;
  const id = setInterval(() => {
    void load();
  }, POLL_INTERVAL_MS);
  return () => clearInterval(id);
  // Use state.drop?.status and state.drop?.id (a stable scalar) instead of the
  // object reference to avoid restarting the interval on every fetch cycle.
}, [load, state.drop?.id, state.drop?.status, state.error]);
```

This replaces `state.drop` (object reference) with `state.drop?.id` (stable string scalar) so the effect only re-runs when the drop identity or status actually changes, not on every re-render with a new object reference.

### WR-02: Wrong body font loaded — Nunito Sans instead of Source Sans 3

**File:** `app/layout.tsx:3,15-18`

**Issue:** CLAUDE.md documents the body font as "Source Sans 3 (`--font-body`)" under both Architecture > Tailwind Theme and the Stack section. The layout imports `Nunito_Sans` from `next/font/google` and assigns it to `--font-body`. This is a factual mismatch: a different font family is loaded than what the project specifies. Whether this is an intentional change that was not reflected in CLAUDE.md, or an incorrect import, it means the site renders with the wrong body typeface.

**Fix:** Either restore `Source_Sans_3` as documented:
```typescript
import { Playfair_Display, Source_Sans_3 } from "next/font/google";

const sourceSans3 = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap"
});
```
Or update CLAUDE.md to document Nunito Sans as the intentional body font choice. The two must agree.

### WR-03: CartContext deserializes localStorage without runtime validation

**File:** `components/cart/CartContext.tsx:31`

**Issue:** `JSON.parse(stored) as CartItem[]` is a type-only cast with no runtime validation. Any value stored under the `big-matts-bbq-cart` key — malformed data, a prior schema version, or attacker-controlled content via XSS — is accepted without checking that each element has a non-empty `variationId` string and a positive integer `quantity`. Downstream code in `setQuantity` guards against `quantity <= 0` but does not guard against a missing `variationId`. Items with `variationId: ""` or `quantity: 0` loaded from storage would be silently included in cart state until a write occurs.

**Fix:**
```typescript
function isCartItemArray(value: unknown): value is CartItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as CartItem).variationId === "string" &&
        (item as CartItem).variationId.length > 0 &&
        typeof (item as CartItem).quantity === "number" &&
        (item as CartItem).quantity > 0
    )
  );
}

// In the useEffect:
const parsed: unknown = JSON.parse(stored);
if (isCartItemArray(parsed)) {
  setItems(parsed);
} else {
  setItems([]);
}
```

### WR-04: `verifyUnsubscribeToken` throws on invalid tokens but has no documented error contract

**File:** `lib/unsubscribeToken.ts:27-33`

**Issue:** `verifyUnsubscribeToken` is typed as `Promise<string>`, but it throws on expired tokens, tampered tokens, algorithm mismatches, and missing email payload. The `jose` library throws `JWTExpired`, `JWTInvalid`, and related error types that are subclasses of `Error`, but callers that pattern-match `error instanceof Error` will get a string that is the jose error message, not the original reason code. The current caller in `app/api/unsubscribe/route.ts` handles this correctly with a broad catch block, but the function's return type gives no indication it throws. A future caller that forgets the try/catch will propagate an unhandled rejection.

This is not a bug today, but it is a documentation gap that creates a trap for future callers.

**Fix:** Document the throwing behavior in a comment above the function (noting that the project convention forbids JSDoc, a brief inline comment is acceptable per project convention review):
```typescript
// Throws if the token is expired, tampered, or missing the email payload.
export async function verifyUnsubscribeToken(token: string): Promise<string> {
```
Alternatively, wrap the jose call and re-throw a consistent error type to give callers a single catch target.

---

## Info

### IN-01: `useActiveDrop` test file uses source-level string matching instead of exercising behavior

**File:** `tests/useActiveDrop.test.ts:1-70`

**Issue:** The test suite reads the hook's source file as a raw string and uses `source.includes(...)` and regex match counts to assert structural properties of the implementation (e.g., that `shouldPoll` appears exactly twice, that `setInterval` appears after `shouldPoll` in character offset order). This approach verifies source text layout, not behavior. It will pass after any whitespace or comment change that preserves the text, and it will fail spuriously if variable names are renamed or the code is reformatted. More critically, it does not detect the polling churn bug described in WR-01, because that bug stems from object reference identity — something source-text analysis cannot observe.

The comment in the file acknowledges the environment limitation ("The hook uses React hooks and cannot be rendered in a node environment"), but this constraint could be addressed by extracting the pure logic (the `shouldPoll` decision and interval management) into a testable helper, or by using a lightweight DOM environment (jsdom) in a separate vitest workspace config.

**Fix:** This is a design observation, not an immediate blocker. For the interval-restart bug fix (WR-01), add a test that exercises the `shouldPoll` logic directly — at minimum by instantiating the hook's internal decision function as a pure utility that can be unit-tested without React.

---

_Reviewed: 2026-05-06_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
