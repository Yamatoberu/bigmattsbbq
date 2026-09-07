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
    locationId: "loc-001",
    frozenCategoryId: "cat-frozen"
  })
}));

const createOrderMock = vi.fn();
const searchCustomerByEmailMock = vi.fn();
const createCustomerMock = vi.fn();
const createInvoiceMock = vi.fn();
const publishInvoiceMock = vi.fn();
const searchCatalogItemsMock = vi.fn();

vi.mock("../lib/square", async () => {
  const actual = await vi.importActual<typeof import("../lib/square")>("../lib/square");
  return {
    searchCustomerByEmail: (...args: unknown[]) => searchCustomerByEmailMock(...args),
    createCustomer: (...args: unknown[]) => createCustomerMock(...args),
    createOrder: (...args: unknown[]) => createOrderMock(...args),
    createInvoice: (...args: unknown[]) => createInvoiceMock(...args),
    publishInvoice: (...args: unknown[]) => publishInvoiceMock(...args),
    searchCatalogItems: (...args: unknown[]) => searchCatalogItemsMock(...args),
    mapCatalogToFrozenItems: actual.mapCatalogToFrozenItems,
    SquareError: class SquareError extends Error {},
    buildAttributionMetadata: actual.buildAttributionMetadata
  };
});

vi.mock("../lib/logger", () => ({
  logError: vi.fn()
}));

vi.mock("../lib/idempotency", () => ({
  newIdempotencyKey: () => "idempotency-key-test"
}));

const supabaseMock = {
  from: vi.fn()
};

vi.mock("../lib/supabase", () => ({
  getSupabaseClient: () => supabaseMock
}));

vi.mock("../lib/drops", async () => {
  const actual = await vi.importActual<typeof import("../lib/drops")>("../lib/drops");
  return {
    checkDropReady: () => ({ ok: true }),
    formatPickupWindow: actual.formatPickupWindow
  };
});

const resolveAttributionLabelMock = vi.fn();

vi.mock("../lib/attributionSources", () => ({
  resolveAttributionLabel: (...args: unknown[]) => resolveAttributionLabelMock(...args)
}));

import { POST } from "../app/api/checkout/route";

const DROP_ID = "a1b2c3d4-0000-4000-8000-000000000001";
const PICKUP_ID = "a1b2c3d4-0000-4000-8000-000000000002";

const activeDropRow = {
  id: DROP_ID,
  status: "active",
  order_cutoff_at: "2099-12-31T23:59:59Z"
};

function makePickupRow(pickupDate: string) {
  return {
    id: PICKUP_ID,
    location_label: "Preston",
    pickup_start_date: pickupDate,
    pickup_end_date: pickupDate,
    pickup_date: pickupDate
  };
}

const ORDER_ROW_ID = "a1b2c3d4-0000-4000-8000-000000000099";

const CATALOG_ITEMS = [
  {
    id: "I-BRISKET",
    type: "ITEM",
    item_data: {
      name: "Brisket",
      variations: [
        {
          id: "V-BRISKET",
          type: "ITEM_VARIATION",
          item_variation_data: { name: "0.5 lb", price_money: { amount: 1800, currency: "USD" } }
        }
      ]
    }
  },
  {
    id: "I-PORK",
    type: "ITEM",
    item_data: {
      name: "Pulled Pork",
      variations: [
        {
          id: "V-PORK",
          type: "ITEM_VARIATION",
          item_variation_data: { name: "0.5 lb", price_money: { amount: 1200, currency: "USD" } }
        }
      ]
    }
  },
  {
    id: "I-SAUCE",
    type: "ITEM",
    item_data: {
      name: "Sauce",
      variations: [
        {
          id: "V-SAUCE",
          type: "ITEM_VARIATION",
          item_variation_data: { name: "Bottle", price_money: { amount: 900, currency: "USD" } }
        }
      ]
    }
  },
  {
    id: "I-V1",
    type: "ITEM",
    item_data: {
      name: "Item One",
      variations: [
        {
          id: "V1",
          type: "ITEM_VARIATION",
          item_variation_data: { name: "Single", price_money: { amount: 1500, currency: "USD" } }
        }
      ]
    }
  },
  {
    id: "I-V2",
    type: "ITEM",
    item_data: {
      name: "Item Two",
      variations: [
        {
          id: "V2",
          type: "ITEM_VARIATION",
          item_variation_data: { name: "Single", price_money: { amount: 2500, currency: "USD" } }
        }
      ]
    }
  }
];

