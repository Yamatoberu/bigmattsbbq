import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { cartSchema } from "../app/api/checkout/route";
import { aggregateByProduct } from "../lib/cart";

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
