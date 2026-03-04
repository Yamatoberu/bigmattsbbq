import { describe, expect, it } from "vitest";
import { isSauceBumpNeeded } from "../lib/cart";

describe("isSauceBumpNeeded", () => {
  it("returns true when meat present and sauce missing", () => {
    const result = isSauceBumpNeeded(
      [{ variationId: "meat-1", quantity: 2 }],
      "sauce-1"
    );
    expect(result).toBe(true);
  });

  it("returns false when sauce already in cart", () => {
    const result = isSauceBumpNeeded(
      [
        { variationId: "meat-1", quantity: 1 },
        { variationId: "sauce-1", quantity: 1 }
      ],
      "sauce-1"
    );
    expect(result).toBe(false);
  });
});
