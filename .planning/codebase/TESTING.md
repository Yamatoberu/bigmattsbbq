# Testing Patterns

**Analysis Date:** 2026-04-03

## Test Framework

**Runner:**
- Vitest 4.x
- Config: `vitest.config.ts`
- Environment: `node` (not jsdom — no DOM or React testing)

**Assertion Library:**
- Vitest built-in (`expect`)

**Run Commands:**
```bash
npm test              # Run all tests once (vitest run)
npm run test:watch    # Interactive watch mode (vitest)
```

**Coverage:** No coverage configuration present; no coverage target enforced.

## Test File Organization

**Location:** All tests live in a top-level `tests/` directory, separate from source.

**Naming:** `{subjectName}.test.ts` — matching the function or module being tested, not the file name.
- `tests/inventoryJoin.test.ts` → tests `lib/normalizers.ts`
- `tests/packageMapping.test.ts` → tests `lib/cart.ts` (`resolvePackageToCartItems`)
- `tests/sauceBump.test.ts` → tests `lib/cart.ts` (`isSauceBumpNeeded`)

**Structure:**
```
tests/
├── inventoryJoin.test.ts
├── packageMapping.test.ts
└── sauceBump.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, it } from "vitest";
import { functionUnderTest } from "../lib/module";

describe("functionUnderTest", () => {
  it("describes what it does in plain English", () => {
    const result = functionUnderTest(input);
    expect(result).toBe(expectedValue);
  });
});
```

**Patterns:**
- `describe` block named after the exact exported function being tested
- `it` descriptions are plain English sentences starting with a verb — "adds remaining inventory to variations", "returns true when meat present and sauce missing"
- Arrange-Act-Assert with no setup helpers — all data constructed inline or as module-level constants
- No `beforeEach`/`afterEach` — each test is fully self-contained
- Single `expect` per test where possible

**Test data:** Declared as module-level `const` when shared across multiple tests in the file:
```typescript
const pkg: PackageConfig = { ... };
const frozenItems = [ ... ];

describe("resolvePackageToCartItems", () => {
  it("maps package config to variation ids", () => { ... });
});
```

## Mocking

**Framework:** None — no mocking library in use.

**Approach:** Tests call real functions with controlled inputs. No external services, no HTTP calls, no filesystem access — all tested functions are pure or near-pure computations.

**What is tested:** Only `lib/` pure utility functions:
- `joinInventoryCounts` (`lib/normalizers.ts`)
- `resolvePackageToCartItems` (`lib/cart.ts`)
- `isSauceBumpNeeded` (`lib/cart.ts`)

**What is NOT tested:**
- API route handlers (`app/api/**`) — no integration or API-level tests
- React components (`components/`) — no component tests
- Hooks (`components/hooks/`) — no hook tests
- Square API calls (`lib/square.ts`) — no mocked HTTP tests
- `lib/env.ts` — no env validation tests

## Fixtures and Factories

**No factory helpers.** Test data is declared as typed inline literals:

```typescript
// Module-level fixture (packageMapping.test.ts)
const frozenItems = [
  {
    itemId: "item-1",
    name: "Smoked Brisket",
    description: "",
    variations: [
      { variationId: "var-1", name: "1 lb", priceCents: 1200, currency: "USD", remaining: 10 }
    ]
  }
];
```

**IDs:** Use readable kebab-case strings — `"item-1"`, `"var-1"`, `"meat-1"`, `"sauce-1"` — not realistic Square IDs.

## Coverage

**Requirements:** None enforced — no coverage thresholds configured.

**Current coverage scope:** 3 test files covering 2 of 9 `lib/` modules. Large portions of the codebase have no test coverage (see below).

## Test Types

**Unit Tests:**
- The only test type present
- Test individual exported functions in isolation
- No external dependencies required to run

**Integration Tests:** Not present

**E2E Tests:** Not present

## Common Patterns

**Equality assertions:**
```typescript
// Primitive comparison
expect(result[0].variations[0].remaining).toBe(8);

// Deep equality for arrays/objects
expect(result).toEqual([
  { variationId: "var-1", quantity: 1 },
  { variationId: "var-2", quantity: 2 }
]);
```

**Edge case testing (observed in sauceBump.test.ts):**
```typescript
// Empty array input
it("returns false when no sauce ids are provided", () => {
  const result = isSauceBumpNeeded([{ variationId: "meat-1", quantity: 1 }], []);
  expect(result).toBe(false);
});

// Overloaded param (string vs string[])
it("supports multiple sauce variations", () => {
  const result = isSauceBumpNeeded([...], ["sauce-1", "sauce-2"]);
  expect(result).toBe(false);
});
```

**Default/missing data testing:**
```typescript
it("defaults missing inventory to zero", () => {
  const result = joinInventoryCounts(items, []);
  expect(result[0].variations[0].remaining).toBe(0);
});
```

## Adding New Tests

**Where to place:** `tests/{descriptiveName}.test.ts` — one file per logical function group, not per source file.

**What to test:** Pure functions in `lib/` are the appropriate test target. Functions that accept typed inputs and return typed outputs with no side effects.

**Vitest globals:** `describe`, `expect`, `it` must be explicitly imported from `"vitest"` (not available as globals — `tsconfig.json` includes `vitest/globals` types but `vitest.config.ts` does not set `globals: true`).

**Template for a new test file:**
```typescript
import { describe, expect, it } from "vitest";
import { myFunction } from "../lib/myModule";

describe("myFunction", () => {
  it("handles the normal case", () => {
    const result = myFunction(validInput);
    expect(result).toEqual(expectedOutput);
  });

  it("handles the edge case", () => {
    const result = myFunction(edgeInput);
    expect(result).toBe(fallbackValue);
  });
});
```

---

*Testing analysis: 2026-04-03*
