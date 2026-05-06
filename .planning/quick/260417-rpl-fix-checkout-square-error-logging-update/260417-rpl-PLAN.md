---
phase: quick
plan: 260417-rpl
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/logger.ts
  - app/api/checkout/route.ts
autonomous: true
requirements: []

must_haves:
  truths:
    - "logError output includes status and body fields when the error has them"
    - "Square API rejection details are logged before the squareError is re-thrown"
  artifacts:
    - path: lib/logger.ts
      provides: "Enhanced logError that duck-types status/body onto normalized output"
    - path: app/api/checkout/route.ts
      provides: "logError call in Square catch block before throw"
  key_links:
    - from: app/api/checkout/route.ts
      to: lib/logger.ts
      via: "logError(squareError) in inner catch block"
      pattern: "logError.*squareError"
---

<objective>
Improve Square error observability by (1) making logError emit status and body fields
when present on the error object, and (2) explicitly logging the SquareError in the
checkout route's inner catch block so the Square API rejection reason is captured before
the error is re-thrown and swallowed into the generic 500 message.

Purpose: Currently, Square API failures surface only as "Checkout failed" with no
indication of the HTTP status or response body returned by Square. These two changes
make root-cause analysis possible from logs alone.
Output: Updated lib/logger.ts and app/api/checkout/route.ts.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@lib/logger.ts
@app/api/checkout/route.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extend logError to emit status and body from duck-typed errors</name>
  <files>lib/logger.ts</files>
  <action>
Replace the existing `logError` function body so that after building `normalized` from
the `instanceof Error` check, it additionally duck-type checks the original `error`
value for `status` (number) and `body` (any shape) properties and spreads them into the
console.error output if present.

Use `'status' in (error as object)` / `'body' in (error as object)` style guards — no
imports. Do NOT change the function signature. Final shape emitted by console.error:

```
{ requestId, message, name, message (from Error), stack, status?, body? }
```

Concrete implementation:

```typescript
export function logError(message: string, error: unknown, requestId?: string) {
  const normalized = error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : { error };
  const extra: { status?: unknown; body?: unknown } = {};
  if (error !== null && typeof error === "object") {
    if ("status" in error) extra.status = (error as { status: unknown }).status;
    if ("body" in error) extra.body = (error as { body: unknown }).body;
  }
  console.error({ requestId, message, ...normalized, ...extra });
}
```
  </action>
  <verify>npm run build 2>&1 | grep -E "error TS|compiled"</verify>
  <done>lib/logger.ts compiles cleanly; the function spreads status and body when present</done>
</task>

<task type="auto">
  <name>Task 2: Log squareError in checkout route inner catch before re-throw</name>
  <files>app/api/checkout/route.ts</files>
  <action>
In the inner try/catch block that catches Square errors (lines ~315-326), insert a
`logError` call immediately before `throw squareError`. The catch variable is already
named `squareError`.

Replace:
```typescript
    } catch (squareError) {
      // Square call failed — release reserved capacity so the slot is not stranded.
      for (const r of reserved) {
        await supabase.rpc("release_pickup_slot", {
          p_drop_id: parsed.data.dropId,
          p_pickup_option_id: parsed.data.pickupOptionId,
          p_product_name: r.productName,
          p_quantity: r.quantity
        });
      }
      throw squareError;
    }
```

With:
```typescript
    } catch (squareError) {
      // Square call failed — release reserved capacity so the slot is not stranded.
      for (const r of reserved) {
        await supabase.rpc("release_pickup_slot", {
          p_drop_id: parsed.data.dropId,
          p_pickup_option_id: parsed.data.pickupOptionId,
          p_product_name: r.productName,
          p_quantity: r.quantity
        });
      }
      logError("Square API call failed", squareError, requestId);
      throw squareError;
    }
```

No imports needed — `logError` is already imported at the top of the file.
  </action>
  <verify>npm run build 2>&1 | grep -E "error TS|compiled"</verify>
  <done>app/api/checkout/route.ts compiles cleanly; Square errors are logged before re-throw</done>
</task>

</tasks>

<verification>
npm run build   # Must produce no TypeScript errors
npm run test    # Existing test suite must remain green
</verification>

<success_criteria>
- `npm run build` exits 0 with no TS errors
- `npm run test` exits 0
- logError in lib/logger.ts includes status/body duck-type spread
- Inner catch block in checkout route calls logError before throw
</success_criteria>

<output>
After completion, create `.planning/quick/260417-rpl-fix-checkout-square-error-logging-update/260417-rpl-SUMMARY.md`
</output>
