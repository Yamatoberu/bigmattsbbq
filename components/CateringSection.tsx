import Link from "next/link";

type CateringSectionProps = {
  showFullMenuLink?: boolean;
};

const TIERS = [
  {
    name: "Basic",
    price: "$15 / person",
    included: [
      "Choice of 2 meats",
      "2 sides",
      "Dinner rolls"
    ]
  },
  {
    name: "Plus",
    price: "$18 / person",
    included: [
      "Choice of 3 meats",
      "2 sides",
      "Dinner rolls"
    ]
  },
  {
    name: "Ultra",
    price: "$21 / person",
    included: [
      "Choice of 3 meats",
      "2 sides",
      "Dinner rolls",
      "Dessert"
    ]
  }
] as const;

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
        <a href="mailto:catering@bigmattsbbq.com" className="button-primary">
          Email for Catering
        </a>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {TIERS.map((tier) => (
          <div key={tier.name} className="rounded-md border border-[#3a2a20] bg-[#1c140f] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f0c16a]">
              {tier.name}
            </p>
            <p className="mt-2 text-xl font-semibold text-smoke-900" style={{ fontFamily: "var(--font-display)" }}>
              {tier.price}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-smoke-800">
              {tier.included.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        ))}
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
