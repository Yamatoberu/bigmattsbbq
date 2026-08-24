import Link from "next/link";

export default function ScaNotFound() {
  return (
    <div className="section-spacing">
      <div className="glass-card max-w-xl p-6">
        <h1 className="font-[var(--font-display)] text-4xl font-semibold text-[#f7f1e6]">
          Not found
        </h1>
        <p className="mt-3 text-sm text-smoke-800">
          We couldn&apos;t find that competition or cook.
        </p>
        <Link
          href="/sca"
          className="mt-6 inline-flex min-h-[44px] items-center text-smoke-800 hover:text-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
