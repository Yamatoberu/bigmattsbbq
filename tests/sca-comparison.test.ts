import { describe, expect, it } from "vitest";
import { buildComparisonTable, COMPARISON_ROW_LABELS } from "../lib/sca/comparison";
import { EM_DASH } from "../lib/sca/format";
import { deriveScoreMetrics } from "../lib/sca/scoring";
import type { ComparisonRowKey, CookWithScore, ScaScoreRow } from "../lib/sca/types";

const EXPECTED_ROW_KEYS: ComparisonRowKey[] = [
  "competition",
  "cook",
  "placement",
  "appearance",
  "doneness",
  "texture",
  "taste",
  "overall_impression",
  "total_score",
  "distance_from_winning",
  "distance_from_perfect"
];

const EXPECTED_ROW_LABELS = [
  "Competition",
  "Cook",
  "Cook Placement",
  "Appearance",
  "Doneness",
  "Texture",
  "Taste",
  "Overall Impression",
  "Total Score",
  "Distance From Winning",
  "Distance From Perfect Score"
];

function makeScore(overrides: Partial<ScaScoreRow> = {}): ScaScoreRow {
  return {
    id: 1,
    cook_id: 1,
    created_at: "2025-11-01T00:00:00Z",
    updated_at: "2025-11-01T00:00:00Z",
    appearance: 45,
    doneness: 45,
    texture: 45,
    taste: 45,
    overall_impression: 45,
    placement: 3,
    field_size: 20,
    first_place_score: 240,
    score_notes: null,
    ticket_number: 12,
    total_score: 225,
    ...overrides
  };
}

function makeCook(overrides: Partial<CookWithScore> = {}): CookWithScore {
  return {
    id: 1,
    steak_label: "A",
    cooked_at: "2025-11-01T14:30:00Z",
    competition_id: 10,
    competition: {
      id: 10,
      name: "The Wurst Butcher Shop",
      event_date: "2025-11-01",
      city: "Preston",
      state: "ID"
    },
    score: makeScore(),
    ...overrides
  };
}

describe("COMPARISON_ROW_LABELS", () => {
  it("maps every row key to its exact DASH-02 label", () => {
    for (const key of EXPECTED_ROW_KEYS) {
      const index = EXPECTED_ROW_KEYS.indexOf(key);
      expect(COMPARISON_ROW_LABELS[key]).toBe(EXPECTED_ROW_LABELS[index]);
    }
  });
});

