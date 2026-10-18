import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { authConfig } from "./config";

export function privateResponse(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function createServerAuthClient() {
  const store = await cookies();
  const { url, key } = authConfig();
  return createServerClient(url, key, {
    cookies: { getAll: () => store.getAll(), setAll: () => { /* Proxy refreshes page cookies. */ } }
  });
}

// Route handlers own their response, including refresh/login/logout cookies.
export function createRouteAuthClient(request: NextRequest) {
  const { url, key } = authConfig();
  const pending = new Map<string, { name: string; value: string; options: CookieOptions }>();
  const client = createServerClient(url, key, {
    cookieOptions: { secure: request.nextUrl.protocol === "https:", sameSite: "lax", path: "/" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(changes) {
        for (const cookie of changes) {
          request.cookies.set(cookie.name, cookie.value);
          pending.set(cookie.name, cookie);
        }
      }
    }
  });
  return {
    client,
    respond(response: NextResponse) {
      for (const cookie of pending.values()) response.cookies.set(cookie.name, cookie.value, cookie.options);
      return privateResponse(response);
    }
  };
}
