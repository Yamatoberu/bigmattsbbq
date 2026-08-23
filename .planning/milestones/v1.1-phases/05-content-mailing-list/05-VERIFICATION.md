---
phase: 05-content-mailing-list
verified: 2026-04-21T09:05:00Z
status: human_needed
score: 15/15 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 12/15
  gaps_closed:
    - "resend and jose declared in package.json and package-lock.json (Gap 1 — closed by Plan 07)"
    - "Existing test suite passes with no regressions — all 56 tests green including 6/6 idempotency tests (Gap 2 — closed by Plan 07)"
    - "User can sign up for the mailing list from the home page when no active drop is running — no-active-drop branch now renders MailingListSection (Gap 3 — closed by Plan 08)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Visual verification of NavBar on desktop and mobile"
    expected: "Desktop shows logo left, 5 centered nav links, Order Now + Cart right. Mobile shows logo left, hamburger + Cart right. Drawer slides in from left, closes on link tap/overlay tap/Escape. Active route link is gold (#f0c16a). Cart badge visible at all times."
    why_human: "Plan 02 Task 3 human checkpoint was never completed. Automated checks confirm the NavBar code structure (usePathname, aria-expanded, Escape handler, min-h-[44px]) but cannot verify the visual layout, drawer animation, scroll lock, or active-link highlight at runtime."
---

# Phase 5: Content & Mailing List Verification Report

