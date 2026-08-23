# Phase 9: Foundation & Subdomain Routing - Research

**Researched:** 2026-08-23
**Domain:** Next.js 16 App Router host-based routing, Supabase multi-schema server clients, Vercel/DNS subdomain cutover
**Confidence:** HIGH (core mechanics verified against current official docs matching this repo's pinned versions) / MEDIUM (Vercel dashboard steps, PostgREST schema-exposure requirement — verified via docs+community, not executed live)

## Summary

Phase 9 is plumbing, not features: a schema-scoped Supabase server client, generated types for the `sca` schema, host-based request routing, a shared scoring utility, and an on-brand shell. The single most important research finding is that **this repo's pinned Next.js version (`^16.1.6`, currently resolving to 16.3.2) has deprecated the `middleware.ts` file convention in favor of `proxy.ts`** — this directly affects how INFRA-03 and CONTEXT.md's D-02 must be implemented and is flagged prominently below. The second major finding is that Supabase's PostgREST layer requires the `sca` schema to be added to the **exposed schemas allowlist** in the Supabase dashboard before *any* client — including a service-role client — can query it; this is an infrastructure prerequisite, not a code change, and this researcher cannot verify or fix it (no MCP/dashboard access in this session). Third, TypeScript's structural typing for `SupabaseClient<Database, SchemaName>` requires `SchemaName` to be a literal key that exists on `Database` — confirming that CONTEXT.md's D-06 (generate `sca` types into their own file, not merged into `lib/database.types.ts`) is not just tidiness but a functional requirement for the client to type-check against the `sca` schema at all.

**Primary recommendation:** Use `proxy.ts` (not `middleware.ts`) exporting `proxy()` at the repo root for INFRA-03, mirror `lib/supabase.ts`'s existing singleton pattern exactly for the new `sca`-scoped client using a fresh `lib/database-sca.types.ts` `Database` type, and treat "add `sca` to Supabase's exposed schemas + grant `service_role` USAGE" as a manual prerequisite step the plan must call out explicitly (likely a `checkpoint:human-verify` or a documented pre-flight check), since it cannot be verified from this repo alone.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Real Next.js path segment `app/sca/` (not a parenthesized route group) holds all tracker pages. Directly visitable at `localhost:3000/sca` and `bigmattsbbq.com/sca` in dev/preview with zero host trickery, and gives the routing layer a clean rewrite target in production.
- **D-02:** A repo-root request-routing file inspects the incoming `host` header. When it matches the configured SCA hostname (`sca.bigmattsbbq.com` in production, overridable via env var for staging), it rewrites `/` → `/sca` and `/foo` → `/sca/foo` (using `NextResponse.rewrite`, so the browser URL bar still shows the clean sca.* path, not `/sca/...`). All other hosts continue to the existing storefront routes untouched. **Research note:** CONTEXT.md names this file `middleware.ts` — see "Critical Finding" below for why the executor must create `proxy.ts` instead on this repo's pinned Next.js version. The rewrite behavior and host-matching logic described here are unaffected; only the file name and exported function name change.
- **D-03 (host matching rule):** Match rule is: hostname === `process.env.SCA_HOSTNAME` (default `"sca.bigmattsbbq.com"`) OR hostname starts with `"sca."` — covers a future staging subdomain (e.g. `sca.staging.bigmattsbbq.com`) without code changes. Vercel preview URLs (`*.vercel.app`) do NOT match this rule by design — on preview deployments the tracker is reached via the plain `/sca` path instead.
- **D-04 (local/preview dev access):** No host-header spoofing or hosts-file edits needed. `/sca` is always a real, visitable path in every environment; only production traffic to the real subdomain gets silently rewritten onto it.
- **D-05:** A new schema-scoped server client (e.g. `getScaSupabaseClient()` in `lib/supabase.ts` or a sibling `lib/supabase-sca.ts`) reuses the existing `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` env vars already in `.env.local` — no new secrets — but is constructed with `.schema('sca')` (or the `db.schema` client option) so all queries default to the `sca` schema. Never imported into a Client Component.
- **D-06:** `sca` schema types are generated via the Supabase MCP `generate_typescript_types` and stored in their own file (e.g. `lib/database-sca.types.ts`) rather than merged into the existing `lib/database.types.ts`, to avoid touching/regenerating the storefront's `public`-schema types as a side effect.
- **D-07:** One function (e.g. `lib/sca/scoring.ts` → `deriveScoreMetrics(score)`) computes `distance_from_winning` and `distance_from_perfect` from a `score` row. Every page/component that needs these values imports this function — no inline recomputation.
- **D-08 (shell/nav):** The SCA shell gets its own tracker-specific header — NOT the storefront's Home/Catering/About/Contact link set. Nav sections correspond to the IA: Dashboard, Competitions, Analytics, AI Reviews (Cook Detail is reached via drill-down, not a top-level nav item). The header keeps the same Big Matt's BBQ logo (small, linking back to the marketing site at bigmattsbbq.com) plus a "SCA Tracker" wordmark/label so it reads as a sibling area of the same brand, not a separate product.
- **D-09:** Visual system is 100% reused, not reinvented: same dark smoke background (`body` styles in `app/globals.css`), same `ember`/`smoke`/`gold`/`pit` Tailwind tokens, same `.glass-card`, `.button-primary`/`.button-secondary`, `.badge`, `.section-spacing` utility classes, same `Playfair Display` (`--font-display`) / `Nunito Sans` (`--font-body`) fonts already wired in `app/layout.tsx`. Note: the current body font is Nunito Sans, not "Source Sans 3" as REQUIREMENTS.md's INFRA-04 text claims — verified directly from `app/layout.tsx` and confirmed again in this research pass.
- **D-10 (empty/sparse states):** Phase 9 ships one thin, real page at `/sca` (index) that renders inside the on-brand shell and calls the new `sca`-schema client for a trivial real read (e.g. a competition count) — proving the full pipe end-to-end — rather than a static "Coming soon" stub. Phase 9's nav only links to routes that exist by the end of this phase.
- **D-11:** This phase cannot complete the real `sca.bigmattsbbq.com` DNS cutover (DNS lives at Hostinger, outside the repo). It must instead produce a short, exact checklist of remaining manual steps for the user to run once ready. This checklist gets surfaced in the final phase summary, not buried in a planning doc only.

### Claude's Discretion

- Exact middleware/proxy matcher config (`config.matcher`) and exact file/function names beyond what's specified above.
- Whether the sca-schema client lives in `lib/supabase.ts` (extended) or a new sibling file — planner/executor's call based on what keeps `lib/supabase.ts` clean.
- Exact `/sca` index page content beyond "prove the pipe works" (e.g. showing the live competition count plus a one-line description).

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope. (A gray-area multi-select question was presented via AskUserQuestion but received no user response; Claude proceeded under `mode: yolo` with the documented defaults above. No scope-creep ideas were raised.)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | Server-side Supabase client reads the `sca` schema using the service-role key; never exposed to the browser | Confirmed `lib/supabase.ts` pattern to mirror; confirmed `.schema()`/`db.schema` API; confirmed `server-only` package already available; **found that `sca` must be added to Supabase's PostgREST "exposed schemas" allowlist or even the service-role client will fail with `PGRST106`** |
| INFRA-02 | `lib/database.types.ts` includes generated types for the `sca` schema — this researcher recommends a **separate file** per D-06 | Confirmed exact `supabase gen types typescript --schema sca` CLI syntax (CLI already a devDependency, run via `npx supabase`); confirmed this researcher has no MCP tool access this session, so `generate_typescript_types` must be run by the planner/executor or documented as a manual step |
| INFRA-03 | `sca.bigmattsbbq.com` requests routed via host-based middleware into `app/sca`, without touching existing routes | **Critical finding:** Next.js 16 deprecates `middleware.ts` → use `proxy.ts` exporting `proxy()`. Confirmed exact `NextResponse.rewrite()` API, `config.matcher` negative-lookahead pattern, and execution-order docs from official Next.js 16.3.2 docs |
| INFRA-04 | SCA pages reuse existing Tailwind theme exactly | Confirmed exact color tokens, utility classes, and font wiring by reading `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx` directly — no invention needed |
| INFRA-05 | Shared lib function for `distance_from_winning`/`distance_from_perfect` | Straightforward; pattern matches existing `lib/cart.ts` style (small pure functions, named exports, no classes) |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Host-based request routing (sca.* → /sca) | Frontend Server (SSR/Proxy) | — | Next.js `proxy.ts` runs at the edge/network boundary before rendering; this is exactly its intended use case per official docs |
| `sca` schema data access | API / Backend (Server Components / server-only lib) | Database / Storage | Reads happen server-side only (service-role key); Supabase/Postgres owns persistence and the exposed-schema allowlist that gates PostgREST access |
| Derived score computation (`deriveScoreMetrics`) | API / Backend (shared lib) | — | Pure function, no I/O; lives in `lib/` so both server-rendered pages and (future) client components can import it without duplicating the formula |
| SCA visual shell (nav/header/footer) | Browser / Client (React components) | Frontend Server (SSR renders initial HTML) | Reuses existing Tailwind/React component patterns; `NavBar`-equivalent is a Client Component per existing convention (`"use client"` in `components/NavBar.tsx`) |
| Subdomain DNS + Vercel domain binding | CDN / Static (Vercel edge/platform config) | — | Occurs entirely outside application code — Vercel project settings + Hostinger DNS — not something `proxy.ts` or any app code can satisfy on its own |

## Critical Finding: `middleware.ts` → `proxy.ts` (Next.js 16)

**This directly affects INFRA-03 and CONTEXT.md D-02's literal file name — read before planning.**

As of Next.js 16.0.0, the `middleware.ts`/`middleware.js` file convention is **deprecated**, renamed to `proxy.ts`/`proxy.js`. `package.json` pins `next: ^16.1.6`, which resolves to `16.3.2` (verified via `npm view next version` in this session) — squarely inside the affected range. `[VERIFIED: nextjs.org/docs — fetched 2026-08-23, docs version 16.3.2]`

- The exported function must be named `proxy` (or be the default export), not `middleware`.
- The file still lives at the **repo root** (same location CONTEXT.md D-02 specifies), so the "single root-level integration point" intent of D-02 is fully preserved — only the filename and function name change.
- `config.matcher` and `NextResponse` behavior are unchanged.
- **Runtime behavior if the old name is used is disputed across sources** — official docs present this as an error/warning message (`docs/messages/middleware-to-proxy`), while independent community reports vary from "still runs with a console warning" to "silently ignored, matcher never executes." `[CITED: nextjs.org/docs/messages/middleware-to-proxy]` `[ASSUMED: community reports on exact runtime behavior — conflicting, not independently verified]`. **Given this ambiguity is a full feature-breaking risk (INFRA-03 is the entire point of this phase), the plan MUST use `proxy.ts` outright rather than gambling on `middleware.ts` still working.**
- A codemod exists: `npx @next/codemod@canary middleware-to-proxy .` — not needed here since this is a net-new file, but useful context if `middleware.ts` is accidentally created first.

**Recommendation for planner:** Create `proxy.ts` at repo root, `export function proxy(request: NextRequest) { ... }`, `export const config = { matcher: [...] }`. Treat every mention of "middleware.ts" in CONTEXT.md as referring to this file under its correct Next.js 16 name. Do not create a file literally named `middleware.ts`.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | `^16.1.6` (resolves 16.3.2) `[VERIFIED: npm registry, checked 2026-08-23]` | App Router, `proxy.ts` routing | Already the project's framework — no change |
| `@supabase/supabase-js` | `^2.101.1` (resolves 2.112.3) `[VERIFIED: npm registry, checked 2026-08-23]` | Server-side Postgres/PostgREST client | Already the project's data client — no change |
| `server-only` | `^0.0.1` (already installed) | Compile-time guard preventing server modules from being imported into client bundles | Already used implicitly by `lib/supabase.ts`'s doc comment; should be an explicit `import "server-only"` in the new sca client per D-05's "never imported into a Client Component" |

No new runtime dependencies are required for this phase — everything needed (`@supabase/supabase-js`, `next`, `server-only`, `supabase` CLI as devDependency) is already installed. **Package Legitimacy Audit is not applicable — no new packages introduced.**

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `supabase` (CLI) | `^2.84.10` devDependency, installed but **1 minor+ behind latest (2.115.0)** `[VERIFIED: npx supabase --version output, checked 2026-08-23]` | `supabase gen types typescript --schema sca` for INFRA-02 | Run via `npx supabase gen types typescript --project-id wpziabhigztyjrmjpmbw --schema sca > lib/database-sca.types.ts` — no global install needed, already resolvable via `npx` in this repo |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CLI type generation | Supabase MCP `generate_typescript_types` tool | Functionally equivalent output; MCP tool wasn't callable in this research session (not in this researcher's toolset) but may be available to the executor agent — either path is acceptable, CLI documented here as the guaranteed-available fallback |
| `.schema('sca')` per-call | `db: { schema: 'sca' }` at `createClient()` time | Both work; `createClient(url, key, { db: { schema: 'sca' } })` is simpler for a client that is *always* scoped to `sca` (this phase's exact use case) and mirrors the existing `getSupabaseClient()` shape most closely — recommended over per-call `.schema()` chaining |
| Single merged `Database` type across schemas | Two separate `Database`-shaped types, one per schema file | Required by TypeScript structural typing (see below) and explicitly directed by D-06 |

## Package Legitimacy Audit

Not applicable this phase — no new external packages are introduced. All libraries used (`@supabase/supabase-js`, `next`, `server-only`, `supabase` CLI) are pre-existing dependencies already present in `package.json`.

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────────────┐
                    │   Incoming HTTP request  │
                    │  Host: sca.bigmattsbbq.  │
                    │  com  OR  bigmattsbbq.com│
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   proxy.ts (repo root)   │
                    │  reads request.headers   │
                    │     .get("host")         │
                    └────────────┬─────────────┘
                                 │
                 ┌───────────────┴────────────────┐
                 │ host === SCA_HOSTNAME           │ all other hosts
                 │ OR startsWith("sca.")           │ (bigmattsbbq.com, *.vercel.app)
                 ▼                                 ▼
   ┌───────────────────────────┐      ┌───────────────────────────┐
   │ NextResponse.rewrite(      │      │      NextResponse.next()   │
   │   /  →  /sca                │      │  (existing storefront      │
   │   /foo → /sca/foo)         │      │   routes untouched)        │
   │ URL bar unchanged           │      └───────────────────────────┘
   └────────────┬───────────────┘
                 ▼
   ┌───────────────────────────┐
   │      app/sca/ tree         │
   │  (real path segment,       │
   │  also directly visitable   │
   │  at /sca in any env)       │
   └────────────┬───────────────┘
                 ▼
   ┌───────────────────────────┐        ┌────────────────────────────┐
   │  Server Component reads    │───────▶│  getScaSupabaseClient()     │
   │  competition count, etc.   │        │  lib/supabase.ts (sibling)  │
   └────────────┬───────────────┘        │  service-role key,          │
                 │                        │  db.schema:'sca',           │
                 ▼                        │  server-only import guard   │
   ┌───────────────────────────┐        └──────────────┬──────────────┘
   │  SCA shell (nav/header/    │                       ▼
   │  footer) — reuses Tailwind │        ┌────────────────────────────┐
   │  ember/smoke/gold tokens   │        │  Supabase Postgres — `sca`  │
   │  from tailwind.config.ts   │        │  schema (must be in         │
   └────────────────────────────┘        │  PostgREST exposed-schemas  │
                                          │  allowlist — see Pitfalls)  │
                                          └────────────────────────────┘
```

### Recommended Project Structure
```
proxy.ts                          # NEW — repo root, host-based rewrite (INFRA-03)
lib/
├── supabase.ts                   # EXISTING — extend with getScaSupabaseClient(), OR:
├── supabase-sca.ts               # NEW (alternative) — sibling schema-scoped client
├── database.types.ts             # EXISTING — untouched (public schema only)
├── database-sca.types.ts         # NEW — generated types, sca schema only (INFRA-02, D-06)
├── env.ts                        # EXISTING — extend with SCA_HOSTNAME validation if needed
└── sca/
    └── scoring.ts                # NEW — deriveScoreMetrics() (INFRA-05, D-07)
components/
└── sca/
    ├── ScaNavBar.tsx              # NEW — tracker-specific header (D-08), "use client" per NavBar convention
    └── ScaFooter.tsx              # NEW (optional) — or reuse existing Footer.tsx as-is
app/
└── sca/
    ├── layout.tsx                 # NEW — wraps ScaNavBar/Footer, applies existing fonts/theme
    └── page.tsx                   # NEW — index page, real read via getScaSupabaseClient() (D-10)
```

### Pattern 1: Host-based rewrite in `proxy.ts`
**What:** Inspect `request.headers.get("host")`, branch on a match, rewrite the pathname while preserving the visible URL.
**When to use:** Exactly this phase's INFRA-03 case — single-app, single-Vercel-project multi-subdomain routing.
**Example:**
```typescript
// Source: nextjs.org/docs/app/api-reference/file-conventions/proxy (v16.3.2)
//         + nextjs.org/docs/app/api-reference/functions/next-response (rewrite())
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SCA_HOSTNAME = process.env.SCA_HOSTNAME || "sca.bigmattsbbq.com";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0]; // strip port for local dev, e.g. localhost:3000

  const isScaHost = hostname === SCA_HOSTNAME || hostname.startsWith("sca.");

  if (!isScaHost) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Guard: avoid double-prefixing if a direct /sca/... request somehow
  // arrives on the sca.* host (e.g. a stale bookmark or crawler).
  if (pathname.startsWith("/sca")) {
    return NextResponse.next();
  }

  const targetPath = pathname === "/" ? "/sca" : `/sca${pathname}`;
  const url = request.nextUrl.clone();
  url.pathname = targetPath;

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)"
  ]
};
```

### Pattern 2: Schema-scoped Supabase server client (mirrors `lib/supabase.ts`)
**What:** A singleton client identical in shape to `getSupabaseClient()`, but constructed with `db.schema: 'sca'` and typed against a schema-specific `Database` type.
**When to use:** All `sca` data reads (INFRA-01).
**Example:**
```typescript
// Source: supabase.com/docs/guides/api/using-custom-schemas
//         supabase.com/docs/reference/javascript/initializing (db.schema option)
import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database-sca.types";

