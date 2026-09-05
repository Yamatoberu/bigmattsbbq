import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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
  order_cutoff_at: "2099-12-31T23:59:59Z"
};

const activePickupRow = {
  id: PICKUP_ID,
  location_label: "Preston",
  pickup_at: "2099-06-01T12:00:00Z",
  pickup_date: "2099-06-01"
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

function getSlackMessageText(): string {
  const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
  const call = fetchMock.mock.calls.find(
    (args) => args[0] === "https://hooks.slack.test/T000/B000/xxx"
  );
  if (!call) {
    throw new Error("No Slack fetch call was recorded");
  }
  const init = call[1] as { body: string };
  return (JSON.parse(init.body) as { text: string }).text;
}

const originalFetch = globalThis.fetch;

describe("POST /api/checkout — Slack attribution line", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSupabaseMock();
    setupSquareMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
    process.env.SLACK_ORDERS_WEBHOOK_URL = "https://hooks.slack.test/T000/B000/xxx";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.SLACK_ORDERS_WEBHOOK_URL;
  });

  it("Test 1: code + detail + resolved label renders 'Heard about us: <label> (<detail>)'", async () => {
    resolveAttributionLabelMock.mockResolvedValue("ChatGPT or another AI");
    const cart = [{ variationId: "V-BRISKET", quantity: 1, productName: "brisket" }];

    await callCheckout({
      dropId: DROP_ID,
      pickupOptionId: PICKUP_ID,
      customer: {
        firstName: "Matt",
        lastName: "Test",
        email: "matt@example.com",
        attributionSourceCode: "ai",
        attributionDetail: "ChatGPT"
      },
      cart
    });

    const text = getSlackMessageText();
    expect(text).toContain("Heard about us: ChatGPT or another AI (ChatGPT)");
  });

  it("Test 2: code with no detail renders label with no parenthesized suffix", async () => {
    resolveAttributionLabelMock.mockResolvedValue("Friend, family, or coworker");
    const cart = [{ variationId: "V-BRISKET", quantity: 1, productName: "brisket" }];

    await callCheckout({
      dropId: DROP_ID,
      pickupOptionId: PICKUP_ID,
      customer: {
        firstName: "Matt",
        lastName: "Test",
        email: "matt@example.com",
        attributionSourceCode: "referral"
      },
      cart
    });

    const text = getSlackMessageText();
    expect(text).toContain("Heard about us: Friend, family, or coworker");
    expect(text).not.toMatch(/Heard about us: .*\(/);
  });

  it("Test 3: no attribution submitted omits the line entirely and never calls the resolver", async () => {
    const cart = [{ variationId: "V-BRISKET", quantity: 1, productName: "brisket" }];

    await callCheckout({
      dropId: DROP_ID,
      pickupOptionId: PICKUP_ID,
      customer: { firstName: "Matt", lastName: "Test", email: "matt@example.com" },
      cart
    });

    const text = getSlackMessageText();
    expect(text).not.toContain("Heard about us");
    expect(resolveAttributionLabelMock).not.toHaveBeenCalled();
  });

  it("Test 4: resolver returning null falls back to the raw code as the label", async () => {
    resolveAttributionLabelMock.mockResolvedValue(null);
    const cart = [{ variationId: "V-BRISKET", quantity: 1, productName: "brisket" }];

    await callCheckout({
      dropId: DROP_ID,
      pickupOptionId: PICKUP_ID,
      customer: {
        firstName: "Matt",
        lastName: "Test",
        email: "matt@example.com",
        attributionSourceCode: "event"
      },
      cart
    });

    const text = getSlackMessageText();
    expect(text).toContain("Heard about us: event");
  });

  it("Test 5: Slack fetch rejecting still yields a 200 checkout response with an orderId", async () => {
    resolveAttributionLabelMock.mockResolvedValue("ChatGPT or another AI");
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
    const cart = [{ variationId: "V-BRISKET", quantity: 1, productName: "brisket" }];

    const response = (await callCheckout({
      dropId: DROP_ID,
      pickupOptionId: PICKUP_ID,
      customer: {
        firstName: "Matt",
        lastName: "Test",
        email: "matt@example.com",
        attributionSourceCode: "ai",
        attributionDetail: "ChatGPT"
      },
      cart
    })) as unknown as { status: number; body: { orderId: string } };

    expect(response.status).toBe(200);
    expect(response.body.orderId).toBeTruthy();
  });

  it("Test 6: with SLACK_ORDERS_WEBHOOK_URL unset, no fetch is attempted and checkout still returns 200", async () => {
    delete process.env.SLACK_ORDERS_WEBHOOK_URL;
    resolveAttributionLabelMock.mockResolvedValue("ChatGPT or another AI");
    const cart = [{ variationId: "V-BRISKET", quantity: 1, productName: "brisket" }];

    const response = (await callCheckout({
      dropId: DROP_ID,
      pickupOptionId: PICKUP_ID,
      customer: {
        firstName: "Matt",
        lastName: "Test",
        email: "matt@example.com",
        attributionSourceCode: "ai",
        attributionDetail: "ChatGPT"
      },
      cart
    })) as unknown as { status: number };

    expect(response.status).toBe(200);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("Test 7: Slack mrkdwn special characters in attributionDetail are escaped, not interpreted", async () => {
    resolveAttributionLabelMock.mockResolvedValue("Saw Big Matt's BBQ at an event");
    const cart = [{ variationId: "V-BRISKET", quantity: 1, productName: "brisket" }];

    await callCheckout({
      dropId: DROP_ID,
      pickupOptionId: PICKUP_ID,
      customer: {
        firstName: "Matt",
        lastName: "Test",
        email: "matt@example.com",
        attributionSourceCode: "event",
        attributionDetail: "<!channel> check <http://evil.example|this>"
      },
      cart
    });

    const text = getSlackMessageText();
    expect(text).not.toContain("<!channel>");
    expect(text).not.toContain("<http://evil.example|this>");
    expect(text).toContain("&lt;!channel&gt; check &lt;http://evil.example|this&gt;");
  });
});
