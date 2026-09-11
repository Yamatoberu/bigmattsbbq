import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const contactsCreateMock = vi.fn();

type ContactsResult = {
  data: { object: "contact"; id: string } | null;
  error: { message: string; name?: string } | null;
};

function mockResend(result: ContactsResult) {
  contactsCreateMock.mockResolvedValue(result);
  vi.doMock("resend", () => ({
    Resend: class {
      contacts = { create: contactsCreateMock };
    }
  }));
  vi.doMock("server-only", () => ({}));
}

const originalFetch = globalThis.fetch;

function getSlackMessageText(): string {
  const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
  const call = fetchMock.mock.calls.find(
    (args) => args[0] === "https://hooks.slack.test/T000/B111/email"
  );
  if (!call) {
    throw new Error("No Slack fetch call was recorded");
  }
  const init = call[1] as { body: string };
  return (JSON.parse(init.body) as { text: string }).text;
}

describe("POST /api/mailing-list — Slack notification", () => {
  beforeEach(() => {
    vi.resetModules();
    contactsCreateMock.mockReset();
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_AUDIENCE_ID = "aud_test_123";
    process.env.RESEND_SEGMENT_ID = "seg_test_123";
    process.env.SLACK_EMAIL_WEBHOOK_URL = "https://hooks.slack.test/T000/B111/email";
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.doUnmock("resend");
    vi.doUnmock("server-only");
    globalThis.fetch = originalFetch;
    delete process.env.SLACK_EMAIL_WEBHOOK_URL;
  });

  it("Test 1: a successful signup posts exactly one Slack message with the subscriber's email and name", async () => {
    mockResend({ data: { object: "contact", id: "c_123" }, error: null });
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", firstName: "Matt" })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://hooks.slack.test/T000/B111/email");
    expect((init as { method: string }).method).toBe("POST");

    const text = getSlackMessageText();
    expect(text).toContain("New Email Subscriber");
    expect(text).toContain("test@example.com");
    expect(text).toContain("Matt");
  });

  it("Test 2: the message contains an ISO-8601 signup timestamp line", async () => {
    mockResend({ data: { object: "contact", id: "c_123" }, error: null });
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", firstName: "Matt" })
    });
    await POST(req);

    const text = getSlackMessageText();
    expect(text).toMatch(/Signed up: \d{4}-\d{2}-\d{2}T[\d:.]+Z/);
  });

  it("Test 3: an invalid email (400 path) returns 400 and never calls fetch", async () => {
    mockResend({ data: { object: "contact", id: "x" }, error: null });
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", firstName: "Matt" })
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("Test 4: Resend returning an error (500 path) returns 500 and never calls fetch", async () => {
    mockResend({ data: null, error: { message: "rate limited", name: "rate_limit_exceeded" } });
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ok@example.com", firstName: "Matt" })
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("Test 5: missing RESEND_AUDIENCE_ID (early 500 env path) returns 500 and never calls fetch", async () => {
    delete process.env.RESEND_AUDIENCE_ID;
    mockResend({ data: { object: "contact", id: "x" }, error: null });
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ok@example.com", firstName: "Matt" })
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("Test 6: with SLACK_EMAIL_WEBHOOK_URL unset, a successful signup still returns 200 and never calls fetch", async () => {
    delete process.env.SLACK_EMAIL_WEBHOOK_URL;
    mockResend({ data: { object: "contact", id: "c_123" }, error: null });
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ok@example.com", firstName: "Matt" })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("Test 7: a rejecting fetch still yields a 200 response with no unhandled rejection", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
    mockResend({ data: { object: "contact", id: "c_123" }, error: null });
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ok@example.com", firstName: "Matt" })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("Test 8: a firstName containing <!channel> is escaped in the Slack message", async () => {
    mockResend({ data: { object: "contact", id: "c_123" }, error: null });
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ok@example.com", firstName: "<!channel> Matt" })
    });
    await POST(req);

    const text = getSlackMessageText();
    expect(text).not.toContain("<!channel>");
    expect(text).toContain("&lt;!channel&gt; Matt");
  });
});
