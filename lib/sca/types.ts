import type { Database } from "../database-sca.types";

export type ScaCompetitionRow = Database["sca"]["Tables"]["competition"]["Row"];
export type ScaCookRow = Database["sca"]["Tables"]["cook"]["Row"];
export type ScaScoreRow = Database["sca"]["Tables"]["score"]["Row"];
export type ScaCookDetailRow = Database["sca"]["Tables"]["cook_detail"]["Row"];
export type ScaCookAiReviewRow = Database["sca"]["Tables"]["cook_ai_review"]["Row"];

export type CookCompetitionSummary = Pick<
  ScaCompetitionRow,
  "id" | "name" | "event_date" | "city" | "state"
>;

export interface CookWithScore {
  id: number;
  steak_label: string | null;
  cooked_at: string;
  competition_id: number | null;
  competition: CookCompetitionSummary | null;
  score: ScaScoreRow | null;
}

export type ComparisonColumnKind = "cook" | "worst" | "best" | "average";

export interface ComparisonColumn {
  key: string;
  label: string;
  kind: ComparisonColumnKind;
  href: string | null;
}

export type ComparisonRowKey =
  | "competition"
  | "cook"
  | "placement"
  | "appearance"
  | "doneness"
  | "texture"
  | "taste"
  | "overall_impression"
  | "total_score"
  | "distance_from_winning"
  | "distance_from_perfect";

export interface ComparisonRow {
  key: ComparisonRowKey;
  label: string;
  cells: string[];
}

export interface ComparisonTableModel {
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
}

export interface ComparisonTableOptions {
  aggregates: boolean;
  aggregateSource?: CookWithScore[];
  aggregateScopeLabel?: string;
}

export interface SummaryStats {
  latestCooks: CookWithScore[];
  bestCook: CookWithScore | null;
  worstCook: CookWithScore | null;
  averageTotalScore: number | null;
  averageDistanceFromWinning: number | null;
}

export type InsightKey = "closest_gap" | "biggest_swing" | "placement_change";

export interface Insight {
  key: InsightKey;
  label: string;
  value: string;
  detail: string;
}

export interface ProcessField {
  key: string;
  label: string;
  value: string;
}

export type CompetitionWithCooks = ScaCompetitionRow & { cook: CookWithScore[] };

export type CookWithDetails = ScaCookRow & {
  competition: ScaCompetitionRow | null;
  score: ScaScoreRow | null;
  cook_detail: ScaCookDetailRow | null;
  cook_ai_review: ScaCookAiReviewRow[];
};
