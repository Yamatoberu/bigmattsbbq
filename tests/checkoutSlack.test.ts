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

const activePickupRow = {
  id: PICKUP_ID,
  location_label: "Preston",
  pickup_start_date: "2099-06-01",
  pickup_end_date: "2099-06-01",
  pickup_date: "2099-06-01"
};

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

  it("Test 8: a multi-day pickup window renders as an en-dash range in the Slack pickup line", async () => {
    resolveAttributionLabelMock.mockResolvedValue(null);
    const multiDayPickupRow = {
      id: PICKUP_ID,
      location_label: "Preston",
      pickup_start_date: "2099-06-01",
      pickup_end_date: "2099-06-03",
      pickup_date: "2099-06-01"
    };
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
                maybeSingle: () => Promise.resolve({ data: multiDayPickupRow, error: null })
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
    const cart = [{ variationId: "V-BRISKET", quantity: 1, productName: "brisket" }];

    await callCheckout({
      dropId: DROP_ID,
      pickupOptionId: PICKUP_ID,
      customer: { firstName: "Matt", lastName: "Test", email: "matt@example.com" },
      cart
    });

    const text = getSlackMessageText();
    expect(text).toContain("Jun 1 – Jun 3");
  });
});

describe("POST /api/checkout — Slack line items sourced from Square", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSupabaseMock();
    setupSquareMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
    process.env.SLACK_ORDERS_WEBHOOK_URL = "https://hooks.slack.test/T000/B000/xxx";
    resolveAttributionLabelMock.mockResolvedValue(null);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.SLACK_ORDERS_WEBHOOK_URL;
  });

  it("Test 9: line items render as '  • <name> × <quantity>' bullets sourced from Square's response", async () => {
    createOrderMock.mockResolvedValue({
      order: {
        id: "order-001",
        total_money: { amount: 4800 },
        line_items: [
          { name: "Brisket 0.5 lb", quantity: "2" },
          { name: "Pulled Pork 0.5 lb", quantity: "1" }
        ]
      }
    });
    const cart = [
      { variationId: "V-BRISKET", quantity: 2, productName: "brisket" },
      { variationId: "V-PORK", quantity: 1, productName: "pulled_pork" }
    ];

    await callCheckout({
      dropId: DROP_ID,
      pickupOptionId: PICKUP_ID,
      customer: { firstName: "Matt", lastName: "Test", email: "matt@example.com" },
      cart
    });

    const text = getSlackMessageText();
    expect(text).toContain("  • Brisket 0.5 lb × 2");
    expect(text).toContain("  • Pulled Pork 0.5 lb × 1");
  });

  it("Test 10: the legacy label map is gone — Square's catalog name renders, not the cart's productName label", async () => {
    createOrderMock.mockResolvedValue({
      order: {
        id: "order-001",
        total_money: { amount: 4800 },
        line_items: [{ name: "Smoked Brisket Burnt Ends", quantity: "1" }]
      }
    });
    const cart = [{ variationId: "V-BRISKET", quantity: 1, productName: "brisket" }];

    await callCheckout({
      dropId: DROP_ID,
      pickupOptionId: PICKUP_ID,
      customer: { firstName: "Matt", lastName: "Test", email: "matt@example.com" },
      cart
    });

    const text = getSlackMessageText();
    expect(text).toContain("Smoked Brisket Burnt Ends");
    expect(text).not.toContain("Brisket ×");
  });

  it("Test 11: a line-item name containing Slack mrkdwn control sequences is escaped", async () => {
    createOrderMock.mockResolvedValue({
      order: {
        id: "order-001",
        total_money: { amount: 4800 },
        line_items: [{ name: "<!channel> Brisket", quantity: "1" }]
      }
    });
    const cart = [{ variationId: "V-BRISKET", quantity: 1, productName: "brisket" }];

    await callCheckout({
      dropId: DROP_ID,
      pickupOptionId: PICKUP_ID,
      customer: { firstName: "Matt", lastName: "Test", email: "matt@example.com" },
      cart
    });

    const text = getSlackMessageText();
    expect(text).not.toContain("<!channel>");
    expect(text).toContain("&lt;!channel&gt; Brisket");
  });

  it("Test 12: createOrder resolving with no line_items key still returns 200 with no bullet lines", async () => {
    createOrderMock.mockResolvedValue({
      order: { id: "order-001", total_money: { amount: 4800 } }
    });
    const cart = [{ variationId: "V-BRISKET", quantity: 1, productName: "brisket" }];

    const response = (await callCheckout({
      dropId: DROP_ID,
      pickupOptionId: PICKUP_ID,
      customer: { firstName: "Matt", lastName: "Test", email: "matt@example.com" },
      cart
    })) as unknown as { status: number };

    expect(response.status).toBe(200);
    const text = getSlackMessageText();
    expect(text).not.toContain("  • ");
  });

  it("Test 13: total_money.amount renders a Total line; no total_money omits it entirely", async () => {
    createOrderMock.mockResolvedValue({
      order: {
        id: "order-001",
        total_money: { amount: 4800 },
        line_items: [{ name: "Brisket 0.5 lb", quantity: "1" }]
      }
    });
    const cart = [{ variationId: "V-BRISKET", quantity: 1, productName: "brisket" }];

    await callCheckout({
      dropId: DROP_ID,
      pickupOptionId: PICKUP_ID,
      customer: { firstName: "Matt", lastName: "Test", email: "matt@example.com" },
      cart
    });

    const text = getSlackMessageText();
    expect(text).toContain("Total: $48.00");

    vi.clearAllMocks();
    setupSupabaseMock();
    setupSquareMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
    resolveAttributionLabelMock.mockResolvedValue(null);
    createOrderMock.mockResolvedValue({
      order: {
        id: "order-001",
        line_items: [{ name: "Brisket 0.5 lb", quantity: "1" }]
      }
    });

    await callCheckout({
      dropId: DROP_ID,
      pickupOptionId: PICKUP_ID,
      customer: { firstName: "Matt", lastName: "Test", email: "matt@example.com" },
      cart
    });

    const textNoTotal = getSlackMessageText();
    expect(textNoTotal).not.toContain("Total:");
  });
});
