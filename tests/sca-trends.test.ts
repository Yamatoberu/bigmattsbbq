import { describe, expect, it } from "vitest";
import type { CookWithScore } from "../lib/sca/types";
import { deriveScoreMetrics } from "../lib/sca/scoring";
import { formatCookDate } from "../lib/sca/format";

function buildScore(overrides: Record<string, unknown>) {
  return {
    id: 1,
    cook_id: 1,
    appearance: null,
    doneness: null,
    texture: null,
    taste: null,
    overall_impression: null,
    placement: null,
    total_score: null,
    first_place_score: null,
    field_size: null,
    ticket_number: null,
    ...overrides
  };
}

function buildCook(overrides: Record<string, unknown>): CookWithScore {
  return {
    id: 1,
    steak_label: "Ribeye",
    cooked_at: "2026-01-01T00:00:00.000Z",
    competition_id: 1,
    competition: null,
    score: null,
    ...overrides
  } as unknown as CookWithScore;
}

describe("total_score", () => {
  it("returns one point per cook with a non-null total_score, in input order", async () => {
    const { buildTrendSeries } = await import("../lib/sca/trends");
    const cooks = [
      buildCook({
        id: 1,
        cooked_at: "2026-01-01T00:00:00.000Z",
        score: buildScore({ total_score: 200 })
      }),
      buildCook({
        id: 2,
        cooked_at: "2026-02-01T00:00:00.000Z",
        score: buildScore({ total_score: 210 })
      })
    ];

    const points = buildTrendSeries(cooks, "total_score");

    expect(points).toHaveLength(2);
    expect(points[0].value).toBe(200);
    expect(points[1].value).toBe(210);
    expect(points[0].cookId).toBe(1);
    expect(points[1].cookId).toBe(2);
  });

  it("produces no point for a cook whose score is null", async () => {
    const { buildTrendSeries } = await import("../lib/sca/trends");
    const cooks = [buildCook({ id: 1, score: null })];

    const points = buildTrendSeries(cooks, "total_score");

    expect(points).toHaveLength(0);
  });

  it("produces no point for a cook whose score.total_score is null", async () => {
    const { buildTrendSeries } = await import("../lib/sca/trends");
    const cooks = [buildCook({ id: 1, score: buildScore({ total_score: null }) })];

    const points = buildTrendSeries(cooks, "total_score");

    expect(points).toHaveLength(0);
  });

  it("carries cookId, date, and label derived from formatCookDate", async () => {
    const { buildTrendSeries } = await import("../lib/sca/trends");
    const cookedAt = "2026-03-15T00:00:00.000Z";
    const cooks = [
      buildCook({
        id: 42,
        cooked_at: cookedAt,
        score: buildScore({ total_score: 220 })
      })
    ];

    const points = buildTrendSeries(cooks, "total_score");

    expect(points).toHaveLength(1);
    expect(points[0].cookId).toBe(42);
    expect(points[0].date).toBe(cookedAt);
    expect(points[0].label).toBe(formatCookDate(cookedAt));
  });
});

describe("distance_from_winning", () => {
  it("matches deriveScoreMetrics output exactly", async () => {
    const { buildTrendSeries } = await import("../lib/sca/trends");
    const score = buildScore({ total_score: 220, first_place_score: 240 });
    const cooks = [buildCook({ id: 1, score })];

    const points = buildTrendSeries(cooks, "distance_from_winning");

    expect(points).toHaveLength(1);
    expect(points[0].value).toBe(20);
    expect(points[0].value).toBe(deriveScoreMetrics(score).distance_from_winning);
  });

  it("produces no point when first_place_score is null", async () => {
    const { buildTrendSeries } = await import("../lib/sca/trends");
    const cooks = [
      buildCook({
        id: 1,
        score: buildScore({ total_score: 220, first_place_score: null })
      })
    ];

    const points = buildTrendSeries(cooks, "distance_from_winning");

    expect(points).toHaveLength(0);
  });

  it("returns a negative gap as-is, not clamped to 0", async () => {
    const { buildTrendSeries } = await import("../lib/sca/trends");
    const cooks = [
      buildCook({
        id: 1,
        score: buildScore({ total_score: 250, first_place_score: 240 })
      })
    ];

    const points = buildTrendSeries(cooks, "distance_from_winning");

    expect(points).toHaveLength(1);
    expect(points[0].value).toBe(-10);
  });
});

describe("category", () => {
  it("reads the raw appearance field value from cook.score", async () => {
    const { buildTrendSeries } = await import("../lib/sca/trends");
    const cooks = [buildCook({ id: 1, score: buildScore({ appearance: 8.5 }) })];

    const points = buildTrendSeries(cooks, "appearance");

    expect(points).toHaveLength(1);
    expect(points[0].value).toBe(8.5);
  });

  it("reads the raw doneness field value from cook.score", async () => {
    const { buildTrendSeries } = await import("../lib/sca/trends");
    const cooks = [buildCook({ id: 1, score: buildScore({ doneness: 7.25 }) })];

    const points = buildTrendSeries(cooks, "doneness");

    expect(points).toHaveLength(1);
    expect(points[0].value).toBe(7.25);
  });

  it("reads the raw texture field value from cook.score", async () => {
    const { buildTrendSeries } = await import("../lib/sca/trends");
    const cooks = [buildCook({ id: 1, score: buildScore({ texture: 9 }) })];

    const points = buildTrendSeries(cooks, "texture");

    expect(points).toHaveLength(1);
    expect(points[0].value).toBe(9);
  });

  it("reads the raw taste field value from cook.score", async () => {
    const { buildTrendSeries } = await import("../lib/sca/trends");
    const cooks = [buildCook({ id: 1, score: buildScore({ taste: 6.75 }) })];

    const points = buildTrendSeries(cooks, "taste");

    expect(points).toHaveLength(1);
    expect(points[0].value).toBe(6.75);
  });

  it("reads the raw overall_impression field value from cook.score", async () => {
    const { buildTrendSeries } = await import("../lib/sca/trends");
    const cooks = [buildCook({ id: 1, score: buildScore({ overall_impression: 8 }) })];

    const points = buildTrendSeries(cooks, "overall_impression");

    expect(points).toHaveLength(1);
    expect(points[0].value).toBe(8);
  });

  it("skips a null category value while other cooks still yield points", async () => {
    const { buildTrendSeries } = await import("../lib/sca/trends");
    const cooks = [
      buildCook({ id: 1, score: buildScore({ appearance: null }) }),
      buildCook({ id: 2, score: buildScore({ appearance: 9 }) })
    ];

    const points = buildTrendSeries(cooks, "appearance");

    expect(points).toHaveLength(1);
    expect(points[0].cookId).toBe(2);
    expect(points[0].value).toBe(9);
  });

  it("returns an empty array for every metric key when cooks is empty", async () => {
    const { buildTrendSeries } = await import("../lib/sca/trends");
    const metrics = [
      "total_score",
      "distance_from_winning",
      "appearance",
      "doneness",
      "texture",
      "taste",
      "overall_impression"
    ] as const;

    for (const metric of metrics) {
      expect(buildTrendSeries([], metric)).toEqual([]);
    }
  });
});
