import { describe, expect, it } from "vitest";
import { buildAttributionMetadata } from "../lib/square";

describe("buildAttributionMetadata", () => {
  it("returns undefined when code is absent", () => {
    const result = buildAttributionMetadata({});
    expect(result).toBeUndefined();
  });

  it("returns undefined when code is an empty string", () => {
    const result = buildAttributionMetadata({ code: "" });
    expect(result).toBeUndefined();
  });

  it("returns undefined when code is whitespace-only", () => {
    const result = buildAttributionMetadata({ code: "   " });
    expect(result).toBeUndefined();
  });

  it("returns only attribution_source when detail is absent", () => {
    const result = buildAttributionMetadata({ code: "ai" });
    expect(result).toBeDefined();
    expect(Object.keys(result!)).toEqual(["attribution_source"]);
    expect(result!.attribution_source).toBe("ai");
  });

  it("returns only attribution_source when detail is empty or whitespace-only", () => {
    const emptyResult = buildAttributionMetadata({ code: "ai", detail: "" });
    expect(Object.keys(emptyResult!)).toEqual(["attribution_source"]);

    const whitespaceResult = buildAttributionMetadata({ code: "ai", detail: "   " });
    expect(Object.keys(whitespaceResult!)).toEqual(["attribution_source"]);
  });

  it("returns both keys when code and detail are given", () => {
    const result = buildAttributionMetadata({ code: "ai", detail: "ChatGPT" });
    expect(result).toEqual({
      attribution_source: "ai",
      attribution_detail: "ChatGPT"
    });
  });

  it("trims surrounding whitespace on both values", () => {
    const result = buildAttributionMetadata({ code: "  ai  ", detail: "  ChatGPT  " });
    expect(result).toEqual({
      attribution_source: "ai",
      attribution_detail: "ChatGPT"
    });
  });

  it("truncates ASCII code to 60 bytes and detail to 255 bytes", () => {
    const result = buildAttributionMetadata({
      code: "x".repeat(500),
      detail: "y".repeat(9999)
    });
    expect(result).toBeDefined();
    expect(result!.attribution_source.length).toBe(60);
    expect(Buffer.byteLength(result!.attribution_source, "utf8")).toBe(60);
    expect(result!.attribution_detail!.length).toBe(255);
    expect(Buffer.byteLength(result!.attribution_detail!, "utf8")).toBe(255);
  });

  it("byte-safe truncation on emoji-heavy detail (multi-byte boundary)", () => {
    const result = buildAttributionMetadata({
      code: "ai",
      detail: "\u{1F525}".repeat(100)
    });
    expect(result).toBeDefined();
    expect(Buffer.byteLength(result!.attribution_detail!, "utf8")).toBeLessThanOrEqual(255);
    expect(result!.attribution_detail).not.toContain("�");
    expect(Buffer.from(result!.attribution_detail!, "utf8").toString("utf8")).toBe(
      result!.attribution_detail
    );
  });

  it("byte-safe truncation on CJK-heavy detail (multi-byte boundary)", () => {
    const result = buildAttributionMetadata({
      code: "ai",
      detail: "烤肉".repeat(100)
    });
    expect(result).toBeDefined();
    expect(Buffer.byteLength(result!.attribution_detail!, "utf8")).toBeLessThanOrEqual(255);
    expect(result!.attribution_detail).not.toContain("�");
    expect(Buffer.from(result!.attribution_detail!, "utf8").toString("utf8")).toBe(
      result!.attribution_detail
    );
  });

  it("never throws on non-string code/detail values", () => {
    const bogusInputs = [42, null, {}, []];
    for (const bogus of bogusInputs) {
      expect(() =>
        buildAttributionMetadata({
          code: bogus as unknown as string,
          detail: bogus as unknown as string
        })
      ).not.toThrow();
    }
  });

  it("never throws on an adversarially large 100,000-character string", () => {
    const huge = "z".repeat(100000);
    expect(() => buildAttributionMetadata({ code: huge, detail: huge })).not.toThrow();
    const result = buildAttributionMetadata({ code: huge, detail: huge });
    expect(Buffer.byteLength(result!.attribution_source, "utf8")).toBeLessThanOrEqual(60);
    expect(Buffer.byteLength(result!.attribution_detail!, "utf8")).toBeLessThanOrEqual(255);
  });
});
