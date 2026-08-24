import { describe, expect, it } from "vitest";
import {
  computeBestWorstAverage,
  computeCategoryAverages,
  computeSummaryStats,
  getLatestCooks,
  scoredCooks
} from "../lib/sca/aggregates";
import type { CookWithScore, ScaScoreRow } from "../lib/sca/types";

function makeScore(overrides: Partial<ScaScoreRow> = {}): ScaScoreRow {
  return {
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
    updated_at: "2026-08-01T00:00:00Z",
    ...overrides
  };
}

function makeCook(overrides: Partial<CookWithScore> = {}): CookWithScore {
  return {
    id: 1,
    steak_label: "Ribeye",
    cooked_at: "2026-08-01T12:00:00Z",
    competition_id: 1,
    competition: {
      id: 1,
      name: "Test Comp",
      event_date: "2026-08-01",
      city: "Logan",
      state: "UT"
    },
    score: makeScore(),
    ...overrides
  };
}

describe("scoredCooks", () => {
  it("returns [] for []", () => {
    expect(scoredCooks([])).toEqual([]);
  });

  it("excludes a cook whose score is null entirely (real cook id 7, competition 4)", () => {
    const unscored = makeCook({ id: 7, competition_id: 4, score: null });
    const scored = makeCook({ id: 1 });
    expect(scoredCooks([unscored, scored])).toEqual([scored]);
  });

  it("excludes a cook whose score.total_score is null", () => {
    const nullTotal = makeCook({ id: 2, score: makeScore({ total_score: null }) });
    const scored = makeCook({ id: 1 });
    expect(scoredCooks([nullTotal, scored])).toEqual([scored]);
  });
});

describe("computeBestWorstAverage", () => {
  it("returns all nulls for []", () => {
    expect(computeBestWorstAverage([])).toEqual({
      best: null,
      worst: null,
      averageTotalScore: null,
      averageDistanceFromWinning: null
    });
  });

  it("returns all nulls for a set whose only cook has score: null (models real competition 4)", () => {
    const cook7 = makeCook({ id: 7, competition_id: 4, score: null });
    expect(computeBestWorstAverage([cook7])).toEqual({
      best: null,
      worst: null,
      averageTotalScore: null,
      averageDistanceFromWinning: null
    });
  });

  it("picks the highest total_score as best and the lowest as worst", () => {
    const low = makeCook({ id: 1, score: makeScore({ total_score: 200 }) });
    const mid = makeCook({ id: 2, score: makeScore({ total_score: 220 }) });
    const high = makeCook({ id: 3, score: makeScore({ total_score: 240 }) });

    const result = computeBestWorstAverage([mid, low, high]);
    expect(result.best).toEqual(high);
    expect(result.worst).toEqual(low);
  });

  it("on a total_score tie, best resolves to the cook with the earlier cooked_at", () => {
    const earlier = makeCook({
      id: 1,
      cooked_at: "2026-08-01T00:00:00Z",
      score: makeScore({ total_score: 220 })
    });
    const later = makeCook({
      id: 2,
      cooked_at: "2026-08-05T00:00:00Z",
      score: makeScore({ total_score: 220 })
    });

    expect(computeBestWorstAverage([later, earlier]).best).toEqual(earlier);
  });

  it("on a total_score tie, worst resolves to the cook with the earlier cooked_at", () => {
    const earlier = makeCook({
      id: 1,
      cooked_at: "2026-08-01T00:00:00Z",
      score: makeScore({ total_score: 220 })
    });
    const later = makeCook({
      id: 2,
      cooked_at: "2026-08-05T00:00:00Z",
      score: makeScore({ total_score: 220 })
    });

    expect(computeBestWorstAverage([later, earlier]).worst).toEqual(earlier);
  });

  it("averages total scores [210, 220, 230] to 220", () => {
    const cooks = [210, 220, 230].map((total_score, index) =>
      makeCook({ id: index + 1, score: makeScore({ total_score }) })
    );
    expect(computeBestWorstAverage(cooks).averageTotalScore).toBe(220);
  });

  it("averageDistanceFromWinning averages only non-null distances and returns null when none qualify", () => {
    const withGap = makeCook({
      id: 1,
      score: makeScore({ total_score: 220, first_place_score: 240 })
    });
    const noGap = makeCook({
      id: 2,
      score: makeScore({ total_score: 210, first_place_score: null })
    });

    expect(computeBestWorstAverage([withGap, noGap]).averageDistanceFromWinning).toBe(20);

    const allNoGap = [noGap, makeCook({ id: 3, score: makeScore({ total_score: 205, first_place_score: null }) })];
    expect(computeBestWorstAverage(allNoGap).averageDistanceFromWinning).toBeNull();
  });
});

describe("computeCategoryAverages", () => {
  it("returns every key set to null for []", () => {
    expect(computeCategoryAverages([])).toEqual({
      appearance: null,
      doneness: null,
      texture: null,
      taste: null,
      overall_impression: null,
      placement: null,
      total_score: null,
      distance_from_winning: null,
      distance_from_perfect: null
    });
  });

  it("averages each key over its own non-null values only, so one null category does not null out the others", () => {
    const cookWithPlacement = makeCook({
      id: 1,
      score: makeScore({ total_score: 220, placement: 2, first_place_score: 240 })
    });
    const cookWithoutPlacement = makeCook({
      id: 2,
      score: makeScore({ total_score: 210, placement: null, first_place_score: 240 })
    });

    const result = computeCategoryAverages([cookWithPlacement, cookWithoutPlacement]);

    expect(result.placement).toBe(2);
    expect(result.total_score).toBe(215);
    expect(result.distance_from_winning).toBe(25);
  });
});

describe("getLatestCooks", () => {
  it("returns [] for []", () => {
    expect(getLatestCooks([])).toEqual([]);
  });

  it("returns every cook sharing the competition_id of the cook with the most recent cooked_at (real competition 13, two same-day cooks)", () => {
    const older = makeCook({ id: 1, competition_id: 5, cooked_at: "2026-07-01T00:00:00Z" });
    const latestA = makeCook({ id: 2, competition_id: 13, cooked_at: "2026-08-20T09:00:00Z" });
    const latestB = makeCook({ id: 3, competition_id: 13, cooked_at: "2026-08-20T09:05:00Z" });

    const result = getLatestCooks([older, latestB, latestA]);
    expect(result.map((cook) => cook.id)).toEqual([2, 3]);
  });

  it("returns just the latest cook when its competition_id is null", () => {
    const older = makeCook({ id: 1, competition_id: 5, cooked_at: "2026-07-01T00:00:00Z" });
    const latestOrphan = makeCook({
      id: 2,
      competition_id: null,
      competition: null,
      cooked_at: "2026-08-20T09:00:00Z"
    });

    expect(getLatestCooks([older, latestOrphan])).toEqual([latestOrphan]);
  });
});

describe("computeSummaryStats", () => {
  it("returns the full empty/null shape for []", () => {
    expect(computeSummaryStats([])).toEqual({
      latestCooks: [],
      bestCook: null,
      worstCook: null,
      averageTotalScore: null,
      averageDistanceFromWinning: null
    });
  });
});
