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
  quantity: number;
}

export interface PackageConfig {
  id: string;
  name: string;
  description: string;
  highlight?: boolean;
  items: PackageItemConfig[];
}

export interface PickupOption {
  locationLabel: "Preston" | "Orem";
  pickupDateLabel: string;
  pickupAtISO: string;
}

export interface CheckoutRequestBody {
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  pickup: PickupOption;
  cart: CartItem[];
}

export interface CheckoutResponseBody {
  orderId: string;
  invoiceId: string;
  pickupNote: string;
}
