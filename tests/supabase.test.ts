import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseEnv } from "../lib/env";

// Each test resets the module to clear the singleton cache.
// We use vi.resetModules() + dynamic import to get a fresh module per test.

describe("getSupabaseClient", () => {
  const ORIGINAL_URL = process.env.SUPABASE_URL;
  const ORIGINAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  afterEach(() => {
    vi.resetModules();
    if (ORIGINAL_URL === undefined) {
      delete process.env.SUPABASE_URL;
    } else {
      process.env.SUPABASE_URL = ORIGINAL_URL;
    }
    if (ORIGINAL_KEY === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = ORIGINAL_KEY;
    }
  });

  it("throws when SUPABASE_URL is missing", async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const { getSupabaseClient } = await import("../lib/supabase");
    expect(() => getSupabaseClient()).toThrow("Missing Supabase environment variables");
  });

  it("throws when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    process.env.SUPABASE_URL = "http://localhost:54321";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const { getSupabaseClient } = await import("../lib/supabase");
    expect(() => getSupabaseClient()).toThrow("Missing Supabase environment variables");
  });

  it("returns a SupabaseClient when env vars are set", async () => {
    process.env.SUPABASE_URL = "http://localhost:54321";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

    const { getSupabaseClient } = await import("../lib/supabase");
    const client = getSupabaseClient();
    expect(client).toBeTruthy();
    expect(typeof client.from).toBe("function");
  });

  it("returns the same instance on repeated calls (singleton)", async () => {
    process.env.SUPABASE_URL = "http://localhost:54321";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

    const { getSupabaseClient } = await import("../lib/supabase");
    const first = getSupabaseClient();
    const second = getSupabaseClient();
    expect(first).toBe(second);
  });
});

describe("getSupabaseEnv", () => {
  const ORIGINAL_URL = process.env.SUPABASE_URL;
  const ORIGINAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  afterEach(() => {
    if (ORIGINAL_URL === undefined) {
      delete process.env.SUPABASE_URL;
    } else {
      process.env.SUPABASE_URL = ORIGINAL_URL;
    }
    if (ORIGINAL_KEY === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = ORIGINAL_KEY;
    }
  });

  it("throws when vars are missing", () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => getSupabaseEnv()).toThrow("Missing Supabase environment variables");
  });

  it("returns url and serviceRoleKey when vars are set", () => {
    process.env.SUPABASE_URL = "http://localhost:54321";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

    const result = getSupabaseEnv();
    expect(result).toEqual({ url: "http://localhost:54321", serviceRoleKey: "test-key" });
  });
});
