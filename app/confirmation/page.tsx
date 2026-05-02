import Link from "next/link";
import { CONTACT_EMAIL } from "../../lib/config";

interface ConfirmationPageProps {
  searchParams: { orderId?: string; pickupNote?: string };
}

export default function ConfirmationPage({ searchParams }: ConfirmationPageProps) {
  const pickupNote = searchParams.pickupNote || "Pickup scheduled";
  const orderId = searchParams.orderId || "";

  return (
    <main className="section-spacing bg-ember-radial bg-grain">
      <div className="mx-auto max-w-2xl">
        <div className="glass-card border border-smoke-100 p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-ember-500">Success</p>
          <h1 className="mt-3 text-3xl font-semibold text-smoke-900" style={{ fontFamily: "var(--font-display)" }}>
            Your frozen order is locked in.
          </h1>
          <p className="mt-4 text-sm text-smoke-600">
            {pickupNote}
          </p>
          <p className="mt-2 text-sm text-smoke-600">Check your email for the invoice and receipt.</p>
          {orderId && (
            <p className="mt-4 text-xs uppercase tracking-[0.3em] text-smoke-500">
              Order ID: {orderId}
            </p>
          )}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/" className="button-primary">
              Back to Menu
            </Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="button-secondary">
              Need Help?
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
