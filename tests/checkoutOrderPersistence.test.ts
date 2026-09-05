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

vi.mock("../lib/square", async () => {
  const actual = await vi.importActual<typeof import("../lib/square")>("../lib/square");
  return {
    searchCustomerByEmail: (...args: unknown[]) => searchCustomerByEmailMock(...args),
    createCustomer: (...args: unknown[]) => createCustomerMock(...args),
    createOrder: (...args: unknown[]) => createOrderMock(...args),
    createInvoice: (...args: unknown[]) => createInvoiceMock(...args),
    publishInvoice: (...args: unknown[]) => publishInvoiceMock(...args),
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

const ordersInsertMock = vi.fn();
const ordersUpdateMock = vi.fn();

let insertOutcome: { data: { id: string } | null; error: unknown };
let updateOutcome: { error: unknown };
let callCountsAtInsertTime: { searchCustomerCalls: number; createOrderCalls: number } | undefined;

function setupSupabaseMock() {
  insertOutcome = { data: { id: ORDER_ROW_ID }, error: null };
  updateOutcome = { error: null };
  callCountsAtInsertTime = undefined;

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
          callCountsAtInsertTime = {
            searchCustomerCalls: searchCustomerByEmailMock.mock.calls.length,
            createOrderCalls: createOrderMock.mock.calls.length
          };
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
        })
      };
    }
    return {};
  });
}

function setupSquareMocks(customerId = "cust-001", orderId = "order-001") {
  searchCustomerByEmailMock.mockResolvedValue({ customers: [{ id: customerId }] });
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

const baseCheckoutBody = {
  dropId: DROP_ID,
  pickupOptionId: PICKUP_ID,
  customer: { firstName: "Matt", lastName: "Test", email: "matt@example.com" },
  cart: [{ variationId: "V-BRISKET", quantity: 2, productName: "brisket" }]
};

describe("POST /api/checkout — Supabase order persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSupabaseMock();
    setupSquareMocks();
    resolveAttributionLabelMock.mockResolvedValue(null);
    // No SLACK_ORDERS_WEBHOOK_URL set — notifySlackNewOrder short-circuits.
    delete process.env.SLACK_ORDERS_WEBHOOK_URL;
  });

  it("Test 1: a successful checkout inserts exactly one orders row with the expected shape", async () => {
    await callCheckout(baseCheckoutBody);

    expect(ordersInsertMock).toHaveBeenCalledOnce();
    const insertValues = ordersInsertMock.mock.calls[0][0] as Record<string, unknown>;

    expect(insertValues.drop_id).toBe(DROP_ID);
    expect(insertValues.pickup_option_id).toBe(PICKUP_ID);
    expect(insertValues.customer_email).toBe("matt@example.com");
    expect(insertValues.customer_name).toBe("Matt Test");
    expect(insertValues.cart_snapshot).toEqual(baseCheckoutBody.cart);
    expect(insertValues.order_status).toBe("pending");
    expect(insertValues.payment_status).toBe("unpaid");
    expect(insertValues.square_order_id ?? null).toBeNull();
    expect(insertValues.square_invoice_id ?? null).toBeNull();
    expect(insertValues.total_amount_cents ?? null).toBeNull();
  });

  it("Test 2: the insert happens before any Square API call", async () => {
    await callCheckout(baseCheckoutBody);

    expect(ordersInsertMock).toHaveBeenCalledOnce();
    expect(callCountsAtInsertTime).toBeDefined();
    expect(callCountsAtInsertTime!.searchCustomerCalls).toBe(0);
    expect(callCountsAtInsertTime!.createOrderCalls).toBe(0);
  });

  it("Test 3: after createOrder resolves, an update carries square_order_id and total_amount_cents against the inserted row id", async () => {
    await callCheckout(baseCheckoutBody);

    const matchingCall = ordersUpdateMock.mock.calls.find(
      (call) => (call[0] as Record<string, unknown>).square_order_id !== undefined
    );
    expect(matchingCall).toBeDefined();
    const [values, column, value] = matchingCall!;
    expect((values as Record<string, unknown>).square_order_id).toBe("order-001");
    expect((values as Record<string, unknown>).total_amount_cents).toBe(4800);
    expect(column).toBe("id");
    expect(value).toBe(ORDER_ROW_ID);
  });

  it("Test 4: after publishInvoice resolves, a further update carries square_invoice_id and order_status invoiced; payment_status is never written by an update", async () => {
    await callCheckout(baseCheckoutBody);

    const invoicedCall = ordersUpdateMock.mock.calls.find(
      (call) => (call[0] as Record<string, unknown>).order_status === "invoiced"
    );
    expect(invoicedCall).toBeDefined();
    const values = invoicedCall![0] as Record<string, unknown>;
    expect(values.square_invoice_id).toBe("inv-001");
    expect(values.order_status).toBe("invoiced");

    for (const call of ordersUpdateMock.mock.calls) {
      expect((call[0] as Record<string, unknown>).payment_status).toBeUndefined();
    }
  });

  it("Test 5: createOrder rejecting marks the row failed, returns non-200, and never marks it invoiced", async () => {
    createOrderMock.mockRejectedValue(new Error("square down"));

    const response = (await callCheckout(baseCheckoutBody)) as unknown as { status: number };

    expect(response.status).not.toBe(200);
    const failedCall = ordersUpdateMock.mock.calls.find(
      (call) => (call[0] as Record<string, unknown>).order_status === "failed"
    );
    expect(failedCall).toBeDefined();
    const invoicedCall = ordersUpdateMock.mock.calls.find(
      (call) => (call[0] as Record<string, unknown>).order_status === "invoiced"
    );
    expect(invoicedCall).toBeUndefined();
  });

  it("Test 6: publishInvoice rejecting also marks the row failed", async () => {
    publishInvoiceMock.mockRejectedValue(new Error("square down"));

    const response = (await callCheckout(baseCheckoutBody)) as unknown as { status: number };

    expect(response.status).not.toBe(200);
    const failedCall = ordersUpdateMock.mock.calls.find(
      (call) => (call[0] as Record<string, unknown>).order_status === "failed"
    );
    expect(failedCall).toBeDefined();
  });

  it("Test 7: the insert erroring returns HTTP 500 and never calls createOrder", async () => {
    insertOutcome = { data: null, error: { message: "insert failed" } };

    const response = (await callCheckout(baseCheckoutBody)) as unknown as { status: number };

    expect(response.status).toBe(500);
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it("Test 8: an update erroring (best-effort) still yields a 200 response carrying an orderId", async () => {
    updateOutcome = { error: { message: "update failed" } };

    const response = (await callCheckout(baseCheckoutBody)) as unknown as {
      status: number;
      body: { orderId: string };
    };

    expect(response.status).toBe(200);
    expect(response.body.orderId).toBeTruthy();
  });
});
