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
});
