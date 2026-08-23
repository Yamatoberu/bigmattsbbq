import { afterEach, describe, expect, it } from "vitest";
import { resolveScaRouting, SCA_AREA_HEADER, DEFAULT_SCA_HOSTNAME } from "../lib/sca/routing";

describe("resolveScaRouting", () => {
  const ORIGINAL_SCA_HOSTNAME = process.env.SCA_HOSTNAME;

  afterEach(() => {
    if (ORIGINAL_SCA_HOSTNAME === undefined) {
      delete process.env.SCA_HOSTNAME;
    } else {
      process.env.SCA_HOSTNAME = ORIGINAL_SCA_HOSTNAME;
    }
  });

  it("rewrites the sca host root path to /sca", () => {
    const result = resolveScaRouting("sca.bigmattsbbq.com", "/");
    expect(result).toEqual({ isScaArea: true, rewritePathname: "/sca" });
  });

  it("rewrites a nested path on the sca host", () => {
    const result = resolveScaRouting("sca.bigmattsbbq.com", "/competitions");
    expect(result).toEqual({ isScaArea: true, rewritePathname: "/sca/competitions" });
  });

  it("rewrites a deeply nested path on the sca host", () => {
    const result = resolveScaRouting("sca.bigmattsbbq.com", "/competitions/12");
    expect(result).toEqual({ isScaArea: true, rewritePathname: "/sca/competitions/12" });
  });

  it("strips the port from the host header", () => {
    const result = resolveScaRouting("sca.bigmattsbbq.com:3000", "/");
    expect(result).toEqual({ isScaArea: true, rewritePathname: "/sca" });
  });

  it("is case-insensitive on the host header", () => {
    const result = resolveScaRouting("SCA.BIGMATTSBBQ.COM", "/");
    expect(result).toEqual({ isScaArea: true, rewritePathname: "/sca" });
  });

  it("matches any host beginning with sca. per D-03", () => {
    const result = resolveScaRouting("sca.staging.bigmattsbbq.com", "/");
    expect(result).toEqual({ isScaArea: true, rewritePathname: "/sca" });
  });

  it("does not double-prefix when the path is already /sca", () => {
    const result = resolveScaRouting("sca.bigmattsbbq.com", "/sca");
    expect(result).toEqual({ isScaArea: true, rewritePathname: null });
  });

  it("does not double-prefix when the path is already under /sca", () => {
    const result = resolveScaRouting("sca.bigmattsbbq.com", "/sca/competitions");
    expect(result).toEqual({ isScaArea: true, rewritePathname: null });
  });

  it("leaves the storefront root untouched on the main host", () => {
    const result = resolveScaRouting("bigmattsbbq.com", "/");
    expect(result).toEqual({ isScaArea: false, rewritePathname: null });
  });

  it("leaves storefront routes untouched on the main host", () => {
    const result = resolveScaRouting("bigmattsbbq.com", "/checkout");
    expect(result).toEqual({ isScaArea: false, rewritePathname: null });
  });

  it("allows direct /sca access on the main host per D-04", () => {
    const result = resolveScaRouting("bigmattsbbq.com", "/sca");
    expect(result).toEqual({ isScaArea: true, rewritePathname: null });
  });

  it("allows direct nested /sca access on the main host per D-04", () => {
    const result = resolveScaRouting("bigmattsbbq.com", "/sca/competitions");
    expect(result).toEqual({ isScaArea: true, rewritePathname: null });
  });

  it("does not over-match a path that merely starts with /sca as a prefix of another word", () => {
    const result = resolveScaRouting("bigmattsbbq.com", "/scallops");
    expect(result).toEqual({ isScaArea: false, rewritePathname: null });
  });

  it("allows direct /sca access on localhost", () => {
    const result = resolveScaRouting("localhost:3000", "/sca");
    expect(result).toEqual({ isScaArea: true, rewritePathname: null });
  });

  it("never matches Vercel preview hosts per D-03", () => {
    const result = resolveScaRouting("big-matts-bbq-git-x.vercel.app", "/");
    expect(result).toEqual({ isScaArea: false, rewritePathname: null });
  });

  it("treats a null host header as non-sca", () => {
    const result = resolveScaRouting(null, "/");
    expect(result).toEqual({ isScaArea: false, rewritePathname: null });
  });

  it("treats an empty host header as non-sca", () => {
    const result = resolveScaRouting("", "/");
    expect(result).toEqual({ isScaArea: false, rewritePathname: null });
  });

  it("honors an explicit configuredHostname override", () => {
    const result = resolveScaRouting("sca.example.dev", "/", "sca.example.dev");
    expect(result).toEqual({ isScaArea: true, rewritePathname: "/sca" });
  });

  it("honors process.env.SCA_HOSTNAME without a configuredHostname argument", () => {
    process.env.SCA_HOSTNAME = "tracker.bigmattsbbq.com";
    const result = resolveScaRouting("tracker.bigmattsbbq.com", "/");
    expect(result).toEqual({ isScaArea: true, rewritePathname: "/sca" });
  });

  it("exposes the shared constants used by proxy.ts and app/layout.tsx", () => {
    expect(SCA_AREA_HEADER).toBe("x-sca-area");
    expect(DEFAULT_SCA_HOSTNAME).toBe("sca.bigmattsbbq.com");
  });
});
