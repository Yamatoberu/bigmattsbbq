import { deriveScoreMetrics } from "./scoring";
import type { CookWithScore, SummaryStats } from "./types";

type ScaScore = NonNullable<CookWithScore["score"]>;

export type ScoredCook = CookWithScore & {
  score: ScaScore & { total_score: number };
};

export type CategoryKey =
  | "appearance"
  | "doneness"
  | "texture"
  | "taste"
  | "overall_impression"
  | "placement"
  | "total_score"
  | "distance_from_winning"
  | "distance_from_perfect";

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const sum = values.reduce((total, value) => total + value, 0);
  return sum / values.length;
}

function compareForBest(a: ScoredCook, b: ScoredCook): ScoredCook {
  if (b.score.total_score > a.score.total_score) {
    return b;
  }
  if (b.score.total_score < a.score.total_score) {
    return a;
  }
  return b.cooked_at < a.cooked_at ? b : a;
}

function compareForWorst(a: ScoredCook, b: ScoredCook): ScoredCook {
  if (b.score.total_score < a.score.total_score) {
    return b;
  }
  if (b.score.total_score > a.score.total_score) {
    return a;
  }
  return b.cooked_at < a.cooked_at ? b : a;
}

export function scoredCooks(cooks: CookWithScore[]): ScoredCook[] {
  return cooks.filter(
    (cook): cook is ScoredCook => cook.score != null && cook.score.total_score != null
  );
}

export function computeBestWorstAverage(cooks: CookWithScore[]): {
  best: CookWithScore | null;
  worst: CookWithScore | null;
  averageTotalScore: number | null;
  averageDistanceFromWinning: number | null;
} {
  const scored = scoredCooks(cooks);

  if (scored.length === 0) {
    return {
      best: null,
      worst: null,
      averageTotalScore: null,
      averageDistanceFromWinning: null
    };
  }

  const best = scored.reduce(compareForBest);
  const worst = scored.reduce(compareForWorst);
  const averageTotalScore = average(scored.map((cook) => cook.score.total_score));
  const averageDistanceFromWinning = average(
    scored
      .map((cook) => deriveScoreMetrics(cook.score).distance_from_winning)
      .filter((value): value is number => value != null)
  );

  return { best, worst, averageTotalScore, averageDistanceFromWinning };
}

export function computeCategoryAverages(cooks: CookWithScore[]): Record<CategoryKey, number | null> {
  const scored = scoredCooks(cooks);

  const directAverage = (
    key: "appearance" | "doneness" | "texture" | "taste" | "overall_impression" | "placement" | "total_score"
  ): number | null =>
    average(
      scored
        .map((cook) => cook.score[key])
        .filter((value): value is number => value != null)
    );

  const distances = scored.map((cook) => deriveScoreMetrics(cook.score));

  return {
    appearance: directAverage("appearance"),
    doneness: directAverage("doneness"),
    texture: directAverage("texture"),
    taste: directAverage("taste"),
    overall_impression: directAverage("overall_impression"),
    placement: directAverage("placement"),
    total_score: directAverage("total_score"),
    distance_from_winning: average(
      distances
        .map((metrics) => metrics.distance_from_winning)
        .filter((value): value is number => value != null)
    ),
    distance_from_perfect: average(
      distances
        .map((metrics) => metrics.distance_from_perfect)
        .filter((value): value is number => value != null)
    )
  };
}

export function getLatestCooks(cooks: CookWithScore[]): CookWithScore[] {
  if (cooks.length === 0) {
    return [];
  }

  const latestCook = cooks.reduce((latest, cook) =>
    cook.cooked_at > latest.cooked_at ? cook : latest
  );

  if (latestCook.competition_id == null) {
    return [latestCook];
  }

  return cooks
    .filter((cook) => cook.competition_id === latestCook.competition_id)
    .sort((a, b) => {
      if (a.cooked_at < b.cooked_at) {
        return -1;
      }
      if (a.cooked_at > b.cooked_at) {
        return 1;
      }
      return 0;
    });
}

export function sortCooksByRecencyDesc(cooks: CookWithScore[]): CookWithScore[] {
  return [...cooks].sort((a, b) => {
    if (a.cooked_at < b.cooked_at) {
      return 1;
    }
    if (a.cooked_at > b.cooked_at) {
      return -1;
    }
    return b.id - a.id;
  });
}

export function computeSummaryStats(cooks: CookWithScore[]): SummaryStats {
  const latestCooks = getLatestCooks(cooks);
  const { best, worst, averageTotalScore, averageDistanceFromWinning } =
    computeBestWorstAverage(cooks);

  return {
    latestCooks,
    bestCook: best,
    worstCook: worst,
    averageTotalScore,
    averageDistanceFromWinning
  };
}
