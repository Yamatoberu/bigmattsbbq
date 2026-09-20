import { describe, expect, it } from "vitest";
import { resolvePackageToCartItems } from "../lib/cart";
import { PackageConfig } from "../lib/types";

const pkg: PackageConfig = {
  id: "family",
  name: "Family",
  catalogName: "Family Bundle",
  description: "",
  items: [
    { itemName: "Brisket", variationName: "1 lb", quantity: 2 },
    { itemName: "Sauce", variationName: "Jar", quantity: 2 }
  ]
};

const frozenItems = [
  {
    itemId: "item-1",
    name: "Smoked Brisket",
    description: "",
    variations: [
      { variationId: "var-1", name: "1 lb", priceCents: 1200, currency: "USD" }
    ]
  },
  {
    itemId: "item-2",
    name: "BBQ Sauce",
    description: "",
    variations: [
      { variationId: "var-2", name: "Jar", priceCents: 500, currency: "USD" }
    ]
  }
];

describe("resolvePackageToCartItems", () => {
  it("maps package config to variation ids and preserves quantity", () => {
    const result = resolvePackageToCartItems(pkg, frozenItems);
    expect(result).toEqual([
      { variationId: "var-1", quantity: 2 },
      { variationId: "var-2", quantity: 2 }
    ]);
  });

  it("requires an exact normalized variation-name match", () => {
    const ambiguousPkg: PackageConfig = {
      id: "ambiguous",
      name: "Ambiguous",
      catalogName: "Ambiguous Bundle",
      description: "",
      items: [{ itemName: "Sauce", variationName: "Bottle", quantity: 2 }]
    };

    const ambiguousItems = [
      {
        itemId: "item-3",
        name: "BBQ Sauce",
        description: "",
        variations: [
          { variationId: "var-bottle", name: "Bottle", priceCents: 500, currency: "USD" },
          { variationId: "var-bottles", name: "Bottles", priceCents: 900, currency: "USD" }
        ]
      }
    ];

    const result = resolvePackageToCartItems(ambiguousPkg, ambiguousItems);
    expect(result).toEqual([{ variationId: "var-bottle", quantity: 2 }]);
  });
});
