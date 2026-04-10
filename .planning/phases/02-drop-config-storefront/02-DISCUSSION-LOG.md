# Phase 2: Drop Config & Storefront - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 02-drop-config-storefront
**Areas discussed:** Drop state UI, Pickup option display, Sold-out behavior, Data migration path

---

## Drop State UI

### No-drop page behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Teaser page | Brand page with "next drop coming soon" and mailing list CTA | ✓ |
| Countdown page | Countdown timer to drop start, fallback to teaser | |
| Hidden ordering section | Keep layout, hide product sections, show banner | |

**User's choice:** Teaser page
**Notes:** Keeps visitors engaged and captures emails

### Active drop display

| Option | Description | Selected |
|--------|-------------|----------|
| Title + deadline | Show drop title and order cutoff date/time | ✓ |
| Title only | Drop title, no countdown or deadline | |
| Full drop banner | Prominent banner with title, countdown, and capacity summary | |

**User's choice:** Title + deadline
**Notes:** Creates urgency without being pushy

### Closed drop behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Same as no-drop teaser | Show teaser/mailing list page | ✓ |
| Closed + summary | "This drop is closed" with availability summary | |
| Redirect to home | Auto-redirect to home page | |

**User's choice:** Same as no-drop teaser
**Notes:** Closed is functionally equivalent to no active drop

### State check location

| Option | Description | Selected |
|--------|-------------|----------|
| Server-side in page | page.tsx fetches drop state, passes to client component | ✓ |
| Client-side hook | useActiveDrop() hook, client-side fetch | |
| You decide | Claude picks based on patterns | |

**User's choice:** Server-side in page
**Notes:** No flash of wrong state; aligns with checkout pattern

---

## Pickup Option Display

### Presentation format

| Option | Description | Selected |
|--------|-------------|----------|
| Cards with details | Selectable cards with location, date, time window | ✓ |
| Radio list | Radio buttons with location/date/time per row | |
| Dropdown select | Single dropdown, saves space | |

**User's choice:** Cards with details
**Notes:** Matches existing PackageCard pattern, tappable on mobile

### Capacity visibility

| Option | Description | Selected |
|--------|-------------|----------|
| No capacity shown | Just location/date/time; only indicate fully sold out | ✓ |
| "Spots available" indicator | Vague availability signal | |
| Exact remaining count | "12 spots left" per location | |

**User's choice:** No capacity shown
**Notes:** Avoids anxiety, keeps UI clean

### Pickup selection timing

| Option | Description | Selected |
|--------|-------------|----------|
| At checkout | Browse first, select pickup at checkout | ✓ |
| On ordering page | Pick location first, then see products | |
| You decide | Claude picks based on flow | |

**User's choice:** At checkout
**Notes:** Keeps browsing simple, matches current flow

---

## Sold-Out Behavior

### Sold-out product appearance

| Option | Description | Selected |
|--------|-------------|----------|
| Greyed card + badge | Muted card with "Sold Out" badge, disabled button | ✓ |
| Hidden entirely | Remove sold-out products from page | |
| Card with waitlist CTA | "Notify me" button (redirects to mailing list) | |

**User's choice:** Greyed card + badge
**Notes:** Customer sees what was available

### Live update mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Polling interval | Refetch every 30-60 seconds | |
| Supabase Realtime | Websocket subscription | |
| You decide | Claude picks pragmatic approach | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion on live update approach

### Sold-out scope

| Option | Description | Selected |
|--------|-------------|----------|
| Global per-product | Sold out when global drop capacity reached | ✓ |
| Per-location after selection | Only for selected pickup location | |
| Both with context | Global while browsing, per-location at checkout | |

**User's choice:** Global per-product
**Notes:** Customer hasn't selected location while browsing

---

## Data Migration Path

### Package storage

| Option | Description | Selected |
|--------|-------------|----------|
| Stay hardcoded | Keep packages in lib/config.ts | ✓ |
| Move to Supabase | Store in packages table | |
| Per-drop packages | Each drop has different package configs | |

**User's choice:** Stay hardcoded
**Notes:** UI convenience, no MVP benefit to move

### Old PICKUP_OPTIONS

| Option | Description | Selected |
|--------|-------------|----------|
| Delete entirely | Remove from config.ts, all data from Supabase | ✓ |
| Keep as fallback | Fallback if Supabase unreachable | |
| You decide | Claude picks cleanest approach | |

**User's choice:** Delete entirely
**Notes:** Clean break, no dead code

### API endpoint design

| Option | Description | Selected |
|--------|-------------|----------|
| New /api/drop endpoint | Separate endpoint for drop state + pickup options | ✓ |
| Extend /api/frozen-items | Add drop data to existing response | |
| You decide | Claude picks based on patterns | |

**User's choice:** New /api/drop endpoint
**Notes:** Keeps Square and Supabase concerns separate

---

## Claude's Discretion

- Live update mechanism for sold-out detection
- Pickup option card layout/spacing details
- Loading skeleton design
- Error handling for Supabase failures
- PickupOption type definition shape

## Deferred Ideas

None
