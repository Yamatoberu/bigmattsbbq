# Phase 9: Foundation & Subdomain Routing - Context

**Gathered:** 2026-08-23
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase makes the app technically ready to serve a live, secure, on-brand SCA subdomain reading real data from Supabase. It ships: host-based subdomain routing plumbing, a service-role Supabase client scoped to the `sca` schema, generated TypeScript types for that schema, a shared derived-score utility, and a minimal on-brand shell (layout/nav/footer) under `app/sca`. It does NOT ship the Dashboard, Competitions, Cook Detail, Analytics, or AI Reviews pages themselves — those are Phase 10/11. No write flows, no new auth.

</domain>

<decisions>
## Implementation Decisions

### Gray-area discussion — not completed interactively
A multi-select gray-area question (SCA shell/nav, local dev access, host matching rule, empty/sparse states) was presented via AskUserQuestion but received no user response. Per the project's `mode: yolo` config and Auto Mode guidance, Claude proceeded with the following documented defaults instead of blocking. The user can redirect any of these after reviewing this file or the shipped result.

### Routing structure
- **D-01:** Real Next.js path segment `app/sca/` (not a parenthesized route group) holds all tracker pages. This makes the tracker directly visitable at `localhost:3000/sca` and `bigmattsbbq.com/sca` in dev/preview with zero host trickery, AND gives middleware a clean rewrite target in production.
- **D-02:** `middleware.ts` at the repo root inspects the incoming `host` header. When it matches the configured SCA hostname (`sca.bigmattsbbq.com` in production, overridable via env var for staging), it rewrites `/` → `/sca` and `/foo` → `/sca/foo` (using `NextResponse.rewrite`, so the browser URL bar still shows the clean sca.* path, not `/sca/...`). All other hosts continue to the existing storefront routes untouched.
- **D-03 (host matching rule):** Match rule is: hostname === `process.env.SCA_HOSTNAME` (default `"sca.bigmattsbbq.com"`) OR hostname starts with `"sca."` — covers a future staging subdomain (e.g. `sca.staging.bigmattsbbq.com`) without code changes. Vercel preview URLs (`*.vercel.app`) do NOT match this rule by design — on preview deployments the tracker is reached via the plain `/sca` path instead, which the route-segment structure already supports for free.
- **D-04 (local/preview dev access):** No host-header spoofing or hosts-file edits needed. `/sca` is always a real, visitable path in every environment; only production traffic to the real subdomain gets silently rewritten onto it.

### Data access
- **D-05:** A new schema-scoped server client (e.g. `getScaSupabaseClient()` in `lib/supabase.ts` or a sibling `lib/supabase-sca.ts`) reuses the existing `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` env vars already in `.env.local` — no new secrets — but is constructed with `.schema('sca')` (or the `db.schema` client option) so all queries default to the `sca` schema. Never imported into a Client Component.
- **D-06:** `sca` schema types are generated via the Supabase MCP `generate_typescript_types` and stored in their own file (e.g. `lib/database-sca.types.ts`) rather than merged into the existing `lib/database.types.ts`, to avoid touching/regenerating the storefront's `public`-schema types as a side effect.

### Shared utilities
- **D-07:** One function (e.g. `lib/sca/scoring.ts` → `deriveScoreMetrics(score)`) computes `distance_from_winning` and `distance_from_perfect` from a `score` row. Every page/component that needs these values imports this function — no inline recomputation.

### Shell / nav / visual system
- **D-08 (shell/nav):** The SCA shell gets its own tracker-specific header — NOT the storefront's Home/Catering/About/Contact link set. Nav sections correspond to the IA: Dashboard, Competitions, Analytics, AI Reviews (Cook Detail is reached via drill-down, not a top-level nav item). The header keeps the same Big Matt's BBQ logo (small, linking back to the marketing site at bigmattsbbq.com) plus a "SCA Tracker" wordmark/label so it reads as a sibling area of the same brand, not a separate product.
- **D-09:** Visual system is 100% reused, not reinvented: same dark smoke background (`body` styles in `app/globals.css`), same `ember`/`smoke`/`gold`/`pit` Tailwind tokens, same `.glass-card`, `.button-primary`/`.button-secondary`, `.badge`, `.section-spacing` utility classes, same `Playfair Display` (`--font-display`) / `Nunito Sans` (`--font-body`) fonts already wired in `app/layout.tsx`. Note: the current body font is Nunito Sans, not "Source Sans 3" as older docs claimed — verified directly from `app/layout.tsx`.
- **D-10 (empty/sparse states):** Since Phase 9 ships the shell before the IA pages exist, its nav only links to routes that exist by the end of THIS phase. Phase 9 ships one thin, real page at `/sca` (index) that renders inside the on-brand shell and calls the new `sca`-schema client for a trivial real read (e.g. a competition count) — proving the full pipe end-to-end — rather than a static "Coming soon" stub. Phase 10 adds Dashboard/Competitions/Cook Detail nav links when those routes land; Phase 11 adds Analytics/AI Reviews nav links.

