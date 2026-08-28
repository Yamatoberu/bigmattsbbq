import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200
    })
  }
}));

vi.mock("next/headers", () => ({
  headers: () =>
    Promise.resolve({ get: (_: string) => null })
}));

vi.mock("../lib/logger", () => ({
  logError: vi.fn()
}));

const fetchActiveAttributionSourcesMock = vi.fn();

vi.mock("../lib/attributionSources", () => ({
  fetchActiveAttributionSources: (...args: unknown[]) => fetchActiveAttributionSourcesMock(...args)
}));

import { GET } from "../app/api/attribution-sources/route";
import { logError } from "../lib/logger";

describe("GET /api/attribution-sources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with the active source DTOs on success", async () => {
    const fixture = [
      { id: 1, code: "referral", label: "Friend, family, or coworker", requiresDetail: false, sortOrder: 10 },
      { id: 5, code: "ai", label: "ChatGPT or another AI", requiresDetail: true, sortOrder: 50 }
    ];
    fetchActiveAttributionSourcesMock.mockResolvedValue(fixture);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.body).toEqual(fixture);
  });

  it("returns a customer-safe 500 when the Supabase fetch fails", async () => {
    fetchActiveAttributionSourcesMock.mockRejectedValue(
      new Error("PGRST301 permission denied for table attribution_sources")
    );

    const response = await GET();

    expect(response.status).toBe(500);
    expect(typeof (response.body as { error: string }).error).toBe("string");
    expect(typeof (response.body as { requestId: string }).requestId).toBe("string");
    expect((response.body as { error: string }).error).not.toContain("PGRST301");
    expect((response.body as { error: string }).error).not.toContain("permission denied");
  });

  it("logs the failure exactly once with the same requestId as the response body", async () => {
    fetchActiveAttributionSourcesMock.mockRejectedValue(new Error("boom"));

    const response = await GET();

    expect(logError).toHaveBeenCalledTimes(1);
    const call = vi.mocked(logError).mock.calls[0];
    expect(call[2]).toBe((response.body as { requestId: string }).requestId);
  });
});
