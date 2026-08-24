import type { Insight } from "../../lib/sca/types";

const LABEL_CLASSES = "text-xs font-semibold uppercase tracking-[0.25em] text-smoke-800";
const VALUE_CLASSES = "text-4xl font-semibold font-[var(--font-display)]";
const DETAIL_CLASSES = "mt-3 text-sm text-smoke-800";

function InsightCard({ insight }: { insight: Insight }) {
  const accentClass = insight.key === "closest_gap" ? "text-gold-300" : "text-[#f7f1e6]";

  return (
    <div className="glass-card p-6">
      <p className={LABEL_CLASSES}>{insight.label}</p>
      <p className={VALUE_CLASSES + " " + accentClass}>{insight.value}</p>
      <p className={DETAIL_CLASSES}>{insight.detail}</p>
    </div>
  );
}

export function WhatStandsOut({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {insights.map((insight) => (
        <InsightCard key={insight.key} insight={insight} />
      ))}
    </div>
  );
}
