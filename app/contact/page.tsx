export const metadata = {
  title: "Contact Big Matt's BBQ",
  description: "Reach out about drops, catering, or anything else. We answer every email."
};

export default function ContactPage() {
  return (
    <section className="section-spacing mx-auto max-w-2xl">
      <header>
        <h1
          className="text-4xl font-semibold text-smoke-900"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Get in Touch
        </h1>
      </header>

      <div className="mt-6 text-base text-smoke-800 leading-relaxed">
        <p>
          We answer every email. Reach out about upcoming drops, catering, or anything else BBQ-adjacent.
        </p>
      </div>

      <div className="glass-card p-6 mt-8 space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f0c16a]">
            General Inquiries
          </p>
          <a
            href="mailto:bigmattsbarbecue@gmail.com"
            className="mt-2 inline-block text-base text-smoke-900 underline hover:text-[#f0c16a]"
          >
            bigmattsbarbecue@gmail.com
          </a>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f0c16a]">
            Catering
          </p>
          <p className="mt-2 text-sm text-smoke-700">
            For event quotes, tier details, and booking.
          </p>
          <a
            href="mailto:catering@bigmattsbbq.com"
            className="button-primary mt-3 inline-block"
          >
            catering@bigmattsbbq.com
          </a>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f0c16a]">
            Service Area
          </p>
          <p className="mt-2 text-base text-smoke-800">
            Cache Valley and Utah County.
          </p>
        </div>
      </div>
    </section>
  );
}
