"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "./cart/CartContext";
import { useFrozenItems } from "./hooks/useFrozenItems";
import { useAttributionSources } from "./hooks/useAttributionSources";
import { formatMoney } from "../lib/format";
import { isSauceBumpNeeded } from "../lib/cart";
import { PACKAGES } from "../lib/config";
import { DropDTO } from "../lib/types";

interface CheckoutClientProps {
  sauceVariationId: string;
  drop: DropDTO;
}

const ATTRIBUTION_DETAIL_LABELS: Record<string, string> = {
  ai: "Which AI? (optional)",
  event: "Which event? (optional)",
  other: "Tell us more (optional)"
};

const ATTRIBUTION_DETAIL_FALLBACK_LABEL = "Tell us more (optional)";

function normalizeMatch(value: string) {
  return value.trim().toLowerCase();
}

export function CheckoutClient({ sauceVariationId, drop }: CheckoutClientProps) {
  const router = useRouter();
  const { items, setQuantity, addItem, clear, selectedPackageId } = useCart();
  const { items: frozenItems, isLoading } = useFrozenItems();
  const { sources: attributionSources, error: attributionSourcesError } = useAttributionSources();
  const firstAvailable = drop.pickupOptions.find((o) => !o.isSoldOut);
  const [pickupOptionId, setPickupOptionId] = useState<string | undefined>(firstAvailable?.id);
  const [formState, setFormState] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    attributionSourceCode: "",
    attributionDetail: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const variationMap = useMemo(() => {
    const map = new Map<string, { name: string; priceCents: number; currency: string }>();
    for (const item of frozenItems) {
      for (const variation of item.variations) {
        map.set(variation.variationId, {
          name: `${item.name} · ${variation.name}`,
          priceCents: variation.priceCents,
          currency: variation.currency
        });
      }
    }
    return map;
  }, [frozenItems]);

  const bundleVariationIdToInfo = useMemo(() => {
    const map = new Map<string, { name: string; priceCents: number; currency: string }>();
    for (const pkg of PACKAGES) {
      const catalogItem = frozenItems.find((item) => normalizeMatch(item.name) === normalizeMatch(pkg.catalogName));
      if (!catalogItem) {
        console.warn(`[CheckoutClient] bundleVariationIdToInfo: no catalog item found for catalogName "${pkg.catalogName}"`);
      }
      const variation = catalogItem?.variations[0];
      if (variation) {
        map.set(variation.variationId, {
          name: pkg.name,
          priceCents: variation.priceCents,
          currency: variation.currency
        });
      }
    }
    return map;
  }, [frozenItems]);

  const productNameMap = useMemo(() => {
    const map = new Map<string, "pulled_pork" | "brisket" | "sauce" | "family_night" | "backyard_host" | "freezer_filler">();
    for (const item of frozenItems) {
      const slug = item.name.toLowerCase().replace(/\s+/g, "_");
      if (slug === "pulled_pork" || slug === "brisket") {
        for (const variation of item.variations) {
          map.set(variation.variationId, slug);
        }
      } else if (normalizeMatch(item.name).includes("sauce")) {
        for (const variation of item.variations) {
          map.set(variation.variationId, "sauce");
        }
      }
    }
    for (const pkg of PACKAGES) {
      const catalogItem = frozenItems.find((item) => normalizeMatch(item.name) === normalizeMatch(pkg.catalogName));
      if (!catalogItem) {
        console.warn(`[CheckoutClient] productNameMap: no catalog item found for catalogName "${pkg.catalogName}"`);
      }
      const variation = catalogItem?.variations[0];
      if (variation) {
        const pkgId = pkg.id as "family-night" | "backyard-host" | "freezer-filler";
        const productName = pkgId === "family-night" ? "family_night"
          : pkgId === "backyard-host" ? "backyard_host"
          : "freezer_filler";
        map.set(variation.variationId, productName);
      }
    }
    return map;
  }, [frozenItems]);

  const sauceVariationIds = useMemo(() => {
    const ids = new Set<string>([sauceVariationId].filter(Boolean));
    for (const item of frozenItems) {
      if (normalizeMatch(item.name).includes("sauce")) {
        for (const variation of item.variations) {
          ids.add(variation.variationId);
        }
      }
    }
    return Array.from(ids);
  }, [frozenItems, sauceVariationId]);

  const sauceAddVariationId = useMemo(() => {
    if (variationMap.has(sauceVariationId)) {
      return sauceVariationId;
    }
    const inMap = sauceVariationIds.find((variationId) => variationMap.has(variationId));
    return inMap ?? sauceVariationIds[0];
  }, [sauceVariationId, sauceVariationIds, variationMap]);

  const cartDetails = items.map((item) => {
    const info = variationMap.get(item.variationId);
    const bundleInfo = bundleVariationIdToInfo.get(item.variationId);
    return {
      ...item,
      name: info?.name ?? bundleInfo?.name ?? "Item",
      priceCents: info?.priceCents ?? bundleInfo?.priceCents ?? 0,
      currency: info?.currency ?? bundleInfo?.currency ?? "USD"
    };
  });

  const estimatedTotalCents = cartDetails.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0
  );

  const needsSauce = isSauceBumpNeeded(items, sauceVariationIds);

  const selectedAttributionSource = attributionSources.find(
    (source) => source.code === formState.attributionSourceCode
  );
  const showAttributionDetail = Boolean(selectedAttributionSource?.requiresDetail);
  const attributionDetailLabel =
    ATTRIBUTION_DETAIL_LABELS[formState.attributionSourceCode] ?? ATTRIBUTION_DETAIL_FALLBACK_LABEL;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);

    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (!pickupOptionId) {
      setError("Please select a pickup option.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          dropId: drop.id,
          pickupOptionId,
          packageId: selectedPackageId,
          customer: {
            firstName: formState.firstName,
            lastName: formState.lastName,
            email: formState.email,
            phone: formState.phone || undefined,
            attributionSourceCode: formState.attributionSourceCode || undefined,
            attributionDetail: formState.attributionDetail || undefined
          },
          cart: items.map((item) => ({
            variationId: item.variationId,
            quantity: item.quantity,
            ...(productNameMap.get(item.variationId) ? { productName: productNameMap.get(item.variationId) } : {})
          }))
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Checkout failed");
      }

      const payload = await response.json();
      clear();
      router.push(
        `/confirmation?orderId=${encodeURIComponent(payload.orderId)}&pickupNote=${encodeURIComponent(
          payload.pickupNote
        )}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Checkout failed";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="section-spacing">
      <div className="mx-auto max-w-3xl space-y-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-ember-500">Step 2</p>
          <h1 className="mt-3 text-3xl font-semibold text-smoke-900 md:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
            Review &amp; Checkout
          </h1>
          <p className="mt-3 text-sm text-smoke-600">
            Confirm your order, choose pickup, and we&apos;ll email an invoice immediately.
          </p>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-smoke-900">Order Summary</h2>
          {items.length === 0 ? (
            <p className="mt-4 text-sm text-smoke-500">Your cart is empty.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {cartDetails.map((item) => (
                <div key={item.variationId} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-smoke-800">{item.name}</p>
                    <p className="text-xs font-medium text-ember-400">
                      {formatMoney(item.priceCents, item.currency)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="button-secondary px-3 py-2 text-xs"
                      onClick={() => setQuantity(item.variationId, item.quantity - 1)}
                    >
                      -
                    </button>
                    <span className="text-sm font-semibold text-smoke-800">{item.quantity}</span>
                    <button
                      className="button-secondary px-3 py-2 text-xs"
                      onClick={() => setQuantity(item.variationId, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-smoke-400 pt-4">
                <span className="text-sm font-semibold text-smoke-700">Estimated total</span>
                <span className="text-sm font-semibold text-smoke-900">
                  {formatMoney(estimatedTotalCents)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-smoke-900">Pickup Selection</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {drop.pickupOptions.map((option) => {
              const isSelected = pickupOptionId === option.id;
              const disabled = option.isSoldOut;
              const baseClasses = "rounded-lg border p-5 text-left min-h-[72px] transition-colors";
              const stateClasses = disabled
                ? "border-smoke-400 bg-pit-card opacity-60 cursor-not-allowed"
                : isSelected
                  ? "border-gold-400 bg-pit-card ring-1 ring-gold-400/40"
                  : "border-smoke-400 bg-pit-card hover:border-gold-600";
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setPickupOptionId(option.id)}
                  className={`${baseClasses} ${stateClasses}`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-smoke-900" style={{ fontFamily: "var(--font-display)" }}>
                        {option.locationLabel}
                      </p>
                      <p className="mt-1 text-sm text-smoke-700">{option.pickupDateLabel}</p>
                      <p className="text-sm text-smoke-600">
                        {new Date(option.pickupAtISO).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone: "America/Denver"
                        })}
                      </p>
                    </div>
                    {disabled && (
                      <span className="rounded-full bg-smoke-300 px-2 py-0.5 text-xs font-semibold text-smoke-50">
                        Sold Out
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {drop.pickupOptions.length === 0 && (
            <p className="mt-4 text-sm text-smoke-500">No pickup options available for this drop.</p>
          )}
        </div>

        {needsSauce && sauceAddVariationId && (
          <div className="glass-card border border-ember-400 bg-[#1a120e] p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-smoke-900">Don&apos;t forget the sauce</h3>
                <p className="text-sm text-smoke-600">
                  Add a jar of house BBQ sauce to finish the spread.
                </p>
              </div>
              <button
                className="button-primary"
                onClick={() => addItem({ variationId: sauceAddVariationId, quantity: 1 })}
              >
                Add Sauce
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="glass-card p-6">
          <h2 className="text-lg font-semibold text-smoke-900">Customer Info</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-smoke-600">
              First name
              <input
                className="input-field mt-2"
                value={formState.firstName}
                onChange={(event) => setFormState({ ...formState, firstName: event.target.value })}
                required
              />
            </label>
            <label className="text-sm text-smoke-600">
              Last name
              <input
                className="input-field mt-2"
                value={formState.lastName}
                onChange={(event) => setFormState({ ...formState, lastName: event.target.value })}
                required
              />
            </label>
            <label className="text-sm text-smoke-600">
              Email
              <input
                type="email"
                className="input-field mt-2"
                value={formState.email}
                onChange={(event) => setFormState({ ...formState, email: event.target.value })}
                required
              />
            </label>
            <label className="text-sm text-smoke-600">
              Phone (optional)
              <input
                type="tel"
                className="input-field mt-2"
                value={formState.phone}
                onChange={(event) => setFormState({ ...formState, phone: event.target.value })}
              />
            </label>
            {!attributionSourcesError && attributionSources.length > 0 && (
              <>
                <label className="text-sm text-smoke-600">
                  How did you hear about us? (optional)
                  <select
                    className="input-field mt-2"
                    value={formState.attributionSourceCode}
                    onChange={(event) => {
                      const nextCode = event.target.value;
                      const nextSource = attributionSources.find((source) => source.code === nextCode);
                      setFormState({
                        ...formState,
                        attributionSourceCode: nextCode,
                        attributionDetail: nextSource?.requiresDetail ? formState.attributionDetail : ""
                      });
                    }}
                  >
                    <option value="">Select an option</option>
                    {attributionSources.map((source) => (
                      <option key={source.id} value={source.code}>
                        {source.label}
                      </option>
                    ))}
                  </select>
                </label>
                {showAttributionDetail && (
                  <label className="text-sm text-smoke-600">
                    {attributionDetailLabel}
                    <input
                      className="input-field mt-2"
                      maxLength={255}
                      value={formState.attributionDetail}
                      onChange={(event) =>
                        setFormState({ ...formState, attributionDetail: event.target.value })
                      }
                    />
                  </label>
                )}
              </>
            )}
          </div>
          {error && <p className="mt-4 text-sm text-ember-600">{error}</p>}
          <button
            type="submit"
            className="button-primary mt-6 w-full"
            disabled={isSubmitting || isLoading || !pickupOptionId}
          >
            {isSubmitting ? "Submitting..." : "Submit Order"}
          </button>
        </form>
      </div>
    </div>
  );
}
