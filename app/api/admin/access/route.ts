import { NextRequest, NextResponse } from "next/server";
import { applicationOrigin } from "../../../../lib/auth/config";
import { createRouteAuthClient } from "../../../../lib/auth/server";
import { AccessError, requirePermission } from "../../../../lib/auth/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = createRouteAuthClient(request);
  try {
    if (request.nextUrl.origin !== applicationOrigin()) throw new AccessError(403);
    await requirePermission(auth.client, "admin.access");
    return auth.respond(NextResponse.json({ administrator: true }));
  } catch (error) {
    return auth.respond(NextResponse.json({ error: error instanceof AccessError ? error.message : "Access could not be verified." }, { status: error instanceof AccessError ? error.status : 503 }));
  }
}
