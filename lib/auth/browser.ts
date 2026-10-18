"use client";

import { createBrowserClient } from "@supabase/ssr";
import { authConfig } from "./config";

// Reserved for provider integrations; user credentials currently go to same-origin handlers.
export function createBrowserAuthClient() {
  const { url, key } = authConfig();
  return createBrowserClient(url, key, { cookieOptions: { secure: window.location.protocol === "https:", sameSite: "lax", path: "/" } });
}
