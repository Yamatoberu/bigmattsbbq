import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const afterQueue = vi.hoisted(() => [] as Array<() => unknown>);

vi.mock("next/server", async (importOriginal) => {
  const original = await importOriginal<typeof import("next/server")>();
  return {
    ...original,
    after: (cb: () => unknown) => {
      afterQueue.push(cb);
      return undefined;
    }
  };
});

async function flushAfter(): Promise<void> {
  const callbacks = afterQueue.splice(0, afterQueue.length);
  for (const cb of callbacks) {
    await cb();
  }
}

const contactsCreateMock = vi.fn();
const contactsGetMock = vi.fn();
const eventsSendMock = vi.fn();

type ContactsResult = {
  data: { object: "contact"; id: string } | null;
  error: { message: string; name?: string; statusCode?: number } | null;
};

type ContactsGetResult = {
  data:
    | {
        object: "contact";
        id: string;
        email: string;
        first_name: string | null;
        unsubscribed: boolean;
        created_at: string;
      }
    | null;
  error: { message: string; name?: string; statusCode?: number } | null;
};

function mockResend(result: ContactsResult) {
  contactsCreateMock.mockResolvedValue(result);
  contactsGetMock.mockResolvedValue({
    data: null,
    error: { name: "not_found", message: "not found", statusCode: 404 }
  } satisfies ContactsGetResult);
  eventsSendMock.mockResolvedValue({
    data: { object: "event", event: "subscriber.welcome" },
    error: null
  });
  vi.doMock("resend", () => ({
    Resend: class {
      contacts = { create: contactsCreateMock, get: contactsGetMock };
      events = { send: eventsSendMock };
    }
  }));
  vi.doMock("server-only", () => ({}));
}

