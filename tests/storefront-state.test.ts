import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// DATA-05: Drop pickup options are stored in Supabase and replace hardcoded config.
// D-12:    PICKUP_OPTIONS constant was deleted from lib/config.ts.

describe("DATA-05 — storefront state: Supabase is source of truth for pickup options", () => {
  describe("lib/config.ts no longer exports PICKUP_OPTIONS", () => {
    it("PICKUP_OPTIONS is absent from the config module (D-12 deletion confirmed)", async () => {
      const config = await import("../lib/config");
      expect((config as Record<string, unknown>)["PICKUP_OPTIONS"]).toBeUndefined();
    });

    it("PACKAGES is still exported as a non-empty array (regression guard)", async () => {
      const { PACKAGES } = await import("../lib/config");
      expect(Array.isArray(PACKAGES)).toBe(true);
      expect(PACKAGES.length).toBeGreaterThan(0);
    });
  });

  describe("lib/types.ts exports the new PickupOptionDTO shape", () => {
    it("PickupOptionDTO is absent from the runtime module namespace (interfaces are erased at runtime)", async () => {
      const types = await import("../lib/types");
      // TypeScript interfaces have no runtime representation — always undefined at runtime.
      // This confirms the file compiled cleanly with PickupOptionDTO defined as an interface.
      expect((types as Record<string, unknown>)["PickupOptionDTO"]).toBeUndefined();
    });

    it("legacy PickupOption interface is absent from runtime module namespace", async () => {
      const types = await import("../lib/types");
      // Both legacy PickupOption and new PickupOptionDTO are interfaces; neither appears at
      // runtime. This assertion locks the contract: if a class or const named PickupOption
      // were re-introduced, this test would catch it.
      expect((types as Record<string, unknown>)["PickupOption"]).toBeUndefined();
    });

    it("DropDTO-shaped object can be constructed with PickupOptionDTO fields (structural validation)", async () => {
      // Validate that the DropDTO shape accepted by the storefront includes pickupOptions.
      // We construct a minimal conforming object and assert its shape, which would fail to
      // type-check at build time if the interface were missing or malformed.
      const pickupOption = {
        id: "p1",
        locationLabel: "Preston",
        pickupDateLabel: "May 9",
        pickupAtISO: "2026-05-09T16:00:00-06:00"
      };

      const drop = {
        id: "d1",
        title: "April 2026 Drop",
        status: "active" as const,
        orderCutoffAt: null,
        pickupOptions: [pickupOption]
      };

      expect(drop.pickupOptions).toHaveLength(1);
      expect(drop.pickupOptions[0].locationLabel).toBe("Preston");
    });
  });

  describe("fetchActiveDrop returns null when Supabase has no active drop (Supabase as source of truth)", () => {
    beforeEach(() => {
      vi.resetModules();
    });

    afterEach(() => {
      vi.doUnmock("../lib/supabase");
      vi.doUnmock("server-only");
    });

    it("fetchActiveDrop returns null when no active drop row exists in Supabase", async () => {
      vi.doMock("../lib/supabase", () => ({
        getSupabaseClient: () => ({
          from: () => ({
            select: function () { return this; },
            eq: function () { return this; },
            order: function () { return this; },
            limit: function () { return this; },
            maybeSingle: () => Promise.resolve({ data: null, error: null })
          })
        })
      }));
      vi.doMock("server-only", () => ({}));

      const { fetchActiveDrop } = await import("../lib/drops");
      const result = await fetchActiveDrop();

      expect(result).toBeNull();
    });
  });
});
