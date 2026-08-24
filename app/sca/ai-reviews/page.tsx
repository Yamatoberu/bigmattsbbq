import Link from "next/link";

import { getAllAiReviews } from "../../../lib/sca/queries";
import { cookColumnLabel, formatCookDate, EM_DASH } from "../../../lib/sca/format";
import { logError } from "../../../lib/logger";
import type { AiReviewWithCook } from "../../../lib/sca/types";

export const dynamic = "force-dynamic";

const LINK_CLASSES =
  "min-h-[44px] inline-flex items-center text-smoke-800 hover:text-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500";

export default async function ScaAiReviewsPage() {
  let reviews: AiReviewWithCook[] = [];
  let errorMessage: string | undefined;

  try {
    reviews = await getAllAiReviews();
  } catch (error) {
    logError("ScaAiReviewsPage query failed", error, "sca-ai-reviews-index-ssr");
    errorMessage = "We couldn't load this page right now. Please try again in a moment.";
  }

  return (
    <div className="section-spacing">
      <h1 className="font-[var(--font-display)] text-4xl font-semibold text-[#f7f1e6]">
        AI Reviews
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-smoke-800">
        {"Every AI review Big Matt's cooks have received, newest first."}
      </p>

      {errorMessage ? (
        <div className="glass-card mt-8 p-6">
          <p className="text-sm text-smoke-800">{errorMessage}</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="glass-card mt-8 p-6">
          <h2 className="font-[var(--font-display)] text-2xl font-semibold text-[#f7f1e6]">
            No AI reviews recorded yet.
          </h2>
          <p className="mt-3 text-sm text-smoke-800">
            {"Check back after Big Matt's next AI review run."}
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="glass-card p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="badge">{review.review_type ?? EM_DASH}</span>
                <span className="text-xs uppercase tracking-[0.25em] text-smoke-800">
                  {review.model ?? EM_DASH}
                </span>
                <span className="text-xs uppercase tracking-[0.25em] text-smoke-800">
                  {formatCookDate(review.created_at)}
                </span>
              </div>

              {review.cook ? (
                <Link href={`/sca/cooks/${review.cook.id}`} className={"mt-3 " + LINK_CLASSES}>
                  {cookColumnLabel(review.cook.competition?.name ?? null, review.cook.steak_label ?? null)}
                </Link>
              ) : (
                <p className="mt-3 text-sm text-[#f7f1e6]">
                  {cookColumnLabel(null, null)}
                </p>
              )}

              <p className="mt-3 line-clamp-3 text-sm text-[#f7f1e6]">{review.comments}</p>

              <Link href={`/sca/ai-reviews/${review.id}`} className={"mt-4 " + LINK_CLASSES}>
                Read Full Review
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
