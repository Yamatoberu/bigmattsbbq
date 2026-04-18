import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Mock next/server before importing the route
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200
    })
  }
}));

// Mock next/headers before importing the route
vi.mock("next/headers", () => ({
  headers: () =>
    Promise.resolve({ get: (_: string) => null })
}));

// Mock lib/env before importing the route
vi.mock("../lib/env", () => ({
  getSquareEnv: () => ({
    host: "https://connect.squareup.com",
    accessToken: "test-token",
    locationId: "loc-001"
  })
}));

// Mock lib/square before importing the route
vi.mock("../lib/square", () => ({
  searchCustomerByEmail: vi.fn(),
  createCustomer: vi.fn(),
  createOrder: vi.fn(),
  createInvoice: vi.fn(),
  publishInvoice: vi.fn(),
  SquareError: class SquareError extends Error {}
}));

// Mock lib/logger before importing the route
vi.mock("../lib/logger", () => ({
  logError: vi.fn()
}));

// Mock lib/idempotency before importing the route
vi.mock("../lib/idempotency", () => ({
  newIdempotencyKey: (_inputs?: string[]) => "idempotency-key-test"
}));

// Mutable supabase mock — tests replace supabaseMock.rpc as needed
const supabaseMock = {
  from: vi.fn(),
  rpc: vi.fn()
};

vi.mock("../lib/supabase", () => ({
  getSupabaseClient: () => supabaseMock
}));

import { cartSchema, POST } from "../app/api/checkout/route";
import { aggregateByProduct } from "../lib/cart";
import {
  searchCustomerByEmail,
  createOrder,
  createInvoice,
  publishInvoice
} from "../lib/square";

describe("cartSchema", () => {
  it("accepts items with productName pulled_pork", () => {
    const result = cartSchema.safeParse({
      variationId: "var-001",
      quantity: 2,
      productName: "pulled_pork"
    });
    expect(result.success).toBe(true);
  });

  it("accepts items with productName brisket", () => {
    const result = cartSchema.safeParse({
      variationId: "var-002",
      quantity: 1,
      productName: "brisket"
    });
    expect(result.success).toBe(true);
  });

  it("accepts items WITHOUT productName (sauce items)", () => {
    const result = cartSchema.safeParse({
      variationId: "var-sauce",
      quantity: 1
    });
    expect(result.success).toBe(true);
  });

  it("rejects items with invalid productName", () => {
    const result = cartSchema.safeParse({
      variationId: "var-003",
      quantity: 1,
      productName: "invalid_meat"
    });
    expect(result.success).toBe(false);
  });
});

describe("aggregateByProduct", () => {
  it("groups items by productName and sums quantities", () => {
    const items = [
      { variationId: "var-001", quantity: 2, productName: "pulled_pork" as const },
      { variationId: "var-002", quantity: 3, productName: "pulled_pork" as const },
      { variationId: "var-003", quantity: 1, productName: "brisket" as const }
    ];
    const result = aggregateByProduct(items);
    expect(result.get("pulled_pork")).toBe(5);
    expect(result.get("brisket")).toBe(1);
  });

  it("skips items without productName (sauce items)", () => {
    const items = [
      { variationId: "var-001", quantity: 2, productName: "pulled_pork" as const },
      { variationId: "var-sauce", quantity: 1 }
    ];
    const result = aggregateByProduct(items);
    expect(result.size).toBe(1);
    expect(result.get("pulled_pork")).toBe(2);
  });
});

// Fixture rows that satisfy the drop-gate and pickup-gate checks upstream of the RPC call.
const DROP_ID = "a1b2c3d4-0000-4000-8000-000000000001";
const PICKUP_ID = "a1b2c3d4-0000-4000-8000-000000000002";

const activeDropRow = {
  id: DROP_ID,
  status: "active",
  order_cutoff_at: "2099-12-31T23:59:59Z",
  capacity_pulled_pork: 200,
  capacity_brisket: 200,
  reserved_pulled_pork: 50,
  reserved_brisket: 50
};

const activePickupRow = {
  id: PICKUP_ID,
  location_label: "Preston",
  pickup_at: "2099-06-01T12:00:00Z",
  pickup_date: "2099-06-01",
  capacity_pulled_pork: 50,
  capacity_brisket: 50,
  reserved_pulled_pork: 10,
  reserved_brisket: 10
};

// Valid checkout request body that passes Zod validation and includes a
// productName so totals map has an entry — needed to reach the RPC call.
const validCheckoutBody = {
  dropId: DROP_ID,
  pickupOptionId: PICKUP_ID,
  customer: {
    firstName: "Matt",
    lastName: "Test",
    email: "matt@example.com"
  },
  cart: [
    { variationId: "var-001", quantity: 2, productName: "pulled_pork" }
  ]
};

