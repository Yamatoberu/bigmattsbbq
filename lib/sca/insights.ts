import { scoredCooks, type ScoredCook } from "./aggregates";
import { cookColumnLabel, formatScoreValue } from "./format";
import { deriveScoreMetrics } from "./scoring";
import type { CookWithScore, Insight } from "./types";

function labelFor(cook: ScoredCook): string {
  return cookColumnLabel(cook.competition?.name ?? null, cook.steak_label);
}

function orderByCookedAt(cooks: ScoredCook[]): ScoredCook[] {
  return [...cooks].sort((a, b) => {
    if (a.cooked_at < b.cooked_at) {
      return -1;
    }
    if (a.cooked_at > b.cooked_at) {
      return 1;
    }
    return a.id - b.id;
  });
}

function computeClosestGap(scored: ScoredCook[]): Insight | null {
  let closest: { cook: ScoredCook; gap: number } | null = null;

  for (const cook of scored) {
    const { distance_from_winning } = deriveScoreMetrics(cook.score);
    if (distance_from_winning == null) {
      continue;
    }
    if (closest === null || distance_from_winning < closest.gap) {
      closest = { cook, gap: distance_from_winning };
    }
  }

  if (closest === null) {
    return null;
  }

  const gapLabel = formatScoreValue(closest.gap);

  return {
    key: "closest_gap",
    label: "Closest gap to first",
    value: gapLabel,
    detail: `${labelFor(closest.cook)} came within ${gapLabel} points of first place.`
  };
}

function computeBiggestSwing(scored: ScoredCook[]): Insight | null {
  if (scored.length < 2) {
    return null;
  }

  const ordered = orderByCookedAt(scored);

  let biggest: { previous: ScoredCook; current: ScoredCook; delta: number } | null = null;

  for (let i = 1; i < ordered.length; i += 1) {
    const previous = ordered[i - 1];
    const current = ordered[i];
    const delta = current.score.total_score - previous.score.total_score;

    if (biggest === null || Math.abs(delta) > Math.abs(biggest.delta)) {
      biggest = { previous, current, delta };
    }
  }

  if (biggest === null) {
    return null;
  }

  const direction = biggest.delta >= 0 ? "up" : "down";
  const sign = biggest.delta >= 0 ? "+" : "-";
  const magnitude = formatScoreValue(Math.abs(biggest.delta));

  return {
    key: "biggest_swing",
    label: "Biggest score swing",
    value: `${sign}${magnitude}`,
    detail: `${labelFor(biggest.current)} scored ${direction} ${magnitude} points from ${labelFor(biggest.previous)}.`
  };
}

function computePlacementChange(scored: ScoredCook[]): Insight | null {
  if (scored.length < 2) {
    return null;
  }

  const ordered = orderByCookedAt(scored);
  const latest = ordered[ordered.length - 1];
  const previous = ordered[ordered.length - 2];

  if (latest.score.placement == null || previous.score.placement == null) {
    return null;
  }

  const delta = previous.score.placement - latest.score.placement;
  const placementLabel = formatScoreValue(latest.score.placement);
  const latestLabel = labelFor(latest);

  let detail: string;
  if (delta > 0) {
    detail = `${latestLabel} improved ${delta} place${delta === 1 ? "" : "s"} to ${placementLabel}.`;
  } else if (delta < 0) {
    const drop = Math.abs(delta);
    detail = `${latestLabel} dropped ${drop} place${drop === 1 ? "" : "s"} to ${placementLabel}.`;
  } else {
    detail = `${latestLabel} held ${placementLabel} place.`;
  }

  return {
    key: "placement_change",
    label: "Most recent placement change",
    value: placementLabel,
    detail
  };
}

export function computeWhatStandsOut(cooks: CookWithScore[]): Insight[] {
  const scored = scoredCooks(cooks);
  const insights: Insight[] = [];

  const closestGap = computeClosestGap(scored);
  if (closestGap) {
    insights.push(closestGap);
  }

  const biggestSwing = computeBiggestSwing(scored);
  if (biggestSwing) {
    insights.push(biggestSwing);
  }

  const placementChange = computePlacementChange(scored);
  if (placementChange) {
    insights.push(placementChange);
  }

  return insights;
}
