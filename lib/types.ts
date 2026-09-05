export interface VariationDTO {
  variationId: string;
  name: string;
  priceCents: number;
  currency: string;
  remaining: number;
}

export interface FrozenItemDTO {
  itemId: string;
  name: string;
  description: string;
  variations: VariationDTO[];
}

export interface CartItem {
  variationId: string;
  quantity: number;
}

export interface PackageItemConfig {
  variationId?: string;
  itemName?: string;
  variationName?: string;
  displayVariationName?: string;
  displayName?: string;
  quantity: number;
}

export interface PackageConfig {
  id: string;
  name: string;
  catalogName: string;
  description: string;
  highlight?: boolean;
  items: PackageItemConfig[];
}


export interface CheckoutRequestBody {
  dropId: string;
  pickupOptionId: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    attributionSourceCode?: string;
    attributionDetail?: string;
  };
  cart: CartItem[];
}

export type DropStatus = "upcoming" | "active" | "closed";

export interface PickupOptionDTO {
  id: string;
  locationLabel: string;
  pickupDateLabel: string;
  pickupAtISO: string;
}

export interface AttributionSourceDTO {
  id: number;
  code: string;
  label: string;
  requiresDetail: boolean;
  sortOrder: number;
}

export interface DropDTO {
  id: string;
  title: string;
  status: DropStatus;
  orderCutoffAt: string | null;
  pickupOptions: PickupOptionDTO[];
}

export interface CheckoutResponseBody {
  orderId: string;
  invoiceId: string;
  pickupNote: string;
}
