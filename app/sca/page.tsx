import { getScaSupabaseClient } from "../../lib/supabase-sca";
import { logError } from "../../lib/logger";

export const dynamic = "force-dynamic";

export default async function ScaIndexPage() {
  let competitionCount: number | null = null;
  let errorMessage: string | undefined;

  try {
    const supabase = getScaSupabaseClient();
    const { count, error } = await supabase
      .from("competition")
      .select("*", { count: "exact", head: true });

    if (error) {
      throw error;
    }

    competitionCount = count ?? 0;
  } catch (error) {
    logError("ScaIndexPage competition count query failed", error, "sca-index-ssr");
    errorMessage = error instanceof Error ? error.message : "Unknown error loading SCA data.";
  }

  return (
    <div className="section-spacing">
      <h1 className="font-[var(--font-display)] text-3xl text-[#f7f1e6]">SCA Tracker</h1>
      <p className="mt-2 max-w-2xl text-sm text-smoke-800">
        Big Matt&apos;s SCA steak cookoff history — cooks, scores, and AI appearance reviews.
      </p>

      <div className="glass-card mt-8 max-w-sm p-6">
        {errorMessage ? (
          <>
            <p className="badge">Data error</p>
            <p className="mt-3 text-sm text-smoke-800">{errorMessage}</p>
          </>
        ) : competitionCount === 0 ? (
          <p className="text-sm text-smoke-800">No competitions have been recorded yet.</p>
        ) : (
          <>
            <p className="text-4xl font-semibold text-[#f7f1e6]">{competitionCount}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.25em] text-smoke-800">
              Competitions recorded
            </p>
          </>
        )}
      </div>

      <p className="mt-8 text-xs text-smoke-800">
        Dashboard, Competitions, Analytics, and AI Reviews arrive in the next phases.
      </p>
    </div>
  );
}
