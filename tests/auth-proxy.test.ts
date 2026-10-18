import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { CookieOptions } from "@supabase/ssr";

const mocks = vi.hoisted(() => ({ createServerClient: vi.fn(), getClaims: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.createServerClient }));
import { proxy } from "../proxy";

type CookieAdapter = {
  getAll: () => { name: string; value: string }[];
  setAll: (cookies: { name: string; value: string; options: CookieOptions }[], headers: Record<string, string>) => void;
};
const origin = "https://bigmattsbbq.com";
const cookieName = "sb-test-auth-token";
function request(path: string, host = "bigmattsbbq.com", signedIn = true) {
  return new NextRequest(`https://${host}${path}`, {
    headers: { host, "x-sca-area": "attacker-supplied", ...(signedIn ? { cookie: `${cookieName}=old` } : {}) }
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("AUTH_SITE_URL", origin);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
  mocks.createServerClient.mockImplementation((_url: string, _key: string, options: { cookies: CookieAdapter }) => ({
    auth: {
      getClaims: async () => {
        mocks.getClaims();
        expect(options.cookies.getAll()).toContainEqual({ name: cookieName, value: "old" });
        options.cookies.setAll([
          { name: cookieName, value: "refreshed", options: { path: "/", httpOnly: true, secure: true } },
          { name: `${cookieName}.1`, value: "second-chunk", options: { path: "/", secure: true } }
        ], { Pragma: "no-cache", Expires: "0" });
        return { data: { claims: {} }, error: null };
      }
    }
  }));
});
afterEach(() => vi.unstubAllEnvs());

describe("Auth session refresh and SCA routing", () => {
  it.each([
    { host: "bigmattsbbq.com", path: "/menu", rewritten: null, sca: null },
    { host: "bigmattsbbq.com", path: "/sca/competitions", rewritten: null, sca: "1" },
    { host: "sca.bigmattsbbq.com", path: "/competitions", rewritten: "https://sca.bigmattsbbq.com/sca/competitions", sca: "1" }
  ])("forwards refreshed cookies and trusted headers for $host$path", async ({ host, path, rewritten, sca }) => {
    const response = await proxy(request(path, host));
    expect(response.headers.get("x-middleware-rewrite")).toBe(rewritten);
    expect(response.headers.get("x-middleware-request-x-sca-area")).toBe(sca);
    expect(response.headers.get("x-middleware-request-cookie")).toContain(`${cookieName}=refreshed`);
    expect(response.headers.get("x-middleware-request-cookie")).toContain(`${cookieName}.1=second-chunk`);
    expect(response.cookies.get(cookieName)?.value).toBe("refreshed");
    expect(response.cookies.get(`${cookieName}.1`)?.value).toBe("second-chunk");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.headers.get("expires")).toBe("0");
    expect(mocks.getClaims).toHaveBeenCalledOnce();
  });
  it.each(["/login?next=%2Fadmin", "/forgot-password", "/reset-password", "/auth/callback?code=test", "/admin"])("redirects SCA auth path %s to the main host before refresh", async path => {
    const response = await proxy(request(path, "sca.bigmattsbbq.com"));
    expect(response.headers.get("location")).toBe(`${origin}${path}`);
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });
  it("does not contact Auth for anonymous storefront traffic and strips spoofed SCA headers", async () => {
    const response = await proxy(request("/menu", "bigmattsbbq.com", false));
    expect(response.headers.get("x-middleware-request-x-sca-area")).toBeNull();
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });
  it("preserves the SCA rewrite for anonymous requests", async () => {
    const response = await proxy(request("/competitions", "sca.bigmattsbbq.com", false));
    expect(response.headers.get("x-middleware-rewrite")).toBe("https://sca.bigmattsbbq.com/sca/competitions");
    expect(response.headers.get("x-middleware-request-x-sca-area")).toBe("1");
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });
  it("continues routing when refresh fails, leaving identity checks to route guards", async () => {
    mocks.createServerClient.mockReturnValue({ auth: { getClaims: vi.fn().mockRejectedValue(new Error("Auth unavailable")) } });
    const response = await proxy(request("/admin"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
