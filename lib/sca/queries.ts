import "server-only";
// Server-only data access. Import only from API routes and Server Components.
import { getScaSupabaseClient } from "../supabase-sca";
import type {
  AiReviewWithCook,
  CompetitionWithCooks,
  CookWithDetails,
  CookWithScore,
  ScaCompetitionRow
} from "./types";

const AI_REVIEW_EMBED_SELECT =
  "id, cook_id, model, review_type, prompt, comments, created_at, cook:cook_id(id, steak_label, competition:competition_id(id, name, event_date, city, state))";

export function parseScaId(raw: string | string[] | undefined): number | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value)) return null;
  if (value <= 0) return null;
  return value;
}

export async function getAllCooksWithScores(): Promise<CookWithScore[]> {
  const supabase = getScaSupabaseClient();
  const { data, error } = await supabase
    .from("cook")
    .select(
      "id, steak_label, cooked_at, competition_id, competition:competition_id(id, name, event_date, city, state), score(*)"
    )
    .order("cooked_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as CookWithScore[];
}

export async function getCompetitions(): Promise<ScaCompetitionRow[]> {
  const supabase = getScaSupabaseClient();
  const { data, error } = await supabase
    .from("competition")
    .select("*")
    .order("event_date", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as ScaCompetitionRow[];
}

export async function getCompetitionWithCooks(
  id: number
): Promise<CompetitionWithCooks | null> {
  const supabase = getScaSupabaseClient();
  const { data, error } = await supabase
    .from("competition")
    .select(
      "*, cook(id, steak_label, cooked_at, competition_id, competition:competition_id(id, name, event_date, city, state), score(*))"
    )
    .eq("id", id)
    .single();

  if (error?.code === "PGRST116") {
    return null;
  }
  if (error) {
    throw error;
  }

  return data as unknown as CompetitionWithCooks;
}

export async function getAllAiReviews(): Promise<AiReviewWithCook[]> {
  const supabase = getScaSupabaseClient();
  const { data, error } = await supabase
    .from("cook_ai_review")
    .select(AI_REVIEW_EMBED_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as AiReviewWithCook[];
}

export async function getAiReviewById(id: number): Promise<AiReviewWithCook | null> {
  const supabase = getScaSupabaseClient();
  const { data, error } = await supabase
    .from("cook_ai_review")
    .select(AI_REVIEW_EMBED_SELECT)
    .eq("id", id)
    .single();

  if (error?.code === "PGRST116") {
    return null;
  }
  if (error) {
    throw error;
  }

  return data as unknown as AiReviewWithCook;
}

export async function getCookWithDetails(id: number): Promise<CookWithDetails | null> {
  const supabase = getScaSupabaseClient();
  const { data, error } = await supabase
    .from("cook")
    .select("*, competition:competition_id(*), score(*), cook_detail(*), cook_ai_review(*)")
    .eq("id", id)
    .single();

  if (error?.code === "PGRST116") {
    return null;
  }
  if (error) {
    throw error;
  }

  const row = data as unknown as CookWithDetails;
  return { ...row, cook_ai_review: row.cook_ai_review ?? [] };
}
