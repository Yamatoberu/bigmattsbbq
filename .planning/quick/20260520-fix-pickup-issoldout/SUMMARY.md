---
slug: fix-pickup-issoldout
status: complete
completed: 2026-05-20
---

Moved `capacityEnforced` declaration above the pickupOptions mapping in `lib/drops.ts` and gated `isSoldOut` on it. All 8 existing drop tests pass. Committed as `1a4e57c`.
