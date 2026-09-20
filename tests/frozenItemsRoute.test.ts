import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200
    })
  }
}));

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve({ get: (_: string) => null })
}));

vi.mock("../lib/logger", () => ({
  logError: vi.fn()
}));

vi.mock("../lib/env", () => ({
  getSquareEnv: () => ({
    host: "https://connect.squareupsandbox.com",
    accessToken: "test-token",
    locationId: "loc-1",
    frozenCategoryId: "cat-frozen",
    sauceVariationId: "var-sauce",
    environment: "sandbox"
  })
}));

const searchCatalogItemsMock = vi.fn();
const mapCatalogToFrozenItemsMock = vi.fn();

const { SquareError } = vi.hoisted(() => {
  class SquareError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  return { SquareError };
});

vi.mock("../lib/square", () => ({
  searchCatalogItems: (...args: unknown[]) => searchCatalogItemsMock(...args),
  mapCatalogToFrozenItems: (...args: unknown[]) => mapCatalogToFrozenItemsMock(...args),
  SquareError
}));

import { GET } from "../app/api/frozen-items/route";
import { logError } from "../lib/logger";

describe("GET /api/frozen-items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the mapped catalog items without a remaining field", async () => {
    searchCatalogItemsMock.mockResolvedValue({ items: [], relatedObjects: [] });
    const fixture = [
      {
        itemId: "item-1",
        name: "Brisket",
        description: "",
        variations: [
          { variationId: "var-1", name: "Regular", priceCents: 1699, currency: "USD" }
        ]
      },
      {
        itemId: "item-2",
        name: "Pulled Pork",
        description: "",
        variations: [
          { variationId: "var-2", name: "Regular", priceCents: 1349, currency: "USD" }
        ]
      }
    ];
    mapCatalogToFrozenItemsMock.mockReturnValue(fixture);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.body).toEqual(fixture);
    expect(JSON.stringify(response.body)).not.toContain("remaining");

    const body = response.body as unknown as typeof fixture;
    for (const item of body) {
      for (const variation of item.variations) {
        expect("remaining" in variation).toBe(false);
      }
    }
  });

  it("calls only the catalog functions — no inventory lookup", async () => {
    searchCatalogItemsMock.mockResolvedValue({ items: [], relatedObjects: [] });
    mapCatalogToFrozenItemsMock.mockReturnValue([]);

    await GET();

    expect(searchCatalogItemsMock).toHaveBeenCalledTimes(1);
    expect(searchCatalogItemsMock).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: "cat-frozen", accessToken: "test-token" })
    );
    expect(mapCatalogToFrozenItemsMock).toHaveBeenCalledTimes(1);

    const source = readFileSync(resolve(__dirname, "../app/api/frozen-items/route.ts"), "utf8");
    expect(source).not.toMatch(/inventory|normalizers|extractVariationIds|remaining/i);
  });

  it("passes a SquareError status through with a customer-safe body", async () => {
    searchCatalogItemsMock.mockRejectedValue(new SquareError("catalog unavailable", 503));

    const response = await GET();

    expect(response.status).toBe(503);
    const body = response.body as unknown as { error: string; requestId: string };
    expect(typeof body.error).toBe("string");
    expect(body.error).not.toContain("catalog unavailable");
    expect(typeof body.requestId).toBe("string");
    expect(logError).toHaveBeenCalledTimes(1);
    const call = vi.mocked(logError).mock.calls[0];
    expect(call[2]).toBe(body.requestId);
  });
});
