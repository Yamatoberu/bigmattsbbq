import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const deferred = vi.hoisted(() => [] as Array<() => Promise<void>>);
const scheduling = vi.hoisted(() => ({ fails: false }));
vi.mock("next/server", async (importOriginal) => ({
  ...await importOriginal<typeof import("next/server")>(),
  after: (task: () => Promise<void>) => {
    if (scheduling.fails) throw new Error("Scheduling unavailable");
    deferred.push(task);
  }
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-request-id": "checkout-59" }) }));
const database = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => database }));
const contacts = vi.hoisted(() => ({ get: vi.fn(), create: vi.fn() }));
vi.mock("resend", () => ({ Resend: class { contacts = contacts; } }));

import { POST } from "../app/api/checkout/route";

const dropId = "a1b2c3d4-0000-4000-8000-000000000001";
const pickupId = "a1b2c3d4-0000-4000-8000-000000000002";
const invoiceRequests: unknown[] = [];
let invoiceFails = false;

beforeEach(() => {
  vi.resetAllMocks();
  deferred.length = 0;
  invoiceRequests.length = 0;
  invoiceFails = false;
  scheduling.fails = false;
  for (const [key, value] of Object.entries({
    SQUARE_ENV: "sandbox", SQUARE_HOST: "https://connect.squareupsandbox.com",
    SQUARE_ACCESS_TOKEN: "test-square", SQUARE_LOCATION_ID: "location",
    SQUARE_FROZEN_CATEGORY_ID: "category", SQUARE_SAUCE_VARIATION_ID: "sauce",
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-db",
    RESEND_API_KEY: "test-resend", RESEND_SEGMENT_ID: "bbq-segment", RESEND_BBQ_TOPIC_ID: "bbq-topic",
    SLACK_ORDERS_WEBHOOK_URL: ""
  })) vi.stubEnv(key, value);
  database.from.mockImplementation((table: string) => {
    const data = table === "drops" ? { id: dropId, status: "active", order_cutoff_at: "2099-01-01" }
      : table === "drop_pickup_options" ? { id: pickupId, location_label: "Preston", pickup_date: "2099-06-01", pickup_start_date: "2099-06-01", pickup_end_date: "2099-06-01" }
      : { id: "order-record" };
    const result = { data, error: null };
    const query = {
      select: () => query, eq: () => query, insert: () => query,
      update: () => query, delete: () => query,
      maybeSingle: async () => result, single: async () => result,
      then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve)
    };
    return query;
  });
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body ?? "{}"));
    if (url.endsWith("/v2/catalog/search-catalog-items")) return Response.json({ items: [{
      id: "item", type: "ITEM", item_data: { name: "Brisket", variations: [{
        id: "brisket", type: "ITEM_VARIATION", item_variation_data: { name: "0.5 lb", price_money: { amount: 1800, currency: "USD" } }
      }] }
    }] });
    if (url.endsWith("/v2/customers/search")) return Response.json({ customers: [{ id: "customer" }] });
    if (url.endsWith("/v2/orders")) return Response.json({ order: { id: "square-order" } });
    if (url.endsWith("/v2/invoices")) {
      invoiceRequests.push(body);
      return Response.json({ invoice: { id: "invoice", version: 1 } });
    }
    if (url.endsWith("/v2/invoices/invoice/publish")) {
      return invoiceFails ? Response.json({ errors: [{ code: "BAD_REQUEST" }] }, { status: 400 }) : Response.json({ invoice: { id: "invoice" } });
    }
    throw new Error(`Unexpected external request: ${url}`);
  }));
  contacts.get.mockResolvedValue({ data: null, error: { name: "not_found", statusCode: 404 } });
  contacts.create.mockResolvedValue({ data: { id: "contact" }, error: null });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function checkout(marketingOptIn: unknown) {
  return POST(new Request("http://localhost/api/checkout", {
    method: "POST", body: JSON.stringify({
      dropId, pickupOptionId: pickupId,
      customer: { firstName: "BBQ", lastName: "Fan", email: "BBQ.Fan@example.com" },
      marketingOptIn, cart: [{ variationId: "brisket", quantity: 1 }]
    })
  }));
}

describe("checkout marketing integration", () => {
  it("keeps the invoice successful if background scheduling is unavailable", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    scheduling.fails = true;
    const response = await checkout(true);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ invoiceId: "invoice" });
    expect(log).toHaveBeenCalledWith({ message: "Checkout marketing scheduling failed", requestId: "checkout-59" });
    expect(contacts.get).not.toHaveBeenCalled();
  });
  it.each([undefined, false, "true", 1, null, { checked: true }])("never subscribes without literal checked consent (%j)", async (value) => {
    const response = await checkout(value);
    expect(response.status).toBe(200);
    expect(deferred).toHaveLength(0);
    expect(contacts.get).not.toHaveBeenCalled();
  });

  it("still returns an invoice when the deferred Resend call fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    contacts.get.mockRejectedValue(new Error("customer-data@example.com"));
    const response = await checkout(true);
    await deferred[0]();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ invoiceId: "invoice" });
    expect(JSON.stringify(log.mock.calls)).not.toContain("customer-data@example.com");
  });

  it("never subscribes if invoice publication fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    invoiceFails = true;
    const response = await checkout(true);
    expect(response.status).toBe(400);
    expect(deferred).toHaveLength(0);
    expect(contacts.get).not.toHaveBeenCalled();
  });
  it("publishes the invoice before scheduling marketing and reuses the invoicing email", async () => {
    const response = await checkout(true);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ orderId: "square-order", invoiceId: "invoice" });
    expect(invoiceRequests).toEqual([expect.objectContaining({ invoice: expect.objectContaining({ delivery_method: "EMAIL" }) })]);
    expect(contacts.get).not.toHaveBeenCalled();
    expect(deferred).toHaveLength(1);
    await deferred[0]();
    expect(contacts.create).toHaveBeenCalledWith(expect.objectContaining({ email: "bbq.fan@example.com" }));
    expect(database.from.mock.calls.map(([table]) => table)).not.toContain("mailing_list");
  });
});
