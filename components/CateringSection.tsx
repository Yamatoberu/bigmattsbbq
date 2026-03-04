export function CateringSection() {
  return (
    <div className="glass-card p-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-smoke-900" style={{ fontFamily: "var(--font-display)" }}>
            Catering, simplified
          </h3>
          <p className="mt-2 text-sm text-smoke-600">
            Need a full spread? We keep catering straightforward and premium.
          </p>
        </div>
        <a href="mailto:bigmattsbarbecue@gmail.com" className="button-primary">
          Email for Catering
        </a>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          { name: "Basic", price: "$22 / person" },
          { name: "Plus", price: "$30 / person" },
          { name: "Ultra", price: "$38 / person" }
        ].map((tier) => (
          <div key={tier.name} className="rounded-md border border-[#3a2a20] bg-[#1c140f] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f0c16a]">
              {tier.name}
            </p>
            <p className="mt-2 text-lg font-semibold text-smoke-900">{tier.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
