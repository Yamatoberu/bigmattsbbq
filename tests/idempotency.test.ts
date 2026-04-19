import { describe, it, expect } from "vitest";
import { newIdempotencyKey } from "../lib/idempotency";

describe("newIdempotencyKey", () => {
  it("returns a string of length <= 45", () => {
    const key = newIdempotencyKey(["a", "b", "c"]);
    expect(typeof key).toBe("string");
    expect(key.length).toBeLessThanOrEqual(45);
  });

  it("is deterministic — same inputs return the same key", () => {
    const key1 = newIdempotencyKey(["a", "b", "c"]);
    const key2 = newIdempotencyKey(["a", "b", "c"]);
    expect(key1).toBe(key2);
  });

  it("produces different keys for different inputs", () => {
    const key1 = newIdempotencyKey(["a", "b", "c"]);
    const key2 = newIdempotencyKey(["a", "b", "d"]);
    expect(key1).not.toBe(key2);
  });

  it("is order-independent — inputs are sorted before hashing", () => {
    const key1 = newIdempotencyKey(["c", "a", "b"]);
    const key2 = newIdempotencyKey(["a", "b", "c"]);
    expect(key1).toBe(key2);
  });

  it("purpose suffix differentiates keys from the same base inputs", () => {
    const base = ["email@test.com", "drop-1", "pickup-1", "var-001:2"];
    const orderKey = newIdempotencyKey([...base, "order"]);
    const invoiceKey = newIdempotencyKey([...base, "invoice"]);
    expect(orderKey).not.toBe(invoiceKey);
  });

  it("output contains only hex characters [0-9a-f]", () => {
    const key = newIdempotencyKey(["email@test.com", "drop-1", "pickup-1", "var-001:2", "order"]);
    expect(key).toMatch(/^[0-9a-f]+$/);
  });
});
