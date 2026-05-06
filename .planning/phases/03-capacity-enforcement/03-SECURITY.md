---
phase: 03
slug: capacity-enforcement
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-12
---

# Phase 03 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| client → API | Cart payload from CheckoutClient crosses trust boundary at checkout route | variationId (string), quantity (int), productName (optional literal) |
| API → Supabase RPC | Route passes Zod-validated data to reserve_pickup_slot RPC | drop_id, pickup_option_id, product_name, quantity |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-03-01 | Tampering | app/api/checkout/route.ts | mitigate | Zod union literal on productName — only `"pulled_pork"` and `"brisket"` accepted; arbitrary strings rejected at API boundary before reaching RPC | closed |
| T-03-02 | Tampering | app/api/checkout/route.ts | mitigate | `z.number().int().positive()` on quantity — zero and negative values rejected, preventing capacity release via negative reservation | closed |
| T-03-03 | Denial of Service | app/api/checkout/route.ts | accept | See Accepted Risks Log — reservation calls bounded by number of distinct product types (max 2); no amplification possible | closed |
| T-03-04 | Information Disclosure | app/api/checkout/route.ts | mitigate | RPC failure details logged server-side via `logError`; client receives generic success response with no reservation internals exposed | closed |
| T-03-05 | Tampering | lib/database.types.ts | accept | See Accepted Risks Log — type file alignment with live schema, no runtime behavior change | closed |
| T-03-06 | Information Disclosure | lib/env.ts | mitigate | Removing `getSupabaseEnv` reduces exported surface area — fewer functions handling credentials are publicly exposed | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-03-01 | T-03-03 | Reservation RPC calls are bounded by the number of distinct product types (max 2 — pulled_pork and brisket). No amplification path exists: an attacker cannot cause more than 2 RPC calls per checkout regardless of cart size. | mgregory | 2026-04-12 |
| AR-03-02 | T-03-05 | The `place_preorder` type fix in `lib/database.types.ts` changes `p_drop_id` and `p_pickup_id` from `number` to `string` (UUID). This is a generated reference file being aligned with the live schema — no runtime behavior change, only type safety improvement. | mgregory | 2026-04-12 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-12 | 6 | 6 | 0 | gsd-secure-phase (claude-sonnet-4-6) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-12
