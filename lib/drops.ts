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
      "id, title, status, order_cutoff_at, capacity_pulled_pork, capacity_brisket, reserved_pulled_pork, reserved_brisket"
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
      "id, location_label, pickup_date, pickup_at, capacity_pulled_pork, capacity_brisket, reserved_pulled_pork, reserved_brisket"
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
      row.reserved_brisket >= row.capacity_brisket
  }));

  return {
    id: drop.id,
    title: drop.title,
    status: drop.status as DropStatus,
    orderCutoffAt: drop.order_cutoff_at,
    capacity: {
      pulledPork: { total: drop.capacity_pulled_pork, reserved: drop.reserved_pulled_pork },
      brisket: { total: drop.capacity_brisket, reserved: drop.reserved_brisket }
    },
    soldOut: {
      pulledPork: drop.reserved_pulled_pork >= drop.capacity_pulled_pork,
      brisket: drop.reserved_brisket >= drop.capacity_brisket
    },
    pickupOptions
  };
}

export interface DropReadinessRow {
  status: string;
  capacity_pulled_pork: number;
  capacity_brisket: number;
  reserved_pulled_pork: number;
  reserved_brisket: number;
  order_cutoff_at: string | null;
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
  const globallySoldOut =
    drop.reserved_pulled_pork >= drop.capacity_pulled_pork &&
    drop.reserved_brisket >= drop.capacity_brisket;
  if (globallySoldOut) {
    return {
      ok: false,
      status: 409,
      error: "This drop has sold out. No more orders can be taken."
    };
  }
  return { ok: true };
}
