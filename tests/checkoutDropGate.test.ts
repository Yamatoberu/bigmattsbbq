import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { checkDropReady, type DropReadinessRow } from "../lib/drops";

const activeRow: DropReadinessRow = {
  status: "active",
  capacity_pulled_pork: 200,
  capacity_brisket: 200,
  capacity_sauce: 200,
  capacity_family_night: 200,
  capacity_backyard_host: 200,
  capacity_freezer_filler: 200,
  reserved_pulled_pork: 50,
  reserved_brisket: 50,
  reserved_sauce: 0,
  reserved_family_night: 0,
  reserved_backyard_host: 0,
  reserved_freezer_filler: 0,
  order_cutoff_at: "2099-12-31T23:59:59Z",
  capacity_enforced: true
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

  it("returns 409 with sold-out message when all 6 products at capacity", () => {
    const result = checkDropReady({
      ...activeRow,
      reserved_pulled_pork: 200,
      reserved_brisket: 200,
      reserved_sauce: 200,
      reserved_family_night: 200,
      reserved_backyard_host: 200,
      reserved_freezer_filler: 200
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

  it("returns ok when only some products are at capacity (global sold-out requires all 6)", () => {
    const result = checkDropReady({
      ...activeRow,
      reserved_pulled_pork: 200,
      reserved_brisket: 50
    });
    expect(result).toEqual({ ok: true });
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

  it("returns ok even when globally sold out if capacity_enforced is false", () => {
    const result = checkDropReady({
      ...activeRow,
      reserved_pulled_pork: 200,
      reserved_brisket: 200,
      reserved_sauce: 200,
      reserved_family_night: 200,
      reserved_backyard_host: 200,
      reserved_freezer_filler: 200,
      capacity_enforced: false
    });
    expect(result).toEqual({ ok: true });
  });

  it("still returns 409 closed when status is closed even if capacity_enforced is false", () => {
    const result = checkDropReady({
      ...activeRow,
      status: "closed",
      capacity_enforced: false
    });
    expect(result).toEqual({
      ok: false,
      status: 409,
      error: "This drop has closed. Orders are no longer being accepted."
    });
  });
});
