import { describe, expect, it } from "vitest";
import { resolvePackageToCartItems } from "../lib/cart";
import { PackageConfig } from "../lib/types";

const pkg: PackageConfig = {
  id: "family",
  name: "Family",
  description: "",
  items: [
    { itemName: "Brisket", variationName: "1 lb", quantity: 1 },
    { itemName: "Sauce", variationName: "Jar", quantity: 2 }
  ]
};

const frozenItems = [
  {
    itemId: "item-1",
    name: "Smoked Brisket",
    description: "",
    variations: [
      { variationId: "var-1", name: "1 lb", priceCents: 1200, currency: "USD", remaining: 10 }
    ]
  },
  {
    itemId: "item-2",
    name: "BBQ Sauce",
    description: "",
    variations: [
      { variationId: "var-2", name: "Jar", priceCents: 500, currency: "USD", remaining: 20 }
    ]
  }
];

describe("resolvePackageToCartItems", () => {
  it("maps package config to variation ids", () => {
    const result = resolvePackageToCartItems(pkg, frozenItems);
    expect(result).toEqual([
      { variationId: "var-1", quantity: 1 },
      { variationId: "var-2", quantity: 2 }
    ]);
  });
});
