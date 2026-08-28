import "server-only";
import { getSupabaseClient } from "./supabase";
import { logError } from "./logger";
import type { AttributionSourceDTO } from "./types";

export async function fetchActiveAttributionSources(): Promise<AttributionSourceDTO[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("attribution_sources")
    .select("id, code, label, sort_order, requires_detail")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    code: row.code,
    label: row.label,
    requiresDetail: row.requires_detail,
    sortOrder: row.sort_order
  }));
}

export async function resolveAttributionLabel(code: string): Promise<string | null> {
  try {
    if (typeof code !== "string" || code.trim().length === 0) {
      return null;
    }
    const trimmedCode = code.trim();

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("attribution_sources")
      .select("label")
      .eq("code", trimmedCode)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data.label;
  } catch (error) {
    logError("Attribution label lookup failed", error);
    return null;
  }
}
