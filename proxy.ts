import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SCA_AREA_HEADER, resolveScaRouting } from "./lib/sca/routing";
import { applicationOrigin, authConfig, isAuthPath } from "./lib/auth/config";

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(SCA_AREA_HEADER);
  const { isScaArea, rewritePathname } = resolveScaRouting(request.headers.get("host"), request.nextUrl.pathname);
  if (isScaArea) requestHeaders.set(SCA_AREA_HEADER, "1");

  // Main-host auth URLs must never become /sca/login or /sca/auth/callback.
  if (isAuthPath(request.nextUrl.pathname) && request.nextUrl.origin !== applicationOrigin()) {
    const destination = new URL(request.nextUrl.pathname + request.nextUrl.search, applicationOrigin());
    const response = NextResponse.redirect(destination);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }

  const changes = new Map<string, { name: string; value: string; options: CookieOptions }>();
  const cacheHeaders = new Headers();
  // No network/Auth dependency for anonymous public requests. Refresh signed-in
  // main-host requests even when visiting /sca, preserving every rewrite branch.
  const hasSessionCookie = request.cookies.getAll().some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name));
  if (hasSessionCookie) {
    const { url, key } = authConfig();
    const client = createServerClient(url, key, {
      cookieOptions: { secure: request.nextUrl.protocol === "https:", sameSite: "lax", path: "/" },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookies, headers) {
          for (const cookie of cookies) {
            request.cookies.set(cookie.name, cookie.value);
            changes.set(cookie.name, cookie);
          }
          Object.entries(headers).forEach(([name, value]) => cacheHeaders.set(name, value));
        }
      }
    });
    // Identity/permissions are checked independently at each protected operation.
    try { await client.auth.getClaims(); } catch { /* Guards fail closed if refresh fails. */ }
    requestHeaders.set("cookie", request.cookies.toString());
  }
  let response: NextResponse;
  if (rewritePathname !== null) {
    const url = request.nextUrl.clone();
    url.pathname = rewritePathname;
    response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  }
  for (const cookie of changes.values()) response.cookies.set(cookie.name, cookie.value, cookie.options);
  cacheHeaders.forEach((value, name) => response.headers.set(name, value));
  if (hasSessionCookie || isAuthPath(request.nextUrl.pathname)) {
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
  }
  return response;
}

// APIs refresh through their request-scoped Auth client, not through this proxy.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif)$).*)"]
};
