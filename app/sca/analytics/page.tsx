import { getAllCooksWithScores } from "../../../lib/sca/queries";
import { buildTrendSeries } from "../../../lib/sca/trends";
import { logError } from "../../../lib/logger";
import { TrendChart } from "../../../components/sca/TrendChart";
import type { CookWithScore } from "../../../lib/sca/types";

export const dynamic = "force-dynamic";

export default async function ScaAnalyticsPage() {
  let cooks: CookWithScore[] = [];
  let errorMessage: string | undefined;

  try {
    cooks = await getAllCooksWithScores();
  } catch (error) {
    logError("ScaAnalyticsPage query failed", error, "sca-analytics-ssr");
    errorMessage = "We couldn't load this page right now. Please try again in a moment.";
  }

  if (errorMessage) {
    return (
      <div className="section-spacing">
        <div className="glass-card mt-8 p-6">
          <p className="text-sm text-smoke-800">{errorMessage}</p>
        </div>
      </div>
    );
  }

  const totalScoreSeries = buildTrendSeries(cooks, "total_score");
  const distanceFromWinningSeries = buildTrendSeries(cooks, "distance_from_winning");
  const appearanceSeries = buildTrendSeries(cooks, "appearance");
  const donenessSeries = buildTrendSeries(cooks, "doneness");
  const textureSeries = buildTrendSeries(cooks, "texture");
  const tasteSeries = buildTrendSeries(cooks, "taste");
  const overallImpressionSeries = buildTrendSeries(cooks, "overall_impression");

  return (
    <div className="section-spacing">
      <h1 className="font-[var(--font-display)] text-4xl font-semibold text-[#f7f1e6]">
        Analytics
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-smoke-800">
        {"How Big Matt's scores have moved across every SCA cook."}
      </p>

      <div className="mt-8">
        <h2 className="font-[var(--font-display)] text-2xl font-semibold text-[#f7f1e6]">
          Score & Gap to First
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TrendChart title="Total Score" points={totalScoreSeries} accent="ember" />
          <TrendChart title="Gap to First" points={distanceFromWinningSeries} accent="ember" />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-[var(--font-display)] text-2xl font-semibold text-[#f7f1e6]">
          Judging Categories
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TrendChart title="Appearance" points={appearanceSeries} accent="gold" />
          <TrendChart title="Doneness" points={donenessSeries} accent="gold" />
          <TrendChart title="Texture" points={textureSeries} accent="gold" />
          <TrendChart title="Taste" points={tasteSeries} accent="gold" />
          <TrendChart title="Overall Impression" points={overallImpressionSeries} accent="gold" />
        </div>
      </div>
    </div>
  );
}