### Deployment documentation
- **D-11:** This phase cannot complete the real `sca.bigmattsbbq.com` DNS cutover (DNS lives at Hostinger, outside the repo). It must instead produce a short, exact checklist of remaining manual steps (add domain in Vercel project settings, add CNAME/A record at Hostinger, verify) for the user to run once ready. This checklist gets surfaced in the final phase summary, not buried in a planning doc only.

### Claude's Discretion
- Exact middleware matcher config (`config.matcher`) and exact file/function names beyond what's specified above.
- Whether the sca-schema client lives in `lib/supabase.ts` (extended) or a new sibling file — planner/executor's call based on what keeps `lib/supabase.ts` clean.
- Exact `/sca` index page content beyond "prove the pipe works" (e.g. showing the live competition count plus a one-line description).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & requirements
- `.planning/PROJECT.md` — Current Milestone: v2.0 SCA Tracker section
- `.planning/REQUIREMENTS.md` — INFRA-01..05 (this phase's requirements)
- `.planning/ROADMAP.md` — Phase 9 entry (goal, success criteria)

### Existing patterns to follow
- `lib/supabase.ts` — existing server-only service-role Supabase client pattern (singleton, `persistSession: false`); the sca-schema client should follow this same shape
- `lib/env.ts` — existing pattern for validating required env vars at startup; extend rather than replace
- `app/layout.tsx` — root layout, font wiring (`Playfair_Display` as `--font-display`, `Nunito_Sans` as `--font-body`), `<Providers>` wrap
- `app/globals.css` — design tokens and utility classes (`.glass-card`, `.button-primary`, `.button-secondary`, `.badge`, `.section-spacing`, body background treatment)
- `tailwind.config.ts` — `ember`/`smoke`/`gold`/`pit` color palettes, `boxShadow.soft`/`.glow`, `borderRadius.xl`
- `components/NavBar.tsx` — sticky header pattern, mobile drawer pattern, logo treatment (`logo-glow`) — reference for structure, NOT for the storefront-specific link set (see D-08)

No external specs beyond the above — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/supabase.ts` `getSupabaseClient()` — the exact pattern (service-role singleton, server-only) to mirror for the new `sca`-schema client
- `app/globals.css` utility classes (`.glass-card`, `.button-primary`, `.button-secondary`, `.badge`, `.section-spacing`) — reusable as-is for SCA shell components
- `tailwind.config.ts` color tokens — reusable as-is, no new palette needed
- `components/Footer.tsx` (not yet read in depth, but exists) — likely reusable pattern reference for an SCA-specific footer

### Established Patterns
- Server-only imports enforced via the `server-only` package (already a dependency) — apply to the new sca-schema client module too
- All API/data-access code lives in `lib/`, never called directly from client components — same discipline applies to `lib/sca/*`
- `lib/env.ts` throws descriptive errors on missing required env vars at call time, not at import time — mirror this for any new SCA-specific env validation

### Integration Points
- Root `middleware.ts` (does not exist yet — net new file) is the single integration point between the existing storefront and the new `app/sca` tree
- `.env.example` needs a new `SCA_HOSTNAME` entry (optional, defaulted) documented alongside the existing Supabase section

</code_context>

<specifics>
## Specific Ideas

No specific literal references beyond what's in the original brief (comparison table shapes, IA, schema) — those are fully captured in REQUIREMENTS.md and don't need to be re-derived here.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (The gray-area question was presented but unanswered; no scope-creep ideas were raised.)

</deferred>

---

*Phase: 9-Foundation & Subdomain Routing*
*Context gathered: 2026-08-23*
