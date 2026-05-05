import { CATERING_EMAIL } from "../../lib/config";

export const metadata = {
  title: "Catering by Big Matt's BBQ",
  description: "Full catering menu with pricing — meats, sides, desserts, and meal packages for groups of any size."
};

const fontDisplay = { fontFamily: "var(--font-display)" };

type MenuItem = { name: string; price: string; description: string };
type PackageTier = { name: string; price: string; included: string[] };

const MEATS: MenuItem[] = [
  {
    name: "Brisket",
    price: "$20 / lb",
    description: "Peppery beef brisket cooked and pulled. It's a fan favorite."
  },
  {
    name: "Pulled Pork",
    price: "$15 / lb",
    description: "Shredded pork paired well with our sweet rubs and cooked until it completely falls apart."
  },
  {
    name: "Chicken Thighs",
    price: "$15 / lb",
    description: "Seasoned and roasted boneless chicken thighs chopped fresh and ready to feed a crowd."
  },
  {
    name: "Ribs",
    price: "$35 / rack",
    description: "St. Louis style ribs with our pork rub, lightly sauced. Each rack feeds 3–4 people."
  }
];

const SIDES: MenuItem[] = [
  {
    name: "Doctored Mashed Potatoes",
    price: "$20 / pan",
    description: "Creamy and cheesy with a hint of smoked gouda. These aren't your everyday mashed potatoes."
  },
  {
    name: "Cheesy Potatoes",
    price: "$20 / pan",
    description: "Sliced potatoes with bacon, smothered in melted cheese."
  },
  {
    name: "Baked Beans",
    price: "$20 / pan",
    description: "Sweet baked beans with plenty of extra bacon. A great combo all around."
  },
  {
    name: "Side Salad",
    price: "$20 / pan",
    description: "Mixed greens with cherry tomatoes. Comes with ranch dressing."
  },
  {
    name: "Dinner Rolls",
    price: "$12 / dozen",
    description: "Soft rolls that will have you coming back for more. Comes with whipped honey butter."
  },
  {
    name: "Cornbread Muffins",
    price: "$12 / dozen",
    description: "Golden muffins with a crisp outside and fluffy interior. Comes with whipped honey butter."
  }
];

const DESSERTS: MenuItem[] = [
  {
    name: "Cheesecake",
    price: "$40 / cake",
    description: "Smooth cheesecake with a graham cracker crust. One topping choice per cake, up to 3 cakes."
  },
  {
    name: "Texas Sheet Cake",
    price: "$30 / cake",
    description: "A moist and rich chocolate cake that blurs the line between fudgy brownie and moist cake."
  }
];

const MEAL_PACKAGES: PackageTier[] = [
  {
    name: "Basic",
    price: "$15 / person",
    included: ["Choice of 2 meats", "2 sides", "Dinner rolls"]
  },
  {
    name: "Plus",
    price: "$18 / person",
    included: ["Choice of 3 meats", "2 sides", "Dinner rolls"]
  },
  {
    name: "Ultra",
    price: "$21 / person",
    included: ["Choice of 3 meats", "2 sides", "Dinner rolls", "Dessert"]
  }
];

const SANDWICHES: PackageTier[] = [
  {
    name: "Basic",
    price: "$12 / person",
    included: ["Choice of 1 meat", "Chips"]
  },
  {
    name: "Plus",
    price: "$15 / person",
    included: ["Choice of 2 meats", "1 side", "Chips"]
  },
  {
    name: "Ultra",
    price: "$18 / person",
    included: ["Choice of 2 meats", "1 side", "Chips", "Dessert"]
  }
];

const POTATO_BOWLS: PackageTier[] = [
  {
    name: "Basic",
    price: "$14 / person",
    included: ["Choice of 1 meat"]
  },
  {
    name: "Plus",
    price: "$16 / person",
    included: ["Choice of 2 meats", "Dinner rolls"]
  },
  {
    name: "Ultra",
    price: "$19 / person",
    included: ["Choice of 3 meats", "Dinner rolls"]
  }
];

function MenuItemCard({ item }: { item: MenuItem }) {
  return (
    <div className="rounded-md border border-[#3a2a20] bg-[#1c140f] p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-smoke-900" style={fontDisplay}>{item.name}</p>
        <p className="shrink-0 text-sm font-semibold text-[#f0c16a]">{item.price}</p>
      </div>
      <p className="mt-1 text-sm text-smoke-700">{item.description}</p>
    </div>
  );
}

