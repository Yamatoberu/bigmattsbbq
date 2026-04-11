import { FrozenItemDTO } from "../lib/types";
import { formatMoney } from "../lib/format";

interface FrozenItemCardProps {
  item: FrozenItemDTO;
  onAdd: (variationId: string) => void;
  soldOut?: boolean;
}

export function FrozenItemCard({ item, onAdd, soldOut = false }: FrozenItemCardProps) {
  return (
    <article className={`glass-card flex h-full flex-col gap-4 p-5${soldOut ? " opacity-60" : ""}`}>
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-smoke-900" style={{ fontFamily: "var(--font-display)" }}>
            {item.name}
          </h3>
          {item.description && <p className="mt-2 text-sm text-smoke-600">{item.description}</p>}
        </div>
        <div className="h-16 w-20 rounded-md border border-[#3a2a20] bg-[linear-gradient(120deg,#201510,#2a1c14)]" />
      </div>
      <div className="flex flex-col gap-3">
        {item.variations.map((variation) => {
          const isSoldOut = soldOut || variation.remaining <= 0;
          return (
            <div key={variation.variationId} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-smoke-800">{variation.name}</p>
                <p className="text-xs text-smoke-600">
                  {formatMoney(variation.priceCents, variation.currency)} · {variation.remaining} left
                </p>
              </div>
              <button
                className="button-primary px-4 py-2 text-xs"
                onClick={() => onAdd(variation.variationId)}
                disabled={isSoldOut}
              >
                {isSoldOut ? "Sold Out" : "Add to Cart"}
              </button>
            </div>
          );
        })}
      </div>
    </article>
  );
}
