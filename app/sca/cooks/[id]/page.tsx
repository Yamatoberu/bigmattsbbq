import Link from "next/link";
import { notFound } from "next/navigation";

import { getCookWithDetails, parseScaId } from "../../../../lib/sca/queries";
import { getPresentProcessFields } from "../../../../lib/sca/cookDetailFields";
import { deriveScoreMetrics } from "../../../../lib/sca/scoring";
import {
  cookColumnLabel,
  formatCookDate,
  formatEventDate,
  formatScoreValue
} from "../../../../lib/sca/format";
import { logError } from "../../../../lib/logger";
import type { CookWithDetails } from "../../../../lib/sca/types";

export const dynamic = "force-dynamic";

const LINK_CLASSES =
  "min-h-[44px] inline-flex items-center text-smoke-800 hover:text-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500";

interface ScoreRow {
  label: string;
  value: string;
}

function buildScoreRows(cook: CookWithDetails): ScoreRow[] {
  const score = cook.score;
  const metrics = deriveScoreMetrics(
    score ?? { total_score: null, first_place_score: null }
  );

  return [
    { label: "Appearance", value: formatScoreValue(score?.appearance) },
    { label: "Doneness", value: formatScoreValue(score?.doneness) },
    { label: "Texture", value: formatScoreValue(score?.texture) },
    { label: "Taste", value: formatScoreValue(score?.taste) },
    { label: "Overall Impression", value: formatScoreValue(score?.overall_impression) },
    { label: "Total Score", value: formatScoreValue(score?.total_score) },
    { label: "Placement", value: formatScoreValue(score?.placement) },
    { label: "Field Size", value: formatScoreValue(score?.field_size) },
    { label: "First Place Score", value: formatScoreValue(score?.first_place_score) },
    { label: "Distance From Winning", value: formatScoreValue(metrics.distance_from_winning) },
    { label: "Distance From Perfect Score", value: formatScoreValue(metrics.distance_from_perfect) }
  ];
}

export default async function CookDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookId = parseScaId(id);
  if (cookId === null) {
    notFound();
  }

  let cook: CookWithDetails | null = null;
  let errorMessage: string | undefined;

  try {
    cook = await getCookWithDetails(cookId);
  } catch (error) {
    logError("CookDetailPage query failed", error, "sca-cook-detail-ssr");
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

  if (cook === null) {
    notFound();
  }

  const heading = cook.steak_label ?? cookColumnLabel(cook.competition?.name, cook.steak_label);
  const scoreRows = buildScoreRows(cook);
  const processFields = getPresentProcessFields(cook.cook_detail);
  const scoreNotes = cook.score?.score_notes?.trim();
  const backHref = cook.competition ? `/sca/competitions/${cook.competition.id}` : "/sca/competitions";
  const backLabel = cook.competition ? "Back to Competition" : "Back to Competitions";

  return (
    <div className="section-spacing">
      <h1 className="font-[var(--font-display)] text-4xl font-semibold text-[#f7f1e6]">
        {heading}
      </h1>
      <p className="mt-2 text-sm text-smoke-800">
        {formatCookDate(cook.cooked_at)}
        {cook.competition && (
          <>
            {" · "}
            <Link href={`/sca/competitions/${cook.competition.id}`} className="hover:text-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500">
              {cook.competition.name}
            </Link>
            {" · "}
            {formatEventDate(cook.competition.event_date)}
          </>
        )}
      </p>

      <div className="mt-8">
        <h2 className="font-[var(--font-display)] text-2xl font-semibold text-[#f7f1e6]">
          Score Breakdown
        </h2>
        <div className="glass-card mt-4 p-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {scoreRows.map((row) => (
              <div key={row.label}>
                <dt className="text-xs uppercase tracking-[0.25em] text-smoke-800">{row.label}</dt>
                <dd className="mt-1 text-sm text-[#f7f1e6]">{row.value}</dd>
              </div>
            ))}
          </dl>
          {scoreNotes && scoreNotes.length > 0 && (
            <p className="mt-4 text-sm text-smoke-800">{scoreNotes}</p>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-[var(--font-display)] text-2xl font-semibold text-[#f7f1e6]">
          Process Variables
        </h2>
        {processFields.length === 0 ? (
          <div className="glass-card mt-4 p-6">
            <p className="text-sm text-smoke-800">No process detail recorded for this cook.</p>
          </div>
        ) : (
          <div className="glass-card mt-4 grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
            {processFields.map((field) => (
              <div key={field.key}>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-smoke-800">
                  {field.label}
                </p>
                <p className="mt-1 text-sm text-[#f7f1e6]">{field.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="font-[var(--font-display)] text-2xl font-semibold text-[#f7f1e6]">
          AI Reviews
        </h2>
        {cook.cook_ai_review.length === 0 ? (
          <div className="glass-card mt-4 p-6">
            <p className="text-sm text-smoke-800">No AI reviews yet.</p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {cook.cook_ai_review.map((review) => (
              <div key={review.id} className="glass-card p-6">
                <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.25em] text-smoke-800">
                  {review.model && <span>{review.model}</span>}
                  {review.review_type && <span>{review.review_type}</span>}
                  <span>{formatCookDate(review.created_at)}</span>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm text-[#f7f1e6]">{review.comments}</p>
                {review.prompt && (
                  <div className="mt-3">
                    <p className="text-xs uppercase tracking-[0.25em] text-smoke-800">Prompt</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-[#f7f1e6]">{review.prompt}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <Link href={backHref} className={LINK_CLASSES}>
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