function setupSuccessMocks() {
  supabaseMock.from.mockImplementation((table: string) => {
    if (table === "drops") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: activeDropRow, error: null })
          })
        })
      };
    }
    if (table === "drop_pickup_options") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: activePickupRow, error: null })
            })
          })
        })
      };
    }
    if (table === "orders") {
      return {
        insert: vi.fn().mockResolvedValue({ data: null, error: null })
      };
    }
    if (table === "mailing_list") {
      return {
        upsert: vi.fn().mockResolvedValue({ data: null, error: null })
      };
    }
    return {};
  });

  supabaseMock.rpc.mockImplementation((name: string) => {
    if (name === "reserve_pickup_slot") {
      return Promise.resolve({ data: { ok: true }, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });

  vi.mocked(searchCustomerByEmail).mockResolvedValue({ customers: [{ id: "cust-001" }] } as never);
  vi.mocked(createOrder).mockResolvedValue({ order: { id: "order-001" } } as never);
  vi.mocked(createInvoice).mockResolvedValue({ invoice: { id: "inv-001", version: 0 } } as never);
  vi.mocked(publishInvoice).mockResolvedValue({} as never);
}

describe("POST /api/checkout — RPC failure returns 409 (03-01-04)", () => {
  it("returns 409 with capacity error when reserve_pickup_slot RPC errors", async () => {
    // Arrange: supabase.from(...).select(...).eq(...).maybeSingle() chains
    // The route calls .from("drops") then .from("drop_pickup_options").
    // We build a chainable mock per .from() call.
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "drops") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: activeDropRow, error: null })
            })
          })
        };
      }
      if (table === "drop_pickup_options") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: activePickupRow, error: null })
              })
            })
          })
        };
      }
      return {};
    });

    // reserve_pickup_slot errors; release_pickup_slot succeeds (no prior reservations to roll back)
    supabaseMock.rpc.mockImplementation((name: string) => {
      if (name === "reserve_pickup_slot") {
        return Promise.resolve({ data: null, error: new Error("capacity exceeded") });
      }
      return Promise.resolve({ data: null, error: null });
    });

    // Act: build a minimal Request and call the route handler directly
    const request = new Request("http://localhost/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validCheckoutBody)
    });

    const response = await POST(request);

    // Assert: route must return 409 and not proceed to Square
    expect(response.status).toBe(409);
    expect((response.body as unknown as { error: string }).error).toBe(
      "Capacity unavailable for selected pickup."
    );
  });
});

describe("POST /api/checkout — order save (ORD-02)", () => {
  it("saves order to Supabase after successful publishInvoice", async () => {
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    setupSuccessMocks();
    const originalFrom = supabaseMock.from.getMockImplementation()!;
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "orders") {
        return { insert: insertMock };
      }
      return originalFrom(table);
    });

    const body = {
      ...validCheckoutBody,
      cart: [{ variationId: "var-001", quantity: 2, productName: "pulled_pork", priceCents: 1500 }]
    };

    const request = new Request("http://localhost/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(insertMock).toHaveBeenCalledOnce();

    const insertArg = insertMock.mock.calls[0][0] as {
      drop_id: string;
      pickup_option_id: string;
      customer_email: string;
      customer_name: string;
      square_order_id: string;
      square_invoice_id: string;
      cart_snapshot: { items: Array<{ priceCents: number }>; estimatedTotalCents: number };
    };
    expect(insertArg.drop_id).toBe(DROP_ID);
    expect(insertArg.pickup_option_id).toBe(PICKUP_ID);
    expect(insertArg.customer_email).toBe("matt@example.com");
    expect(insertArg.customer_name).toBe("Matt Test");
    expect(insertArg.square_order_id).toBe("order-001");
    expect(insertArg.square_invoice_id).toBe("inv-001");
    expect(insertArg.cart_snapshot.items[0].priceCents).toBe(1500);
    expect(insertArg.cart_snapshot.estimatedTotalCents).toBe(3000);
  });

  it("returns success even when order save fails (fire-and-forget per D-03)", async () => {
    setupSuccessMocks();
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "orders") {
        return { insert: vi.fn().mockResolvedValue({ data: null, error: new Error("DB down") }) };
      }
      if (table === "drops") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: activeDropRow, error: null })
            })
          })
        };
      }
      if (table === "drop_pickup_options") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: activePickupRow, error: null })
              })
            })
          })
        };
      }
      if (table === "mailing_list") {
        return { upsert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }
      return {};
    });

    const request = new Request("http://localhost/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validCheckoutBody)
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});

describe("POST /api/checkout — mailing list opt-in (MAIL-04)", () => {
  it("upserts mailing list when optInMailingList is true", async () => {
    const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    setupSuccessMocks();
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "mailing_list") {
        return { upsert: upsertMock };
      }
      if (table === "orders") {
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }
      if (table === "drops") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: activeDropRow, error: null })
            })
          })
        };
      }
      if (table === "drop_pickup_options") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: activePickupRow, error: null })
              })
            })
          })
        };
      }
      return {};
    });

    const body = { ...validCheckoutBody, optInMailingList: true };
    const request = new Request("http://localhost/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledOnce();
    expect(upsertMock.mock.calls[0][0]).toEqual({ email: "matt@example.com" });
  });

  it("does NOT upsert mailing list when optInMailingList is false", async () => {
    const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    setupSuccessMocks();
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "mailing_list") {
        return { upsert: upsertMock };
      }
      if (table === "orders") {
        return { insert: vi.fn().mockResolvedValue({ data: null, error: null }) };
      }
      if (table === "drops") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: activeDropRow, error: null })
            })
          })
        };
      }
      if (table === "drop_pickup_options") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: activePickupRow, error: null })
              })
            })
          })
        };
      }
      return {};
    });

    const body = { ...validCheckoutBody, optInMailingList: false };
    const request = new Request("http://localhost/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(upsertMock).not.toHaveBeenCalled();
  });
});
