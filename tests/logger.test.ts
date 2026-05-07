import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logError } from "../lib/logger";
import { SquareError } from "../lib/square";

describe("logError", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("Test 1: emits name, message (outer param), stack for a plain Error; no status or body", () => {
    const err = new Error("something broke");
    logError("plain error occurred", err, "req-001");

    expect(consoleSpy).toHaveBeenCalledOnce();
    const logged = consoleSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(logged.requestId).toBe("req-001");
    expect(logged.message).toBe("plain error occurred");
    expect(logged.name).toBe("Error");
    expect(logged.stack).toBeDefined();
    // plain Error must NOT include status or body
    expect("status" in logged).toBe(false);
    expect("body" in logged).toBe(false);
  });

  it("Test 2: emits status and body when error is a SquareError", () => {
    const squareBody = { errors: [{ code: "NOT_FOUND", detail: "item not found" }] };
    const err = new SquareError("Square API request failed", 422, squareBody);
    logError("checkout failed", err, "req-002");

    expect(consoleSpy).toHaveBeenCalledOnce();
    const logged = consoleSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(logged.requestId).toBe("req-002");
    expect(logged.message).toBe("checkout failed");
    expect(logged.status).toBe(422);
    expect(logged.body).toEqual(squareBody);
  });

  it("Test 3: emits { requestId, message, error } for a non-Error value", () => {
    logError("something unexpected", "just a string", "req-003");

    expect(consoleSpy).toHaveBeenCalledOnce();
    const logged = consoleSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(logged.requestId).toBe("req-003");
    expect(logged.message).toBe("something unexpected");
    expect(logged.error).toBe("just a string");
    expect("name" in logged).toBe(false);
    expect("stack" in logged).toBe(false);
  });

  it("Test 4: SquareError log includes name and stack alongside status and body", () => {
    const squareBody = { errors: [{ code: "BAD_REQUEST" }] };
    const err = new SquareError("invalid catalog_object_id", 400, squareBody);
    logError("order creation failed", err, "req-004");

    expect(consoleSpy).toHaveBeenCalledOnce();
    const logged = consoleSpy.mock.calls[0][0] as Record<string, unknown>;
    // Outer message (log label) is preserved
    expect(logged.message).toBe("order creation failed");
    // Base Error fields preserved
    expect(logged.name).toBe("SquareError");
    expect(logged.stack).toBeDefined();
    // SquareError extra fields
    expect(logged.status).toBe(400);
    expect(logged.body).toEqual(squareBody);
  });
});
