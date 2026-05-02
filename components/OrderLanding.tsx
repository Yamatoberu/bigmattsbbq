"use client";

import { useMemo, useState, type FormEvent } from "react";
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
  const { items: cartItems, addItem, addItems, setPackage } = useCart();
  const { drop } = useActiveDrop(initialDrop);
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

  const bundleVariationIds = useMemo(() => {
    const ids = new Set<string>();
    for (const pkg of PACKAGES) {
      if (pkg.bundleVariationId) ids.add(pkg.bundleVariationId);
    }
    return ids;
  }, []);

  const individualItems = useMemo(
    () => frozenItems.filter((item) => !item.variations.some((v) => bundleVariationIds.has(v.variationId))),
    [frozenItems, bundleVariationIds]
  );

  type MailingListState = "idle" | "submitting" | "success" | "error";
  const [mlEmail, setMlEmail] = useState("");
  const [mlState, setMlState] = useState<MailingListState>("idle");
  const [mlError, setMlError] = useState<string | undefined>(undefined);

  async function handleMailingListSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mlState === "submitting") return;
    setMlState("submitting");
    setMlError(undefined);
    try {
      const response = await fetch("/api/mailing-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mlEmail })
      });
      if (!response.ok) throw new Error("request failed");
      setMlState("success");
    } catch {
      setMlState("error");
      setMlError("Something went wrong. Try again in a moment.");
    }
  }

  if (!drop || drop.status !== "active") {
    return (
      <main className="bg-ember-radial bg-grain">
        <section className="hero-panel">
          <div className="hero-content mx-auto max-w-5xl text-center">
            <span className="badge">Next Drop</span>
            <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
              Be first to know when the next drop opens.
            </h1>
            {mlState === "success" ? (
              <p className="mt-4 text-sm font-semibold text-[#f0c16a]">
                You&apos;re on the list! We&apos;ll let you know about the next drop.
              </p>
            ) : (
              <form
                className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center"
                onSubmit={handleMailingListSubmit}
                noValidate
              >
                <input
                  type="email"
                  required
                  value={mlEmail}
                  onChange={(event) => setMlEmail(event.target.value)}
                  placeholder="your@email.com"
                  className="input-field sm:w-72"
                  aria-label="Email address"
                  disabled={mlState === "submitting"}
                />
                <button
                  type="submit"
                  className="button-primary px-6 py-3 text-sm"
                  disabled={mlState === "submitting" || mlEmail.length === 0}
                >
                  {mlState === "submitting" ? "…" : "Notify Me"}
                </button>
              </form>
            )}
            {mlState === "error" && mlError && (
              <p className="mt-3 text-sm text-ember-300" role="alert">
                {mlError}
              </p>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-ember-radial bg-grain">
      <section className="hero-panel">
        <div className="hero-content mx-auto max-w-5xl text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="badge">{drop.title}</span>
            {drop.orderCutoffAt && (
              <span className="badge bg-[#b31414] text-white">
                Orders close {formatDenverDateTime(drop.orderCutoffAt)}
              </span>
            )}
          </div>
          <h1 className="mt-4 text-3xl font-semibold leading-tight md:text-5xl" style={{ fontFamily: "var(--font-display)" }}>
Orders are open!
          </h1>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {drop.pickupOptions.map((opt) => (
              <span key={opt.id} className="badge">{opt.locationLabel}</span>
            ))}
          </div>
        </div>
      </section>

      <section id="order" className="section-spacing bg-[#120c09]">
        <div className="mx-auto max-w-5xl">
          <SectionHeader
            title="Choose Your Drop"
            subtitle="Start with a package or build your own."
          />
          <div className="grid gap-6 md:grid-cols-3">
            {PACKAGES.map((pkg) => {
              const hasBundleVariation = Boolean(pkg.bundleVariationId && variationMap.has(pkg.bundleVariationId));
              const bundleRemaining = pkg.bundleVariationId ? (variationMap.get(pkg.bundleVariationId)?.remaining ?? 0) : 0;
              const resolved = hasBundleVariation ? [] : resolvePackageToCartItems(pkg, frozenItems);
              const canAdd = hasBundleVariation || resolved.length === pkg.items.length;
              const inStock = hasBundleVariation
                ? bundleRemaining > 0
                : resolved.every((item) => (variationMap.get(item.variationId)?.remaining ?? 0) > 0);
              return (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  onAdd={() => {
                    if (pkg.bundleVariationId) {
                      addItem({ variationId: pkg.bundleVariationId, quantity: 1 });
                    } else {
                      addItems(resolved);
                    }
                    setPackage(pkg.id);
                  }}
                  soldOut={canAdd && !inStock}
                  isDisabled={!canAdd || isLoading || Boolean(error)}
                />
              );
            })}
          </div>
          {estimatedTotalCents > 0 && (
            <div className="mt-8 text-xs uppercase tracking-[0.3em] text-smoke-700">
              Estimated total: {formatMoney(estimatedTotalCents)}
            </div>
          )}
        </div>
      </section>

      <section className="section-spacing">
        <div className="mx-auto max-w-5xl">
          <SectionHeader
            eyebrow="Individual Items"
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
              {individualItems.map((item) => {
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
            eyebrow="Social Proof"
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
