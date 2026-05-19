import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const broadcastsCreateMock = vi.fn();

function mockDeps() {
  vi.doMock("resend", () => ({
    Resend: class {
      broadcasts = { create: broadcastsCreateMock };
    }
  }));
  vi.doMock("@react-email/render", () => ({
    render: vi.fn().mockResolvedValue(
      "<html><body>mock {{{RESEND_UNSUBSCRIBE_URL}}}</body></html>"
    )
  }));
  vi.doMock("../emails/DropNotificationEmail", () => ({
    DropNotificationEmail: () => null
  }));
  vi.doMock("server-only", () => ({}));
}

describe("POST /api/admin/broadcast", () => {
  beforeEach(() => {
    vi.resetModules();
    broadcastsCreateMock.mockReset();
    broadcastsCreateMock.mockResolvedValue({
      data: { id: "bcast_123" },
      error: null
    });
    process.env.BROADCAST_SECRET =
      "correct-secret-xxxxxxxxxxxxxxxxxxxxxxxxx";
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_AUDIENCE_ID = "aud_test_123";
    process.env.RESEND_SEGMENT_ID = "seg_test_123";
    process.env.EMAIL_FROM = "Big Matt's BBQ <orders@bigmattsbbq.com>";
  });

  afterEach(() => {
    vi.doUnmock("resend");
    vi.doUnmock("@react-email/render");
    vi.doUnmock("../emails/DropNotificationEmail");
    vi.doUnmock("server-only");
  });

  it("returns 401 when Authorization header is missing", async () => {
    mockDeps();
    const { POST } = await import("../app/api/admin/broadcast/route");
    const req = new Request("http://localhost/api/admin/broadcast", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subject: "Drop live" })
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(broadcastsCreateMock).not.toHaveBeenCalled();
  });

  it("returns 401 when bearer value is wrong", async () => {
    mockDeps();
    const { POST } = await import("../app/api/admin/broadcast/route");
    const req = new Request("http://localhost/api/admin/broadcast", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer wrong-secret"
      },
      body: JSON.stringify({ subject: "Drop live" })
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(broadcastsCreateMock).not.toHaveBeenCalled();
  });

  it("returns 401 when BROADCAST_SECRET env var is unset (fail closed)", async () => {
    delete process.env.BROADCAST_SECRET;
    mockDeps();
    const { POST } = await import("../app/api/admin/broadcast/route");
    const req = new Request("http://localhost/api/admin/broadcast", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer anything"
      },
      body: JSON.stringify({ subject: "x" })
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(broadcastsCreateMock).not.toHaveBeenCalled();
  });

  it("calls resend.broadcasts.create with segmentId, subject, html and send:true on success", async () => {
    mockDeps();
    const { POST } = await import("../app/api/admin/broadcast/route");
    const req = new Request("http://localhost/api/admin/broadcast", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.BROADCAST_SECRET}`
      },
      body: JSON.stringify({ subject: "Drop is live" })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(broadcastsCreateMock).toHaveBeenCalledOnce();
    const call = broadcastsCreateMock.mock.calls[0][0];
    expect(call.segmentId).toBe("seg_test_123");
    expect(call.subject).toBe("Drop is live");
    expect(call.send).toBe(true);
    expect(typeof call.html).toBe("string");
    expect(call.html).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(call.from).toBe("Big Matt's BBQ <orders@bigmattsbbq.com>");
    const body = await res.json();
    expect(body.id).toBe("bcast_123");
  });

  it("returns 500 when resend.broadcasts.create returns an error", async () => {
    mockDeps();
    broadcastsCreateMock.mockResolvedValue({
      data: null,
      error: { message: "segment not found" }
    });
    const { POST } = await import("../app/api/admin/broadcast/route");
    const req = new Request("http://localhost/api/admin/broadcast", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.BROADCAST_SECRET}`
      },
      body: JSON.stringify({ subject: "Drop is live" })
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error).not.toContain("segment not found");
  });

  it("returns 400 on missing subject", async () => {
    mockDeps();
    const { POST } = await import("../app/api/admin/broadcast/route");
    const req = new Request("http://localhost/api/admin/broadcast", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.BROADCAST_SECRET}`
      },
      body: JSON.stringify({ dropId: "d1" })
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(broadcastsCreateMock).not.toHaveBeenCalled();
  });

  it("returns 500 when RESEND_SEGMENT_ID is unset", async () => {
    delete process.env.RESEND_SEGMENT_ID;
    mockDeps();
    const { POST } = await import("../app/api/admin/broadcast/route");
    const req = new Request("http://localhost/api/admin/broadcast", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.BROADCAST_SECRET}`
      },
      body: JSON.stringify({ subject: "Drop is live" })
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(broadcastsCreateMock).not.toHaveBeenCalled();
  });
});
