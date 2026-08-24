import Link from "next/link";

import { cookColumnLabel, formatScoreValue, EM_DASH } from "../../lib/sca/format";
import type { CookWithScore, SummaryStats } from "../../lib/sca/types";

const LINK_CLASSES =
  "min-h-[44px] inline-flex items-center text-smoke-800 hover:text-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500";

const LABEL_CLASSES = "text-xs font-semibold uppercase tracking-[0.25em] text-smoke-800";
const VALUE_CLASSES = "text-4xl font-semibold text-[#f7f1e6] font-[var(--font-display)]";
const BODY_CLASSES = "mt-3 text-sm text-smoke-800";

function CookLink({ cook }: { cook: CookWithScore }) {
  return (
    <Link href={`/sca/cooks/${cook.id}`} className={LINK_CLASSES}>
      {cookColumnLabel(cook.competition?.name ?? null, cook.steak_label)}
    </Link>
  );
}

export function SummaryCards({ stats }: { stats: SummaryStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="glass-card p-6">
        <p className={LABEL_CLASSES}>Latest Cooks</p>
        <p className={VALUE_CLASSES}>
          {stats.latestCooks.length > 0 ? stats.latestCooks.length : EM_DASH}
        </p>
        {stats.latestCooks.length > 0 ? (
          <ul className={BODY_CLASSES}>
            {stats.latestCooks.map((cook) => (
              <li key={cook.id}>
                <CookLink cook={cook} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="glass-card p-6">
        <p className={LABEL_CLASSES}>Best Cook</p>
        <p className={VALUE_CLASSES}>{formatScoreValue(stats.bestCook?.score?.total_score)}</p>
        {stats.bestCook ? (
          <p className={BODY_CLASSES}>
            <CookLink cook={stats.bestCook} />
          </p>
        ) : null}
      </div>

      <div className="glass-card p-6">
        <p className={LABEL_CLASSES}>Worst Cook</p>
        <p className={VALUE_CLASSES}>{formatScoreValue(stats.worstCook?.score?.total_score)}</p>
        {stats.worstCook ? (
          <p className={BODY_CLASSES}>
            <CookLink cook={stats.worstCook} />
          </p>
        ) : null}
      </div>

      <div className="glass-card p-6">
        <p className={LABEL_CLASSES}>Average Total Score</p>
        <p className={VALUE_CLASSES}>{formatScoreValue(stats.averageTotalScore)}</p>
      </div>

      <div className="glass-card p-6">
        <p className={LABEL_CLASSES}>Average Gap To First</p>
        <p className={VALUE_CLASSES}>{formatScoreValue(stats.averageDistanceFromWinning)}</p>
      </div>
    </div>
  );
}
