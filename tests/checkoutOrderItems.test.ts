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
const ORDER_ROW_ID = "a1b2c3d4-0000-4000-8000-000000000099";

const activeDropRow = {
  id: DROP_ID,
  status: "active",
  order_cutoff_at: "2099-12-31T23:59:59Z"
};

const activePickupRow = {
  id: PICKUP_ID,
  location_label: "Preston",
  pickup_start_date: "2099-06-01",
  pickup_end_date: "2099-06-01",
  pickup_date: "2099-06-01"
};

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

const ordersInsertMock = vi.fn();
const ordersUpdateMock = vi.fn();
const ordersDeleteMock = vi.fn();
const orderItemsInsertMock = vi.fn();

let insertOutcome: { data: { id: string } | null; error: unknown };
let updateOutcome: { error: unknown };
let itemsInsertOutcome: { error: unknown };
let callCountsAtCatalogTime:
  | { searchCustomerCalls: number; createOrderCalls: number; ordersInsertCalls: number }
  | undefined;
let callCountsAtItemsInsertTime: { createOrderCalls: number; ordersInsertCalls: number } | undefined;

function setupSupabaseMock() {
  insertOutcome = { data: { id: ORDER_ROW_ID }, error: null };
  updateOutcome = { error: null };
  itemsInsertOutcome = { error: null };
  callCountsAtItemsInsertTime = undefined;

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
        insert: (values: Record<string, unknown>) => {
          ordersInsertMock(values);
          return {
            select: () => ({
              single: () => Promise.resolve(insertOutcome)
            })
          };
        },
        update: (values: Record<string, unknown>) => ({
          eq: (column: string, value: unknown) => {
            ordersUpdateMock(values, column, value);
            return Promise.resolve(updateOutcome);
          }
        }),
        delete: () => ({
          eq: (column: string, value: unknown) => {
            ordersDeleteMock(column, value);
            return Promise.resolve({ error: null });
          }
        })
      };
    }
    if (table === "order_items") {
      return {
        insert: (rows: unknown[]) => {
          orderItemsInsertMock(rows);
          callCountsAtItemsInsertTime = {
            createOrderCalls: createOrderMock.mock.calls.length,
            ordersInsertCalls: ordersInsertMock.mock.calls.length
          };
          return Promise.resolve(itemsInsertOutcome);
        }
      };
    }
    return {};
  });
}

