import { NextResponse } from "next/server";
import { getSupabaseClient } from "../../../lib/supabase";
import { logError } from "../../../lib/logger";
import { getSquareEnv } from "../../../lib/env";

export const runtime = "nodejs";

export async function GET() {
  const requestId = crypto.randomUUID();

  try {
    const env = getSquareEnv();
    if (env.environment !== "sandbox") {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const supabase = getSupabaseClient();

    // 1. Query drops table — should return the seeded test drop
    const { data: drops, error: dropsError } = await supabase
      .from("drops")
      .select("id, title, status, capacity_pulled_pork, capacity_brisket, reserved_pulled_pork, reserved_brisket");

    if (dropsError) {
      return NextResponse.json(
        { error: dropsError.message, requestId },
        { status: 500, headers: { "x-request-id": requestId } }
      );
    }

    // 2. Query pickup options for the first drop
    const dropId = drops?.[0]?.id;
    let pickupOptions = null;

    if (dropId) {
      const { data, error } = await supabase
        .from("drop_pickup_options")
        .select("id, location_label, pickup_date, capacity_pulled_pork, capacity_brisket")
        .eq("drop_id", dropId);

      if (error) {
        return NextResponse.json(
          { error: error.message, requestId },
          { status: 500, headers: { "x-request-id": requestId } }
        );
      }

      pickupOptions = data;
    }

    return NextResponse.json(
      {
        ok: true,
        requestId,
        drops,
        pickupOptions,
        summary: {
          dropCount: drops?.length ?? 0,
          pickupOptionCount: pickupOptions?.length ?? 0
        }
      },
      { headers: { "x-request-id": requestId } }
    );
  } catch (err) {
    logError("test-seed query failed", err, requestId);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
        requestId
      },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}
