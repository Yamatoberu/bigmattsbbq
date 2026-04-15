# Phase 5: Content & Mailing List — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 05-content-mailing-list
**Areas discussed:** Site-wide navigation, Mailing list signup UX, Resend scope & MAIL-01, Static pages depth & content

---

## Site-wide Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Logo left, links center, cart right | Classic 3-zone header — logo left, page links center, cart right | ✓ |
| Logo left, links + cart all right | Links and cart cluster together on the right | |
| Logo top, links below (stacked) | Two-row header | |

**User's choice:** Logo left, links center (Home, Frozen Drops, Catering, About, Contact), Order Now + Cart right

---

| Option | Description | Selected |
|--------|-------------|----------|
| Hamburger → slide-in drawer | Full-height drawer, cart badge always in header | ✓ |
| Hamburger → dropdown overlay | Dropdown below header | |
| Horizontal scroll nav strip | Always-visible scrollable strip | |

**User's choice:** Hamburger → slide-in drawer. Cart badge stays in header at all times.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Keep "Order Now" button | Primary action CTA distinct from nav links | ✓ |
| Remove it — Frozen Drops link covers it | Redundant with nav | |
| Contextual CTA based on drop state | Show/hide based on active drop | |

**User's choice:** Keep "Order Now" — it's a CTA, not navigation.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Move NavBar + Footer to layout.tsx | Site-wide layout, clean up OrderLanding | ✓ |
| Keep in OrderLanding, add to each page manually | Less refactoring risk | |

**User's choice:** Move to layout.tsx. OrderLanding cleaned up.

---

## Mailing List Signup UX

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated full-width section | Distinct band on home page with headline + email form | ✓ |
| Compact inline callout | Smaller card/banner | |
| Claude's discretion | Decide based on page flow | |

**User's choice:** Full-width section — "Be first to know about the next drop."

---

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in footer — email + button on one row | Minimal footprint alongside copyright text | ✓ |
| Footer section above copyright strip | Labeled block with more vertical space | |

**User's choice:** Inline email + button on one row in footer.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Inline success message — form replaced | Form disappears, success text appears | ✓ |
| Toast / brief notification | Toast at top/bottom, form stays visible | |
| Claude's discretion | Most natural UX for context | |

**User's choice:** Inline success message replaces form. Works for both home section and footer.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Silent success — same "You're on the list" message | No email enumeration, no friction | ✓ |
| Friendly "you're already subscribed" message | Transparent but leaks email presence | |

**User's choice:** Silent success for duplicate emails.

---

## Resend Scope & MAIL-01

| Option | Description | Selected |
|--------|-------------|----------|
| No — keep MAIL-01 deferred, Square invoice is enough | Phase 4 decision stands | ✓ |
| Yes — send confirmation email via Resend after checkout | Bring MAIL-01 back while Resend is being wired | |

**User's choice:** MAIL-01 stays deferred. Square invoice email is sufficient for MVP.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Admin-only API route with shared secret | POST /api/admin/broadcast, called manually | ✓ |
| Supabase database trigger / Edge Function | Auto-broadcast on drop status change | |
| Manual script | Local CLI script | |

**User's choice:** Admin API route — `POST /api/admin/broadcast` with `Authorization: Bearer <BROADCAST_SECRET>`.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Signed token URL → one-click unsubscribe page | JWT-encoded email, no login required | ✓ |
| Resend's built-in unsubscribe header | Resend handles unsubscribe, webhook needed | |
| Claude's discretion | Simplest reliable implementation | |

**User's choice:** Signed token URL → `/unsubscribe?token=<signed-jwt>` → updates Supabase.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Shared secret header | Authorization: Bearer <BROADCAST_SECRET> | ✓ |
| Supabase service role check | Supabase auth for admin route | |

**User's choice:** Shared secret header.

---

## Static Pages Depth & Content

| Option | Description | Selected |
|--------|-------------|----------|
| Expand CateringSection into full /catering page | Same tiers + more detail; home teaser links to it | ✓ |
| Replace home CateringSection with /catering link | Shrink home page teaser | |
| Keep both independent | No component reuse | |

**User's choice:** Expand to full /catering page; home page CateringSection gets a "See full catering menu →" link.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Thin but real — a few sentences each | About: who Matt is, BBQ philosophy. Contact: emails + service area. | ✓ |
| Full story pages | Detailed brand story, contact form | |
| Placeholder pages | Coming soon / minimal | |

**User's choice:** Thin but real. 2-3 paragraphs each.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Claude drafts it — review and adjust later | Claude writes copy based on project context | ✓ |
| I'll provide the copy | Matt supplies the text | |

**User's choice:** Claude drafts About and Contact copy. Matt reviews before launch.

---

## Claude's Discretion

- Exact mailing list headline, CTA label, and success message text
- About and Contact page copy (Claude drafts)
- Broadcast email template design and subject line
- Unsubscribe page visual treatment and copy
- JWT signing approach for unsubscribe tokens
- Active nav link highlighting pattern
- Hamburger animation and drawer close behavior
- Whether unsubscribed_at timestamp or boolean flag in mailing_list schema

## Deferred Ideas

- MAIL-01 (Resend checkout confirmation) — remains post-MVP
- Admin UI for drops and mailing list management — v2
- Contact form — static email CTAs for MVP
- Catering scheduling system — static page only for MVP
