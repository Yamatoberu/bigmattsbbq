import { describe, expect, it } from "vitest";
import { joinInventoryCounts } from "../lib/normalizers";

describe("joinInventoryCounts", () => {
  it("adds remaining inventory to variations", () => {
    const items = [
      {
        itemId: "item-1",
        name: "Brisket",
        description: "",
        variations: [
          { variationId: "var-1", name: "1 lb", priceCents: 1200, currency: "USD", remaining: 0 }
        ]
      }
    ];

    const result = joinInventoryCounts(items, [
      { catalog_object_id: "var-1", quantity: "8" }
    ]);

    expect(result[0].variations[0].remaining).toBe(8);
  });

  it("defaults missing inventory to zero", () => {
    const items = [
      {
        itemId: "item-1",
        name: "Brisket",
        description: "",
        variations: [
          { variationId: "var-1", name: "1 lb", priceCents: 1200, currency: "USD", remaining: 0 }
        ]
      }
    ];

    const result = joinInventoryCounts(items, []);
    expect(result[0].variations[0].remaining).toBe(0);
  });
});
