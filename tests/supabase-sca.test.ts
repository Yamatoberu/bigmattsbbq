import { afterEach, describe, expect, it, vi } from "vitest";

// "server-only" throws unconditionally when resolved outside a "react-server"
// module graph (which is how Vitest resolves it under environment: "node").
// Mock it to a no-op so lib/supabase-sca.ts can be imported in tests, exactly
// as Next.js's own build/runtime would treat it as a no-op on the server.
vi.mock("server-only", () => ({}));

// Each test resets the module to clear the singleton cache.
// We use vi.resetModules() + dynamic import to get a fresh module per test.

describe("getScaSupabaseClient", () => {
  const ORIGINAL_URL = process.env.SUPABASE_URL;
  const ORIGINAL_PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const ORIGINAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  afterEach(() => {
    vi.resetModules();
    if (ORIGINAL_URL === undefined) {
      delete process.env.SUPABASE_URL;
    } else {
      process.env.SUPABASE_URL = ORIGINAL_URL;
    }
    if (ORIGINAL_PUBLIC_URL === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_PUBLIC_URL;
    }
    if (ORIGINAL_KEY === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = ORIGINAL_KEY;
    }
  });

  it("throws when SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL are both missing", async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

    const { getScaSupabaseClient } = await import("../lib/supabase-sca");
    expect(() => getScaSupabaseClient()).toThrow(
      "Missing Supabase environment variables. Check SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY."
    );
  });

  it("throws when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const { getScaSupabaseClient } = await import("../lib/supabase-sca");
    expect(() => getScaSupabaseClient()).toThrow(
      "Missing Supabase environment variables. Check SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY."
    );
  });

  it("returns the same instance on repeated calls (singleton)", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

    const { getScaSupabaseClient } = await import("../lib/supabase-sca");
    const first = getScaSupabaseClient();
    const second = getScaSupabaseClient();
    expect(first).toBe(second);
  });

  it("scopes the client to the sca schema", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

    const { getScaSupabaseClient } = await import("../lib/supabase-sca");
    const client = getScaSupabaseClient();

    const acceptProfile = (client.from("chef").select("*") as any).headers?.get?.(
      "Accept-Profile"
    );
    if (acceptProfile) {
      expect(acceptProfile).toBe("sca");
    } else {
      expect((client as any).rest.schemaName).toBe("sca");
    }
  });
});
