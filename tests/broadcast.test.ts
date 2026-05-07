import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const resendSendMock = vi.fn();

function mockDeps(subscribers: Array<{ email: string }>) {
  vi.doMock("../lib/supabase", () => ({
    getSupabaseClient: () => ({
      from: (table: string) => {
        if (table === "mailing_list") {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: subscribers, error: null })
            })
          };
        }
        if (table === "email_logs") {
          return { insert: () => Promise.resolve({ error: null }) };
        }
        return {};
      }
    })
  }));
  vi.doMock("server-only", () => ({}));
  vi.doMock("resend", () => ({
    Resend: class { emails = { send: resendSendMock }; }
  }));
}

describe("POST /api/admin/broadcast", () => {
  beforeEach(() => {
    vi.resetModules();
    resendSendMock.mockReset();
    resendSendMock.mockResolvedValue({ data: { id: "msg_123" }, error: null });
    process.env.BROADCAST_SECRET = "correct-secret-xxxxxxxxxxxxxxxxxxxxxxxxx";
    process.env.UNSUBSCRIBE_SECRET = "unsub-secret-at-least-32-characters-long-xxxxxxxxxxxxxx";
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Big Matt's BBQ <orders@bigmattsbbq.com>";
  });

  afterEach(() => {
    vi.doUnmock("../lib/supabase");
    vi.doUnmock("server-only");
    vi.doUnmock("resend");
  });

  it("returns 401 when Authorization header is missing", async () => {
    mockDeps([{ email: "a@b.com" }]);
    const { POST } = await import("../app/api/admin/broadcast/route");
    const req = new Request("http://localhost/api/admin/broadcast", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dropId: "d1" })
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(resendSendMock).not.toHaveBeenCalled();
  });

  it("returns 401 when bearer value is wrong", async () => {
    mockDeps([{ email: "a@b.com" }]);
    const { POST } = await import("../app/api/admin/broadcast/route");
    const req = new Request("http://localhost/api/admin/broadcast", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer wrong-secret"
      },
      body: JSON.stringify({ dropId: "d1" })
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(resendSendMock).not.toHaveBeenCalled();
  });

  it("passes auth with correct bearer", async () => {
    mockDeps([]); // empty subscribers list
    const { POST } = await import("../app/api/admin/broadcast/route");
    const req = new Request("http://localhost/api/admin/broadcast", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer correct-secret-xxxxxxxxxxxxxxxxxxxxxxxxx"
      },
      body: JSON.stringify({ subject: "Drop live", html: "<p>Order now</p>" })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(resendSendMock).not.toHaveBeenCalled(); // no subscribers → no sends
  });

  it("strips <script> tags from html before sending", async () => {
    mockDeps([{ email: "sub@example.com" }]);
    const { POST } = await import("../app/api/admin/broadcast/route");
    const req = new Request("http://localhost/api/admin/broadcast", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.BROADCAST_SECRET}`
      },
      body: JSON.stringify({
        subject: "Drop live",
        html: '<p>Order now</p><script>alert("xss")</script>'
      })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const sentHtml: string = resendSendMock.mock.calls[0][0].html;
    expect(sentHtml).not.toContain("<script>");
    expect(sentHtml).toContain("<p>Order now</p>");
  });

  it("strips javascript: href from links before sending", async () => {
    mockDeps([{ email: "sub@example.com" }]);
    const { POST } = await import("../app/api/admin/broadcast/route");
    const req = new Request("http://localhost/api/admin/broadcast", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.BROADCAST_SECRET}`
      },
      body: JSON.stringify({
        subject: "Drop live",
        html: '<a href="javascript:alert(1)">click me</a>'
      })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const sentHtml: string = resendSendMock.mock.calls[0][0].html;
    expect(sentHtml).not.toContain("javascript:");
    expect(sentHtml).toContain("click me");
  });

  it("returns 401 when BROADCAST_SECRET env var is unset (fail closed)", async () => {
    delete process.env.BROADCAST_SECRET;
    mockDeps([{ email: "a@b.com" }]);
    const { POST } = await import("../app/api/admin/broadcast/route");
    const req = new Request("http://localhost/api/admin/broadcast", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer anything"
      },
      body: JSON.stringify({ subject: "x", html: "y" })
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(resendSendMock).not.toHaveBeenCalled();
  });
});
