import "server-only";
import { getSupabaseClient } from "./supabase";
import type { DropDTO, DropStatus, PickupOptionDTO } from "./types";

export function formatPickupDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Denver"
  });
}

export async function fetchActiveDrop(): Promise<DropDTO | null> {
  const supabase = getSupabaseClient();

  const { data: drop, error: dropErr } = await supabase
    .from("drops")
    .select(
      "id, title, status, order_cutoff_at, capacity_pulled_pork, capacity_brisket, capacity_sauce, capacity_family_night, capacity_backyard_host, capacity_freezer_filler, reserved_pulled_pork, reserved_brisket, reserved_sauce, reserved_family_night, reserved_backyard_host, reserved_freezer_filler, capacity_enforced"
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (dropErr) {
    throw dropErr;
  }
  if (!drop) {
    return null;
  }

  const { data: pickupRows, error: pickupErr } = await supabase
    .from("drop_pickup_options")
    .select(
      "id, location_label, pickup_date, pickup_at, capacity_pulled_pork, capacity_brisket, capacity_sauce, capacity_family_night, capacity_backyard_host, capacity_freezer_filler, reserved_pulled_pork, reserved_brisket, reserved_sauce, reserved_family_night, reserved_backyard_host, reserved_freezer_filler"
    )
    .eq("drop_id", drop.id)
    .order("pickup_at", { ascending: true });

  if (pickupErr) {
    throw pickupErr;
  }

  const pickupOptions: PickupOptionDTO[] = (pickupRows ?? []).map((row) => ({
    id: row.id,
    locationLabel: row.location_label,
    pickupDateLabel: formatPickupDate(row.pickup_at),
    pickupAtISO: row.pickup_at,
    isSoldOut:
      row.reserved_pulled_pork >= row.capacity_pulled_pork &&
      row.reserved_brisket >= row.capacity_brisket &&
      row.reserved_sauce >= row.capacity_sauce &&
      row.reserved_family_night >= row.capacity_family_night &&
      row.reserved_backyard_host >= row.capacity_backyard_host &&
      row.reserved_freezer_filler >= row.capacity_freezer_filler
  }));

  const capacityEnforced = drop.capacity_enforced !== false;
  return {
    id: drop.id,
    title: drop.title,
    status: drop.status as DropStatus,
    orderCutoffAt: drop.order_cutoff_at,
    capacity: {
      pulledPork: { total: drop.capacity_pulled_pork, reserved: drop.reserved_pulled_pork },
      brisket: { total: drop.capacity_brisket, reserved: drop.reserved_brisket },
      sauce: { total: drop.capacity_sauce, reserved: drop.reserved_sauce },
      familyNight: { total: drop.capacity_family_night, reserved: drop.reserved_family_night },
      backyardHost: { total: drop.capacity_backyard_host, reserved: drop.reserved_backyard_host },
      freezerFiller: { total: drop.capacity_freezer_filler, reserved: drop.reserved_freezer_filler }
    },
    soldOut: {
      pulledPork: capacityEnforced && drop.reserved_pulled_pork >= drop.capacity_pulled_pork,
      brisket: capacityEnforced && drop.reserved_brisket >= drop.capacity_brisket,
      sauce: capacityEnforced && drop.reserved_sauce >= drop.capacity_sauce,
      familyNight: capacityEnforced && drop.reserved_family_night >= drop.capacity_family_night,
      backyardHost: capacityEnforced && drop.reserved_backyard_host >= drop.capacity_backyard_host,
      freezerFiller: capacityEnforced && drop.reserved_freezer_filler >= drop.capacity_freezer_filler
    },
    pickupOptions,
    capacityEnforced
  };
}

export interface DropReadinessRow {
  status: string;
  capacity_pulled_pork: number;
  capacity_brisket: number;
  capacity_sauce: number;
  capacity_family_night: number;
  capacity_backyard_host: number;
  capacity_freezer_filler: number;
  reserved_pulled_pork: number;
  reserved_brisket: number;
  reserved_sauce: number;
  reserved_family_night: number;
  reserved_backyard_host: number;
  reserved_freezer_filler: number;
  order_cutoff_at: string | null;
  capacity_enforced: boolean;
}

export type DropReadiness =
  | { ok: true }
  | { ok: false; status: number; error: string };

export function checkDropReady(drop: DropReadinessRow | null): DropReadiness {
  if (!drop) {
    return { ok: false, status: 404, error: "Drop not found." };
  }
  if (drop.status !== "active") {
    return {
      ok: false,
      status: 409,
      error: "This drop has closed. Orders are no longer being accepted."
    };
  }
  if (drop.order_cutoff_at !== null) {
    const cutoffMs = Date.parse(drop.order_cutoff_at);
    if (!Number.isNaN(cutoffMs) && cutoffMs <= Date.now()) {
      return {
        ok: false,
        status: 409,
        error: "This drop has closed. Orders are no longer being accepted."
      };
    }
  }
  if (!drop.capacity_enforced) {
    return { ok: true };
  }
  // Coarse gate: block only when every product type is globally exhausted.
  // Per-product capacity (e.g. pulled pork sold out but brisket available) is
  // enforced atomically by the reserve_pickup_slot RPC during checkout.
  const globallySoldOut =
    drop.reserved_pulled_pork >= drop.capacity_pulled_pork &&
    drop.reserved_brisket >= drop.capacity_brisket &&
    drop.reserved_sauce >= drop.capacity_sauce &&
    drop.reserved_family_night >= drop.capacity_family_night &&
    drop.reserved_backyard_host >= drop.capacity_backyard_host &&
    drop.reserved_freezer_filler >= drop.capacity_freezer_filler;
  if (globallySoldOut) {
    return {
      ok: false,
      status: 409,
      error: "This drop has sold out. No more orders can be taken."
    };
  }
  return { ok: true };
}
