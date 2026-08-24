import { describe, expect, it } from "vitest";
import {
  getPresentProcessFields,
  PROCESS_FIELD_LABELS
} from "../lib/sca/cookDetailFields";
import type { ScaCookDetailRow } from "../lib/sca/types";

function makeCookDetail(overrides: Partial<ScaCookDetailRow> = {}): ScaCookDetailRow {
  return {
    id: 19,
    cook_id: 19,
    created_at: "2025-11-01T00:00:00Z",
    updated_at: "2025-11-01T00:00:00Z",
    trimmed_weight_oz: null,
    steak_thickness_in: null,
    starting_internal_temp_f: null,
    grate_temp_f: null,
    turn_interval_seconds: null,
    back_side_interval_count: null,
    presentation_side_interval_count: null,
    peak_internal_temp_f: null,
    meatrix_peak_percent: null,
    pull_internal_temp_f: null,
    meatrix_pull_percent: null,
    rest_duration_seconds: null,
    seasoning: null,
    prep_notes: null,
    cook_notes: null,
    ...overrides
  };
}

describe("PROCESS_FIELD_LABELS", () => {
  it("has exactly 15 entries", () => {
    expect(PROCESS_FIELD_LABELS).toHaveLength(15);
  });

  it("never includes the four metadata columns", () => {
    const keys = PROCESS_FIELD_LABELS.map((f) => f.key);
    expect(keys).not.toContain("id");
    expect(keys).not.toContain("cook_id");
    expect(keys).not.toContain("created_at");
    expect(keys).not.toContain("updated_at");
  });
});

describe("getPresentProcessFields", () => {
  it("returns [] for null", () => {
    expect(getPresentProcessFields(null)).toEqual([]);
  });

  it("returns [] for undefined", () => {
    expect(getPresentProcessFields(undefined)).toEqual([]);
  });

  it("returns [] when every displayable column is null", () => {
    expect(getPresentProcessFields(makeCookDetail())).toEqual([]);
  });

  it("returns only non-null fields in declared PROCESS_FIELD_LABELS order, modeled on real cook 19", () => {
    const detail = makeCookDetail({
      grate_temp_f: 500,
      meatrix_pull_percent: 70,
      turn_interval_seconds: 90,
      starting_internal_temp_f: 96
    });

    const fields = getPresentProcessFields(detail);

    expect(fields.map((f) => f.key)).toEqual([
      "starting_internal_temp_f",
      "grate_temp_f",
      "turn_interval_seconds",
      "meatrix_pull_percent"
    ]);
  });

  it("includes a numeric 0 value since 0 is real data, not missing", () => {
    const detail = makeCookDetail({ back_side_interval_count: 0 });
    const fields = getPresentProcessFields(detail);

    const field = fields.find((f) => f.key === "back_side_interval_count");
    expect(field).toBeDefined();
    expect(field?.value).toBe("0");
  });

  it("excludes a whitespace-only or empty-string text field", () => {
    const detail = makeCookDetail({ seasoning: "   ", prep_notes: "", cook_notes: "Great bark" });
    const fields = getPresentProcessFields(detail);

    const keys = fields.map((f) => f.key);
    expect(keys).not.toContain("seasoning");
    expect(keys).not.toContain("prep_notes");
    expect(keys).toContain("cook_notes");
  });

  it("never surfaces id, cook_id, created_at, or updated_at", () => {
    const detail = makeCookDetail({ grate_temp_f: 500 });
    const fields = getPresentProcessFields(detail);
    const keys = fields.map((f) => f.key);

    expect(keys).not.toContain("id");
    expect(keys).not.toContain("cook_id");
    expect(keys).not.toContain("created_at");
    expect(keys).not.toContain("updated_at");
  });

  it("returns each value as a string, formatting numeric values via formatScoreValue", () => {
    const detail = makeCookDetail({ peak_internal_temp_f: 133.333 });
    const fields = getPresentProcessFields(detail);

    const field = fields.find((f) => f.key === "peak_internal_temp_f");
    expect(typeof field?.value).toBe("string");
    expect(field?.value).toBe("133.33");
  });

  it("returns the declared label alongside each key", () => {
    const detail = makeCookDetail({ grate_temp_f: 500 });
    const fields = getPresentProcessFields(detail);

    const field = fields.find((f) => f.key === "grate_temp_f");
    expect(field?.label).toBe("Grate Temp (°F)");
  });
});
