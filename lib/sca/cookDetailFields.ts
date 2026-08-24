import { formatScoreValue } from "./format";
import type { ProcessField, ScaCookDetailRow } from "./types";

type ProcessFieldKey =
  | "trimmed_weight_oz"
  | "steak_thickness_in"
  | "starting_internal_temp_f"
  | "grate_temp_f"
  | "turn_interval_seconds"
  | "back_side_interval_count"
  | "presentation_side_interval_count"
  | "peak_internal_temp_f"
  | "meatrix_peak_percent"
  | "pull_internal_temp_f"
  | "meatrix_pull_percent"
  | "rest_duration_seconds"
  | "seasoning"
  | "prep_notes"
  | "cook_notes";

export const PROCESS_FIELD_LABELS: { key: ProcessFieldKey; label: string }[] = [
  { key: "trimmed_weight_oz", label: "Trimmed Weight (oz)" },
  { key: "steak_thickness_in", label: "Thickness (in)" },
  { key: "starting_internal_temp_f", label: "Starting Internal Temp (°F)" },
  { key: "grate_temp_f", label: "Grate Temp (°F)" },
  { key: "turn_interval_seconds", label: "Turn Interval (s)" },
  { key: "back_side_interval_count", label: "Back-Side Turns" },
  { key: "presentation_side_interval_count", label: "Presentation-Side Turns" },
  { key: "peak_internal_temp_f", label: "Peak Internal Temp (°F)" },
  { key: "meatrix_peak_percent", label: "Meatrix Peak %" },
  { key: "pull_internal_temp_f", label: "Pull Internal Temp (°F)" },
  { key: "meatrix_pull_percent", label: "Meatrix Pull %" },
  { key: "rest_duration_seconds", label: "Rest Duration (s)" },
  { key: "seasoning", label: "Seasoning" },
  { key: "prep_notes", label: "Prep Notes" },
  { key: "cook_notes", label: "Cook Notes" }
];

export function getPresentProcessFields(
  detail: ScaCookDetailRow | null | undefined
): ProcessField[] {
  if (detail == null) {
    return [];
  }

  const fields: ProcessField[] = [];

  for (const { key, label } of PROCESS_FIELD_LABELS) {
    const raw = detail[key];

    if (raw === null || raw === undefined) {
      continue;
    }

    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed.length === 0) {
        continue;
      }
      fields.push({ key, label, value: trimmed });
      continue;
    }

    fields.push({ key, label, value: formatScoreValue(raw) });
  }

  return fields;
}
