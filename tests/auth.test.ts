import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), signInWithPassword: vi.fn(), signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(), updateUser: vi.fn(), exchangeCodeForSession: vi.fn(),
  assignments: vi.fn(), grants: vi.fn(), from: vi.fn()
}));
vi.mock("server-only", () => ({}));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: mocks }) }));
vi.mock("../lib/supabase", () => ({ getSupabaseClient: () => ({ from: mocks.from }) }));
import { POST } from "../app/api/auth/[action]/route";
import { GET as access } from "../app/api/admin/access/route";
import { GET as callback } from "../app/auth/callback/route";
import { safeReturnPath } from "../lib/auth/config";

const origin = "https://bigmattsbbq.com";
function post(action: string, body: object = {}, source: string | null = origin, destination = origin) {
  return POST(new NextRequest(`${destination}/api/auth/${action}`, {
    method: "POST", headers: { "content-type": "application/json", ...(source ? { origin: source } : {}) },
    body: JSON.stringify(body)
  }), { params: Promise.resolve({ action }) });
}
const credentials = { email: "test@example.com", password: "synthetic-password" };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("AUTH_SITE_URL", origin);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
  mocks.getUser.mockResolvedValue({ data: { user: { id: "test-user" } }, error: null });
  mocks.signInWithPassword.mockResolvedValue({ error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.updateUser.mockResolvedValue({ error: null });
  mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
  mocks.assignments.mockResolvedValue({ data: [{ role_id: "administrator" }], error: null });
  mocks.grants.mockResolvedValue({ data: [{ permission: "admin.access" }], error: null });
  mocks.from.mockImplementation((table: string) => table === "user_roles"
    ? { select: () => ({ eq: mocks.assignments }) }
    : { select: () => ({ in: () => ({ eq: () => ({ limit: mocks.grants }) }) }) });
});
afterEach(() => vi.unstubAllEnvs());

describe("auth mutations", () => {
  it("logs in and preserves a safe admin return path", async () => {
    const response = await post("login", { ...credentials, next: "/admin/orders?status=open" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ next: "/admin/orders?status=open" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.signInWithPassword).toHaveBeenCalledOnce();
  });
  it("returns a generic error for wrong credentials", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: { message: "internal user lookup detail" } });
    const response = await post("login", credentials);
    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).not.toContain("internal");
  });
  it("rejects malformed login before contacting Auth", async () => {
    expect((await post("login", { email: "invalid", password: "" })).status).toBe(400);
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });
  it.each(["login", "logout", "forgot-password", "reset-password"])("rejects missing and foreign Origin for %s", async action => {
    for (const source of [null, "https://evil.example"]) {
      expect((await post(action, credentials, source)).status).toBe(403);
    }
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it("rejects an untrusted destination even with the correct Origin", async () => {
    expect((await post("login", credentials, origin, "https://sca.bigmattsbbq.com")).status).toBe(403);
  });
  it("keeps recovery responses identical for success, provider error, and network failure", async () => {
    const success = await (await post("forgot-password", { email: credentials.email })).json();
    mocks.resetPasswordForEmail.mockResolvedValueOnce({ error: { message: "rate limited" } });
    expect(await (await post("forgot-password", { email: credentials.email })).json()).toEqual(success);
    mocks.resetPasswordForEmail.mockRejectedValueOnce(new Error("network error"));
    expect(await (await post("forgot-password", { email: credentials.email })).json()).toEqual(success);
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(credentials.email, { redirectTo: `${origin}/auth/callback` });
  });
  it("rejects password reset without a verified session", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await post("reset-password", { password: "new-strong-password" })).status).toBe(401);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it("updates a valid password and globally signs out", async () => {
    const response = await post("reset-password", { password: "new-strong-password" });
    expect(await response.json()).toEqual({ next: "/login?reset=success" });
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: "new-strong-password" });
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "global" });
  });
});

describe("protected access checks", () => {
  const request = () => new NextRequest(`${origin}/api/admin/access`);
  it("returns 401 for unauthenticated access before querying permissions", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await access(request())).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("returns 403 for a signed-in user without an assignment", async () => {
    mocks.assignments.mockResolvedValue({ data: [], error: null });
    expect((await access(request())).status).toBe(403);
  });
  it("rechecks current grants so revocation takes effect on the next request", async () => {
    expect((await access(request())).status).toBe(200);
    mocks.grants.mockResolvedValueOnce({ data: [], error: null });
    expect((await access(request())).status).toBe(403);
    expect(mocks.assignments).toHaveBeenCalledTimes(2);
    expect(mocks.assignments).toHaveBeenCalledWith("user_id", "test-user");
  });
  it.each(["assignments", "grants"] as const)("fails closed when %s cannot be read", async source => {
    mocks[source].mockResolvedValue({ data: null, error: { message: "database failure" } });
    expect((await access(request())).status).toBe(503);
  });
  it("does not trust administrator claims in user-controlled metadata", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "test-user", user_metadata: { role: "administrator", permissions: ["admin.access"] } } }, error: null });
    mocks.assignments.mockResolvedValue({ data: [], error: null });
    expect((await access(request())).status).toBe(403);
  });
});

describe("recovery callback", () => {
  it("exchanges a valid code and rejects a reused code", async () => {
    mocks.exchangeCodeForSession.mockResolvedValueOnce({ data: { user: { id: "test-user" } }, error: null })
      .mockResolvedValueOnce({ data: { user: null }, error: { message: "already used" } });
    const request = () => new NextRequest(`${origin}/auth/callback?code=test-code&sb_flow_id=test-flow`);
    expect((await callback(request())).headers.get("location")).toBe(`${origin}/reset-password`);
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("test-code", { flowId: "test-flow" });
    expect((await callback(request())).headers.get("location")).toBe(`${origin}/reset-password?error=invalid`);
  });
  it.each(["", "?error=expired", "?code=test&error=denied"])("rejects an invalid callback %s", async query => {
    const response = await callback(new NextRequest(`${origin}/auth/callback${query}`));
    expect(response.headers.get("location")).toBe(`${origin}/reset-password?error=invalid`);
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });
});

describe("return destination validation", () => {
  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "/admin/../../checkout", "/admin%2f..%2fcheckout", "/admin\n", "/checkout", undefined])("rejects unsafe return %s", value => {
    expect(safeReturnPath(value)).toBe("/admin");
  });
  it("preserves admin paths and drops fragments", () => {
    expect(safeReturnPath("/admin/orders?status=open#section")).toBe("/admin/orders?status=open");
  });
});

describe("account navigation status", () => {
  it("keeps logout available but hides admin when the permission store fails", async () => {
    mocks.assignments.mockResolvedValue({ data: null, error: { message: "unavailable" } });
    const { GET } = await import("../app/api/auth/[action]/route");
    const response = await GET(new NextRequest(`${origin}/api/auth/session`), { params: Promise.resolve({ action: "session" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ signedIn: true, admin: false, accessUnavailable: true });
  });
});
