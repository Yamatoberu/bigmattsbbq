import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type InsertResult = { error: { code?: string; message: string } | null };

function buildMockClient(insertResult: InsertResult) {
  return {
    from: () => ({
      insert: () => Promise.resolve(insertResult)
    })
  };
}

function mockSupabase(client: ReturnType<typeof buildMockClient>) {
  vi.doMock("../lib/supabase", () => ({ getSupabaseClient: () => client }));
  vi.doMock("server-only", () => ({}));
}

describe("POST /api/mailing-list", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => {
    vi.doUnmock("../lib/supabase");
    vi.doUnmock("server-only");
  });

  it("returns 200 on successful insert", async () => {
    mockSupabase(buildMockClient({ error: null }));
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "test@example.com" })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("returns 200 silently on duplicate email (23505)", async () => {
    mockSupabase(buildMockClient({ error: { code: "23505", message: "duplicate key" } }));
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "dup@example.com" })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.error).toBeUndefined();
  });

  it("returns 400 on invalid email", async () => {
    mockSupabase(buildMockClient({ error: null }));
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "not-an-email" })
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 on unexpected Supabase error", async () => {
    mockSupabase(buildMockClient({ error: { code: "42P01", message: "relation does not exist" } }));
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ok@example.com" })
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error).not.toContain("relation does not exist"); // don't leak DB internals
  });
});
