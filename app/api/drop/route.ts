import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { fetchActiveDrop } from "../../../lib/drops";
import { logError } from "../../../lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const headerList = await headers();
  const requestId = headerList.get("x-request-id") ?? crypto.randomUUID();

  try {
    const drop = await fetchActiveDrop();
    return NextResponse.json(drop, {
      headers: { "x-request-id": requestId }
    });
  } catch (error) {
    logError("Failed to load active drop", error, requestId);
    return NextResponse.json(
      { error: "Unable to load drop info right now.", requestId },
      { status: 500, headers: { "x-request-id": requestId } }
    );
  }
}