function setupSquareMocks(customerId = "cust-001", orderId = "order-001") {
  searchCustomerByEmailMock.mockResolvedValue({ customers: [{ id: customerId }] });
  searchCatalogItemsMock.mockImplementation(async () => {
    callCountsAtCatalogTime = {
      searchCustomerCalls: searchCustomerByEmailMock.mock.calls.length,
      createOrderCalls: createOrderMock.mock.calls.length,
      ordersInsertCalls: ordersInsertMock.mock.calls.length
    };
    return { items: CATALOG_ITEMS, relatedObjects: [] };
  });
  createOrderMock.mockResolvedValue({
    order: {
      id: orderId,
      total_money: { amount: 1800 },
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

const baseCheckoutBody = {
  dropId: DROP_ID,
  pickupOptionId: PICKUP_ID,
  customer: { firstName: "Matt", lastName: "Test", email: "matt@example.com" },
  cart: [{ variationId: "V-BRISKET", quantity: 2 }]
};

describe("POST /api/checkout — order_items persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callCountsAtCatalogTime = undefined;
    callCountsAtItemsInsertTime = undefined;
    setupSupabaseMock();
    setupSquareMocks();
    resolveAttributionLabelMock.mockResolvedValue(null);
    // No SLACK_ORDERS_WEBHOOK_URL set — notifySlackNewOrder short-circuits.
    delete process.env.SLACK_ORDERS_WEBHOOK_URL;
  });

  it("Test 1: the catalog lookup runs exactly once, before customer search, createOrder, or the orders insert", async () => {
    await callCheckout(baseCheckoutBody);

    expect(searchCatalogItemsMock).toHaveBeenCalledOnce();
    expect(callCountsAtCatalogTime).toBeDefined();
    expect(callCountsAtCatalogTime!.searchCustomerCalls).toBe(0);
    expect(callCountsAtCatalogTime!.createOrderCalls).toBe(0);
    expect(callCountsAtCatalogTime!.ordersInsertCalls).toBe(0);
  });

  it("Test 2: order_items are written after the orders insert and before any Square order call", async () => {
    await callCheckout(baseCheckoutBody);

    expect(orderItemsInsertMock).toHaveBeenCalledOnce();
    expect(callCountsAtItemsInsertTime).toBeDefined();
    expect(callCountsAtItemsInsertTime!.createOrderCalls).toBe(0);
    expect(callCountsAtItemsInsertTime!.ordersInsertCalls).toBe(1);
  });

  it("Test 3: a two-line cart produces exactly 2 order_items rows, in cart order, with catalog-derived fields", async () => {
    const cart = [
      { variationId: "V-BRISKET", quantity: 2 },
      { variationId: "V-PORK", quantity: 1 }
    ];

    await callCheckout({ ...baseCheckoutBody, cart });

    expect(orderItemsInsertMock).toHaveBeenCalledOnce();
    const rows = orderItemsInsertMock.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(2);

    expect(rows[0]).toMatchObject({
      order_id: ORDER_ROW_ID,
      variation_id: "V-BRISKET",
      item_id: "I-BRISKET",
      item_name: "Brisket",
      variation_name: "0.5 lb",
      unit_price_cents: 1800,
      quantity: 2
    });
    expect(rows[1]).toMatchObject({
      order_id: ORDER_ROW_ID,
      variation_id: "V-PORK",
      item_id: "I-PORK",
      item_name: "Pulled Pork",
      variation_name: "0.5 lb",
      unit_price_cents: 1200,
      quantity: 1
    });
  });

  it("Test 4: the snapshot ignores the client — a client-supplied productName cannot influence the persisted name/price", async () => {
    const cart = [{ variationId: "V-BRISKET", quantity: 1, productName: "pulled_pork" }];

    await callCheckout({ ...baseCheckoutBody, cart });

    expect(orderItemsInsertMock).toHaveBeenCalledOnce();
    const rows = orderItemsInsertMock.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);
    const row = rows[0];

    expect(row.item_name).toBe("Brisket");
    expect(row.variation_name).toBe("0.5 lb");
    expect(row.unit_price_cents).toBe(1800);
    expect(Object.keys(row).sort()).toEqual(
      [
        "item_id",
        "item_name",
        "order_id",
        "quantity",
        "unit_price_cents",
        "variation_id",
        "variation_name"
      ].sort()
    );
  });

  it("Test 5: createOrder rejecting still leaves the order_items insert already performed, marks the order failed, and issues no compensating delete", async () => {
    createOrderMock.mockRejectedValue(new Error("square down"));

    const response = (await callCheckout(baseCheckoutBody)) as unknown as { status: number };

    expect(response.status).not.toBe(200);
    expect(orderItemsInsertMock).toHaveBeenCalledOnce();
    const failedCall = ordersUpdateMock.mock.calls.find(
      (call) => (call[0] as Record<string, unknown>).order_status === "failed"
    );
    expect(failedCall).toBeDefined();
    expect(ordersDeleteMock).not.toHaveBeenCalled();
  });

  it("Test 6: a catalog lookup failure returns 500 and never reaches the orders insert, order_items insert, or customer search", async () => {
    searchCatalogItemsMock.mockRejectedValue(new Error("catalog down"));

    const response = (await callCheckout(baseCheckoutBody)) as unknown as { status: number };

    expect(response.status).toBe(500);
    expect(ordersInsertMock).not.toHaveBeenCalled();
    expect(orderItemsInsertMock).not.toHaveBeenCalled();
    expect(searchCustomerByEmailMock).not.toHaveBeenCalled();
  });

  it("Test 7: an unknown cart variationId returns a 4xx and never reaches the orders insert, order_items insert, or customer search", async () => {
    const cart = [{ variationId: "V-GHOST", quantity: 1 }];

    const response = (await callCheckout({ ...baseCheckoutBody, cart })) as unknown as {
      status: number;
    };

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(ordersInsertMock).not.toHaveBeenCalled();
    expect(orderItemsInsertMock).not.toHaveBeenCalled();
    expect(searchCustomerByEmailMock).not.toHaveBeenCalled();
  });

  it("Test 8: an order_items insert failure returns 500, deletes the just-inserted orders row, and never calls the customer search", async () => {
    itemsInsertOutcome = { error: { message: "items insert failed" } };

    const response = (await callCheckout(baseCheckoutBody)) as unknown as { status: number };

    expect(response.status).toBe(500);
    expect(ordersDeleteMock).toHaveBeenCalledWith("id", ORDER_ROW_ID);
    expect(searchCustomerByEmailMock).not.toHaveBeenCalled();
  });

  it("Test 9: the dead orderItems request field is inert — Square line_items derive from cart, and checkout still succeeds", async () => {
    const response = (await callCheckout({
      ...baseCheckoutBody,
      cart: [{ variationId: "V-BRISKET", quantity: 1 }],
      orderItems: [{ variationId: "V-GHOST", quantity: 99 }]
    })) as unknown as { status: number };

    expect(response.status).toBe(200);
    expect(createOrderMock).toHaveBeenCalledOnce();
    const callBody = createOrderMock.mock.calls[0][0] as {
      body: { order: { line_items: Array<{ catalog_object_id: string }> } };
    };
    expect(callBody.body.order.line_items).toHaveLength(1);
    expect(callBody.body.order.line_items[0].catalog_object_id).toBe("V-BRISKET");
  });
});
