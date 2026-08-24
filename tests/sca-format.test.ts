import { describe, expect, it } from "vitest";
import {
  EM_DASH,
  cookColumnLabel,
  formatCookDate,
  formatEventDate,
  formatScoreValue
} from "../lib/sca/format";

describe("EM_DASH", () => {
  it("is the em dash character U+2014", () => {
    expect(EM_DASH).toBe("—");
  });
});

describe("formatScoreValue", () => {
  it("returns EM_DASH for null", () => {
    expect(formatScoreValue(null)).toBe(EM_DASH);
  });

  it("returns EM_DASH for undefined", () => {
    expect(formatScoreValue(undefined)).toBe(EM_DASH);
  });

  it("returns EM_DASH for NaN", () => {
    expect(formatScoreValue(NaN)).toBe(EM_DASH);
  });

  it("returns '0' for an actual zero, not the em dash", () => {
    expect(formatScoreValue(0)).toBe("0");
    expect(formatScoreValue(0)).not.toBe(EM_DASH);
  });

  it("returns '254.5' for 254.5", () => {
    expect(formatScoreValue(254.5)).toBe("254.5");
  });

  it("returns '220' with no forced decimals", () => {
    expect(formatScoreValue(220)).toBe("220");
  });

  it("rounds to max 2 decimals and strips trailing zeros", () => {
    expect(formatScoreValue(8.333333)).toBe("8.33");
  });
});

describe("cookColumnLabel", () => {
  it("joins competition name and steak label with a hyphen", () => {
    expect(cookColumnLabel("The Wurst Butcher Shop", "A")).toBe("The Wurst Butcher Shop - A");
  });

  it("returns just the competition name when steak label is null", () => {
    expect(cookColumnLabel("The Wurst Butcher Shop", null)).toBe("The Wurst Butcher Shop");
  });

  it("returns just the steak label when competition name is null", () => {
    expect(cookColumnLabel(null, "Jackpot")).toBe("Jackpot");
  });

  it("returns 'Untitled Cook' when both are null", () => {
    expect(cookColumnLabel(null, null)).toBe("Untitled Cook");
  });

  it("treats whitespace-only strings as absent", () => {
    expect(cookColumnLabel("   ", "Jackpot")).toBe("Jackpot");
    expect(cookColumnLabel("The Wurst Butcher Shop", "   ")).toBe("The Wurst Butcher Shop");
    expect(cookColumnLabel("   ", "   ")).toBe("Untitled Cook");
  });
});

describe("formatEventDate", () => {
  it("formats a date-only string without a timezone off-by-one", () => {
    expect(formatEventDate("2025-11-01")).toBe("Nov 1, 2025");
  });
});

describe("formatCookDate", () => {
  it("formats a timestamptz in America/Denver, date portion only", () => {
    expect(formatCookDate("2025-11-01T14:30:00Z")).toBe("Nov 1, 2025");
  });
});
