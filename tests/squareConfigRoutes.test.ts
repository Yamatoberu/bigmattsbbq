import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("../lib/logger", () => ({ logError: vi.fn() }));
const { getSupabaseClient } = vi.hoisted(() => ({ getSupabaseClient: vi.fn() }));
vi.mock("../lib/supabase", () => ({ getSupabaseClient }));

import { POST } from "../app/api/checkout/route";
import { GET } from "../app/api/frozen-items/route";

const payload = {
  dropId: "a1b2c3d4-0000-4000-8000-000000000001",
  pickupOptionId: "a1b2c3d4-0000-4000-8000-000000000002",
  customer: { firstName: "Test", lastName: "Customer", email: "test@example.com" },
  cart: [{ variationId: "synthetic-variation", quantity: 1 }]
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SQUARE_ENV", "sandbox");
  vi.stubEnv("SQUARE_HOST", undefined);
  for (const key of ["SQUARE_ACCESS_TOKEN", "SQUARE_LOCATION_ID", "SQUARE_FROZEN_CATEGORY_ID", "SQUARE_SAUCE_VARIATION_ID"]) {
    vi.stubEnv(key, "synthetic");
  }
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected network call"); }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("route configuration boundary (real environment validator)", () => {
  it.each([
    { SQUARE_ENV: undefined }, { SQUARE_ENV: "invalid" },
    { SQUARE_HOST: "https://connect.squareup.com" },
    { SQUARE_HOST: "https://proxy.example" }, { SQUARE_ACCESS_TOKEN: undefined }
  ])("rejects %j before checkout database or provider access", async (settings) => {
    for (const [key, value] of Object.entries(settings)) vi.stubEnv(key, value);
    const response = await POST(new Request("http://localhost/api/checkout", {
      method: "POST", body: JSON.stringify(payload)
    }));
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: expect.any(String) });
    expect(getSupabaseClient).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();

    const catalogResponse = await GET();
    expect(catalogResponse.status).toBe(500);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["sandbox", "production"])("permits valid %s configuration to reach the drop check", async (environment) => {
    vi.stubEnv("SQUARE_ENV", environment);
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    getSupabaseClient.mockReturnValue({ from: vi.fn().mockReturnValue({ select }) });
    const response = await POST(new Request("http://localhost/api/checkout", {
      method: "POST", body: JSON.stringify(payload)
    }));
    expect(getSupabaseClient).toHaveBeenCalledOnce();
    expect(maybeSingle).toHaveBeenCalledOnce();
    expect(response.status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });
});