describe("POST /api/mailing-list", () => {
  beforeEach(() => {
    vi.resetModules();
    afterQueue.length = 0;
    contactsCreateMock.mockReset();
    contactsGetMock.mockReset();
    eventsSendMock.mockReset();
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_AUDIENCE_ID = "aud_test_123";
    process.env.RESEND_SEGMENT_ID = "seg_test_123";
  });

  afterEach(() => {
    vi.doUnmock("resend");
    vi.doUnmock("server-only");
    vi.restoreAllMocks();
  });

  it("returns 200 when Resend contacts.create succeeds", async () => {
    mockResend({ data: { object: "contact", id: "c_123" }, error: null });
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", firstName: "Matt" })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(contactsCreateMock).toHaveBeenCalledOnce();
    const call = contactsCreateMock.mock.calls[0][0];
    expect(call.email).toBe("test@example.com");
    expect(call.audienceId).toBe("aud_test_123");
    expect(call.unsubscribed).toBe(false);
    expect(call.firstName).toBe("Matt");
  });

  it("returns 200 silently on duplicate (Resend upsert returns no error)", async () => {
    mockResend({ data: { object: "contact", id: "c_dup" }, error: null });
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "dup@example.com", firstName: "Matt" })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.error).toBeUndefined();
  });

  it("returns 400 on invalid email", async () => {
    mockResend({ data: { object: "contact", id: "x" }, error: null });
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", firstName: "Matt" })
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(contactsCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 when firstName is missing", async () => {
    mockResend({ data: { object: "contact", id: "x" }, error: null });
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ok@example.com" })
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(contactsCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 when firstName is empty", async () => {
    mockResend({ data: { object: "contact", id: "x" }, error: null });
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ok@example.com", firstName: "" })
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(contactsCreateMock).not.toHaveBeenCalled();
  });

  it("returns 400 when firstName is whitespace only", async () => {
    mockResend({ data: { object: "contact", id: "x" }, error: null });
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ok@example.com", firstName: "   " })
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(contactsCreateMock).not.toHaveBeenCalled();
  });

  it("trims firstName before forwarding to contacts.create", async () => {
    mockResend({ data: { object: "contact", id: "x" }, error: null });
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ok@example.com", firstName: "  Matt  " })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(contactsCreateMock).toHaveBeenCalledOnce();
    const call = contactsCreateMock.mock.calls[0][0];
    expect(call.firstName).toBe("Matt");
  });

  it("returns 500 when Resend contacts.create returns an error", async () => {
    mockResend({
      data: null,
      error: { message: "rate limited", name: "rate_limit_exceeded" }
    });
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ok@example.com", firstName: "Matt" })
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error).not.toContain("rate limited");
  });

  it("returns 500 when RESEND_AUDIENCE_ID is unset", async () => {
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
    expect(contactsCreateMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/mailing-list — welcome automation", () => {
  beforeEach(() => {
    vi.resetModules();
    afterQueue.length = 0;
    contactsCreateMock.mockReset();
    contactsGetMock.mockReset();
    eventsSendMock.mockReset();
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_AUDIENCE_ID = "aud_test_123";
    process.env.RESEND_SEGMENT_ID = "seg_test_123";
  });

  afterEach(() => {
    vi.doUnmock("resend");
    vi.doUnmock("server-only");
    vi.restoreAllMocks();
  });

  it("triggers the welcome event exactly once for a new subscriber", async () => {
    mockResend({ data: { object: "contact", id: "c_new" }, error: null });
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "new@example.com", firstName: "Matt" })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(contactsCreateMock).toHaveBeenCalledOnce();
    await flushAfter();
    expect(eventsSendMock).toHaveBeenCalledOnce();
    expect(eventsSendMock).toHaveBeenCalledWith({
      event: "subscriber.welcome",
      email: "new@example.com",
      payload: { FIRST_NAME: "Matt" }
    });
  });

  it("does not trigger the welcome event for an already-subscribed active contact", async () => {
    mockResend({ data: { object: "contact", id: "c_dup" }, error: null });
    contactsGetMock.mockResolvedValue({
      data: {
        object: "contact",
        id: "c_dup",
        email: "new@example.com",
        first_name: "Matt",
        unsubscribed: false,
        created_at: "2026-01-01T00:00:00.000Z"
      },
      error: null
    } satisfies ContactsGetResult);
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "new@example.com", firstName: "Matt" })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(contactsCreateMock).toHaveBeenCalledOnce();
    await flushAfter();
    expect(eventsSendMock).not.toHaveBeenCalled();
  });

  it("triggers the welcome event again for a previously-unsubscribed contact re-subscribing", async () => {
    mockResend({ data: { object: "contact", id: "c_resub" }, error: null });
    contactsGetMock.mockResolvedValue({
      data: {
        object: "contact",
        id: "c_resub",
        email: "new@example.com",
        first_name: "Matt",
        unsubscribed: true,
        created_at: "2026-01-01T00:00:00.000Z"
      },
      error: null
    } satisfies ContactsGetResult);
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "new@example.com", firstName: "Matt" })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    await flushAfter();
    expect(eventsSendMock).toHaveBeenCalledOnce();
  });

  it("does not trigger the welcome event when the lookup fails with a non-not_found error", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mockResend({ data: { object: "contact", id: "c_new" }, error: null });
    contactsGetMock.mockResolvedValue({
      data: null,
      error: { name: "rate_limit_exceeded", message: "rate limited", statusCode: 429 }
    } satisfies ContactsGetResult);
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "new@example.com", firstName: "Matt" })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(contactsCreateMock).toHaveBeenCalledOnce();
    await flushAfter();
    expect(eventsSendMock).not.toHaveBeenCalled();
  });

  it("does not trigger the welcome event when contacts.create fails", async () => {
    mockResend({ data: null, error: { message: "boom", name: "internal_server_error" } });
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "new@example.com", firstName: "Matt" })
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    await flushAfter();
    expect(eventsSendMock).not.toHaveBeenCalled();
  });

  it("swallows a welcome trigger failure (rejected error result or thrown rejection) without affecting the response", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mockResend({ data: { object: "contact", id: "c_new" }, error: null });

    // (a) events.send resolves with a Resend error object
    eventsSendMock.mockResolvedValueOnce({
      data: null,
      error: { name: "validation_error", message: "bad", statusCode: 422 }
    });
    const { POST } = await import("../app/api/mailing-list/route");
    const reqA = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "new@example.com", firstName: "Matt" })
    });
    const resA = await POST(reqA);
    expect(resA.status).toBe(200);
    expect(contactsCreateMock).toHaveBeenCalledOnce();
    await expect(flushAfter()).resolves.not.toThrow();

    // (b) events.send rejects outright
    eventsSendMock.mockRejectedValueOnce(new Error("network"));
    const reqB = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "new@example.com", firstName: "Matt" })
    });
    const resB = await POST(reqB);
    expect(resB.status).toBe(200);
    expect(contactsCreateMock).toHaveBeenCalledTimes(2);
    await expect(flushAfter()).resolves.not.toThrow();
  });

  it("returns 400 on invalid body without calling contacts.get or events.send", async () => {
    mockResend({ data: { object: "contact", id: "x" }, error: null });
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", firstName: "Matt" })
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(contactsGetMock).not.toHaveBeenCalled();
    expect(eventsSendMock).not.toHaveBeenCalled();
  });
});
