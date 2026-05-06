import Image from "next/image";
import { FrozenItemDTO } from "../lib/types";
import { formatMoney } from "../lib/format";
import { getFrozenItemImage } from "../lib/productImages";
import { SoldOutCapture } from "./SoldOutCapture";

interface FrozenItemCardProps {
  item: FrozenItemDTO;
  onAdd: (variationId: string) => void;
  soldOut?: boolean;
  ignoreStock?: boolean;
}

export function FrozenItemCard({ item, onAdd, soldOut = false, ignoreStock = false }: FrozenItemCardProps) {
  const image = getFrozenItemImage(item);

  return (
    <article className={`glass-card flex h-full flex-col gap-4 p-5${soldOut ? " opacity-60" : ""}`}>
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-smoke-900" style={{ fontFamily: "var(--font-display)" }}>
            {item.name}
          </h3>
          {item.description && (
            item.description.startsWith("- ") ? (
              <ul className="mt-2 space-y-0.5 text-sm text-smoke-600">
                {item.description.split(/ - /).filter(Boolean).map((part) => (
                  <li key={part} className="flex items-start gap-1.5">
                    <span className="mt-0.5 text-xs text-gold-600">•</span>
                    <span>{part.replace(/^-\s*/, "")}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-smoke-600">{item.description}</p>
            )
          )}
        </div>
        <div className="relative h-16 w-20 overflow-hidden rounded-md border border-smoke-400 bg-pit-img">
          <Image src={image.src} alt={image.alt} fill sizes="80px" className="object-cover" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {item.variations.map((variation) => {
          const isSoldOut = !ignoreStock && (soldOut || variation.remaining <= 0);
          return (
            <div key={variation.variationId} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                {variation.name.toLowerCase() !== "regular" && (
                  <p className="text-xs text-smoke-500">{variation.name}</p>
                )}
                <p className="text-sm font-semibold text-smoke-900">
                  {formatMoney(variation.priceCents, variation.currency)}
                </p>
                {!ignoreStock && (
                  <p className="text-xs text-smoke-600" aria-live="polite">
                    <span aria-label={`${variation.remaining} items left in stock`}>{variation.remaining} left</span>
                  </p>
                )}
              </div>
              {isSoldOut ? (
                <SoldOutCapture />
              ) : (
                <button
                  className="button-primary px-4 py-2 text-xs"
                  onClick={() => onAdd(variation.variationId)}
                >
                  Add to Cart
                </button>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}
