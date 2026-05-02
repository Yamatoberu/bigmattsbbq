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
  quantity: number;
}

export interface PackageConfig {
  id: string;
  name: string;
  description: string;
  highlight?: boolean;
  bundleVariationId?: string;
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
  };
  cart: CartItem[];
}

export type DropStatus = "upcoming" | "active" | "closed";

export interface CapacitySlot {
  total: number;
  reserved: number;
}

export interface PickupOptionDTO {
  id: string;
  locationLabel: string;
  pickupDateLabel: string;
  pickupAtISO: string;
  isSoldOut: boolean;
}

export interface DropDTO {
  id: string;
  title: string;
  status: DropStatus;
  orderCutoffAt: string | null;
  capacity: {
    pulledPork: CapacitySlot;
    brisket: CapacitySlot;
  };
  soldOut: {
    pulledPork: boolean;
    brisket: boolean;
  };
  pickupOptions: PickupOptionDTO[];
}

export interface CheckoutResponseBody {
  orderId: string;
  invoiceId: string;
  pickupNote: string;
}
