import Link from "next/link";

import { sortCooksByRecencyDesc } from "../../../lib/sca/aggregates";
import { getAllCooksWithScores } from "../../../lib/sca/queries";
import { cookColumnLabel, formatCookDate, formatScoreValue } from "../../../lib/sca/format";
import { logError } from "../../../lib/logger";
import type { CookWithScore } from "../../../lib/sca/types";

export const dynamic = "force-dynamic";

const LINK_CLASSES =
  "min-h-[44px] inline-flex items-center text-smoke-800 hover:text-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500";

export default async function ScaCooksPage() {
  let cooks: CookWithScore[] = [];
  let errorMessage: string | undefined;

  try {
    cooks = await getAllCooksWithScores();
  } catch (error) {
    logError("ScaCooksPage query failed", error, "sca-cooks-index-ssr");
    errorMessage = "We couldn't load this page right now. Please try again in a moment.";
  }

  const sortedCooks = sortCooksByRecencyDesc(cooks);

  return (
    <div className="section-spacing">
      <h1 className="font-[var(--font-display)] text-4xl font-semibold text-[#f7f1e6]">
        Cooks
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-smoke-800">
        {"Every steak Big Matt's has turned in, newest first."}
      </p>

      {errorMessage ? (
        <div className="glass-card mt-8 p-6">
          <p className="text-sm text-smoke-800">{errorMessage}</p>
        </div>
      ) : sortedCooks.length === 0 ? (
        <div className="glass-card mt-8 p-6">
          <h2 className="font-[var(--font-display)] text-2xl font-semibold text-[#f7f1e6]">
            No cooks recorded yet.
          </h2>
          <p className="mt-3 text-sm text-smoke-800">
            {"Check back after Big Matt's next SCA cookoff."}
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {sortedCooks.map((cook) => (
            <div key={cook.id} className="glass-card p-6">
              <p className="text-xs uppercase tracking-[0.25em] text-smoke-800">
                {formatCookDate(cook.cooked_at)}
              </p>
              <h2 className="mt-2 font-[var(--font-display)] text-2xl font-semibold text-[#f7f1e6]">
                {cookColumnLabel(cook.competition?.name ?? null, cook.steak_label)}
              </h2>
              <p className="mt-2 text-sm text-smoke-800">
                {`Total Score ${formatScoreValue(cook.score?.total_score)} · Placement ${formatScoreValue(cook.score?.placement)}`}
              </p>
              <Link href={`/sca/cooks/${cook.id}`} className={"mt-4 " + LINK_CLASSES}>
                View Cook
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
