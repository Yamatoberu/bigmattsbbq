export function authConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Auth configuration is missing.");
  return { url, key };
}

// Never derive email destinations from caller-controlled Host/forwarded headers.
export function applicationOrigin() {
  const value = process.env.AUTH_SITE_URL;
  if (!value) throw new Error("AUTH_SITE_URL is required for authentication.");
  const url = new URL(value);
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) {
    throw new Error("AUTH_SITE_URL must be an approved HTTPS origin or localhost.");
  }
  return url.origin;
}

export function safeReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") ||
      /[\\\s\u0000-\u001f\u007f%]/.test(value)) return "/admin";
  const url = new URL(value, "https://local.invalid");
  // Only return to admin pages; never send a login through an arbitrary public redirect.
  return url.origin === "https://local.invalid" &&
    (url.pathname === "/admin" || url.pathname.startsWith("/admin/"))
    ? url.pathname + url.search : "/admin";
}

export function isAuthPath(path: string) {
  return ["/login", "/forgot-password", "/reset-password", "/admin", "/auth"].some(
    (prefix) => path === prefix || path.startsWith(prefix + "/")
  );
}