function setupSupabaseMock(pickupRow: ReturnType<typeof makePickupRow>) {
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
              maybeSingle: () => Promise.resolve({ data: pickupRow, error: null })
            })
          })
        })
      };
    }
    if (table === "orders") {
      return {
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: { id: ORDER_ROW_ID }, error: null })
          })
        }),
        update: () => ({
          eq: () => Promise.resolve({ error: null })
        }),
        delete: () => ({
          eq: () => Promise.resolve({ error: null })
        })
      };
    }
    if (table === "order_items") {
      return {
        insert: () => Promise.resolve({ error: null })
      };
    }
    return {};
  });
}

function setupSquareMocks(customerId = "cust-001", orderId = "order-001") {
  searchCustomerByEmailMock.mockResolvedValue({ customers: [{ id: customerId }] });
  searchCatalogItemsMock.mockResolvedValue({ items: CATALOG_ITEMS, relatedObjects: [] });
  createOrderMock.mockResolvedValue({
    order: {
      id: orderId,
      total_money: { amount: 4800 },
      line_items: [{ name: "Brisket 0.5 lb", quantity: "2" }]
    }
  });
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

function getInvoiceDueDate(): string {
  const call = createInvoiceMock.mock.calls[0];
  if (!call) {
    throw new Error("createInvoice was never called");
  }
  return call[0].body.invoice.payment_requests[0].due_date;
}

describe("POST /api/checkout — invoice due date", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAttributionLabelMock.mockResolvedValue(null);
  });

  it("Test 1: uses the selected pickup option's pickup_date as the invoice due_date", async () => {
    setupSupabaseMock(makePickupRow("2099-06-01"));
    setupSquareMocks();
    const cart = [{ variationId: "V-BRISKET", quantity: 1, productName: "brisket" }];

    await callCheckout({
      dropId: DROP_ID,
      pickupOptionId: PICKUP_ID,
      customer: { firstName: "Matt", lastName: "Test", email: "matt@example.com" },
      cart
    });

    expect(getInvoiceDueDate()).toBe("2099-06-01");
  });

  it("Test 2: due_date does not equal today's date, proving it is sourced from the pickup row rather than the clock", async () => {
    setupSupabaseMock(makePickupRow("2099-06-01"));
    setupSquareMocks();
    const cart = [{ variationId: "V-BRISKET", quantity: 1, productName: "brisket" }];

    await callCheckout({
      dropId: DROP_ID,
      pickupOptionId: PICKUP_ID,
      customer: { firstName: "Matt", lastName: "Test", email: "matt@example.com" },
      cart
    });

    const todaysDate = new Date().toISOString().slice(0, 10);
    expect(getInvoiceDueDate()).not.toBe(todaysDate);
  });

  it("Test 3: a different pickup_date yields that same date as due_date, proving the value tracks the selected pickup option", async () => {
    setupSupabaseMock(makePickupRow("2099-09-15"));
    setupSquareMocks();
    const cart = [{ variationId: "V-BRISKET", quantity: 1, productName: "brisket" }];

    await callCheckout({
      dropId: DROP_ID,
      pickupOptionId: PICKUP_ID,
      customer: { firstName: "Matt", lastName: "Test", email: "matt@example.com" },
      cart
    });

    expect(getInvoiceDueDate()).toBe("2099-09-15");
  });
});
