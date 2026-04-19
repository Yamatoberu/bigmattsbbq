export const metadata = {
  title: "About Big Matt's BBQ",
  description: "The story behind Big Matt's BBQ — pit-smoked, small-batch, Utah-raised."
};

export default function AboutPage() {
  return (
    <section className="section-spacing mx-auto max-w-2xl">
      <header>
        <h1
          className="text-4xl font-semibold text-smoke-900"
          style={{ fontFamily: "var(--font-display)" }}
        >
          About Big Matt&apos;s BBQ
        </h1>
      </header>
      <div className="mt-6 space-y-4 text-base text-smoke-800 leading-relaxed">
        <p>
          Big Matt&apos;s BBQ started in a backyard smoker and a weekend obsession with getting pulled pork right. What started as feeding friends and family at barbecues grew into small-batch frozen drops that let folks across Utah stock their freezers with real pit-smoked BBQ.
        </p>
        <p>
          We keep it simple: small batches, one low-and-slow smoke per drop, and no shortcuts. Every brisket and pork shoulder gets 12+ hours over post oak and cherry wood, rested, sliced, vacuum-sealed, and flash-frozen. Heat it at home, slice it, serve it — the smoke is already there.
        </p>
        <p>
          We believe great BBQ isn&apos;t a restaurant — it&apos;s a craft. That&apos;s why we work in drops instead of running a storefront. When a drop opens, we&apos;ve planned the capacity, the pickup windows, and the sourcing. When it closes, we&apos;re already prepping the next one.
        </p>
      </div>
      <p className="mt-8 text-sm text-smoke-600 italic">
        Draft copy — Matt will revise before launch.
      </p>
    </section>
  );
}
