import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applicationOrigin, safeReturnPath } from "../../../../lib/auth/config";
import { createRouteAuthClient, privateResponse } from "../../../../lib/auth/server";
import { AccessError, hasPermission, verifiedUser } from "../../../../lib/auth/permissions";

export const dynamic = "force-dynamic";
const credentials = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(1024), next: z.string().optional() });
const recovery = z.object({ email: z.string().trim().email().max(254) });
const password = z.object({ password: z.string().min(12).max(128) });
const resetMessage = "If an account matches that email, you’ll receive a password-reset link. Open it in this browser.";
type Context = { params: Promise<{ action: string }> };

export async function GET(request: NextRequest, context: Context) {
  const { action } = await context.params;
  if (action !== "session") return privateResponse(NextResponse.json({ error: "Not found." }, { status: 404 }));
  const auth = createRouteAuthClient(request);
  try {
    if (request.nextUrl.origin !== applicationOrigin()) throw new AccessError(403);
    const user = await verifiedUser(auth.client);
    try {
      return auth.respond(NextResponse.json({ signedIn: true, admin: await hasPermission(user.id, "admin.access") }));
    } catch {
      // A permission-store outage must not hide the authenticated logout control.
      return auth.respond(NextResponse.json({ signedIn: true, admin: false, accessUnavailable: true }));
    }
  } catch (error) {
    if (error instanceof AccessError && error.status === 401) {
      return auth.respond(NextResponse.json({ signedIn: false, admin: false }));
    }
    return auth.respond(NextResponse.json({ error: "Unable to verify access." }, { status: error instanceof AccessError ? error.status : 503 }));
  }
}

export async function POST(request: NextRequest, context: Context) {
  const { action } = await context.params;
  // Require both a trusted destination and an exact Origin, including login/logout.
  if (request.nextUrl.origin !== applicationOrigin() || request.headers.get("origin") !== applicationOrigin()) {
    return privateResponse(NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 }));
  }
  const auth = createRouteAuthClient(request);
  const json = (body: object, status = 200) => auth.respond(NextResponse.json(body, { status }));
  try {
    if (action === "logout") {
      const { error } = await auth.client.auth.signOut({ scope: "local" });
      if (error) return json({ error: "Could not log out. Please try again." }, 503);
      return json({ next: "/login" });
    }
    const body = await request.json().catch(() => null);
    if (action === "login") {
      const parsed = credentials.safeParse(body);
      if (!parsed.success) return json({ error: "Enter a valid email and password." }, 400);
      const { error } = await auth.client.auth.signInWithPassword(parsed.data);
      if (error) return json({ error: "Unable to log in. Check your email and password, or try again later." }, 400);
      return json({ next: safeReturnPath(parsed.data.next) });
    }
    if (action === "forgot-password") {
      const parsed = recovery.safeParse(body);
      if (!parsed.success) return json({ error: "Enter a valid email address." }, 400);
      // Always return the same message, including provider throttling/errors.
      await auth.client.auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: `${applicationOrigin()}/auth/callback`
      });
      return json({ message: resetMessage });
    }
    if (action === "reset-password") {
      await verifiedUser(auth.client);
      const parsed = password.safeParse(body);
      if (!parsed.success) return json({ error: "Use a password between 12 and 128 characters." }, 400);
      const { error } = await auth.client.auth.updateUser({ password: parsed.data.password });
      if (error) return json({ error: "Could not update your password. Use a different password or request a new reset link." }, 400);
      const { error: logoutError } = await auth.client.auth.signOut({ scope: "global" });
      if (logoutError) return json({ error: "Password updated, but sign-out could not be completed. Please log out and sign in again." }, 503);
      return json({ next: "/login?reset=success" });
    }
    return json({ error: "Not found." }, 404);
  } catch (error) {
    if (action === "forgot-password") return json({ message: resetMessage });
    return json({ error: error instanceof AccessError ? error.message : "Something went wrong. Please try again." }, error instanceof AccessError ? error.status : 503);
  }
}
