import Link from "next/link";
import { CATERING_EMAIL } from "../lib/config";

type CateringSectionProps = {
  showFullMenuLink?: boolean;
};


export function CateringSection({ showFullMenuLink = false }: CateringSectionProps = {}) {
  return (
    <div className="glass-card p-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h3
            className="text-xl font-semibold text-smoke-900"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Catering, simplified
          </h3>
          <p className="mt-2 text-sm text-smoke-600">
            Need a full spread? We keep catering straightforward and premium.
          </p>
        </div>
        <a href={`mailto:${CATERING_EMAIL}`} className="button-primary">
          Email for Catering
        </a>
      </div>

      {showFullMenuLink && (
        <div className="mt-6 text-center">
          <Link
            href="/catering"
            className="button-secondary text-sm"
          >
            See full catering menu →
          </Link>
        </div>
      )}
    </div>
  );
}
