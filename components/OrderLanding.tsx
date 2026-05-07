"use client";

import Link from "next/link";
import { useMemo } from "react";
import { SectionHeader } from "./SectionHeader";
import { PackageCard } from "./PackageCard";
import { FrozenItemCard } from "./FrozenItemCard";
import { Testimonials } from "./Testimonials";
import { Faq } from "./Faq";
import { MailingListSection } from "./MailingListSection";
import { useFrozenItems } from "./hooks/useFrozenItems";
import { useActiveDrop } from "./hooks/useActiveDrop";
import { useCart } from "./cart/CartContext";
import { PACKAGES } from "../lib/config";
import { formatDenverDateTime, formatMoney } from "../lib/format";
import { resolvePackageToCartItems } from "../lib/cart";
import { DropDTO } from "../lib/types";
import { CountdownTimer } from "./CountdownTimer";

export function OrderLanding({ initialDrop }: { initialDrop: DropDTO | null }) {
  const { items: frozenItems, isLoading, error, reload } = useFrozenItems();
  const { items: cartItems, addItem, addItems, setPackage } = useCart();
  const { drop } = useActiveDrop(initialDrop);
  const variationMap = useMemo(() => {
    const map = new Map<string, { priceCents: number; currency: string }>();
    for (const item of frozenItems) {
      for (const variation of item.variations) {
        map.set(variation.variationId, {
          priceCents: variation.priceCents,
          currency: variation.currency
        });
      }
    }
    return map;
  }, [frozenItems]);

  const estimatedTotalCents = cartItems.reduce((sum, item) => {
    const info = variationMap.get(item.variationId);
    return sum + (info?.priceCents ?? 0) * item.quantity;
  }, 0);

  const bundleItemNames = useMemo(() => PACKAGES.map((p) => p.name.toLowerCase()), []);

  const individualItems = useMemo(
    () => frozenItems.filter((item) => !bundleItemNames.some((name) => item.name.toLowerCase().includes(name))),
    [frozenItems, bundleItemNames]
  );

  return (
    <div className="bg-ember-radial bg-grain">
      {(!drop || drop.status !== "active") && <MailingListSection />}

      {drop && drop.status === "active" && (
        <section className="hero-panel">
          <div className="hero-content mx-auto max-w-5xl text-center">
            <div className="inline-flex overflow-hidden rounded-lg mx-auto" style={{
              background: "#130e0b",
              border: "1px solid #2e1a10",
              boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(179,20,20,0.12)",
            }}>
              <div className="w-[3px] self-stretch bg-[#c01818]" />
              <div className="px-6 py-4 text-left">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.35em] text-[#f0b8a8]">
                  {drop.title} — Orders Open
                </p>
                {drop.orderCutoffAt && (
                  <div className="mt-2 flex items-baseline gap-3">
                    <span className="text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-[#c08878]">
                      Window Closes In
                    </span>
                    <CountdownTimer
                      deadline={drop.orderCutoffAt}
                      fallbackLabel={formatDenverDateTime(drop.orderCutoffAt)}
                      bare
                    />
                  </div>
                )}
              </div>
            </div>
            <h1 className="mt-4 text-3xl font-semibold leading-tight md:text-5xl" style={{ fontFamily: "var(--font-display)" }}>
              Real Pit-Smoked BBQ —<br className="hidden sm:block" /> Straight to Your Freezer.
            </h1>
            <p className="mt-3 text-base text-smoke-700 md:text-lg">
              Brisket and pulled pork smoked low and slow for 12–14 hours, vacuum-sealed at peak flavor, and ready to heat any night of the week.
            </p>
            <ul aria-label="Pickup locations" className="mt-3 flex list-none flex-wrap items-center justify-center gap-2 p-0">
              {drop.pickupOptions.map((opt) => (
                <li key={opt.id} className="badge">{opt.locationLabel}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="px-6 pt-3 pb-6 md:px-12">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeader
            title="Straight Off the Pit"
            subtitle="No shortcuts. Just smoke, time, and heat."
          />
          <p className="text-base leading-relaxed text-smoke-700 md:text-lg">
            Every batch starts the night before. Pulled pork and brisket go on the smoker around midnight — cherry, oak, and pecan wood — and come off 12 to 14 hours later. Vacuum-sealed at peak flavor and frozen within hours of leaving the pit. The result: a Tuesday dinner that tastes like a weekend cookout. No restaurant markup. No grill. Just heat and eat.
          </p>
        </div>
      </section>

      <section className="px-6 pt-4 pb-8 md:px-12">
        <div className="mx-auto max-w-5xl">
          <SectionHeader
            title="What People Are Saying"
            subtitle="Real reviews from real customers."
          />
          <Testimonials variant="strip" />
        </div>
      </section>

      {drop && drop.status === "active" && (
        <section id="order" className="section-spacing bg-pit-surface">
          <div className="mx-auto max-w-5xl">
            <SectionHeader
              title="Choose Your Drop"
              subtitle="Start with a package or build your own."
            />
            <div className="grid gap-6 md:grid-cols-3">
              {PACKAGES.map((pkg) => {
                const resolved = resolvePackageToCartItems(pkg, frozenItems);
                const canAdd = resolved.length === pkg.items.length;
                const pkgSoldOutMap: Record<string, boolean> = {
                  "family-night": drop.soldOut.familyNight,
                  "backyard-host": drop.soldOut.backyardHost,
                  "freezer-filler": drop.soldOut.freezerFiller
                };
                const pkgSoldOut = drop.capacityEnforced ? (pkgSoldOutMap[pkg.id] ?? false) : false;
                return (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    onAdd={() => {
                      addItems(resolved);
                      setPackage(pkg.id);
                    }}
                    soldOut={pkgSoldOut}
                    isDisabled={!canAdd || isLoading || Boolean(error)}
                  />
                );
              })}
            </div>
            {estimatedTotalCents > 0 && (
              <p className="mt-8 text-xs uppercase tracking-[0.3em] text-smoke-700">
                Estimated total: {formatMoney(estimatedTotalCents)}
              </p>
            )}
          </div>
        </section>
      )}

      {drop && drop.status === "active" && (
        <section className="section-spacing">
          <div className="mx-auto max-w-5xl">
            <SectionHeader
              eyebrow="Build Your Own"
              title="Individual Items"
              subtitle="Mix and match individual items while supplies last."
            />
            {error && (
              <div className="glass-card border border-ember-400 bg-[#1a120e] p-4 text-sm text-ember-200">
                {error}
                <button className="button-secondary ml-3 text-xs" onClick={reload}>
                  Retry
                </button>
              </div>
            )}
            {isLoading ? (
              <p className="text-sm text-smoke-500">Loading frozen menu...</p>
            ) : (
              <div className="mt-6 grid gap-5 md:grid-cols-3">
                {individualItems.map((item) => {
                  const nameLower = item.name.toLowerCase();
                  const itemSoldOut = drop.capacityEnforced && (
                    (nameLower.includes("pulled pork") && drop.soldOut.pulledPork) ||
                    (nameLower.includes("brisket") && drop.soldOut.brisket) ||
                    (nameLower.includes("sauce") && drop.soldOut.sauce)
                  );
                  return (
                    <FrozenItemCard
                      key={item.itemId}
                      item={item}
                      onAdd={(variationId) => addItem({ variationId, quantity: 1 })}
                      soldOut={itemSoldOut}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="section-spacing bg-pit-surface">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-300">
            Catering
          </p>
          <h2
            className="mt-4 text-3xl font-semibold text-smoke-900"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Feeding a crowd?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-smoke-700">
            We cater events across Utah — weddings, reunions, corporate lunches, rodeos. Simple per-person pricing and the same low-and-slow brisket and pulled pork you get from the drops.
          </p>
          <Link
            href="/catering"
            className="mt-6 inline-block text-sm font-semibold text-gold-300 underline-offset-4 hover:underline"
          >
            See Catering Packages →
          </Link>
        </div>
      </section>

      <section className="section-spacing">
        <div className="mx-auto max-w-4xl">
          <SectionHeader
            eyebrow="FAQs"
            title="Everything you need to know"
            subtitle="Short answers before you lock in your order."
          />
          <Faq />
        </div>
      </section>

      <section className="section-spacing bg-pit-surface">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-300">
            The Pitmaster
          </p>
          <h2
            className="mt-4 text-3xl font-semibold text-smoke-900"
            style={{ fontFamily: "var(--font-display)" }}
          >
            One smoker. Twelve-hour cooks. Real BBQ.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-smoke-700">
            Big Matt&apos;s BBQ started as a Covid hobby — watching <em>BBQ Pitmasters</em>, then cooking
            for friends, then requests to pay for it. One thing led to another: catering events, family
            reunions, rodeos. Eventually, frozen drops. One-man operation out of Springville, Utah,
            cooking every batch low and slow with no shortcuts.
          </p>
          <a
            href="/about"
            className="mt-6 inline-block text-sm font-semibold text-gold-300 underline-offset-4 hover:underline"
          >
            Read the full story →
          </a>
        </div>
      </section>

      {drop && drop.status === "active" && <MailingListSection />}
    </div>
  );
}
