import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { fetchActiveAttributionSources } from "../../../lib/attributionSources";
import { logError } from "../../../lib/logger";

export const runtime = "nodejs";

export async function GET() {
  const headerList = await headers();
  const requestId = headerList.get("x-request-id") ?? crypto.randomUUID();

  try {
    const sources = await fetchActiveAttributionSources();
    return NextResponse.json(sources);
  } catch (error) {
    logError("Failed to load attribution sources", error, requestId);
    return NextResponse.json(
      {
        error: "Unable to load attribution sources.",
        requestId
      },
      { status: 500 }
    );
  }
}
