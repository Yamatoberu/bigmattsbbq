# Phase 9: Foundation & Subdomain Routing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-23
**Phase:** 9-Foundation & Subdomain Routing
**Areas discussed:** SCA shell/nav, Local dev access, Host matching rule, Empty/sparse states (offered, not answered)

---

## Gray-area selection (unanswered)

An AskUserQuestion multi-select was presented offering these areas:

| Option | Description | Selected |
|--------|-------------|----------|
| SCA shell/nav | Reuse storefront NavBar link set vs. tracker-specific nav | — |
| Local dev access | Path fallback vs. host-header spoofing vs. Vercel-preview-only | — |
| Host matching rule | Exact hostnames middleware treats as "the SCA app" | — |
| Empty/sparse states | How the shell looks before Phase 10/11 pages land | — |

**User's choice:** No response received (question returned unanswered).
**Notes:** Per `mode: yolo` in `.planning/config.json` and Auto Mode guidance to make reasonable calls and keep going, Claude proceeded to decide all four areas itself rather than block. Rationale for each decision is recorded in `09-CONTEXT.md` under `<decisions>` (D-01 through D-10). The user can redirect any of these after reviewing that file or the shipped Phase 9 result.

---

## Claude's Discretion

All four offered gray areas (SCA shell/nav, local dev access, host matching rule, empty/sparse states) were resolved by Claude's discretion, documented with rationale in `09-CONTEXT.md`. Additionally: exact middleware matcher config, exact client/file naming beyond what's specified, and exact `/sca` index page copy.

## Deferred Ideas

None — no scope-creep ideas were raised (the discussion did not reach the point of free-form conversation).
