import { describe, expect, it } from "vitest";
import { deriveScoreMetrics, PERFECT_SCORE } from "../lib/sca/scoring";
import type { Database } from "../lib/database-sca.types";

type ScaScoreRow = Database["sca"]["Tables"]["score"]["Row"];

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

  it("accepts a real sca score row with no mapping or narrowing at the call site", () => {
    const row: ScaScoreRow = {
      id: 1,
      cook_id: 1,
      appearance: 9,
      doneness: 9,
      texture: 9,
      taste: 9,
      overall_impression: 9,
      total_score: 220,
      first_place_score: 240,
      placement: 3,
      field_size: 12,
      ticket_number: 45,
      score_notes: null,
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z"
    };

    expect(deriveScoreMetrics(row)).toEqual({
      distance_from_winning: 20,
      distance_from_perfect: 34.5
    });
  });
});
