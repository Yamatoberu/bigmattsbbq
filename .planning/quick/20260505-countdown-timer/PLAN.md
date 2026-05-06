---
slug: countdown-timer
created: "2026-05-05"
status: in-progress
---

# Quick Task: Live Countdown Timer

## Goal
Replace the static "Orders close …" red badge in the hero section with a live ticking countdown timer. Keep the static date as a fallback.

## Steps
1. Create `components/CountdownTimer.tsx` — "use client", ticks every second, displays `X days X hrs X min X sec`, hides when expired
2. Import and use `CountdownTimer` in `components/OrderLanding.tsx` hero section, replacing the static badge span
3. Build check passes
