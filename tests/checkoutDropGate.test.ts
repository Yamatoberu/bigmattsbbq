import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { checkDropReady, type DropReadinessRow } from "../lib/drops";

const activeRow: DropReadinessRow = {
  status: "active",
  order_cutoff_at: "2099-12-31T23:59:59Z"
};

describe("checkDropReady", () => {
  it("returns ok when drop is active and not sold out", () => {
    const result = checkDropReady(activeRow);
    expect(result).toEqual({ ok: true });
  });

  it("returns 409 with closed message when status is closed", () => {
    const result = checkDropReady({ ...activeRow, status: "closed" });
    expect(result).toEqual({
      ok: false,
      status: 409,
      error: "This drop has closed. Orders are no longer being accepted."
    });
  });

  it("returns 409 with closed message when status is upcoming", () => {
    const result = checkDropReady({ ...activeRow, status: "upcoming" });
    expect(result).toEqual({
      ok: false,
      status: 409,
      error: "This drop has closed. Orders are no longer being accepted."
    });
  });

  it("returns 404 when drop is null", () => {
    const result = checkDropReady(null);
    expect(result).toEqual({
      ok: false,
      status: 404,
      error: "Drop not found."
    });
  });

  it("returns ok when order_cutoff_at is in the future", () => {
    const result = checkDropReady({
      ...activeRow,
      order_cutoff_at: "2099-12-31T23:59:59Z"
    });
    expect(result).toEqual({ ok: true });
  });

  it("returns 409 closed when order_cutoff_at is in the past", () => {
    const result = checkDropReady({
      ...activeRow,
      order_cutoff_at: "2020-01-01T00:00:00Z"
    });
    expect(result).toEqual({
      ok: false,
      status: 409,
      error: "This drop has closed. Orders are no longer being accepted."
    });
  });

  it("returns ok when order_cutoff_at is null (no cutoff configured)", () => {
    const result = checkDropReady({
      ...activeRow,
      order_cutoff_at: null
    });
    expect(result).toEqual({ ok: true });
  });

  it("still returns 409 closed when status is closed", () => {
    const result = checkDropReady({
      ...activeRow,
      status: "closed"
    });
    expect(result).toEqual({
      ok: false,
      status: 409,
      error: "This drop has closed. Orders are no longer being accepted."
    });
  });
});
