export const metadata = {
  title: "About Big Matt's BBQ",
  description: "The story behind Big Matt's BBQ — pit-smoked, small-batch, Utah-raised."
};

const fontDisplay = { fontFamily: "var(--font-display)" };

export default function AboutPage() {
  return (
    <section className="section-spacing mx-auto max-w-2xl">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f0c16a]">
          The Story
        </p>
        <h1 className="mt-2 text-4xl font-semibold text-smoke-900" style={fontDisplay}>
          About Big Matt&apos;s BBQ
        </h1>
        <p className="mt-4 text-base text-smoke-700 leading-relaxed">
          One-man operation out of Springville, Utah. Backyard roots, real pit smokes, and a
          simple goal: get great BBQ into your freezer.
        </p>
      </header>

      <div className="mt-10 space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f0c16a]">
            How It Started
          </p>
          <h2 className="mt-1 text-xl font-semibold text-smoke-900" style={fontDisplay}>
            From Screen to Smoker
          </h2>
          <p className="mt-3 text-base text-smoke-700 leading-relaxed">
            It started with a TV obsession. Watching <em>BBQ Pitmasters</em> on Discovery Channel
            planted the seed — but it was Covid that finally gave Matt the time to pursue it.
            Cooking for friends and family turned into requests to pay for it, which led to catering
            orders, then events: weddings, family reunions, rodeos. Eventually, frozen drops. The
            journey has been great.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f0c16a]">
            The Craft
          </p>
          <h2 className="mt-1 text-xl font-semibold text-smoke-900" style={fontDisplay}>
            Low &amp; Slow, No Shortcuts
          </h2>
          <p className="mt-3 text-base text-smoke-700 leading-relaxed">
            Pulled pork and brisket are the heart of the menu — cooked over cherry, oak, and pecan
            on a Traeger Ironwood 885 or an Ol&apos; Hickory CTO. Most cooks run 12–14 hours. The
            recipe matters more than the method, and if time allows, it&apos;s cooked a full day
            ahead. No rushing it.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f0c16a]">
            Why Drops?
          </p>
          <h2 className="mt-1 text-xl font-semibold text-smoke-900" style={fontDisplay}>
            Freshness by Design
          </h2>
          <p className="mt-3 text-base text-smoke-700 leading-relaxed">
            The drop model exists because of freshness. Every batch is smoked to order — no standing
            freezer inventory, no leftovers from last month&apos;s cook. When a drop opens, the smoke
            schedule, capacity, and pickup windows are already planned. When it closes, prep for the
            next one begins. Pickups run out of Utah County (Orem), Salt Lake County (Sandy), and
            Cache Valley (Preston, ID).
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f0c16a]">
            Reheating
          </p>
          <h2 className="mt-1 text-xl font-semibold text-smoke-900" style={fontDisplay}>
            Already Cooked. You Just Heat It.
          </h2>
          <p className="mt-3 text-base text-smoke-700 leading-relaxed">
            Everything ships vacuum-sealed and fully pre-cooked. In a hurry? Thaw and eat. For
            the closest-to-fresh-from-the-pit result, reheat by boiling in the bag — it comes out
            nearly as good as the day it left the smoker.
          </p>
        </div>
      </div>

      <section aria-labelledby="about-matt-heading" className="mt-10 border-t border-[#3a2a20] pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f0c16a]">
          The Pitmaster
        </p>
        <h2 id="about-matt-heading" className="mt-1 text-xl font-semibold text-smoke-900" style={fontDisplay}>
          Matt Gregory
        </h2>
        <p className="mt-3 text-sm text-smoke-600 leading-relaxed">
          Matt Gregory grew up in Preston, Idaho and moved to Salt Lake City in 2017 to start a
          career in software — first QA, now development. He&apos;s called Utah County home since
          2018, alongside his wife Becky, whose support has been the backbone of every cook. The
          long-term goal: make BBQ the main gig and let software become the side hustle.
        </p>
      </section>
    </section>
  );
}
