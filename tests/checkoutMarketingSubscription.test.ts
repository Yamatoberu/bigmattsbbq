import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const contacts = vi.hoisted(() => ({
  get: vi.fn(), create: vi.fn(), update: vi.fn(),
  segments: { list: vi.fn(), add: vi.fn() },
  topics: { list: vi.fn(), update: vi.fn() }
}));
vi.mock("resend", () => ({ Resend: class { contacts = contacts; } }));

import { subscribeToDropUpdates } from "../lib/checkoutMarketing";

const consent = { email: "  BBQ.Fan@Example.com  ", consent: true, requestId: "request-59" };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("RESEND_API_KEY", "test-key");
  vi.stubEnv("RESEND_SEGMENT_ID", "bbq-segment");
  vi.stubEnv("RESEND_BBQ_TOPIC_ID", "bbq-topic");
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("checkout marketing subscription", () => {
  it("makes no provider requests when required marketing configuration is absent", async () => {
    vi.stubEnv("RESEND_BBQ_TOPIC_ID", "");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await subscribeToDropUpdates(consent);
    expect(contacts.get).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
  });
  it("reads every page before deciding segment membership or lifting a global unsubscribe", async () => {
    contacts.get.mockResolvedValue({ data: { id: "contact-1", unsubscribed: true }, error: null });
    contacts.segments.list.mockResolvedValueOnce({ data: { data: [{ id: "first-segment" }], has_more: true }, error: null })
      .mockResolvedValueOnce({ data: { data: [{ id: "bbq-segment" }], has_more: false }, error: null });
    contacts.topics.list.mockResolvedValueOnce({ data: { data: [{ id: "bbq-topic", subscription: "opt_out" }], has_more: true }, error: null })
      .mockResolvedValueOnce({ data: { data: [{ id: "last-topic", subscription: "opt_in" }], has_more: false }, error: null });
    contacts.topics.update.mockResolvedValue({ data: { id: "contact-1" }, error: null });
    contacts.update.mockResolvedValue({ data: { id: "contact-1" }, error: null });
    await subscribeToDropUpdates(consent);
    expect(contacts.segments.add).not.toHaveBeenCalled();
    expect(contacts.topics.update).toHaveBeenCalledWith({ id: "contact-1", topics: [
      { id: "last-topic", subscription: "opt_out" }, { id: "bbq-topic", subscription: "opt_in" }
    ] });
  });
  it("recovers concurrent creates and leaves the winning subscriber unchanged", async () => {
    const absent = { data: null, error: { name: "not_found", statusCode: 404 } };
    const existing = { data: { id: "winner", unsubscribed: false }, error: null };
    contacts.get.mockResolvedValueOnce(absent).mockResolvedValueOnce(absent).mockResolvedValue(existing);
    contacts.create.mockResolvedValueOnce({ data: { id: "winner" }, error: null })
      .mockResolvedValueOnce({ data: null, error: { name: "validation_error", statusCode: 409 } });
    contacts.segments.list.mockResolvedValue({ data: { data: [{ id: "bbq-segment" }], has_more: false }, error: null });
    contacts.topics.list.mockResolvedValue({ data: { data: [{ id: "bbq-topic", subscription: "opt_in" }], has_more: false }, error: null });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await Promise.all([subscribeToDropUpdates(consent), subscribeToDropUpdates(consent)]);
    await subscribeToDropUpdates(consent);
    expect(log).not.toHaveBeenCalled();
    expect(contacts.update).not.toHaveBeenCalled();
    expect(contacts.topics.update).not.toHaveBeenCalled();
    expect(contacts.segments.add).not.toHaveBeenCalled();
  });
  it.each(["lookup", "segments", "topics", "topic-update"])("fails closed on %s API errors before lifting a global unsubscribe", async (stage) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = { data: null, error: { name: "internal_server_error", message: "bbq.fan@example.com", statusCode: 500 } };
    contacts.get.mockResolvedValue(stage === "lookup" ? failure : { data: { id: "contact-1", unsubscribed: true }, error: null });
    contacts.segments.list.mockResolvedValue(stage === "segments" ? failure : { data: { data: [{ id: "bbq-segment" }], has_more: false }, error: null });
    contacts.topics.list.mockResolvedValue(stage === "topics" ? failure : { data: { data: [{ id: "bbq-topic", subscription: "opt_out" }], has_more: false }, error: null });
    contacts.topics.update.mockResolvedValue(failure);
    await subscribeToDropUpdates(consent);
    expect(contacts.update).not.toHaveBeenCalled();
    expect(contacts.create).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toContain("bbq.fan@example.com");
  });
  it("contains provider failures without logging customer data or changing preferences", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    contacts.get.mockRejectedValue(new Error("secret-key bbq.fan@example.com"));
    await expect(subscribeToDropUpdates(consent)).resolves.toBeUndefined();
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/secret-key|bbq.fan@example.com/);
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ requestId: "request-59" }));
    expect(contacts.create).not.toHaveBeenCalled();
    expect(contacts.update).not.toHaveBeenCalled();
  });
  it("converts a global unsubscribe to BBQ-only consent before enabling delivery", async () => {
    contacts.get.mockResolvedValue({ data: { id: "contact-1", unsubscribed: true }, error: null });
    contacts.segments.list.mockResolvedValue({ data: { data: [{ id: "bbq-segment" }], has_more: false }, error: null });
    contacts.topics.list.mockResolvedValue({ data: { data: [
      { id: "bbq-topic", subscription: "opt_out" },
      { id: "other-topic", subscription: "opt_in" },
      { id: "already-out", subscription: "opt_out" }
    ], has_more: false }, error: null });
    contacts.topics.update.mockResolvedValue({ data: { id: "contact-1" }, error: null });
    let finishTopicUpdate: (() => void) | undefined;
    contacts.topics.update.mockImplementation(() => new Promise((resolve) => {
      finishTopicUpdate = () => resolve({ data: { id: "contact-1" }, error: null });
    }));
    contacts.update.mockResolvedValue({ data: { id: "contact-1" }, error: null });
    const subscription = subscribeToDropUpdates(consent);
    await vi.waitFor(() => expect(finishTopicUpdate).toBeDefined());
    expect(contacts.update).not.toHaveBeenCalled();
    expect(contacts.topics.update).toHaveBeenCalledWith({ id: "contact-1", topics: [
      { id: "other-topic", subscription: "opt_out" },
      { id: "bbq-topic", subscription: "opt_in" }
    ] });
    finishTopicUpdate!();
    await subscription;
    expect(contacts.update).toHaveBeenCalledWith({ id: "contact-1", unsubscribed: false });
  });
  it("resubscribes the BBQ topic with fresh consent and leaves unrelated topic choices untouched", async () => {
    contacts.get.mockResolvedValue({ data: { id: "contact-1", unsubscribed: false }, error: null });
    contacts.segments.list.mockResolvedValue({ data: { data: [{ id: "bbq-segment" }], has_more: false }, error: null });
    contacts.topics.list.mockResolvedValue({ data: { data: [
      { id: "bbq-topic", subscription: "opt_out" },
      { id: "other-topic", subscription: "opt_in" }
    ], has_more: false }, error: null });
    contacts.topics.update.mockResolvedValue({ data: { id: "contact-1" }, error: null });
    await subscribeToDropUpdates(consent);
    expect(contacts.topics.update).toHaveBeenCalledWith({ id: "contact-1", topics: [{ id: "bbq-topic", subscription: "opt_in" }] });
    expect(contacts.segments.add).not.toHaveBeenCalled();
    expect(contacts.update).not.toHaveBeenCalled();
  });
  it("adds only missing BBQ membership for an existing subscriber without changing their profile", async () => {
    contacts.get.mockResolvedValue({ data: { id: "contact-1", unsubscribed: false }, error: null });
    contacts.segments.list.mockResolvedValue({ data: { data: [{ id: "other-segment" }], has_more: false }, error: null });
    contacts.topics.list.mockResolvedValue({ data: { data: [
      { id: "bbq-topic", subscription: "opt_in" },
      { id: "other-topic", subscription: "opt_out" }
    ], has_more: false }, error: null });
    contacts.segments.add.mockResolvedValue({ data: { id: "bbq-segment" }, error: null });
    await subscribeToDropUpdates(consent);
    expect(contacts.segments.add).toHaveBeenCalledWith({ contactId: "contact-1", segmentId: "bbq-segment" });
    expect(contacts.create).not.toHaveBeenCalled();
    expect(contacts.update).not.toHaveBeenCalled();
    expect(contacts.topics.update).not.toHaveBeenCalled();
  });
  it("creates a normalized contact in the BBQ segment and opts into only BBQ", async () => {
    contacts.get.mockResolvedValue({ data: null, error: { name: "not_found", statusCode: 404 } });
    contacts.create.mockResolvedValue({ data: { id: "contact-1" }, error: null });
    await subscribeToDropUpdates(consent);
    expect(contacts.create).toHaveBeenCalledWith({
      email: "bbq.fan@example.com",
      segments: [{ id: "bbq-segment" }],
      topics: [{ id: "bbq-topic", subscription: "opt_in" }]
    });
  });
  it("does not access Resend without explicit consent", async () => {
    await subscribeToDropUpdates({ ...consent, consent: false });
    expect(contacts.get).not.toHaveBeenCalled();
    expect(contacts.create).not.toHaveBeenCalled();
  });
});
