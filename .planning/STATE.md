---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: SCA Tracker
status: planning
last_updated: "2026-08-23T19:29:09.183Z"
last_activity: 2026-08-23
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-23 — v2.0 SCA Tracker milestone started)

**Core value:** A chef/spectator can browse, compare, and understand Big Matt's SCA steak cookoff history — cooks, scores, process detail, and AI appearance reviews — in one place that looks and feels like it belongs on bigmattsbbq.com.
**Current focus:** Phase 9 — Foundation & Subdomain Routing

## Current Position

Phase: 9 of 11 (Foundation & Subdomain Routing)
Plan: TBD (roadmap just created, not yet planned)
Status: Ready to plan
Last activity: 2026-08-23 — ROADMAP.md created for v2.0 SCA Tracker (Phases 9-11), awaiting user approval

Progress: [░░░░░░░░░░] 0%

## Milestone Summary

**v1.0 — Website Refresh & Frozen Drops**

- 5 phases, 19 plans completed
- 3,730 LOC TypeScript
- Timeline: 2026-04-03 → 2026-04-22 (19 days)
- See: .planning/milestones/v1.0-ROADMAP.md

**v1.1**

- 3 phases (6-8), 10 plans completed
- Code review fixes + mailing list/email platform migration to Resend

## Performance Metrics

**Velocity:**
- Total plans completed: 0 (v2.0 not yet started)
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 9. Foundation & Subdomain Routing | TBD | - | - |
| 10. Core Browsing | TBD | - | - |
| 11. Analytics & AI Reviews | TBD | - | - |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- v2.0 kickoff: read-only tracker, no new auth, service-role Supabase reads only, shared repo/Vercel project/design system (not a separate app)
- v2.0 kickoff: full DNS cutover to sca.bigmattsbbq.com is manual (Hostinger) and out of scope for the repo work

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Deferred Items

Items acknowledged and carried forward from previous milestone close (2026-04-22, still open):

