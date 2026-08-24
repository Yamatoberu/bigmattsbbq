import { computeBestWorstAverage, computeCategoryAverages } from "./aggregates";
import { EM_DASH, cookColumnLabel, formatCookDate, formatScoreValue } from "./format";
import { deriveScoreMetrics } from "./scoring";
import type {
  ComparisonColumn,
  ComparisonRow,
  ComparisonRowKey,
  ComparisonTableModel,
  ComparisonTableOptions,
  CookWithScore
} from "./types";

export const COMPARISON_ROW_LABELS: Record<ComparisonRowKey, string> = {
  competition: "Competition",
  cook: "Cook",
  placement: "Cook Placement",
  appearance: "Appearance",
  doneness: "Doneness",
  texture: "Texture",
  taste: "Taste",
  overall_impression: "Overall Impression",
  total_score: "Total Score",
  distance_from_winning: "Distance From Winning",
  distance_from_perfect: "Distance From Perfect Score"
};

const ROW_KEYS: ComparisonRowKey[] = [
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

type CellsByRow = Record<ComparisonRowKey, string>;

function buildCookCells(cook: CookWithScore | null): CellsByRow {
  const score = cook?.score ?? null;
  const metrics = deriveScoreMetrics(score ?? { total_score: null, first_place_score: null });

  return {
    competition: cook?.competition?.name ?? EM_DASH,
    cook: cook ? formatCookDate(cook.cooked_at) : EM_DASH,
    placement: formatScoreValue(score?.placement),
    appearance: formatScoreValue(score?.appearance),
    doneness: formatScoreValue(score?.doneness),
    texture: formatScoreValue(score?.texture),
    taste: formatScoreValue(score?.taste),
    overall_impression: formatScoreValue(score?.overall_impression),
    total_score: formatScoreValue(score?.total_score),
    distance_from_winning: formatScoreValue(metrics.distance_from_winning),
    distance_from_perfect: formatScoreValue(metrics.distance_from_perfect)
  };
}

function buildAverageCells(cooks: CookWithScore[]): CellsByRow {
  const averages = computeCategoryAverages(cooks);

  return {
    competition: EM_DASH,
    cook: EM_DASH,
    placement: formatScoreValue(averages.placement),
    appearance: formatScoreValue(averages.appearance),
    doneness: formatScoreValue(averages.doneness),
    texture: formatScoreValue(averages.texture),
    taste: formatScoreValue(averages.taste),
    overall_impression: formatScoreValue(averages.overall_impression),
    total_score: formatScoreValue(averages.total_score),
    distance_from_winning: formatScoreValue(averages.distance_from_winning),
    distance_from_perfect: formatScoreValue(averages.distance_from_perfect)
  };
}

function sortCooksAscending(cooks: CookWithScore[]): CookWithScore[] {
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

export function buildComparisonTable(
  cooks: CookWithScore[],
  options: ComparisonTableOptions
): ComparisonTableModel {
  if (cooks.length === 0 && !options.aggregates) {
    return { columns: [], rows: [] };
  }

  const sorted = sortCooksAscending(cooks);
  const columns: ComparisonColumn[] = [];
  const cellsByColumnKey = new Map<string, CellsByRow>();

  sorted.forEach((cook) => {
    const key = `cook-${cook.id}`;
    columns.push({
      key,
      label: cookColumnLabel(cook.competition?.name ?? null, cook.steak_label),
      kind: "cook",
      href: `/sca/cooks/${cook.id}`
    });
    cellsByColumnKey.set(key, buildCookCells(cook));
  });

  if (options.aggregates) {
    const aggregateSource = options.aggregateSource ?? cooks;
    const scopeSuffix = options.aggregateScopeLabel ? ` (${options.aggregateScopeLabel})` : "";
    const { best, worst } = computeBestWorstAverage(aggregateSource);

    columns.push({
      key: "worst",
      label: "Worst Cook" + scopeSuffix,
      kind: "worst",
      href: worst ? `/sca/cooks/${worst.id}` : null
    });
    cellsByColumnKey.set("worst", buildCookCells(worst));

    columns.push({
      key: "best",
      label: "Best Cook" + scopeSuffix,
      kind: "best",
      href: best ? `/sca/cooks/${best.id}` : null
    });
    cellsByColumnKey.set("best", buildCookCells(best));

    columns.push({
      key: "average",
      label: "Cook Averages" + scopeSuffix,
      kind: "average",
      href: null
    });
    cellsByColumnKey.set("average", buildAverageCells(aggregateSource));
  }

  const rows: ComparisonRow[] = ROW_KEYS.map((key) => ({
    key,
    label: COMPARISON_ROW_LABELS[key],
    cells: columns.map((column) => cellsByColumnKey.get(column.key)?.[key] ?? EM_DASH)
  }));

  return { columns, rows };
}
