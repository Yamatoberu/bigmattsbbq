import { describe, expect, it } from "vitest";
import { PICKUP_TIME_ZONE, zonedNoonToUtcISO } from "../lib/timezone";

describe("PICKUP_TIME_ZONE", () => {
  it("is America/Denver", () => {
    expect(PICKUP_TIME_ZONE).toBe("America/Denver");
  });
});

describe("zonedNoonToUtcISO", () => {
  it("converts a standard-time (MST) date to the correct UTC instant", () => {
    expect(zonedNoonToUtcISO("2026-01-15", PICKUP_TIME_ZONE)).toBe("2026-01-15T19:00:00.000Z");
  });

  it("converts a daylight-time (MDT) date to the correct UTC instant", () => {
    expect(zonedNoonToUtcISO("2026-07-15", PICKUP_TIME_ZONE)).toBe("2026-07-15T18:00:00.000Z");
  });

  it("handles the spring-forward transition day correctly", () => {
    expect(zonedNoonToUtcISO("2026-03-08", PICKUP_TIME_ZONE)).toBe("2026-03-08T18:00:00.000Z");
  });

  it("handles the fall-back transition day correctly", () => {
    expect(zonedNoonToUtcISO("2026-11-01", PICKUP_TIME_ZONE)).toBe("2026-11-01T19:00:00.000Z");
  });

  it("computes the offset rather than hardcoding it, proven by a one-hour difference between January and July", () => {
    const januaryHour = new Date(zonedNoonToUtcISO("2026-01-15", PICKUP_TIME_ZONE)).getUTCHours();
    const julyHour = new Date(zonedNoonToUtcISO("2026-07-15", PICKUP_TIME_ZONE)).getUTCHours();
    expect(januaryHour - julyHour).toBe(1);
  });

  it("returns a value that parses back via Date.parse without NaN", () => {
    const iso = zonedNoonToUtcISO("2026-07-15", PICKUP_TIME_ZONE);
    expect(Number.isNaN(Date.parse(iso))).toBe(false);
  });

  it("throws on unparseable input", () => {
    expect(() => zonedNoonToUtcISO("not-a-date", PICKUP_TIME_ZONE)).toThrow();
  });
});