let _scaClient: SupabaseClient<Database, "sca"> | undefined;

export function getScaSupabaseClient(): SupabaseClient<Database, "sca"> {
  if (_scaClient) return _scaClient;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variables. Check SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  _scaClient = createClient<Database, "sca">(url, key, {
    db: { schema: "sca" },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  return _scaClient;
}
```
**Why the `Database` type must come from `lib/database-sca.types.ts`, not `lib/database.types.ts`:** `[VERIFIED: GitHub supabase-js type discussions + supabase.com docs, cross-checked]` supabase-js's `SchemaName` generic is constrained to `string & keyof Omit<Database, "__InternalSupabase">` — i.e., it must be a literal key that actually exists on the `Database` type passed in. The existing `lib/database.types.ts` only has a `public` key; passing `"sca"` as the second generic against that type would fail to compile. Generating a **separate** `Database` type scoped to `--schema sca` (via `npx supabase gen types typescript --schema sca`) produces a type whose top-level key is `sca`, which is what makes `SupabaseClient<Database, "sca">` type-check. This confirms D-06's separate-file approach is a hard requirement, not just a style preference.

### Anti-Patterns to Avoid
- **Passing the storefront's `Database` type to the sca client:** Will not type-check against `.schema("sca")` or `db.schema: "sca"` — the type has no `sca` key. Use the dedicated `database-sca.types.ts` type instead.
- **Creating a literal `middleware.ts` file:** Deprecated on this repo's pinned Next.js version; behavior is disputed/unreliable across sources. Use `proxy.ts`.
- **Merging `sca` types into `lib/database.types.ts`:** Explicitly rejected by D-06 — regenerating the combined file risks silently dropping or reordering the storefront's `public` schema types as a side effect of an unrelated `sca` change.
- **Assuming service-role bypasses PostgREST's schema exposure allowlist:** It does not. `service_role` bypasses Row Level Security, but PostgREST still refuses to route to a schema that isn't in its `db_schemas` / dashboard "Exposed schemas" list, returning `PGRST106`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Type generation for a Postgres schema | Manually writing `Database['sca']['Tables']['...']` interfaces by hand | `supabase gen types typescript --schema sca` (or MCP `generate_typescript_types`) | Hand-written types drift from the real schema silently; generated types are the source of truth and match exactly what PostgREST returns |
| Host/subdomain matching logic | Regex parsing of `request.url` | `request.headers.get("host")` + `request.nextUrl.clone()` | `nextUrl` already handles port-stripping edge cases and gives a `URL` object ready for `.pathname` mutation and `NextResponse.rewrite()` |
| Score derivation math | Recomputing `first_place_score - total_score` inline on each page | `deriveScoreMetrics()` in `lib/sca/scoring.ts` (D-07, INFRA-05) | Exactly what this phase's INFRA-05 requirement mandates — single source of truth for a formula that appears on Dashboard, Competitions, and Analytics pages in later phases |

**Key insight:** Every "don't hand-roll" item above is really the same lesson: this phase is glue code between already-correct systems (Next.js's proxy layer, Supabase's generated types, a two-line arithmetic formula). The risk isn't inventing something complex — it's silently drifting from what those systems already provide correctly.

## Common Pitfalls

### Pitfall 1: `sca` schema not exposed to PostgREST
**What goes wrong:** Any query via `getScaSupabaseClient()` — including with the service-role key — fails with `PGRST106: "The schema must be one of the following: public"` even though the schema and tables exist in Postgres.
**Why it happens:** PostgREST (which powers the Supabase Data API that `@supabase/supabase-js` talks to) only routes requests to schemas listed in its `db_schemas` config, set via the Supabase dashboard's "Exposed schemas" setting (API settings page). `service_role` bypasses Row Level Security policies, but not this routing-level allowlist. `[CITED: supabase.com/docs/guides/troubleshooting/pgrst106-the-schema-must-be-one-of-the-following-error-when-querying-an-exposed-schema]` `[MEDIUM confidence — verified via official troubleshooting doc + community confirmation, not executed live against project wpziabhigztyjrmjpmbw in this session]`
**How to avoid:** Before writing any `sca`-schema query code, verify (or have the user verify) that `sca` appears in the Supabase dashboard under Settings → API → Exposed schemas for project `wpziabhigztyjrmjpmbw`. If not yet exposed, this is a one-time dashboard change, not a code change — but it blocks INFRA-01 entirely until done.
**Warning signs:** A working `sca` schema visible via `list_tables`/SQL editor, but every `supabase-js` query returning `PGRST106` or an empty error object.

### Pitfall 2: `middleware.ts` created instead of `proxy.ts`
**What goes wrong:** Routing silently does nothing (or produces console warnings depending on exact patch version) — the entire subdomain routing feature (INFRA-03) appears to work in review but never actually intercepts real host-based traffic.
**Why it happens:** CONTEXT.md's decision text (D-02) and most training-data knowledge/tutorials reference `middleware.ts`, which was the correct convention through Next.js 15. This repo is pinned to Next.js 16.
**How to avoid:** Create `proxy.ts` at the repo root with `export function proxy(...)`. See "Critical Finding" above.
**Warning signs:** `next build` output mentioning proxy/middleware deprecation; requests to `sca.bigmattsbbq.com` (once DNS is live) serving the storefront instead of the tracker.

### Pitfall 3: Double-prefixing the rewrite target
**What goes wrong:** A request that already resolves to `/sca/...` on the sca host (e.g., a bot or stale bookmark hitting `sca.bigmattsbbq.com/sca/dashboard`) gets rewritten again to `/sca/sca/dashboard`, a 404.
**Why it happens:** The rewrite logic in D-02 unconditionally prepends `/sca` to the incoming pathname without checking whether it's already there.
**How to avoid:** Guard with `if (pathname.startsWith("/sca")) return NextResponse.next();` before rewriting, as shown in the Pattern 1 code example above.
**Warning signs:** Intermittent 404s on the sca subdomain that don't reproduce when visiting `/sca` directly in dev.

### Pitfall 4: `SCA_HOSTNAME` env var missing in one environment but not another
**What goes wrong:** `process.env.SCA_HOSTNAME` is `undefined` in an environment where it was expected to be set (e.g., a staging Vercel project), silently falling back to the hardcoded default `"sca.bigmattsbbq.com"` and misrouting staging traffic onto the production hostname's matching logic, or vice versa.
**Why it happens:** D-03's fallback (`hostname.startsWith("sca.")`) actually makes this low-risk for the *staging subdomain* case specifically (it's designed to catch that without an env var) — but it's worth being explicit in `.env.example` per the Integration Points note in CONTEXT.md so the intent isn't lost.
**How to avoid:** Add `SCA_HOSTNAME=` (commented, optional, defaulted) to `.env.example` per CONTEXT.md's own Integration Points section.
**Warning signs:** N/A for this phase specifically (no staging environment exists yet) — flagged for completeness since D-03 explicitly anticipates it.

## Code Examples

### Deriving score metrics (INFRA-05, D-07)
```typescript
// lib/sca/scoring.ts
// Pattern follows this repo's existing small-pure-function convention (see lib/cart.ts)
const PERFECT_SCORE = 254.5;

export interface ScoreMetricsInput {
  total_score: number;
  first_place_score: number;
}

export interface ScoreMetrics {
  distance_from_winning: number;
  distance_from_perfect: number;
}

export function deriveScoreMetrics(score: ScoreMetricsInput): ScoreMetrics {
  return {
    distance_from_winning: score.first_place_score - score.total_score,
    distance_from_perfect: PERFECT_SCORE - score.total_score
  };
}
```
Naming, `export function` (not default export), and colocated interfaces all match this repo's existing `lib/` conventions (`lib/cart.ts`, `lib/normalizers.ts`) confirmed by direct file reads in this session.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `middleware.ts` / `export function middleware()` | `proxy.ts` / `export function proxy()` | Next.js 16.0.0 | Directly affects INFRA-03; see Critical Finding above |
| Middleware defaulted to Edge Runtime | Proxy defaults to **Node.js runtime** | Next.js 16.0.0 (Node.js runtime for middleware became stable in 15.5.0, default in 16) `[CITED: nextjs.org/docs/app/api-reference/file-conventions/proxy version history table]` | No `runtime` config option is available/needed in `proxy.ts` — setting one throws an error. This is actually convenient here: no Edge Runtime restrictions to worry about for the host-check logic (which is trivial anyway and wouldn't have hit Edge limits either way) |

**Deprecated/outdated:**
- `middleware.ts` file convention: deprecated in favor of `proxy.ts` as of Next.js 16.0.0. A codemod (`npx @next/codemod@canary middleware-to-proxy .`) exists for migrating existing projects, not needed here since this is a net-new file.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Exact runtime behavior of a project that keeps a literal `middleware.ts` file on Next.js 16.3.2 (silent no-op vs. warning-but-functional) — sources disagree | Critical Finding | Low practical risk since the recommendation is to avoid `middleware.ts` entirely and use `proxy.ts`; only matters if the plan/executor deviates from that recommendation |
| A2 | Whether `sca` schema is already in Supabase's "Exposed schemas" allowlist for project `wpziabhigztyjrmjpmbw` | Common Pitfalls #1 | High — if not yet exposed, INFRA-01 is blocked until a one-time dashboard change is made; this researcher had no MCP/dashboard access this session to check directly |
| A3 | Whether appropriate `GRANT USAGE`/`GRANT SELECT` statements already exist for `service_role` on the `sca` schema (separate from the PostgREST exposure setting) | Common Pitfalls #1 | Medium — service-role typically bypasses RLS but still needs schema-level GRANTs in Postgres; if the `sca` schema was created outside this repo's migrations (confirmed: no `sca`-related files under `supabase/migrations/`), these grants may or may not already exist |
| A4 | Whether a single non-wildcard domain add (`sca.bigmattsbbq.com`) in Vercel project settings + one CNAME record at Hostinger is sufficient (vs. requiring nameserver delegation to Vercel for a wildcard cert) | Deployment Checklist | Low-Medium — D-03's code already avoids needing a true wildcard cert since only one concrete hostname (plus its own explicit env override) is matched; a single CNAME to `cname.vercel-dns.com` is the standard non-wildcard path and should suffice, but this wasn't executed live against the real Vercel project in this session |

## Open Questions

1. **Is the `sca` schema already exposed to PostgREST for project `wpziabhigztyjrmjpmbw`?**
   - What we know: The schema and its tables exist in Postgres (per the phase brief referencing `sca.bigmattsbbq.com` data and INFRA-02's assumption that `generate_typescript_types` can already introspect it).
   - What's unclear: Whether the dashboard's "Exposed schemas" list and the necessary `GRANT` statements for `service_role` have been applied. This researcher had no Supabase MCP/dashboard tool access in this session to check directly.
   - Recommendation: The plan should include an early, cheap verification task (e.g., the executor runs `generate_typescript_types` or a raw `select` via MCP against `sca`, or a `checkpoint:human-verify` asking the user to confirm the dashboard setting) **before** building the client and pages that depend on it — this is a hard blocker for INFRA-01 if not already done, and cheap to check first.

2. **Exact current Vercel project name/ID this repo deploys to, and whether Hostinger DNS is currently delegated to Vercel nameservers or manages its own zone.**
   - What we know: DNS lives at Hostinger (per user memory `reference_dns_hosting.md` and CONTEXT.md D-11); only a single concrete subdomain is needed (no wildcard), which is the simpler CNAME path.
   - What's unclear: Whether Hostinger's zone is authoritative (i.e., a plain CNAME add is sufficient) or whether the apex domain is already using Vercel's nameservers for some other reason.
   - Recommendation: Surface the exact manual checklist (below) in the phase summary per D-11, but don't attempt to execute or verify it from within this coding phase — it's explicitly out of scope per REQUIREMENTS.md's Out of Scope table ("Full DNS cutover / final subdomain activation").

## Deployment Checklist (for D-11 — surface in final phase summary, not just this doc)

These steps are **manual, outside the repo**, and out of scope for this phase's code — but must be documented per D-11:

1. **Vercel dashboard:** Project Settings → Domains → Add `sca.bigmattsbbq.com`. Since only a single named subdomain is needed (not a wildcard `*.bigmattsbbq.com`), Vercel will show a CNAME target (typically `cname.vercel-dns.com`) — no nameserver delegation required. `[CITED: vercel.com/docs/domains/working-with-domains]`
2. **Hostinger DNS:** Add a CNAME record — Name: `sca`, Value: `cname.vercel-dns.com` (copy the exact value Vercel displays, including trailing period if shown). `[CITED: hostinger.com/support/4738777-how-to-manage-cname-records-at-hostinger]`
3. **Verify:** Wait for DNS propagation (can check via a DNS checker tool), then confirm Vercel shows the domain as "Valid Configuration" and that `https://sca.bigmattsbbq.com/` actually reaches the app (proving `proxy.ts` fires correctly against the real host header, not just `/sca` in dev).
4. **No `vercel.json` changes needed** — confirmed no `vercel.json` exists in this repo today, and none of the standard subdomain patterns researched require one; Vercel's domain-to-project binding plus the app's own `proxy.ts` is sufficient once DNS resolves.

## Sources

### Primary (HIGH confidence)
- https://nextjs.org/docs/app/api-reference/file-conventions/proxy — fetched directly, docs version 16.3.2 (matches this repo's resolved `next` version 16.3.2), lastUpdated 2026-08-04
- https://nextjs.org/docs/app/getting-started/proxy — fetched directly, docs version 16.3.2, lastUpdated 2025-12-20
- https://nextjs.org/docs/app/api-reference/functions/next-response — fetched directly, docs version 16.3.2, lastUpdated 2025-12-04
- https://nextjs.org/docs/messages/middleware-to-proxy — fetched directly
- `npm view next version` / `npm view @supabase/supabase-js version` — run directly in this session, confirmed 16.3.2 / 2.112.3 as latest matching this repo's `^` ranges
- `npx supabase --version` — run directly, confirmed CLI available at 2.84.10 (local devDependency)
- Direct reads of `lib/supabase.ts`, `lib/env.ts`, `app/layout.tsx`, `app/globals.css`, `tailwind.config.ts`, `components/NavBar.tsx`, `components/Footer.tsx`, `package.json`, `tests/supabase.test.ts`, `.env.example`, `supabase/migrations/*`, `supabase/.temp/project-ref` — all read directly this session

### Secondary (MEDIUM confidence)
- https://supabase.com/docs/guides/api/using-custom-schemas — fetched, confirms exposed-schema allowlist requirement and `db.schema` client option
- https://supabase.com/docs/guides/troubleshooting/pgrst106-the-schema-must-be-one-of-the-following-error-when-querying-an-exposed-schema — via WebSearch summary, cross-referenced with the using-custom-schemas doc
- https://supabase.com/docs/guides/api/rest/generating-types — fetched, confirms `--schema` CLI flag and per-schema output shape
- https://vercel.com/docs/domains/working-with-domains — via WebSearch summary, confirms wildcard-vs-single-subdomain CNAME distinction
- GitHub supabase-js discussions on `SchemaName` generic constraint (`#39106`, `#39107`) — via WebSearch summary, not fetched directly; behavior is consistent with and predicted correctly by the official schema/typescript-support docs

### Tertiary (LOW confidence)
- Community blog posts on exact `middleware.ts` runtime behavior on Next.js 16 (silent no-op vs. functional-with-warning) — conflicting accounts, flagged as Assumption A1, not load-bearing since the recommendation avoids the ambiguity entirely by using `proxy.ts`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, versions verified live against npm registry this session
- Architecture (proxy.ts routing): HIGH — verified directly against official docs matching this repo's exact resolved Next.js version
- Architecture (Supabase schema typing): MEDIUM-HIGH — core `db.schema`/`.schema()` API confirmed via official docs; the `SchemaName` generic constraint confirmed via GitHub discussion summaries (not the raw TS source, which returned 404), but consistent across independent sources
- Pitfalls: MEDIUM — PGRST106/exposed-schema pitfall is well-documented but not verified live against project `wpziabhigztyjrmjpmbw` in this session (no MCP/dashboard access)
- Deployment/DNS: MEDIUM — standard Vercel+Hostinger CNAME pattern is well-documented; not executed live

**Research date:** 2026-08-23
**Valid until:** ~14 days — Next.js 16 is in active post-release stabilization (proxy.js docs lastUpdated as recently as 2026-08-04) and the exact `middleware.ts` runtime-behavior ambiguity may resolve/change in a patch release before this phase is planned or executed
