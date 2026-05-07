import { beforeEach, describe, expect, it } from "vitest";

describe("unsubscribeToken", () => {
  beforeEach(() => {
    process.env.UNSUBSCRIBE_SECRET = "test-secret-at-least-32-characters-long-xxxxxxxxxxxxxxxxxxx";
  });

  it("signs a JWT with 3 dot-separated segments", async () => {
    const { signUnsubscribeToken } = await import("../lib/unsubscribeToken");
    const token = await signUnsubscribeToken("a@b.com");
    expect(token.split(".").length).toBe(3);
  });

  it("round-trips email through sign/verify", async () => {
    const { signUnsubscribeToken, verifyUnsubscribeToken } = await import("../lib/unsubscribeToken");
    const token = await signUnsubscribeToken("a@b.com");
    const email = await verifyUnsubscribeToken(token);
    expect(email).toBe("a@b.com");
  });

  it("rejects a tampered token", async () => {
    const { signUnsubscribeToken, verifyUnsubscribeToken } = await import("../lib/unsubscribeToken");
    const token = await signUnsubscribeToken("a@b.com");
    const parts = token.split(".");
    parts[2] = parts[2].slice(0, -4) + "XXXX";
    await expect(verifyUnsubscribeToken(parts.join("."))).rejects.toThrow();
  });

  it("rejects a token signed with a different secret", async () => {
    const { signUnsubscribeToken } = await import("../lib/unsubscribeToken");
    const token = await signUnsubscribeToken("a@b.com");
    process.env.UNSUBSCRIBE_SECRET = "different-secret-at-least-32-characters-long-yyyyyyyyyyyyyy";
    // reset module cache so verify picks up the new env
    const { verifyUnsubscribeToken } = await import("../lib/unsubscribeToken");
    await expect(verifyUnsubscribeToken(token)).rejects.toThrow();
  });

  it("throws 'Missing or too-short UNSUBSCRIBE_SECRET' when UNSUBSCRIBE_SECRET is unset", async () => {
    delete process.env.UNSUBSCRIBE_SECRET;
    delete process.env.BROADCAST_SECRET;
    const { signUnsubscribeToken } = await import("../lib/unsubscribeToken");
    await expect(signUnsubscribeToken("a@b.com")).rejects.toThrow("Missing or too-short UNSUBSCRIBE_SECRET");
  });

  it("throws 'Do NOT reuse BROADCAST_SECRET' when UNSUBSCRIBE_SECRET is unset", async () => {
    delete process.env.UNSUBSCRIBE_SECRET;
    delete process.env.BROADCAST_SECRET;
    const { signUnsubscribeToken } = await import("../lib/unsubscribeToken");
    await expect(signUnsubscribeToken("a@b.com")).rejects.toThrow("Do NOT reuse BROADCAST_SECRET");
  });

  it("throws when UNSUBSCRIBE_SECRET is shorter than 32 characters", async () => {
    process.env.UNSUBSCRIBE_SECRET = "short";
    const { signUnsubscribeToken } = await import("../lib/unsubscribeToken");
    await expect(signUnsubscribeToken("a@b.com")).rejects.toThrow("Missing or too-short UNSUBSCRIBE_SECRET");
  });

  it("throws even when only BROADCAST_SECRET is set (no fallback)", async () => {
    delete process.env.UNSUBSCRIBE_SECRET;
    process.env.BROADCAST_SECRET = "broadcast-secret-at-least-32-characters-long-zzzzzzzzzzzzz";
    const { signUnsubscribeToken } = await import("../lib/unsubscribeToken");
    await expect(signUnsubscribeToken("a@b.com")).rejects.toThrow("Missing or too-short UNSUBSCRIBE_SECRET");
  });
});
