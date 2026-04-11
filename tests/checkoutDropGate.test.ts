import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { checkDropReady, type DropReadinessRow } from "../lib/drops";

const activeRow: DropReadinessRow = {
  status: "active",
  capacity_pulled_pork: 200,
  capacity_brisket: 200,
  reserved_pulled_pork: 50,
  reserved_brisket: 50
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

  it("returns 409 with sold-out message when both products at capacity", () => {
    const result = checkDropReady({
      ...activeRow,
      reserved_pulled_pork: 200,
      reserved_brisket: 200
    });
    expect(result).toEqual({
      ok: false,
      status: 409,
      error: "This drop has sold out. No more orders can be taken."
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

  it("returns ok when only one product is at capacity (global sold-out requires both)", () => {
    const result = checkDropReady({
      ...activeRow,
      reserved_pulled_pork: 200,
      reserved_brisket: 50
    });
    expect(result).toEqual({ ok: true });
  });
});
