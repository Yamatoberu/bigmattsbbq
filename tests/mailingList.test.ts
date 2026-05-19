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

describe("POST /api/mailing-list", () => {
  beforeEach(() => {
    vi.resetModules();
    contactsCreateMock.mockReset();
    process.env.RESEND_API_KEY = "re_test";
  });

  afterEach(() => {
    vi.doUnmock("resend");
    vi.doUnmock("server-only");
  });

  it("returns 200 when Resend contacts.create succeeds", async () => {
    mockResend({ data: { object: "contact", id: "c_123" }, error: null });
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "test@example.com" })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(contactsCreateMock).toHaveBeenCalledOnce();
    const call = contactsCreateMock.mock.calls[0][0];
    expect(call.email).toBe("test@example.com");
  });

  it("returns 200 silently on duplicate (Resend upsert returns no error)", async () => {
    mockResend({ data: { object: "contact", id: "c_dup" }, error: null });
    const { POST } = await import("../app/api/mailing-list/route");
    const req = new Request("http://localhost/api/mailing-list", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "dup@example.com" })
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
      body: JSON.stringify({ email: "not-an-email" })
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(contactsCreateMock).not.toHaveBeenCalled();
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
      body: JSON.stringify({ email: "ok@example.com" })
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error).not.toContain("rate limited");
  });
});
