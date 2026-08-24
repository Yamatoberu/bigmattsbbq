import { deriveScoreMetrics } from "./scoring";
import { formatCookDate } from "./format";
import type { CookWithScore } from "./types";

export type TrendMetricKey =
  | "total_score"
  | "distance_from_winning"
  | "appearance"
  | "doneness"
  | "texture"
  | "taste"
  | "overall_impression";

export interface TrendPoint {
  cookId: number;
  date: string;
  label: string;
  value: number;
}

function readMetric(cook: CookWithScore, metric: TrendMetricKey): number | null {
  if (cook.score == null) {
    return null;
  }

  if (metric === "distance_from_winning") {
    return deriveScoreMetrics(cook.score).distance_from_winning;
  }

  return cook.score[metric];
}

export function buildTrendSeries(
  cooks: CookWithScore[],
  metric: TrendMetricKey
): TrendPoint[] {
  const points: TrendPoint[] = [];

  for (const cook of cooks) {
    const value = readMetric(cook, metric);

    if (value == null) {
      continue;
    }

    points.push({
      cookId: cook.id,
      date: cook.cooked_at,
      label: formatCookDate(cook.cooked_at),
      value
    });
  }

  return points;
}
