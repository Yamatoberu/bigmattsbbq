import { describe, expect, it } from "vitest";
import { computeWhatStandsOut } from "../lib/sca/insights";
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

describe("computeWhatStandsOut", () => {
  it("returns [] for []", () => {
    expect(computeWhatStandsOut([])).toEqual([]);
  });

  it("with exactly one scored cook, returns only the closest_gap insight", () => {
    const cook = makeCook({ id: 1, score: makeScore({ total_score: 220, first_place_score: 240 }) });
    const result = computeWhatStandsOut([cook]);
    expect(result.map((insight) => insight.key)).toEqual(["closest_gap"]);
  });

  it("with two or more scored cooks, insights appear in fixed order closest_gap, biggest_swing, placement_change", () => {
    const first = makeCook({
      id: 1,
      cooked_at: "2026-08-01T00:00:00Z",
      score: makeScore({ total_score: 200, first_place_score: 240, placement: 5 })
    });
    const second = makeCook({
      id: 2,
      cooked_at: "2026-08-08T00:00:00Z",
      score: makeScore({ total_score: 230, first_place_score: 240, placement: 2 })
    });

    const result = computeWhatStandsOut([first, second]);
    expect(result.map((insight) => insight.key)).toEqual([
      "closest_gap",
      "biggest_swing",
      "placement_change"
    ]);
  });

  it("closest_gap selects the minimum non-null distance_from_winning and names that cook", () => {
    const farCook = makeCook({
      id: 1,
      steak_label: "Far Cook",
      score: makeScore({ total_score: 180, first_place_score: 240 })
    });
    const closeCook = makeCook({
      id: 2,
      steak_label: "Close Cook",
      score: makeScore({ total_score: 235, first_place_score: 240 })
    });

    const result = computeWhatStandsOut([farCook, closeCook]);
    const closestGap = result.find((insight) => insight.key === "closest_gap");
    expect(closestGap).toBeDefined();
    expect(closestGap!.detail).toContain("Close Cook");
    expect(closestGap!.value).toBe("5");
  });

  it("closest_gap is omitted when every scored cook has a null first_place_score", () => {
    const first = makeCook({
      id: 1,
      cooked_at: "2026-08-01T00:00:00Z",
      score: makeScore({ total_score: 200, first_place_score: null })
    });
    const second = makeCook({
      id: 2,
      cooked_at: "2026-08-08T00:00:00Z",
      score: makeScore({ total_score: 230, first_place_score: null })
    });

    const result = computeWhatStandsOut([first, second]);
    expect(result.map((insight) => insight.key)).not.toContain("closest_gap");
  });

  it("biggest_swing selects the largest consecutive total_score delta and reports up vs down wording", () => {
    const earliest = makeCook({
      id: 1,
      cooked_at: "2026-08-01T00:00:00Z",
      steak_label: "Cook One",
      score: makeScore({ total_score: 200 })
    });
    const middle = makeCook({
      id: 2,
      cooked_at: "2026-08-08T00:00:00Z",
      steak_label: "Cook Two",
      score: makeScore({ total_score: 210 })
    });
    const latest = makeCook({
      id: 3,
      cooked_at: "2026-08-15T00:00:00Z",
      steak_label: "Cook Three",
      score: makeScore({ total_score: 190 })
    });

    const result = computeWhatStandsOut([earliest, middle, latest]);
    const swing = result.find((insight) => insight.key === "biggest_swing");
    expect(swing).toBeDefined();
    expect(swing!.detail).toContain("Cook Two");
    expect(swing!.detail).toContain("Cook Three");
    expect(swing!.detail).toContain("down");

    const risingEarliest = makeCook({
      id: 4,
      cooked_at: "2026-09-01T00:00:00Z",
      steak_label: "Cook Four",
      score: makeScore({ total_score: 190 })
    });
    const risingLatest = makeCook({
      id: 5,
      cooked_at: "2026-09-08T00:00:00Z",
      steak_label: "Cook Five",
      score: makeScore({ total_score: 230 })
    });

    const risingResult = computeWhatStandsOut([risingEarliest, risingLatest]);
    const risingSwing = risingResult.find((insight) => insight.key === "biggest_swing");
    expect(risingSwing!.detail).toContain("up");
  });

  it("placement_change reads improved/dropped/held based on the last two scored cooks", () => {
    const previous = makeCook({
      id: 1,
      cooked_at: "2026-08-01T00:00:00Z",
      steak_label: "Previous Cook",
      score: makeScore({ placement: 5 })
    });
    const improved = makeCook({
      id: 2,
      cooked_at: "2026-08-08T00:00:00Z",
      steak_label: "Improved Cook",
      score: makeScore({ placement: 2 })
    });

    const improvedResult = computeWhatStandsOut([previous, improved]);
    const improvedInsight = improvedResult.find((insight) => insight.key === "placement_change");
    expect(improvedInsight!.detail).toContain("improved");

    const dropped = makeCook({
      id: 3,
      cooked_at: "2026-08-08T00:00:00Z",
      steak_label: "Dropped Cook",
      score: makeScore({ placement: 8 })
    });
    const droppedResult = computeWhatStandsOut([previous, dropped]);
    const droppedInsight = droppedResult.find((insight) => insight.key === "placement_change");
    expect(droppedInsight!.detail).toContain("dropped");

    const held = makeCook({
      id: 4,
      cooked_at: "2026-08-08T00:00:00Z",
      steak_label: "Held Cook",
      score: makeScore({ placement: 5 })
    });
    const heldResult = computeWhatStandsOut([previous, held]);
    const heldInsight = heldResult.find((insight) => insight.key === "placement_change");
    expect(heldInsight!.detail).toContain("held");
  });

  it("placement_change is omitted when either of the two most recent scored cooks has a null placement", () => {
    const previous = makeCook({
      id: 1,
      cooked_at: "2026-08-01T00:00:00Z",
      score: makeScore({ placement: 5 })
    });
    const latestNoPlacement = makeCook({
      id: 2,
      cooked_at: "2026-08-08T00:00:00Z",
      score: makeScore({ placement: null })
    });

    const result = computeWhatStandsOut([previous, latestNoPlacement]);
    expect(result.map((insight) => insight.key)).not.toContain("placement_change");
  });

  it("every returned insight detail contains at least one digit", () => {
    const first = makeCook({
      id: 1,
      cooked_at: "2026-08-01T00:00:00Z",
      score: makeScore({ total_score: 200, first_place_score: 240, placement: 5 })
    });
    const second = makeCook({
      id: 2,
      cooked_at: "2026-08-08T00:00:00Z",
      score: makeScore({ total_score: 230, first_place_score: 240, placement: 5 })
    });

    const result = computeWhatStandsOut([first, second]);
    expect(result.length).toBeGreaterThan(0);
    for (const insight of result) {
      expect(insight.detail).toMatch(/\d/);
    }
  });
});
