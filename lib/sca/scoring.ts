export const PERFECT_SCORE = 254.5;

export interface ScoreMetricsInput {
  total_score: number | null | undefined;
  first_place_score: number | null | undefined;
}

export interface ScoreMetrics {
  distance_from_winning: number | null;
  distance_from_perfect: number | null;
}

export function deriveScoreMetrics(score: ScoreMetricsInput): ScoreMetrics {
  const distance_from_perfect =
    score.total_score == null ? null : PERFECT_SCORE - score.total_score;

  const distance_from_winning =
    score.total_score == null || score.first_place_score == null
      ? null
      : score.first_place_score - score.total_score;

  return { distance_from_winning, distance_from_perfect };
}
