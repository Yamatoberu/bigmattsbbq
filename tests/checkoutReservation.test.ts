import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

const cartSchema = z.object({
  variationId: z.string().min(1),
  quantity: z.number().int().positive(),
  productName: z.union([z.literal("pulled_pork"), z.literal("brisket")]).optional()
});

function aggregateByProduct(
  items: Array<{ variationId: string; quantity: number; productName?: "pulled_pork" | "brisket" }>
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of items) {
    if (item.productName) {
      totals.set(item.productName, (totals.get(item.productName) ?? 0) + item.quantity);
    }
  }
  return totals;
}

describe("cartSchema", () => {
  it("accepts items with productName pulled_pork", () => {
    const result = cartSchema.safeParse({
      variationId: "var-001",
      quantity: 2,
      productName: "pulled_pork"
    });
    expect(result.success).toBe(true);
  });

  it("accepts items with productName brisket", () => {
    const result = cartSchema.safeParse({
      variationId: "var-002",
      quantity: 1,
      productName: "brisket"
    });
    expect(result.success).toBe(true);
  });

  it("accepts items WITHOUT productName (sauce items)", () => {
    const result = cartSchema.safeParse({
      variationId: "var-sauce",
      quantity: 1
    });
    expect(result.success).toBe(true);
  });

  it("rejects items with invalid productName", () => {
    const result = cartSchema.safeParse({
      variationId: "var-003",
      quantity: 1,
      productName: "invalid_meat"
    });
    expect(result.success).toBe(false);
  });
});

describe("aggregateByProduct", () => {
  it("groups items by productName and sums quantities", () => {
    const items = [
      { variationId: "var-001", quantity: 2, productName: "pulled_pork" as const },
      { variationId: "var-002", quantity: 3, productName: "pulled_pork" as const },
      { variationId: "var-003", quantity: 1, productName: "brisket" as const }
    ];
    const result = aggregateByProduct(items);
    expect(result.get("pulled_pork")).toBe(5);
    expect(result.get("brisket")).toBe(1);
  });

  it("skips items without productName (sauce items)", () => {
    const items = [
      { variationId: "var-001", quantity: 2, productName: "pulled_pork" as const },
      { variationId: "var-sauce", quantity: 1 }
    ];
    const result = aggregateByProduct(items);
    expect(result.size).toBe(1);
    expect(result.get("pulled_pork")).toBe(2);
  });
});
