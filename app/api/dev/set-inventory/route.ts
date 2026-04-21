import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { getSquareEnv } from "../../../../lib/env";
import { newIdempotencyKey } from "../../../../lib/idempotency";
import { batchSetInventoryCounts, SquareError } from "../../../../lib/square";
import { logError } from "../../../../lib/logger";

export const runtime = "nodejs";

const payloadSchema = z.object({
  counts: z
    .array(
      z.object({
        variationId: z.string().min(1),
        quantity: z.number().int().nonnegative()
      })
    )
    .min(1)
});

export async function POST(request: Request) {
  const headerList = await headers();
  const requestId = headerList.get("x-request-id") ?? crypto.randomUUID();

  try {
    const env = getSquareEnv();
    if (env.environment !== "sandbox") {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid inventory payload.", requestId },
        { status: 400 }
      );
    }

    await batchSetInventoryCounts({
      host: env.host,
      accessToken: env.accessToken,
      requestId,
      locationId: env.locationId,
      changes: parsed.data.counts,
      idempotencyKey: newIdempotencyKey([
        "dev",
        "set-inventory",
        new Date().toISOString().slice(0, 10)
      ])
    });

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    logError("Inventory update failed", error, requestId);
    const status = error instanceof SquareError ? error.status : 500;
    return NextResponse.json(
      {
        error: "Unable to update inventory.",
        requestId
      },
      { status }
    );
  }
}
