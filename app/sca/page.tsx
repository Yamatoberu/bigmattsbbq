import { getAllCooksWithScores } from "../../lib/sca/queries";
import { computeSummaryStats } from "../../lib/sca/aggregates";
import { computeWhatStandsOut } from "../../lib/sca/insights";
import { buildComparisonTable } from "../../lib/sca/comparison";
import { logError } from "../../lib/logger";
import { ComparisonTable } from "../../components/sca/ComparisonTable";
import { SummaryCards } from "../../components/sca/SummaryCards";
import { WhatStandsOut } from "../../components/sca/WhatStandsOut";
import type { CookWithScore } from "../../lib/sca/types";

export const dynamic = "force-dynamic";

export default async function ScaDashboardPage() {
  let cooks: CookWithScore[] = [];
  let errorMessage: string | undefined;

  try {
    cooks = await getAllCooksWithScores();
  } catch (error) {
    logError("ScaDashboardPage cooks query failed", error, "sca-dashboard-ssr");
    errorMessage = "We couldn't load this page right now. Please try again in a moment.";
  }

  const stats = computeSummaryStats(cooks);
  const insights = computeWhatStandsOut(cooks);
  const model = buildComparisonTable(cooks, { aggregates: true });

  return (
    <div className="section-spacing">
      <h1 className="font-[var(--font-display)] text-4xl font-semibold text-[#f7f1e6]">
        Dashboard
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-smoke-800">
        Big Matt&apos;s SCA steak cookoff history — cooks, scores, and standout results at a
        glance.
      </p>

      {errorMessage ? (
        <div className="glass-card mt-8 p-6">
          <p className="text-sm text-smoke-800">{errorMessage}</p>
        </div>
      ) : cooks.length === 0 ? (
        <div className="glass-card mt-8 p-6">
          <h2 className="font-[var(--font-display)] text-2xl font-semibold text-[#f7f1e6]">
            No competitions recorded yet.
          </h2>
          <p className="mt-3 text-sm text-smoke-800">
            {"Check back after Big Matt's next SCA cookoff."}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8">
            <WhatStandsOut insights={insights} />
          </div>

          <div className="mt-8">
            <h2 className="font-[var(--font-display)] text-2xl font-semibold text-[#f7f1e6]">
              Summary
            </h2>
            <div className="mt-4">
              <SummaryCards stats={stats} />
            </div>
          </div>

          <div className="mt-8">
            <h2 className="font-[var(--font-display)] text-2xl font-semibold text-[#f7f1e6]">
              Comparison Table
            </h2>
            <div className="mt-4">
              <ComparisonTable model={model} caption="All recorded cooks compared side by side" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
