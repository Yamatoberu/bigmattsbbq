import { describe, expect, it } from "vitest";
import { deriveScoreMetrics, PERFECT_SCORE } from "../lib/sca/scoring";

describe("PERFECT_SCORE", () => {
  it("is 254.5", () => {
    expect(PERFECT_SCORE).toBe(254.5);
  });
});

describe("deriveScoreMetrics", () => {
  it("computes both distances for a mid-pack score", () => {
    expect(deriveScoreMetrics({ total_score: 220, first_place_score: 240 })).toEqual({
      distance_from_winning: 20,
      distance_from_perfect: 34.5
    });
  });

  it("computes zero distance from winning when tied for first", () => {
    expect(deriveScoreMetrics({ total_score: 240, first_place_score: 240 })).toEqual({
      distance_from_winning: 0,
      distance_from_perfect: 14.5
    });
  });

  it("computes zero for both distances on a perfect winning score", () => {
    expect(deriveScoreMetrics({ total_score: 254.5, first_place_score: 254.5 })).toEqual({
      distance_from_winning: 0,
      distance_from_perfect: 0
    });
  });

  it("handles fractional scores without IEEE-754 noise", () => {
    const result = deriveScoreMetrics({ total_score: 200.5, first_place_score: 233.25 });
    expect(result.distance_from_winning).toBeCloseTo(32.75, 2);
    expect(result.distance_from_perfect).toBeCloseTo(54, 2);
  });

  it("returns negative distances above the caps instead of clamping", () => {
    expect(deriveScoreMetrics({ total_score: 260, first_place_score: 240 })).toEqual({
      distance_from_winning: -20,
      distance_from_perfect: -5.5
    });
  });

  it("returns null distance_from_winning when first_place_score is null", () => {
    expect(deriveScoreMetrics({ total_score: 220, first_place_score: null })).toEqual({
      distance_from_winning: null,
      distance_from_perfect: 34.5
    });
  });

  it("returns null distance_from_winning when first_place_score is undefined", () => {
    expect(deriveScoreMetrics({ total_score: 220, first_place_score: undefined })).toEqual({
      distance_from_winning: null,
      distance_from_perfect: 34.5
    });
  });

  it("returns null for both distances when total_score is null", () => {
    expect(deriveScoreMetrics({ total_score: null, first_place_score: 240 })).toEqual({
      distance_from_winning: null,
      distance_from_perfect: null
    });
  });
});
