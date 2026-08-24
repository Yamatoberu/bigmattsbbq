import Link from "next/link";

import { getCompetitions } from "../../../lib/sca/queries";
import { formatEventDate } from "../../../lib/sca/format";
import { logError } from "../../../lib/logger";
import type { ScaCompetitionRow } from "../../../lib/sca/types";

export const dynamic = "force-dynamic";

const LINK_CLASSES =
  "min-h-[44px] inline-flex items-center text-smoke-800 hover:text-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500";

function buildMetaLine(competition: ScaCompetitionRow): string | null {
  const parts = [competition.city, competition.state, competition.organizer].filter(
    (value): value is string => value !== null && value.trim().length > 0
  );

  if (parts.length === 0) {
    return null;
  }

  return parts.join(" · ");
}

export default async function CompetitionsPage() {
  let competitions: ScaCompetitionRow[] = [];
  let errorMessage: string | undefined;

  try {
    competitions = await getCompetitions();
  } catch (error) {
    logError("CompetitionsPage query failed", error, "sca-competitions-ssr");
    errorMessage = "We couldn't load this page right now. Please try again in a moment.";
  }

  return (
    <div className="section-spacing">
      <h1 className="font-[var(--font-display)] text-4xl font-semibold text-[#f7f1e6]">
        Competitions
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-smoke-800">
        Every SCA competition Big Matt&apos;s has entered, newest first.
      </p>

      {errorMessage ? (
        <div className="glass-card mt-8 p-6">
          <p className="text-sm text-smoke-800">{errorMessage}</p>
        </div>
      ) : competitions.length === 0 ? (
        <div className="glass-card mt-8 p-6">
          <h2 className="font-[var(--font-display)] text-2xl font-semibold text-[#f7f1e6]">
            No competitions recorded yet.
          </h2>
          <p className="mt-3 text-sm text-smoke-800">
            {"Check back after Big Matt's next SCA cookoff."}
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {competitions.map((competition) => {
            const metaLine = buildMetaLine(competition);

            return (
              <div key={competition.id} className="glass-card p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-smoke-800">
                  {formatEventDate(competition.event_date)}
                </p>
                <h2 className="mt-2 font-[var(--font-display)] text-2xl font-semibold text-[#f7f1e6]">
                  {competition.name}
                </h2>
                {metaLine ? <p className="mt-2 text-sm text-smoke-800">{metaLine}</p> : null}
                <Link href={`/sca/competitions/${competition.id}`} className={"mt-4 " + LINK_CLASSES}>
                  View Competition
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
