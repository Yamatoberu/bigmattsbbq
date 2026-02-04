export type DropInventoryRow = {
  product_id: string;
  drop_id: string;
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
  id: string;
  drop_id: string;
  pickup_location_id: string;
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
  id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'live' | 'closed';
  starts_at?: string | null;
  ends_at?: string | null;
  hero_copy?: string | null;
};
