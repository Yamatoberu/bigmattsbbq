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
  from: vi.fn(),
  rpc: vi.fn()
};

vi.mock("../lib/supabase", () => ({
  getSupabaseClient: () => supabaseMock
}));

vi.mock("../lib/drops", () => ({
  checkDropReady: () => ({ ok: true })
}));

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

function makePickupRow(pickupDate: string) {
  return {
    id: PICKUP_ID,
    location_label: "Preston",
    pickup_at: `${pickupDate}T12:00:00Z`,
    pickup_date: pickupDate,
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
}

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
