import { CartItem, FrozenItemDTO, PackageConfig } from "./types";
export type { CartItem };

export function mergeCartItems(current: CartItem[], added: CartItem[]): CartItem[] {
  const map = new Map<string, number>();
  for (const item of current) {
    map.set(item.variationId, (map.get(item.variationId) || 0) + item.quantity);
  }
  for (const item of added) {
    map.set(item.variationId, (map.get(item.variationId) || 0) + item.quantity);
  }
  return Array.from(map.entries())
    .filter(([, quantity]) => quantity > 0)
    .map(([variationId, quantity]) => ({ variationId, quantity }));
}

function normalizeMatch(value: string) {
  return value.trim().toLowerCase();
}

export function resolvePackageToCartItems(
  packageConfig: PackageConfig,
  items: FrozenItemDTO[]
): CartItem[] {
  const resolved: CartItem[] = [];

  for (const entry of packageConfig.items) {
    let variationId = entry.variationId;

    if (!variationId && entry.itemName) {
      const item = items.find((candidate) =>
        normalizeMatch(candidate.name).includes(normalizeMatch(entry.itemName!))
      );
      if (item) {
        if (entry.variationName) {
          const variation = item.variations.find((candidate) =>
            normalizeMatch(candidate.name) === normalizeMatch(entry.variationName!)
          );
          variationId = variation?.variationId;
        } else {
          variationId = item.variations[0]?.variationId;
        }
      }
    }

    if (variationId) {
      resolved.push({ variationId, quantity: entry.quantity });
    }
  }

  return resolved;
}

export function aggregateByProduct(
  items: Array<{ variationId: string; quantity: number; productName?: "pulled_pork" | "brisket" | "sauce" | "family_night" | "backyard_host" | "freezer_filler" }>
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of items) {
    if (item.productName) {
      totals.set(item.productName, (totals.get(item.productName) ?? 0) + item.quantity);
    }
  }
  return totals;
}

export function isSauceBumpNeeded(
  items: CartItem[],
  sauceVariationIds: string | string[]
): boolean {
  const ids = Array.isArray(sauceVariationIds) ? sauceVariationIds : [sauceVariationIds];
  const sauceSet = new Set(ids.filter((value) => value.trim().length > 0));
  if (sauceSet.size === 0) {
    return false;
  }
  const sauceQty = items
    .filter((item) => sauceSet.has(item.variationId))
    .reduce((sum, item) => sum + item.quantity, 0);
  const meatQty = items
    .filter((item) => !sauceSet.has(item.variationId))
    .reduce((sum, item) => sum + item.quantity, 0);
  return meatQty > 0 && sauceQty === 0;
}
