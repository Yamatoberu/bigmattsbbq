---
phase: 09-foundation-subdomain-routing
reviewed: 2026-08-23T21:07:39Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - app/layout.tsx
  - app/sca/layout.tsx
  - app/sca/page.tsx
  - components/sca/ScaFooter.tsx
  - components/sca/ScaNavBar.tsx
  - docs/sca-subdomain-deployment.md
  - lib/database-sca.types.ts
  - lib/sca/routing.ts
  - lib/sca/scoring.ts
  - lib/supabase-sca.ts
  - proxy.ts
  - scripts/check-sca-schema.mjs
  - tests/sca-routing.test.ts
  - tests/sca-scoring.test.ts
  - tests/supabase-sca.test.ts
findings:
  critical: 0
  warning: 5
  info: 1
  total: 6
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-08-23T21:07:39Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Reviewed the foundation phase for the read-only SCA Tracker subdomain (`sca.bigmattsbbq.com`). The
core trust-boundary mechanics called out for extra scrutiny are sound: `proxy.ts` strips the
client-supplied `x-sca-area` header before conditionally re-setting it from a server-side host check,
so a client cannot forge the header to spoof the SCA layout; the rewrite only ever mutates
`pathname` on a cloned `NextUrl` (same origin), so there is no open-redirect vector; and
`lib/supabase-sca.ts` imports `"server-only"` at the top, which fails the build if the module is ever
pulled into a client bundle, and it is in fact only imported from one Server Component. `npm run test`
and `npx tsc --noEmit` both pass clean for the files in scope.

That said, several issues were found: an overly broad host-matching rule in `lib/sca/routing.ts`, an
error-message disclosure in `app/sca/page.tsx`, a broken/misleading generic type helper in the
generated `database-sca.types.ts`, an environment-variable-validation convention drift in
`lib/supabase-sca.ts`, and a real (if narrow) behavioral change to existing storefront routes caused
by the new unconditional `headers()` call in `app/layout.tsx`. None of these are exploitable for
data leakage or privilege escalation given the read-only, non-authenticated nature of this phase, so
none are classified Critical, but all are worth fixing before later phases build write paths or
authenticated routes on top of this foundation.

## Warnings

### WR-01: Host-matching rule accepts any hostname with the `sca.` prefix, not just subdomains of the real domain

**File:** `lib/sca/routing.ts:20`
**Issue:** `resolveScaRouting` treats a request as SCA-area traffic if the (attacker-controlled) `Host`
header, after stripping the port, equals the configured hostname **or** merely starts with the literal
string `"sca."`:
```ts
const isScaHost = hostname.length > 0 && (hostname === target || hostname.startsWith("sca."));
```
This is a prefix check, not a subdomain-of-`bigmattsbbq.com` check. `sca.evil.com`,
`sca.bigmattsbbq.com.attacker.net`, and `sca.` followed by anything at all will all match, even
though none of them are actually part of `bigmattsbbq.com`. The intent (per `docs/sca-subdomain-deployment.md`
and the D-03 test) is to also match a future `sca.staging.bigmattsbbq.com`-style subdomain, but the
current implementation matches unrelated domains entirely, not just subdomains of the real one. Since
this only currently affects which layout chrome renders (no auth/data implications yet), the impact
today is low, but it is the exact host-header trust boundary this review was asked to scrutinize, and
loosening it further in a later phase (e.g. gating a write endpoint on `isScaArea`) would turn this
into a real bypass.
**Fix:** Anchor the match to the actual base domain instead of a bare prefix, e.g.:
```ts
const baseDomain = "bigmattsbbq.com"; // or derive from `target`
const isScaHost =
  hostname.length > 0 &&
  (hostname === target || (hostname.startsWith("sca.") && hostname.endsWith(`.${baseDomain}`)));
```

### WR-02: Raw internal error message rendered to public visitors

**File:** `app/sca/page.tsx:23,37`
**Issue:** When the Supabase count query fails, the caught error's raw `.message` is stored and
rendered directly in the page body:
```ts
errorMessage = error instanceof Error ? error.message : "Unknown error loading SCA data.";
...
<p className="mt-3 text-sm text-smoke-800">{errorMessage}</p>
```
This follows the project's established `error instanceof Error ? error.message : ...` pattern (used
elsewhere for logging/API responses), but here the message is shown on a public, unauthenticated page
rather than logged or returned in a JSON API error. A misconfiguration (e.g. missing
`SUPABASE_SERVICE_ROLE_KEY`) would surface a message like `"Missing Supabase environment variables.
Check SUPABASE_URL ... and SUPABASE_SERVICE_ROLE_KEY."`, or a raw PostgREST/Postgres error, directly
to any site visitor — revealing internal architecture details unnecessarily.
**Fix:** Keep `logError(...)` for diagnostics, but show a generic user-facing message and drop the raw
error text from the rendered output:
```tsx
} catch (error) {
  logError("ScaIndexPage competition count query failed", error, "sca-index-ssr");
  errorMessage = "Unable to load SCA data right now.";
}
```

### WR-03: SCA Supabase env-var validation bypasses the established `lib/env.ts` convention

