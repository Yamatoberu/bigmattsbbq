import Link from "next/link";
import { notFound } from "next/navigation";

import { getAiReviewById, parseScaId } from "../../../../lib/sca/queries";
import { cookColumnLabel, formatCookDate, formatEventDate, EM_DASH } from "../../../../lib/sca/format";
import { logError } from "../../../../lib/logger";
import type { AiReviewWithCook } from "../../../../lib/sca/types";

export const dynamic = "force-dynamic";

const LINK_CLASSES =
  "min-h-[44px] inline-flex items-center text-smoke-800 hover:text-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500";

export default async function AiReviewDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const reviewId = parseScaId(id);
  if (reviewId === null) {
    notFound();
  }

  let review: AiReviewWithCook | null = null;
  let errorMessage: string | undefined;

  try {
    review = await getAiReviewById(reviewId);
  } catch (error) {
    logError("AiReviewDetailPage query failed", error, "sca-ai-review-detail-ssr");
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

  if (review === null) {
    notFound();
  }

  return (
    <div className="section-spacing">
      <h1 className="font-[var(--font-display)] text-4xl font-semibold text-[#f7f1e6]">
        {review.model ?? EM_DASH}
      </h1>
      <p className="mt-2 text-sm text-smoke-800">
        <span className="badge">{review.review_type ?? EM_DASH}</span>
        {" · "}
        {formatCookDate(review.created_at)}
        {review.cook && (
          <>
            {" · "}
            <Link href={`/sca/cooks/${review.cook.id}`} className="hover:text-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500">
              {cookColumnLabel(review.cook.competition?.name ?? null, review.cook.steak_label)}
            </Link>
            {review.cook.competition && (
              <>
                {" · "}
                <Link href={`/sca/competitions/${review.cook.competition.id}`} className="hover:text-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500">
                  {formatEventDate(review.cook.competition.event_date)}
                </Link>
              </>
            )}
          </>
        )}
      </p>

      <div className="mt-8">
        <h2 className="font-[var(--font-display)] text-2xl font-semibold text-[#f7f1e6]">
          Comments
        </h2>
        <div className="glass-card mt-4 p-6">
          <p className="whitespace-pre-line text-sm text-[#f7f1e6]">{review.comments}</p>
        </div>
      </div>

      {review.prompt && (
        <div className="mt-8">
          <h2 className="font-[var(--font-display)] text-2xl font-semibold text-[#f7f1e6]">
            Prompt
          </h2>
          <div className="glass-card mt-4 p-6">
            <p className="whitespace-pre-line text-sm text-[#f7f1e6]">{review.prompt}</p>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-6">
        <Link href="/sca/ai-reviews" className={LINK_CLASSES}>
          Back to AI Reviews
        </Link>
        {review.cook && (
          <Link href={`/sca/cooks/${review.cook.id}`} className={LINK_CLASSES}>
            View Cook
          </Link>
        )}
        {review.cook?.competition && (
          <Link href={`/sca/competitions/${review.cook.competition.id}`} className={LINK_CLASSES}>
            View Competition
          </Link>
        )}
      </div>
    </div>
  );
}
