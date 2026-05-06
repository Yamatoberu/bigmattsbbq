---
slug: countdown-timer
status: complete
completed: "2026-05-05"
---

# Summary: Live Countdown Timer

Created `components/CountdownTimer.tsx` — client component that ticks every second, shows `Xd HH:MM:SS`, hides on expiry, renders static fallback before hydration to avoid SSR mismatch.

Wired into `components/OrderLanding.tsx` hero section replacing the static red badge.

Build clean. Committed: cbc82f4.
