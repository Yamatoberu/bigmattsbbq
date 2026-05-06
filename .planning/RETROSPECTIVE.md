# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

---

## Milestone: v1.0 — Website Refresh & Frozen Drops

**Shipped:** 2026-04-22
**Phases:** 5 | **Plans:** 19 | **Timeline:** 19 days (2026-04-03 → 2026-04-22)

### What Was Built

- Supabase persistence layer: 5-table schema with RLS, atomic `reserve_pickup_slot` RPCs, typed Node.js singleton client
- Database-driven drops model replacing all hardcoded pickup config; drop state gates ordering availability
- Atomic capacity enforcement: `reserve_pickup_slot` called before Square API calls — no overselling possible
- Deterministic SHA-256 idempotency keys; order persistence to Supabase `orders` with JSONB cart snapshot
- Complete mailing list: signup (home + footer + checkout opt-in), Jose HS256 JWT unsubscribe, Resend broadcast with `email_logs` audit trail
- Site-wide NavBar in layout.tsx with 5 links, mobile hamburger drawer, active-route highlight
- Static content pages: /catering (tiered menu + booking), /about, /contact
- 56 tests passing across 12 test files

### What Worked

- **GSD phase discipline**: Planning artifacts (CONTEXT, RESEARCH, PLAN, SUMMARY, VERIFICATION) kept each phase well-scoped and easy to hand off between sessions
- **Verification before advancing**: VERIFICATION.md files caught 3 real gaps (missing resend/jose deps, idempotency regression, stub form not replaced) before milestone close
- **Fire-and-forget pattern for Supabase writes**: Decoupling order persistence from checkout success kept the flow simple and resilient
- **Single migration file**: All DDL, RLS, and functions in `0001_foundation.sql` made it easy to inspect and replay during Phase 1
- **Test-first for side effects**: Writing RED tests before implementing mailing list, broadcast, and unsubscribe routes made implementation fast and regressions obvious
- **Quick tasks for interruptions**: `/gsd-quick` kept NavBar hotfixes (breakpoint, Tailwind custom breakpoint) tracked and separate from phase work

### What Was Inefficient

- **Phase 5 gaps required 2 extra plans**: resend/jose deps and SHA-256 idempotency were accidentally dropped during Phase 5 execution, requiring Plans 07 and 08 to re-close gaps that Phase 4 had already resolved. More careful cross-phase dependency tracking would have caught this earlier.
- **NavBar merge conflict in Phase 5**: The layout lift (moving NavBar from OrderLanding to layout.tsx) caused a merge conflict during Phase 5 Plan 06. A dedicated layout-lift plan earlier in Phase 5 would have avoided the conflict.
- **Human UAT not completed before milestone close**: 3 human verification scenarios remain open (NavBar UX, opt-in checkbox, E2E order write). These are non-blocking but represent unconfirmed behavior.
- **REQUIREMENTS.md checkboxes out of sync**: The traceability table showed "Pending" for requirements that were actually implemented. Keeping REQUIREMENTS.md in sync during execution (not just at close) would reduce the audit overhead at milestone time.
- **STATE.md staleness**: The STATE.md "Current Position" section drifted significantly from reality — it showed "Phase: 2" when all 5 phases were complete. The frontmatter was more reliable than the body.

### Patterns Established

- **Atomic pre-reservation before external API**: Always reserve capacity in Supabase before calling Square — never rely on Square's response timing for capacity enforcement
- **Deterministic idempotency over sorted inputs**: `createHash("sha256")` with `[...inputs].sort().join("|")` produces stable keys for retry safety without UUID randomness
- **Fire-and-forget for audit writes**: Order saves and email_logs inserts use `logError` on failure but don't rethrow — checkout/broadcast success is independent of audit write success
- **Jose HS256 for stateless unsubscribe**: Signed JWT with `algorithms` pin and length guard on secret — no DB query needed to verify unsubscribe intent
- **RED → GREEN test scaffolding**: Create failing test files in Plan N, implement in Plan N+1 — makes acceptance criteria executable from day one

### Key Lessons

1. **Track cross-plan dependencies explicitly**: When Plan A introduces a dep that Plan B relies on, put it in CONTEXT.md for Plan B. Phase 5 Plans 07/08 existed entirely because resend/jose (added in Plan 01) got dropped somewhere in Plans 02-06.
2. **Layout changes deserve their own plan**: Moving NavBar from a component into `layout.tsx` was a cross-cutting change that should have been isolated from content work. Mixing it with static page creation created a merge conflict.
3. **Lock the verification status before advancing phases**: human_needed verification is fine to carry forward, but should have a clear owner and deadline. Without that, it drifts to milestone close.
4. **REQUIREMENTS.md is a contract, not a log**: Keep checkboxes current during execution (mark [x] when a phase SUMMARY confirms satisfaction) — don't batch-update at close.

### Cost Observations

- Model mix: primarily Sonnet 4.x for execution; Opus for planning/discussion phases
- Notable: gap closure in Phase 5 (Plans 07-08) added ~2-3 sessions of overhead — prevented by explicit dep tracking

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 5 | 19 | First GSD milestone — baseline established |

### Cumulative Quality

| Milestone | Tests | Notes |
|-----------|-------|-------|
| v1.0 | 56 | 12 test files; idempotency, mailing list, broadcast, unsubscribe token, checkout reservation |

### Top Lessons (Verified Across Milestones)

1. Atomic pre-reservation before external API calls prevents overselling — implement this pattern early, not as a gap closure
2. Gap closure plans add overhead proportional to how far the gap drifted from its origin phase — catch dependencies in CONTEXT.md at hand-off time
