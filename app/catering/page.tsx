import { CateringSection } from "../../components/CateringSection";

export const metadata = {
  title: "Catering by Big Matt's BBQ",
  description: "Event-ready BBQ catering with three simple tiers. Serving Cache Valley and Utah County."
};

export default function CateringPage() {
  return (
    <section className="section-spacing mx-auto max-w-4xl">
      <header className="text-center">
        <h1
          className="text-4xl font-semibold text-smoke-900"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Catering by Big Matt&apos;s BBQ
        </h1>
        <p className="mt-4 text-base text-smoke-700">
          Simple pricing, premium quality, no surprises.
        </p>
      </header>

      <div className="mt-10">
        <CateringSection />
      </div>

      <div className="glass-card p-6 mt-8">
        <h2
          className="text-xl font-semibold text-smoke-900"
          style={{ fontFamily: "var(--font-display)" }}
        >
          How far in advance?
        </h2>
        <p className="mt-3 text-sm text-smoke-700">
          We ask for at least two weeks&apos; notice for catering orders so we can plan the smoke schedule and source the right quantities. Larger events (75+ guests) are best booked a month out.
        </p>
      </div>

      <div className="glass-card p-6 mt-6">
        <h2
          className="text-xl font-semibold text-smoke-900"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Where we cater
        </h2>
        <p className="mt-3 text-sm text-smoke-700">
          Cache Valley and Utah County. If your event is outside this radius, email us — we may be able to make it work for the right event.
        </p>
      </div>

      <div className="mt-10 text-center">
        <a href="mailto:catering@bigmattsbbq.com" className="button-primary">
          Email for Catering
        </a>
      </div>
    </section>
  );
}