| Category | Item | Status |
|----------|------|--------|
| uat_gap | Phase 04: opt-in checkbox UI + E2E order save (2 scenarios) | partial |
| uat_gap | Phase 05: NavBar full UX verification (1 scenario) | partial |
| verification_gap | Phase 04: 04-VERIFICATION.md | human_needed |
| verification_gap | Phase 05: 05-VERIFICATION.md | human_needed |
| requirement | MAIL-01 branded Resend confirmation email | deferred (D-10) |
| requirement | Square API version bump from 2024-12-18 (EOL ~June 2026) | pending |
| quick_task | 260417-rpl-fix-checkout-square-error-logging-update | missing summary |
| quick_task | 260421-cs6-fix-navbar-breakpoint-from-640px-to-960p | missing summary |
| quick_task | 260421-d21-replace-nav-custom-css-classes-with-tail | missing summary |

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260501-sc1 | Hero section redesign | 2026-05-02 | a25a39a | [260501-sc1-hero-section-redesign](./.planning/quick/260501-sc1-hero-section-redesign/) |
| 260502-eu1 | Fix Issue 10 — About page bio missing heading and section wrapper | 2026-05-02 | 3b427e7 | [260502-eu1-fix-issue-10-about-page-bio-missing-head](./.planning/quick/260502-eu1-fix-issue-10-about-page-bio-missing-head/) |
| 260502-ex3 | Fix catering page max-width for desktop viewports (Issue 12) | 2026-05-02 | a27c739 | [260502-ex3-fix-catering-page-max-width-for-desktop-](./.planning/quick/260502-ex3-fix-catering-page-max-width-for-desktop-/) |
| 20260502-ui-review-quick-batch | UI review quick batch — Issues 2, 5, 6, 7, 9, 11 | 2026-05-02 | 4b0a938 | [20260502-ui-review-quick-batch](./.planning/quick/20260502-ui-review-quick-batch/) |
| 260502-ui3 | Fix Issue 3 — excessive blank whitespace at page bottom | 2026-05-02 | b74909d | [260502-ui3-fix-blank-whitespace-at-page-bottom](./.planning/quick/260502-ui3-fix-blank-whitespace-at-page-bottom/) |
| 20260505-sold-out-capture | Inline sold-out email capture in product cards (Funnel Issue 2) | 2026-05-05 | 733199f | [20260505-sold-out-capture](./.planning/quick/20260505-sold-out-capture/) |
| 20260505-catering-page-hook-trust-restructure | Catering page Hook → Trust → Offer → CTA restructure (Funnel Issue 6) | 2026-05-05 | 3d89fcf | [20260505-catering-page-hook-trust-restructure](./.planning/quick/20260505-catering-page-hook-trust-restructure/) |
| 260505-fkj | Add catering cross-sell block to homepage (Funnel Issue 5 — partial) | 2026-05-05 | 4939aaa | [260505-fkj-add-catering-cross-sell-block-to-homepag](./.planning/quick/260505-fkj-add-catering-cross-sell-block-to-homepag/) |
| 260505-rcp | Add capacity_enforced boolean flag to the drops table and wire it through all capacity gates | 2026-05-06 | 05c1fda | [260505-rcp-add-capacity-enforced-boolean-flag-to-th](./.planning/quick/260505-rcp-add-capacity-enforced-boolean-flag-to-th/) |
| 260506-t9u | Expand stock tracking to all 6 menu items independently | 2026-05-07 | 179f157 | [260506-t9u-expand-stock-tracking-to-all-6-menu-item](./.planning/quick/260506-t9u-expand-stock-tracking-to-all-6-menu-item/) |
| 260506-tr9 | Remove Square inventory from stock display — drive all in-stock checks off drop.soldOut from the database | 2026-05-07 | 1cdd49b | [260506-tr9-remove-square-inventory-from-stock-displ](./.planning/quick/260506-tr9-remove-square-inventory-from-stock-displ/) |
| 260506-u3i | Fix cart showing Item instead of bundle name in CheckoutClient | 2026-05-07 | 8ba6268 | [260506-u3i-fix-cart-showing-item-instead-of-bundle-](./.planning/quick/260506-u3i-fix-cart-showing-item-instead-of-bundle-/) |
| 260507-bcm | Fix bundle price showing zero in checkout order summary | 2026-05-07 | 70aa204 | [260507-bcm-fix-bundle-price-showing-zero-in-checkou](./.planning/quick/260507-bcm-fix-bundle-price-showing-zero-in-checkou/) |
| 260507-bnv | Fix useActiveDrop infinite fetch loop | 2026-05-07 | 00c4d51 | [260507-bnv-fix-useactivedrop-infinite-fetch-loop](./.planning/quick/260507-bnv-fix-useactivedrop-infinite-fetch-loop/) |
| 260507-c71 | Fix checkout Square API failure | 2026-05-07 | 480cc99 | [260507-c71-fix-checkout-square-api-failure](./.planning/quick/260507-c71-fix-checkout-square-api-failure/) |
| 260507-emt | Move enhancements.md backlog items to ROADMAP.md, delete public file | 2026-05-07 | — | [260507-move-enhancements-to-roadmap](./.planning/quick/260507-move-enhancements-to-roadmap/) |
| 20260520-fix-pickup-issoldout | Fix pickup isSoldOut incorrectly true when capacity_enforced is false | 2026-05-20 | 1a4e57c | [20260520-fix-pickup-issoldout](./.planning/quick/20260520-fix-pickup-issoldout/) |
| 20260520-package-item-display-name | Add displayName to PackageItemConfig for clean sauce label override | 2026-05-20 | eca119b | [20260520-package-item-display-name](./.planning/quick/20260520-package-item-display-name/) |
| 20260819-slack-order-notification | Add fire-and-forget Slack notification to checkout route on new order | 2026-08-19 | 7c3918a | [20260819-slack-order-notification](./.planning/quick/20260819-slack-order-notification/) |
| 2026-05-07 | fast | Increase cart item price text size and highlight with ember-400 color | ✅ | — |
| 2026-05-07 | fast | Bump Square API version from 2024-12-18 to 2026-04-21 | ✅ | — |
| 2026-05-07 | fast | Normalize catalogName bundle match and add console.warn on mismatch in CheckoutClient | ✅ | — |

## Session Continuity

Last session: 2026-08-23
Stopped at: v2.0 ROADMAP.md and STATE.md written, REQUIREMENTS.md traceability updated; awaiting roadmap approval
Resume file: None — next step is `/gsd:plan-phase 9`
