import { FrozenItemDTO } from "./types";

interface InventoryCount {
  catalog_object_id: string;
  quantity?: string | null;
}

export function joinInventoryCounts(
  items: FrozenItemDTO[],
  counts: InventoryCount[]
): FrozenItemDTO[] {
  const countMap = new Map<string, number>();
  for (const count of counts) {
    const quantity = count.quantity ? Number.parseInt(count.quantity, 10) : 0;
    if (!Number.isNaN(quantity)) {
      countMap.set(count.catalog_object_id, quantity);
    }
  }

  return items.map((item) => ({
    ...item,
    variations: item.variations.map((variation) => ({
      ...variation,
      remaining: countMap.get(variation.variationId) ?? 0
    }))
  }));
}
