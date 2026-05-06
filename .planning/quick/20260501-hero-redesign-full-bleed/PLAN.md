---
slug: hero-redesign-full-bleed
created: 2026-05-01
status: in-progress
---

# Hero Section Redesign — Full-Bleed Atmospheric

## Goal
Replace the striped panel card hero with a full-bleed atmospheric section that matches the rest of the page's design language.

## Changes

### `app/globals.css`
- Rewrite `.hero-panel` — remove `rounded-lg`, `border`, and the `repeating-linear-gradient` stripe; replace with full-bleed atmospheric layers (ember radial glow + dark base + bottom fade)
- Rewrite `.hero-content` — remove `max-w-xl` cap, expand to use full section width

### `components/OrderLanding.tsx`
- Active-drop path: remove the `<div className="hero-panel">` wrapper and its inline radial overlay; make the section itself the atmospheric container (`max-w-5xl` matching order section)
- No-drop path: same treatment — remove panel wrapper, center content in full-bleed section

## Design Spec
- No rounded border, no card box
- Background: dark base (`#0d0906`) + ember radial glow centered-left + bottom fade to `#120c09`
- Content: `max-w-5xl` container, left-aligned on desktop
- Padding: matches `section-spacing` (px-6 py-12 md:px-12) but with extra top padding for breathing room
- Bottom fade: `after:` pseudo-element or inline gradient so the section bleeds into the next dark section
