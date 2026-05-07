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

vi.mock("../lib/env", () => ({
  getSquareEnv: () => ({
    host: "https://connect.squareup.com",
    accessToken: "test-token",
    locationId: "loc-001"
  })
}));

const createOrderMock = vi.fn();
const searchCustomerByEmailMock = vi.fn();
const createCustomerMock = vi.fn();
const createInvoiceMock = vi.fn();
const publishInvoiceMock = vi.fn();

vi.mock("../lib/square", () => ({
  searchCustomerByEmail: (...args: unknown[]) => searchCustomerByEmailMock(...args),
  createCustomer: (...args: unknown[]) => createCustomerMock(...args),
  createOrder: (...args: unknown[]) => createOrderMock(...args),
  createInvoice: (...args: unknown[]) => createInvoiceMock(...args),
  publishInvoice: (...args: unknown[]) => publishInvoiceMock(...args),
  SquareError: class SquareError extends Error {}
}));

vi.mock("../lib/logger", () => ({
  logError: vi.fn()
}));

vi.mock("../lib/idempotency", () => ({
  newIdempotencyKey: () => "idempotency-key-test"
}));

const supabaseMock = {
  from: vi.fn(),
  rpc: vi.fn()
};

vi.mock("../lib/supabase", () => ({
  getSupabaseClient: () => supabaseMock
}));

vi.mock("../lib/drops", () => ({
  checkDropReady: () => ({ ok: true })
}));

import { POST } from "../app/api/checkout/route";

const DROP_ID = "a1b2c3d4-0000-4000-8000-000000000001";
const PICKUP_ID = "a1b2c3d4-0000-4000-8000-000000000002";

const activeDropRow = {
  id: DROP_ID,
  status: "active",
  order_cutoff_at: "2099-12-31T23:59:59Z",
  capacity_pulled_pork: 200,
  capacity_brisket: 200,
  capacity_sauce: 200,
  capacity_family_night: 200,
  capacity_backyard_host: 200,
  capacity_freezer_filler: 200,
  reserved_pulled_pork: 0,
  reserved_brisket: 0,
  reserved_sauce: 0,
  reserved_family_night: 0,
  reserved_backyard_host: 0,
  reserved_freezer_filler: 0,
  capacity_enforced: false
};

const activePickupRow = {
  id: PICKUP_ID,
  location_label: "Preston",
  pickup_at: "2099-06-01T12:00:00Z",
  pickup_date: "2099-06-01",
  capacity_pulled_pork: 50,
  capacity_brisket: 50,
  capacity_sauce: 50,
  capacity_family_night: 50,
  capacity_backyard_host: 50,
  capacity_freezer_filler: 50,
  reserved_pulled_pork: 0,
  reserved_brisket: 0,
  reserved_sauce: 0,
  reserved_family_night: 0,
  reserved_backyard_host: 0,
  reserved_freezer_filler: 0
};

function setupSupabaseMock() {
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
  supabaseMock.rpc.mockResolvedValue({ data: null, error: null });
}

function setupSquareMocks(customerId = "cust-001", orderId = "order-001") {
  searchCustomerByEmailMock.mockResolvedValue({ customers: [{ id: customerId }] });
  createOrderMock.mockResolvedValue({ order: { id: orderId } });
  createInvoiceMock.mockResolvedValue({ invoice: { id: "inv-001", version: 1 } });
  publishInvoiceMock.mockResolvedValue({});
}

async function callCheckout(body: Record<string, unknown>) {
  const request = new Request("http://localhost/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return POST(request);
}

describe("POST /api/checkout — line_items passed to createOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSupabaseMock();
    setupSquareMocks();
  });

  it("Test 1: with packageId having bundleVariationId, createOrder receives exactly N cart line items (no phantom bundle line)", async () => {
    const cart = [
      { variationId: "V-BRISKET", quantity: 2, productName: "brisket" },
      { variationId: "V-PORK", quantity: 1, productName: "pulled_pork" }
    ];

    await callCheckout({
      dropId: DROP_ID,
      pickupOptionId: PICKUP_ID,
      packageId: "family-night",
      customer: { firstName: "Matt", lastName: "Test", email: "matt@example.com" },
      cart
    });

    expect(createOrderMock).toHaveBeenCalledOnce();
    const callBody = createOrderMock.mock.calls[0][0] as { body: { order: { line_items: unknown[] } } };
    expect(callBody.body.order.line_items.length).toBe(2);
  });

  it("Test 2: without packageId, createOrder receives exactly N cart line items (regression guard)", async () => {
    const cart = [
      { variationId: "V-BRISKET", quantity: 1, productName: "brisket" },
      { variationId: "V-PORK", quantity: 2, productName: "pulled_pork" },
      { variationId: "V-SAUCE", quantity: 1 }
    ];

    await callCheckout({
      dropId: DROP_ID,
      pickupOptionId: PICKUP_ID,
      customer: { firstName: "Matt", lastName: "Test", email: "matt@example.com" },
      cart
    });

    expect(createOrderMock).toHaveBeenCalledOnce();
    const callBody = createOrderMock.mock.calls[0][0] as { body: { order: { line_items: unknown[] } } };
    expect(callBody.body.order.line_items.length).toBe(3);
  });

  it("Test 3: each line item has only quantity and catalog_object_id (no base_price_money added by route)", async () => {
    const cart = [
      { variationId: "V-BRISKET", quantity: 2, productName: "brisket" }
    ];

    await callCheckout({
      dropId: DROP_ID,
      pickupOptionId: PICKUP_ID,
      packageId: "backyard-host",
      customer: { firstName: "Matt", lastName: "Test", email: "matt@example.com" },
      cart
    });

    expect(createOrderMock).toHaveBeenCalledOnce();
    const callBody = createOrderMock.mock.calls[0][0] as { body: { order: { line_items: unknown[] } } };
    const lineItems = callBody.body.order.line_items;
    for (const li of lineItems) {
      expect(Object.keys(li as Record<string, unknown>).sort()).toEqual(["catalog_object_id", "quantity"]);
    }
  });

  it("Test 4: cart array order is preserved verbatim in line_items", async () => {
    const cart = [
      { variationId: "V1", quantity: 1, productName: "pulled_pork" },
      { variationId: "V2", quantity: 2, productName: "brisket" }
    ];

    await callCheckout({
      dropId: DROP_ID,
      pickupOptionId: PICKUP_ID,
      customer: { firstName: "Matt", lastName: "Test", email: "matt@example.com" },
      cart
    });

    expect(createOrderMock).toHaveBeenCalledOnce();
    const callBody = createOrderMock.mock.calls[0][0] as { body: { order: { line_items: Array<{ quantity: string; catalog_object_id: string }> } } };
    const lineItems = callBody.body.order.line_items;
    expect(lineItems[0].catalog_object_id).toBe("V1");
    expect(lineItems[0].quantity).toBe("1");
    expect(lineItems[1].catalog_object_id).toBe("V2");
    expect(lineItems[1].quantity).toBe("2");
  });
});