**File:** `lib/supabase-sca.ts:11-18`
**Issue:** Every other integration in this codebase centralizes required-env-var validation in
`lib/env.ts` (`getSquareEnv()`, `getResendEnv()`), called once at the top of each route/page handler
per the project's documented error-handling convention. `lib/supabase-sca.ts` instead validates
`SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` inline inside the singleton
getter, and `scripts/check-sca-schema.mjs` duplicates the same fallback/validation logic a third time.
This isn't a correctness bug today, but it's a convention drift that will make future SCA env
additions inconsistent with the rest of the codebase and harder to find/audit in one place.
**Fix:** Add a `getScaSupabaseEnv()` to `lib/env.ts` alongside `getSquareEnv()`/`getResendEnv()`,
and have both `lib/supabase-sca.ts` and `scripts/check-sca-schema.mjs` consume it (the script can
still fall back to `process.env` directly since it isn't part of the Next.js runtime, but the app-side
client should follow the established pattern).

### WR-04: Generated `Tables<>` / `TablesInsert<>` / `TablesUpdate<>` helpers silently resolve to `any` for this schema

**File:** `lib/database-sca.types.ts:359-441`
**Issue:** The bottom of this file is boilerplate copied from Supabase's default (`"public"` schema)
codegen output. It derives `DefaultSchema` via:
```ts
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]
```
but this `Database` type only has a `"sca"` key — there is no `"public"` schema. `Extract<keyof
Database, "public">` is `never`, so `DefaultSchema` is `never`, and indexing into it makes the
non-schema-qualified generic overloads (`Tables<"chef">`, `TablesInsert<"chef">`,
`TablesUpdate<"chef">`) resolve to `any` rather than a real row type or a compile error. Verified with
a standalone `tsc --strict` check: `Tables<"chef">` satisfies `0 extends (1 & Tables<"chef">)`, i.e.
it is `any`, not `never` and not a real `chef` row shape. Nothing in the current codebase calls these
generics without the `{ schema: "sca" }` qualifier (the one live usage in
`tests/sca-scoring.test.ts` goes through `Database["sca"]["Tables"]["score"]["Row"]` directly, which
is unaffected), so this isn't causing a bug today — but it's a landmine: a future developer who
naturally reaches for `Tables<"chef">` (the form used throughout `lib/database.types.ts` for the
public schema) will get silent `any`, defeating the entire purpose of the generated types with zero
compiler feedback.
**Fix:** Either delete the unused non-schema-qualified overloads from this file (only the
schema-qualified `Tables<{ schema: "sca" }, "chef">` form is valid here), or add a comment at the top
of the generic section noting that the single-argument form is non-functional for this file and the
`{ schema: "sca" }` form must always be used.

### WR-05: `headers()` in the root layout opts previously-static storefront pages into full dynamic rendering

**File:** `app/layout.tsx:38`
**Issue:** `RootLayout` now unconditionally calls `await headers()` to read `SCA_AREA_HEADER` and
decide whether to render the storefront `NavBar`/`Footer`. In the Next.js App Router, calling a
dynamic API like `headers()` anywhere in a layout opts the *entire* subtree under that layout into
dynamic rendering — not just the pages that already declare `export const dynamic = "force-dynamic"`.
Checking every `app/**/page.tsx`, `/` , `/checkout`, and `/sca` already declared `force-dynamic`
before this phase, but `/about`, `/contact`, `/catering`, `/confirmation`, and `/orders` did not, and
were previously eligible for static generation. They will now be forced into per-request dynamic
rendering purely as a side effect of the root layout's new `headers()` call, even though none of
those pages need per-request data. This is a real, silent behavior change to existing storefront
routes — exactly the risk flagged for this review — even though the pages still render correct
content (nothing is functionally broken, but the previously-static routes lose static optimization
without any comment or decision record explaining the tradeoff).
**Fix:** Avoid making the whole tree dynamic to solve a purely presentational (nav/footer visibility)
concern. The `/sca` area already has its own `app/sca/layout.tsx` rendering `ScaNavBar`/`ScaFooter`
independently — consider using Next.js route groups (e.g. a `(storefront)` group that owns
`NavBar`/`Footer` and wraps only the non-SCA pages) so `RootLayout` never needs to branch on the
request at all, restoring static-generation eligibility for `/about`, `/contact`, `/catering`,
`/confirmation`, and `/orders`.

## Info

### IN-01: Hardcoded `/sca` nav link breaks the "clean subdomain URL" goal when already on the subdomain

**File:** `components/sca/ScaNavBar.tsx:7,38`
**Issue:** The single nav link is `{ label: "Dashboard", href: "/sca" }`. `docs/sca-subdomain-deployment.md`
states the deployment goal is that `https://sca.bigmattsbbq.com/` shows "the clean subdomain ... in
the browser's address bar." When a visitor is already on `sca.bigmattsbbq.com/` (root) and clicks
"Dashboard," the relative link navigates to `sca.bigmattsbbq.com/sca` — proxy.ts sees
`alreadyUnderSca === true` for that path and does not rewrite it away, so the address bar picks up an
extra `/sca` suffix that the deployment doc explicitly says should not be user-visible on the
subdomain. Low impact today (one nav item, foundation phase), but will compound as more nav links are
added in later phases.
**Fix:** Make the link host-aware, e.g. derive `href` from whether the current hostname already
satisfies the SCA host rule (`href={isOnScaHost ? "/" : "/sca"}`), or use a root-relative `href="/"`
inside `ScaNavBar` and rely on `proxy.ts` to rewrite `/` → `/sca` only on the main-site path.

---

_Reviewed: 2026-08-23T21:07:39Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