**Phase Goal:** Complete the site — site-wide navigation, catering/about/contact static pages, mailing list signup on home page and footer, unsubscribe flow, and drop notification broadcast via Resend.
**Verified:** 2026-04-21T09:05:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure via Plans 07 and 08

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | NavBar and Footer appear on every page via layout.tsx | VERIFIED | `app/layout.tsx` imports both and wraps `{children}` with `<NavBar />{children}<Footer />` inside Providers |
| 2 | NavBar has 5 nav links (Home, Frozen Drops, Catering, About, Contact) with correct hrefs | VERIFIED | `components/NavBar.tsx` navLinks array contains all 5 links with exact hrefs (/, /#order, /catering, /about, /contact) |
| 3 | Mobile hamburger drawer with Escape, overlay, link-tap close — active link highlighting | VERIFIED | NavBar contains usePathname, aria-expanded, aria-controls="mobile-nav-drawer", Escape handler, min-h-[44px] touch target |
| 4 | OrderLanding no longer double-renders NavBar or Footer | VERIFIED | `grep -c "NavBar\|Footer" components/OrderLanding.tsx` returns 0 |
| 5 | User can sign up from the home page mailing list section (active drop state) | VERIFIED | MailingListSection rendered in OrderLanding active-drop branch (line 200); POSTs to /api/mailing-list |
| 6 | User can sign up from the home page when no active drop is running | VERIFIED | OrderLanding no-active-drop branch (line 64) now renders `<MailingListSection />` — stub form removed; no event.preventDefault, no inline form, no "Notify Me" button in OrderLanding |
| 7 | Footer shows inline email signup on every page | VERIFIED | Footer.tsx is a client component with useState form posting to /api/mailing-list; "Join List" button confirmed |
| 8 | Unsubscribe flow: signed JWT token library, API route verifying token, /unsubscribe page with 3 states | VERIFIED | lib/unsubscribeToken.ts (HS256, 30d expiry, algorithms pin), app/api/unsubscribe/route.ts (401 on invalid token, updates subscribed=false), app/unsubscribe/page.tsx (Suspense, 3 states) |
| 9 | Broadcast endpoint: bearer auth, sends via Resend per subscriber, per-recipient unsubscribe link, email_logs row per send | VERIFIED | app/api/admin/broadcast/route.ts: authorize() checks before body parse; .eq("subscribed",true) subscriber query; signUnsubscribeToken per recipient; .from("email_logs").insert per send |
| 10 | /catering page with tier cards, booking details, service area, mailto CTA | VERIFIED | app/catering/page.tsx confirmed with heading, CateringSection (Basic/Plus/Ultra with included lists), booking blocks, catering@bigmattsbbq.com CTA |
| 11 | /about page with 3+ paragraphs of draft copy | VERIFIED | app/about/page.tsx has 3 substantive paragraphs and "Draft copy — Matt will revise before launch." disclaimer |
| 12 | /contact page with general email, catering email, service area — no form | VERIFIED | app/contact/page.tsx has bigmattsbarbecue@gmail.com, catering@bigmattsbbq.com, "Cache Valley and Utah County", zero `<form>` elements |
| 13 | CateringSection home page teaser "See full catering menu →" link | VERIFIED | CateringSection showFullMenuLink prop renders the link; OrderLanding passes `<CateringSection showFullMenuLink />` |
| 14 | resend and jose declared in package.json and package-lock.json | VERIFIED | `package.json` has `"resend": "^6.12.2"` and `"jose": "^6.2.2"` under dependencies; both present in package-lock.json as node_modules/resend and node_modules/jose |
| 15 | Full test suite passes with no regressions | VERIFIED | All 56 tests pass: 12 test files including idempotency (6/6), mailingList (4/4), broadcast (4/4), unsubscribeToken (4/4) |

**Score:** 15/15 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `components/NavBar.tsx` | 5 nav links, hamburger, active-route highlight | VERIFIED | All plan acceptance criteria present |
| `app/layout.tsx` | NavBar + Footer wrapping all pages | VERIFIED | `<NavBar />{children}<Footer />` inside Providers |
| `components/Footer.tsx` | Client component, inline mailing list signup | VERIFIED | `"use client"`, useState form state, Join List button, /api/mailing-list fetch |
| `components/OrderLanding.tsx` | No NavBar/Footer refs; MailingListSection in both branches | VERIFIED | NavBar/Footer removed; MailingListSection in active branch (line 200) and no-active-drop branch (line 64); no stub form |
| `app/api/mailing-list/route.ts` | POST, Zod email, 23505 silent, 200 on dup | VERIFIED | runtime="nodejs", z.string().trim().toLowerCase().email(), 23505 check, all 4 tests pass |
| `components/MailingListSection.tsx` | Full-width home section, /api/mailing-list fetch | VERIFIED | "Drop Notifications", "Be first to know...", "Notify Me", fetch to /api/mailing-list |
| `lib/unsubscribeToken.ts` | signUnsubscribeToken + verifyUnsubscribeToken, HS256, 30d | VERIFIED | All 4 unsubscribeToken tests pass; HS256, algorithms pin, 30d, length<32 guard |
| `app/api/unsubscribe/route.ts` | verifyUnsubscribeToken, subscribed=false, 401 on invalid | VERIFIED | Inner try/catch, 401 on token failure, .update({subscribed:false}).eq("email",email) |
| `app/unsubscribe/page.tsx` | Suspense, useSearchParams, 3 UI states, correct copy | VERIFIED | Suspense wrapper, 3 states with verbatim copy, /api/unsubscribe fetch |
| `app/api/admin/broadcast/route.ts` | Bearer auth, Resend send loop, email_logs, signUnsubscribeToken | VERIFIED | All 4 broadcast tests pass; authorize() first; per-recipient JWT; email_logs insert |
| `app/catering/page.tsx` | Catering heading, CateringSection, booking blocks, mailto | VERIFIED | Server component, correct copy, no showFullMenuLink prop |
| `app/about/page.tsx` | About heading, 3 paragraphs, draft disclaimer | VERIFIED | 3 paragraphs with substantive BBQ copy, "Draft copy" disclaimer |
| `app/contact/page.tsx` | Get in Touch heading, both emails, service area, no form | VERIFIED | All required elements present, zero `<form>` elements |
| `components/CateringSection.tsx` | TIERS array, showFullMenuLink, catering@bigmattsbbq.com | VERIFIED | Basic/Plus/Ultra each with included lists; conditional teaser link; updated mailto |
| `package.json` | resend and jose in dependencies | VERIFIED | `"resend": "^6.12.2"` and `"jose": "^6.2.2"` under dependencies — restored by Plan 07 |
| `lib/idempotency.ts` | Deterministic SHA-256 from Phase 4 preserved | VERIFIED | createHash("sha256"), [...inputs].sort().join("|"), .digest("hex").slice(0, 45) — restored by Plan 07; 6/6 idempotency tests green |
| `app/api/dev/set-inventory/route.ts` | Array-arg idempotency callsite | VERIFIED | `newIdempotencyKey([` at line 47 — no bare zero-arg call |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/layout.tsx` | `components/NavBar.tsx` | `import { NavBar } + <NavBar />` | WIRED | Confirmed |
| `app/layout.tsx` | `components/Footer.tsx` | `import { Footer } + <Footer />` | WIRED | Confirmed |
| `components/NavBar.tsx` | `next/navigation` | usePathname for active-link highlight | WIRED | Import and usage confirmed |
| `components/MailingListSection.tsx` | `/api/mailing-list` | fetch POST on submit | WIRED | Confirmed |
| `components/Footer.tsx` | `/api/mailing-list` | fetch POST on submit | WIRED | Confirmed |
| `app/api/mailing-list/route.ts` | `mailing_list` Supabase table | `.from("mailing_list").insert({ email })` | WIRED | Confirmed |
| `components/OrderLanding.tsx` (no-drop branch) | `components/MailingListSection.tsx` | `<MailingListSection />` at line 64 | WIRED | Gap 3 closed — stub form replaced |
| `app/unsubscribe/page.tsx` | `/api/unsubscribe` | fetch POST with token in body | WIRED | Confirmed |
| `app/api/unsubscribe/route.ts` | `lib/unsubscribeToken` | verifyUnsubscribeToken import | WIRED | Confirmed |
| `app/api/unsubscribe/route.ts` | `mailing_list` | `.update({ subscribed: false })` | WIRED | Confirmed |
| `app/api/admin/broadcast/route.ts` | Resend SDK | `new Resend(...).emails.send(...)` | WIRED | Confirmed |
| `app/api/admin/broadcast/route.ts` | `lib/unsubscribeToken` | signUnsubscribeToken per recipient | WIRED | Confirmed |
| `app/api/admin/broadcast/route.ts` | `mailing_list` | `.eq("subscribed", true)` | WIRED | Confirmed |
| `app/api/admin/broadcast/route.ts` | `email_logs` | insert per send attempt | WIRED | Confirmed |
| `components/CateringSection.tsx` | `app/catering/page.tsx` | `href="/catering"` teaser link | WIRED | Conditional render when showFullMenuLink |
| `components/NavBar.tsx` | app/catering, app/about, app/contact | Link hrefs | WIRED | navLinks array confirmed |
| `app/api/checkout/route.ts` | `lib/idempotency.ts` | `newIdempotencyKey([...])` with 4 array callsites | WIRED | 4 array-arg calls, 0 bare zero-arg calls |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `app/api/mailing-list/route.ts` | email from POST body | Zod-validated request body → Supabase insert | Yes | FLOWING |
| `app/api/admin/broadcast/route.ts` | subscribers | Supabase `.from("mailing_list").select("email").eq("subscribed", true)` | Yes — real DB query | FLOWING |
| `components/MailingListSection.tsx` | email state | useState; fetch to /api/mailing-list | Yes — real API call | FLOWING |
| `components/Footer.tsx` | email state | useState; fetch to /api/mailing-list | Yes — real API call | FLOWING |
| `app/unsubscribe/page.tsx` | state (loading/success/invalid) | fetch to /api/unsubscribe on mount | Yes — real API call | FLOWING |
| `components/OrderLanding.tsx` (no-drop branch) | email via MailingListSection | MailingListSection state machine → /api/mailing-list | Yes — real component wired | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 56 tests pass | `npm run test` | 56/56 passed, 12 test files | PASS |
| idempotency tests (regression) | subset of above | 6/6 passed | PASS |
| mailingList tests | subset of above | 4/4 passed | PASS |
| broadcast tests | subset of above | 4/4 passed | PASS |
| unsubscribeToken tests | subset of above | 4/4 passed | PASS |
| resend in package.json | `grep '"resend"' package.json` | `"resend": "^6.12.2"` | PASS |
| jose in package.json | `grep '"jose"' package.json` | `"jose": "^6.2.2"` | PASS |
| OrderLanding stub form gone | `grep -c "event.preventDefault" components/OrderLanding.tsx` | 0 | PASS |
| MailingListSection in both branches | `grep -c "MailingListSection" components/OrderLanding.tsx` | 3 (1 import + 2 renders) | PASS |
| idempotency is deterministic SHA-256 | `cat lib/idempotency.ts` | createHash("sha256") confirmed | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| MAIL-02 | Plans 03, 08 | User can sign up for mailing list from home page | SATISFIED | Both active-drop and no-active-drop branches now render MailingListSection; active-drop: line 200, no-active-drop: line 64 |
| MAIL-03 | Plan 03 | User can sign up from site-wide footer | SATISFIED | Footer.tsx client component, Join List button, /api/mailing-list fetch confirmed |
| MAIL-05 | Plan 04 | Subscribers can unsubscribe via link in emails | SATISFIED | lib/unsubscribeToken.ts, /api/unsubscribe, /unsubscribe page all implemented and 4/4 tests pass |
| MAIL-06 | Plan 05 | Drop notification broadcast via Resend | SATISFIED | /api/admin/broadcast with bearer auth, Resend loop, email_logs audit trail — 4/4 tests pass |
| NAV-01 | Plan 02 | Site-wide navigation: Home, Frozen Drops, Catering, About, Contact | SATISFIED | NavBar in layout.tsx with all 5 links, mobile drawer, active highlighting — human visual verification still needed (see below) |
| PAGE-01 | Plan 06 | Catering page with static menu, pricing, and mailto CTA | SATISFIED | /catering renders with tiers, booking blocks, service area, catering@bigmattsbbq.com |
| PAGE-02 | Plan 06 | About page with static content | SATISFIED | /about has 3 paragraphs, draft disclaimer; ready for Matt's review |
| PAGE-03 | Plan 06 | Contact page with contact information | SATISFIED | /contact has both emails, service area, no form per D-22 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/api/admin/broadcast/route.ts` | ~100 | Caller-supplied `html` appended without sanitization | Warning | Compromised admin credential allows arbitrary HTML injection into subscriber emails — mitigated by bearer auth requirement |
| `lib/unsubscribeToken.ts` | 7-13 | Falls back from UNSUBSCRIBE_SECRET to BROADCAST_SECRET silently | Warning | Accidental deletion of UNSUBSCRIBE_SECRET silently uses a different key, causing token failures without clear error |
| `app/about/page.tsx` | ~29 | "Draft copy — Matt will revise before launch." visible on live page | Info | Pre-launch item per D-21; Matt is aware and plans to revise |

No blockers remain. The three blockers from the previous verification have all been closed.

### Human Verification Required

#### 1. NavBar Full UX Verification

**Test:** Run `npm run dev` and open http://localhost:3000.

Desktop (browser width ≥ 768px):
1. Verify header shows: logo (left), 5 nav links centered (Home, Frozen Drops, Catering, About, Contact), [Order Now] [Cart] on the right.
2. Verify "Home" link is highlighted in gold (`#f0c16a`) on `/`.
3. Click "Frozen Drops" — page scrolls to `#order` section.
4. Visit `/checkout`, `/catering`, `/about`, `/contact` — verify header appears on each with the correct active link highlighted.
5. Add an item to cart — verify cart badge shows count in header.

Mobile (resize to <768px via DevTools):
1. Verify header shows: logo (left), hamburger + Cart (right). No centered nav links, no "Order Now" button.
2. Tap hamburger — drawer slides in from the left with 5 stacked nav links. Overlay darkens the rest of the page.
3. Tap any link in the drawer — drawer closes, navigation occurs.
4. Reopen drawer. Tap the overlay — drawer closes.
5. Reopen drawer. Press Escape — drawer closes.
6. Verify cart badge stays visible in header at all times (per D-03).
7. Verify hamburger icon changes from ≡ to ✕ when drawer is open.

**Expected:** All of the above behaviors match Plan 02 spec.
**Why human:** Plan 02 Task 3 human checkpoint was never signed off. Automated checks confirm code structure but cannot verify visual layout, drawer animation, scroll lock behavior, or active-link color at runtime.

## Gaps Summary

No gaps remain. All three gaps from the initial verification have been closed:

- **Gap 1 CLOSED:** `package.json` now declares `resend@^6.12.2` and `jose@^6.2.2` under dependencies. `package-lock.json` contains both `node_modules/resend` and `node_modules/jose` entries with integrity hashes.

- **Gap 2 CLOSED:** `lib/idempotency.ts` is the deterministic SHA-256 implementation. All 6 tests in `tests/idempotency.test.ts` pass. All 5 callsites (4 in checkout, 1 in dev/set-inventory) pass string array arguments.

- **Gap 3 CLOSED:** `components/OrderLanding.tsx` no-active-drop branch renders `<MailingListSection />` (line 64) instead of the stub form. Zero occurrences of `event.preventDefault`, zero inline email inputs, zero "Notify Me" buttons remain in OrderLanding.tsx. The hero heading and intro paragraph are preserved.

One human verification item remains (NavBar UX) from the original verification. This is not a gap in the code — it is a visual/behavioral confirmation that automated checks cannot perform.

---

_Verified: 2026-04-21T09:05:00Z_
_Verifier: Claude (gsd-verifier)_