function PackageTierCard({ tier }: { tier: PackageTier }) {
  return (
    <div className="rounded-md border border-[#3a2a20] bg-[#1c140f] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f0c16a]">
        {tier.name}
      </p>
      <p className="mt-2 text-xl font-semibold text-smoke-900" style={fontDisplay}>
        {tier.price}
      </p>
      <ul className="mt-2 space-y-1 text-sm text-smoke-800">
        {tier.included.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

const EVENT_TYPES = [
  "Weddings",
  "Family Reunions",
  "Corporate Lunches",
  "Rodeos",
  "Backyard Dinners",
  "Birthday Parties",
];

export default function CateringPage() {
  return (
    <section className="section-spacing mx-auto max-w-5xl">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f0c16a]">
          Catering by Big Matt&apos;s BBQ
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-smoke-900 md:text-5xl" style={fontDisplay}>
          Your guests rave about the food.<br className="hidden sm:block" /> You stress about nothing.
        </h1>
        <p className="mt-5 mx-auto max-w-2xl text-base text-smoke-700 leading-relaxed">
          Big Matt&apos;s BBQ has catered weddings, family reunions, rodeos, and corporate lunches
          across Utah. One point of contact, clear per-person pricing, and BBQ cooked fresh the
          day of your event — low and slow, no shortcuts.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {EVENT_TYPES.map((type) => (
          <span
            key={type}
            className="rounded-full border border-[#3a2a20] bg-[#1c140f] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-smoke-700"
          >
            {type}
          </span>
        ))}
      </div>

      <div className="mt-8 text-center">
        <a href={`mailto:${CATERING_EMAIL}`} className="button-primary">
          Email for Catering
        </a>
      </div>

      <div className="mt-6 glass-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f0c16a]">
          Group Orders
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-smoke-900" style={fontDisplay}>
          Leave the Planning to Us
        </h2>
        <p className="mt-3 text-sm text-smoke-700">
          All group orders include plates, utensils, and flatware. Orders over $500 come with two
          hours of buffet service — setup, replenishment, and teardown included. Adding brisket as a
          meat choice adds $2 per person.
        </p>

        <div className="mt-8">
          <h3 className="text-xl font-semibold text-smoke-900" style={fontDisplay}>
            Meal Packages
          </h3>
          <p className="mt-1 text-sm text-smoke-700">
            A full family-style spread with perfectly cooked meats, classic sides, fresh bread, and
            dessert.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {MEAL_PACKAGES.map((pkg) => (
              <PackageTierCard key={pkg.name} tier={pkg} />
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-[#3a2a20] pt-8">
          <h3 className="text-xl font-semibold text-smoke-900" style={fontDisplay}>
            Sandwiches
          </h3>
          <p className="mt-1 text-sm text-smoke-700">
            Soft buns filled with smoked meat, tangy sauce, and crisp pickles. One sandwich per
            person.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {SANDWICHES.map((pkg) => (
              <PackageTierCard key={pkg.name} tier={pkg} />
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-[#3a2a20] pt-8">
          <h3 className="text-xl font-semibold text-smoke-900" style={fontDisplay}>
            Mashed Potato Bowls
          </h3>
          <p className="mt-1 text-sm text-smoke-700">
            Our doctored mashed potatoes as the base, topped with your choice of meat. Customize
            with shredded cheese, savory sauce, green onions, pickled jalapeños, and sweet corn.
            Each bowl is packed and ready to enjoy on the go.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {POTATO_BOWLS.map((pkg) => (
              <PackageTierCard key={pkg.name} tier={pkg} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 glass-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f0c16a]">
          À La Carte
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-smoke-900" style={fontDisplay}>
          Order It Your Way
        </h2>

        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-smoke-600">
            Meats
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {MEATS.map((meat) => (
              <MenuItemCard key={meat.name} item={meat} />
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-[#3a2a20] pt-8">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-smoke-600">
              Sides
            </h3>
            <span className="text-xs text-smoke-600">Pans serve 15–20 people</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {SIDES.map((side) => (
              <MenuItemCard key={side.name} item={side} />
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-[#3a2a20] pt-8">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-smoke-600">
            Desserts
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {DESSERTS.map((dessert) => (
              <MenuItemCard key={dessert.name} item={dessert} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.45em] text-[#f0c16a]">FAQs</p>
          <div className="section-title-wrap mt-3">
            <span className="section-title-line hidden md:block" />
            <h2 className="text-2xl font-semibold text-smoke-900 md:text-3xl" style={fontDisplay}>
              Everything you need to know
            </h2>
            <span className="section-title-line hidden md:block" />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <details className="glass-card px-5 py-4">
          <summary className="cursor-pointer text-sm font-semibold text-smoke-800">
            Pricing Notes
          </summary>
          <ul className="mt-3 space-y-2 text-sm text-smoke-600">
            <li>• Delivery orders are subject to a 40–60¢ per mile charge depending on order size.</li>
            <li>• A 50% deposit is due 14 days before your event date. This deposit is non-refundable.</li>
            <li>• All listed prices exclude taxes and card processing fees.</li>
          </ul>
        </details>

        <details className="glass-card px-5 py-4">
          <summary className="cursor-pointer text-sm font-semibold text-smoke-800">
            How far in advance?
          </summary>
          <p className="mt-3 text-sm text-smoke-600">
            We ask for at least two weeks&apos; notice so we can plan the smoke schedule and source
            the right quantities. Larger events (75+ guests) are best booked a month out.
          </p>
        </details>

        <details className="glass-card px-5 py-4">
          <summary className="cursor-pointer text-sm font-semibold text-smoke-800">
            Where we cater
          </summary>
          <p className="mt-3 text-sm text-smoke-600">
            Cache Valley, Utah County, and Salt Lake County. If your event is outside this radius,
            email us — we may be able to make it work for the right event.
          </p>
        </details>
      </div>

      <div className="mt-10 text-center">
        <a href={`mailto:${CATERING_EMAIL}`} className="button-primary">
          Email for Catering
        </a>
      </div>
    </section>
  );
}
