export type DropInventoryRow = {
  product_id: number;
  drop_id: number;
  bags_available: number;
  bags_reserved: number;
  bags_sold: number;
  enabled: boolean;
  product?: {
    name: string;
    bag_size_lb: number;
    description?: string | null;
  };
};

export type DropPickup = {
  id: number;
  drop_id: number;
  pickup_location_id: number;
  start_time: string | null;
  end_time: string | null;
  instructions?: string | null;
  enabled: boolean;
  pickup_location?: {
    name: string;
    address?: string | null;
  };
};

export type Drop = {
  id: number;
  name: string;
  status: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  hero_copy?: string | null;
};
