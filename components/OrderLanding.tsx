"use client";

import { useMemo } from "react";
import Link from "next/link";
import { SectionHeader } from "./SectionHeader";
import { PackageCard } from "./PackageCard";
import { FrozenItemCard } from "./FrozenItemCard";
import { Testimonials } from "./Testimonials";
import { Faq } from "./Faq";
import { CateringSection } from "./CateringSection";
import { MailingListSection } from "./MailingListSection";
import { useFrozenItems } from "./hooks/useFrozenItems";
import { useActiveDrop } from "./hooks/useActiveDrop";
import { useCart } from "./cart/CartContext";
import { PACKAGES } from "../lib/config";
import { formatDenverDateTime, formatMoney } from "../lib/format";
import { resolvePackageToCartItems } from "../lib/cart";
import { DropDTO } from "../lib/types";

export function OrderLanding({ initialDrop }: { initialDrop: DropDTO | null }) {
  const { items: frozenItems, isLoading, error, reload } = useFrozenItems();
  const { items: cartItems, addItem, addItems } = useCart();
  const { drop } = useActiveDrop(initialDrop);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const variationMap = useMemo(() => {
    const map = new Map<string, { priceCents: number; currency: string; remaining: number }>();
    for (const item of frozenItems) {
      for (const variation of item.variations) {
        map.set(variation.variationId, {
          priceCents: variation.priceCents,
          currency: variation.currency,
          remaining: variation.remaining
        });
      }
    }
    return map;
  }, [frozenItems]);

  const estimatedTotalCents = cartItems.reduce((sum, item) => {
    const info = variationMap.get(item.variationId);
    return sum + (info?.priceCents ?? 0) * item.quantity;
  }, 0);

  if (!drop || drop.status !== "active") {
    return (
      <main className="bg-ember-radial bg-grain">
        <section className="px-4 pb-10 pt-6 md:px-10">
          <div className="mx-auto max-w-3xl">
            <div className="hero-panel">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_10%,rgba(255,255,255,0.3),transparent_55%)]" aria-hidden />
              <div className="hero-content text-center">
                <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl" style={{ fontFamily: "var(--font-display)" }}>
                  Next Drop Coming Soon
                </h1>
                <p className="mt-6 text-base text-[#f3e7d8]">
                  Join the list and we&apos;ll notify you the moment a new drop opens.
                </p>
                <form
                  className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
                  onSubmit={(event) => event.preventDefault()}
                >
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="input-field sm:w-72"
                    aria-label="Email address"
                  />
                  <button type="submit" className="button-primary px-6 py-3 text-sm">
                    Notify Me
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-ember-radial bg-grain">
      <section className="px-4 pb-10 pt-6 md:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="hero-panel">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_10%,rgba(255,255,255,0.3),transparent_55%)]" aria-hidden />
            <div className="hero-content">
              <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl" style={{ fontFamily: "var(--font-display)" }}>
                Pit-Smoked Barbecue.
                <br />
                Ready in 30 Minutes.
              </h1>
              <div className="mt-4 space-y-1 text-sm text-[#f3e7d8] md:text-base">
                <p>Small-batch brisket and pulled pork.</p>
                <p>Fully smoked and vacuum sealed.</p>
                <p>Heat, slice, serve.</p>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/checkout"
                  className="button-secondary relative inline-flex items-center justify-center px-5 py-3 text-sm"
                  aria-label={`Review cart with ${cartCount} items`}
                >
                  Review Cart
                  {cartCount > 0 && (
                    <span className="absolute -right-2.5 -top-2.5 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[#b31414] px-1.5 text-xs font-semibold text-white shadow">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.35em] text-[#d9c7b3]">
                {drop.title}
                {drop.orderCutoffAt && (
                  <> — Orders close {formatDenverDateTime(drop.orderCutoffAt)}</>
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="order" className="section-spacing bg-[#120c09]">
        <div className="mx-auto max-w-5xl">
          <SectionHeader
            eyebrow="Step 1"
            title="Choose Your Drop"
            subtitle="Start with a package or build your own."
          />
          <div className="grid gap-6 md:grid-cols-3">
            {PACKAGES.map((pkg) => {
              const resolved = resolvePackageToCartItems(pkg, frozenItems);
              const available =
                resolved.length === pkg.items.length &&
                resolved.every((item) => (variationMap.get(item.variationId)?.remaining ?? 0) > 0);
              return (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  onAdd={() => addItems(resolved)}
                  isDisabled={!available || isLoading || Boolean(error)}
                />
              );
            })}
          </div>
          <div className="mt-8 text-xs uppercase tracking-[0.3em] text-smoke-700">
            Estimated total: {formatMoney(estimatedTotalCents)}
          </div>
        </div>
      </section>

      <section className="section-spacing">
        <div className="mx-auto max-w-5xl">
          <SectionHeader
            eyebrow="Build Your Own"
            title="Build Your Own"
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
              {frozenItems.map((item) => {
                const nameLower = item.name.toLowerCase();
                const itemSoldOut =
                  (nameLower.includes("pulled pork") && drop.soldOut.pulledPork) ||
                  (nameLower.includes("brisket") && drop.soldOut.brisket);
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

      <section className="section-spacing bg-[#120c09]">
        <div className="mx-auto max-w-5xl">
          <SectionHeader
            eyebrow="Social proof"
            title="Trusted by BBQ Lovers Across Utah County"
            subtitle="Real talk from customers stocking their freezers."
          />
          <Testimonials />
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

      <MailingListSection />

      <section className="section-spacing bg-[#0f0b08]">
        <div className="mx-auto max-w-5xl">
          <SectionHeader
            eyebrow="Catering"
            title="Event-ready BBQ"
            subtitle="Simple pricing tiers and a direct line to us."
          />
          <CateringSection showFullMenuLink />
        </div>
      </section>
    </main>
  );
}
