import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getAllCooksWithScores,
  getCompetitionWithCooks,
  parseScaId
} from "../../../../lib/sca/queries";
import { buildComparisonTable } from "../../../../lib/sca/comparison";
import { formatEventDate } from "../../../../lib/sca/format";
import { logError } from "../../../../lib/logger";
import { ComparisonTable } from "../../../../components/sca/ComparisonTable";
import type { CompetitionWithCooks, CookWithScore } from "../../../../lib/sca/types";

export const dynamic = "force-dynamic";

const LINK_CLASSES =
  "min-h-[44px] inline-flex items-center text-smoke-800 hover:text-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500";

interface MetaField {
  label: string;
  value: string;
}

function buildMetaFields(competition: CompetitionWithCooks): MetaField[] {
  const fields: MetaField[] = [{ label: "Event Date", value: formatEventDate(competition.event_date) }];

  if (competition.city !== null && competition.city.trim().length > 0) {
    fields.push({ label: "City", value: competition.city });
  }
  if (competition.state !== null && competition.state.trim().length > 0) {
    fields.push({ label: "State", value: competition.state });
  }
  if (competition.elevation_ft !== null) {
    fields.push({ label: "Elevation (ft)", value: String(competition.elevation_ft) });
  }
  if (competition.organizer !== null && competition.organizer.trim().length > 0) {
    fields.push({ label: "Organizer", value: competition.organizer });
  }
  if (competition.notes !== null && competition.notes.trim().length > 0) {
    fields.push({ label: "Notes", value: competition.notes });
  }

  return fields;
}

export default async function CompetitionDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const competitionId = parseScaId(id);
  if (competitionId === null) {
    notFound();
  }

  let competition: CompetitionWithCooks | null = null;
  let allCooks: CookWithScore[] = [];
  let errorMessage: string | undefined;

  try {
    [competition, allCooks] = await Promise.all([
      getCompetitionWithCooks(competitionId),
      getAllCooksWithScores()
    ]);
  } catch (error) {
    logError("CompetitionDetailPage query failed", error, "sca-competition-detail-ssr");
    errorMessage = "We couldn't load this page right now. Please try again in a moment.";
  }

  if (errorMessage) {
    return (
      <div className="section-spacing">
        <div className="glass-card p-6">
          <p className="text-sm text-smoke-800">{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (competition === null) {
    notFound();
  }

  const metaFields = buildMetaFields(competition);
  const model = buildComparisonTable(competition.cook, {
    aggregates: true,
    aggregateSource: allCooks,
    aggregateScopeLabel: "All Time"
  });

  return (
    <div className="section-spacing">
      <h1 className="font-[var(--font-display)] text-4xl font-semibold text-[#f7f1e6]">
        {competition.name}
      </h1>

      <div className="glass-card mt-8 p-6">
        <h2 className="font-[var(--font-display)] text-2xl font-semibold text-[#f7f1e6]">
          Event Details
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {metaFields.map((field) => (
            <div key={field.label}>
              <dt className="text-xs uppercase tracking-[0.25em] text-smoke-800">{field.label}</dt>
              <dd className="mt-1 text-sm text-[#f7f1e6]">{field.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-8">
        <h2 className="font-[var(--font-display)] text-2xl font-semibold text-[#f7f1e6]">
          Cooks at This Event
        </h2>
        <div className="mt-4">
          {competition.cook.length === 0 ? (
            <div className="glass-card p-6">
              <p className="text-sm text-smoke-800">No cooks recorded for this competition.</p>
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm text-smoke-800">
                Worst Cook, Best Cook, and Cook Averages compare this event against every cook
                Big Matt&apos;s has recorded — not just the cooks below.
              </p>
              <ComparisonTable
                model={model}
                caption={`Cooks entered at ${competition.name} compared against every cook recorded to date`}
              />
            </>
          )}
        </div>
      </div>

      <div className="mt-8">
        <Link href="/sca/competitions" className={LINK_CLASSES}>
          Back to Competitions
        </Link>
      </div>
    </div>
  );
}