describe("buildComparisonTable", () => {
  it("returns empty columns and rows for an empty cook list without aggregates", () => {
    const result = buildComparisonTable([], { aggregates: false });
    expect(result).toEqual({ columns: [], rows: [] });
  });

  it("returns 3 aggregate columns and 11 all-em-dash rows for an empty cook list with aggregates", () => {
    const result = buildComparisonTable([], { aggregates: true });

    expect(result.columns).toHaveLength(3);
    expect(result.columns.map((c) => c.kind)).toEqual(["worst", "best", "average"]);
    expect(result.rows).toHaveLength(11);

    for (const row of result.rows) {
      expect(row.cells).toHaveLength(3);
      for (const cell of row.cells) {
        expect(cell).toBe(EM_DASH);
      }
    }
  });

  it("always returns rows in the exact eleven-key order", () => {
    const result = buildComparisonTable([makeCook()], { aggregates: false });
    expect(result.rows.map((r) => r.key)).toEqual(EXPECTED_ROW_KEYS);
  });

  it("always returns rows with the exact eleven labels", () => {
    const result = buildComparisonTable([makeCook()], { aggregates: false });
    expect(result.rows.map((r) => r.label)).toEqual(EXPECTED_ROW_LABELS);
  });

  it("gives every row a cells array matching columns.length", () => {
    const cooks = [makeCook({ id: 1 }), makeCook({ id: 2, steak_label: "B" })];
    const result = buildComparisonTable(cooks, { aggregates: true });

    for (const row of result.rows) {
      expect(row.cells).toHaveLength(result.columns.length);
    }
  });

  it("orders cook columns ascending by cooked_at, tie-broken by id", () => {
    const cookA = makeCook({ id: 3, cooked_at: "2025-11-02T00:00:00Z", steak_label: "C" });
    const cookB = makeCook({ id: 1, cooked_at: "2025-11-01T00:00:00Z", steak_label: "A" });
    const cookC = makeCook({ id: 2, cooked_at: "2025-11-01T00:00:00Z", steak_label: "B" });

    const result = buildComparisonTable([cookA, cookB, cookC], { aggregates: false });

    expect(result.columns.map((c) => c.key)).toEqual(["cook-1", "cook-2", "cook-3"]);
  });

  it("builds a cook column label using cookColumnLabel(competitionName, steakLabel)", () => {
    const cook = makeCook({ id: 5, steak_label: "A" });
    const result = buildComparisonTable([cook], { aggregates: false });

    expect(result.columns[0].label).toBe("The Wurst Butcher Shop - A");
  });

  it("sets a cook column's href to /sca/cooks/<id> and kind to 'cook'", () => {
    const cook = makeCook({ id: 42 });
    const result = buildComparisonTable([cook], { aggregates: false });

    expect(result.columns[0].href).toBe("/sca/cooks/42");
    expect(result.columns[0].kind).toBe("cook");
  });

  it("has no worst/best/average columns when aggregates is false", () => {
    const cooks = [makeCook({ id: 1 }), makeCook({ id: 2 })];
    const result = buildComparisonTable(cooks, { aggregates: false });

    const kinds = result.columns.map((c) => c.kind);
    expect(kinds).not.toContain("worst");
    expect(kinds).not.toContain("best");
    expect(kinds).not.toContain("average");
  });

  it("appends worst/best/average as the last three columns with correct labels when aggregates is true", () => {
    const cooks = [makeCook({ id: 1 }), makeCook({ id: 2 })];
    const result = buildComparisonTable(cooks, { aggregates: true });

    const lastThree = result.columns.slice(-3);
    expect(lastThree.map((c) => c.kind)).toEqual(["worst", "best", "average"]);
    expect(lastThree.map((c) => c.label)).toEqual(["Worst Cook", "Best Cook", "Cook Averages"]);
  });

  it("renders em dash for score rows and real values for competition/cook rows when a cook has no score", () => {
    const cook = makeCook({ id: 7, score: null });
    const result = buildComparisonTable([cook], { aggregates: false });

    const cellFor = (key: ComparisonRowKey) =>
      result.rows.find((r) => r.key === key)?.cells[0];

    expect(cellFor("placement")).toBe(EM_DASH);
    expect(cellFor("appearance")).toBe(EM_DASH);
    expect(cellFor("doneness")).toBe(EM_DASH);
    expect(cellFor("texture")).toBe(EM_DASH);
    expect(cellFor("taste")).toBe(EM_DASH);
    expect(cellFor("overall_impression")).toBe(EM_DASH);
    expect(cellFor("total_score")).toBe(EM_DASH);
    expect(cellFor("distance_from_winning")).toBe(EM_DASH);
    expect(cellFor("distance_from_perfect")).toBe(EM_DASH);

    expect(cellFor("competition")).toBe("The Wurst Butcher Shop");
    expect(cellFor("cook")).not.toBe(EM_DASH);
  });

  it("renders '0' (not em dash) for a total_score of 0", () => {
    const cook = makeCook({ id: 8, score: makeScore({ total_score: 0 }) });
    const result = buildComparisonTable([cook], { aggregates: false });

    const totalScoreRow = result.rows.find((r) => r.key === "total_score");
    expect(totalScoreRow?.cells[0]).toBe("0");
    expect(totalScoreRow?.cells[0]).not.toBe(EM_DASH);
  });

  it("shows the em dash in the competition row when competition is null", () => {
    const cook = makeCook({ id: 9, competition: null, competition_id: null });
    const result = buildComparisonTable([cook], { aggregates: false });

    const competitionRow = result.rows.find((r) => r.key === "competition");
    expect(competitionRow?.cells[0]).toBe(EM_DASH);
  });

  it("shows the em dash in competition and cook rows for the average column", () => {
    const cooks = [makeCook({ id: 1 }), makeCook({ id: 2 })];
    const result = buildComparisonTable(cooks, { aggregates: true });

    const averageIndex = result.columns.findIndex((c) => c.kind === "average");
    const competitionRow = result.rows.find((r) => r.key === "competition");
    const cookRow = result.rows.find((r) => r.key === "cook");

    expect(competitionRow?.cells[averageIndex]).toBe(EM_DASH);
    expect(cookRow?.cells[averageIndex]).toBe(EM_DASH);
  });

  it("shows the best/worst cook's own competition name and cook date for those columns", () => {
    const worseCook = makeCook({
      id: 1,
      cooked_at: "2025-11-01T14:30:00Z",
      score: makeScore({ total_score: 100 })
    });
    const betterCook = makeCook({
      id: 2,
      cooked_at: "2025-11-05T14:30:00Z",
      score: makeScore({ total_score: 240 })
    });

    const result = buildComparisonTable([worseCook, betterCook], { aggregates: true });

    const worstIndex = result.columns.findIndex((c) => c.kind === "worst");
    const bestIndex = result.columns.findIndex((c) => c.kind === "best");
    const competitionRow = result.rows.find((r) => r.key === "competition");
    const cookRow = result.rows.find((r) => r.key === "cook");

    expect(competitionRow?.cells[worstIndex]).toBe("The Wurst Butcher Shop");
    expect(competitionRow?.cells[bestIndex]).toBe("The Wurst Butcher Shop");
    expect(cookRow?.cells[worstIndex]).not.toBe(EM_DASH);
    expect(cookRow?.cells[bestIndex]).not.toBe(EM_DASH);
  });

  it("computes distance_from_winning and distance_from_perfect via deriveScoreMetrics", () => {
    const cook = makeCook({ id: 10, score: makeScore({ total_score: 200, first_place_score: 230 }) });
    const result = buildComparisonTable([cook], { aggregates: false });

    const metrics = deriveScoreMetrics(cook.score!);
    const winningRow = result.rows.find((r) => r.key === "distance_from_winning");
    const perfectRow = result.rows.find((r) => r.key === "distance_from_perfect");

    expect(winningRow?.cells[0]).toBe(String(metrics.distance_from_winning));
    expect(perfectRow?.cells[0]).toBe(String(metrics.distance_from_perfect));
  });

  it("produces no NaN or undefined cell values across a mixed set of scored/unscored cooks", () => {
    const cooks = [
      makeCook({ id: 1, score: null }),
      makeCook({ id: 2, score: makeScore({ total_score: 0 }) }),
      makeCook({ id: 3, competition: null, competition_id: null })
    ];
    const result = buildComparisonTable(cooks, { aggregates: true });

    for (const row of result.rows) {
      for (const cell of row.cells) {
        expect(cell).not.toBe("NaN");
        expect(cell).not.toBe("undefined");
        expect(cell).not.toBeNull();
        expect(cell).not.toBeUndefined();
      }
    }
  });
});
