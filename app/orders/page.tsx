import Link from "next/link";

export default function OrdersPage() {
  return (
    <main className="section-spacing bg-ember-radial bg-grain">
      <div className="mx-auto max-w-xl">
        <div className="glass-card border border-smoke-100 p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-ember-500">
            Coming Soon
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-smoke-900" style={{ fontFamily: "var(--font-display)" }}>
            Order history is on the way.
          </h1>
          <p className="mt-3 text-sm text-smoke-600">
            We&apos;re preparing a secure login experience so you can review past frozen drops.
          </p>
          <div className="mt-6">
            <Link href="/" className="button-primary">
              Back to Menu
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
