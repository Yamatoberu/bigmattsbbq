import { NextRequest, NextResponse } from "next/server";
import { applicationOrigin } from "../../../lib/auth/config";
import { createRouteAuthClient } from "../../../lib/auth/server";

export async function GET(request: NextRequest) {
  const origin = applicationOrigin();
  const auth = createRouteAuthClient(request);
  const fail = () => auth.respond(NextResponse.redirect(new URL("/reset-password?error=invalid", origin)));
  if (request.nextUrl.origin !== origin) return fail();
  const code = request.nextUrl.searchParams.get("code");
  if (!code || request.nextUrl.searchParams.has("error")) return fail();
  try {
    const flowId = request.nextUrl.searchParams.get("sb_flow_id");
    const { data, error } = await auth.client.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
    if (error || !data.user) return fail();
    return auth.respond(NextResponse.redirect(new URL("/reset-password", origin)));
  } catch {
    return fail();
  }
}
