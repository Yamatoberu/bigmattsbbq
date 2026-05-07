/**
 * Static analysis tests for useActiveDrop polling behavior.
 *
 * These tests verify the source code structure of components/hooks/useActiveDrop.ts
 * to confirm the two-effect fix is in place (prevents infinite fetch loop). The hook
 * uses React hooks and cannot be rendered in a node environment; static analysis of
 * the source is the correct approach here per the plan's behavior contract.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

const HOOK_PATH = join(__dirname, "../components/hooks/useActiveDrop.ts");
const source = readFileSync(HOOK_PATH, "utf-8");

describe("useActiveDrop — two-effect structure (fix infinite fetch loop)", () => {
  it("Test 1 (mount-only load effect exists): source contains [load] as standalone dep array", () => {
    expect(source).toContain("}, [load]);");
  });

  it("Test 2 (polling effect dep array): dep array is [load, state.drop?.status] not [load, state.drop, state.drop?.status]", () => {
    expect(source).toContain("}, [load, state.drop?.status]);");
    expect(source).not.toContain("[load, state.drop, state.drop?.status]");
  });

  it("Test 3 (exactly two useEffect calls): source contains exactly two useEffect( invocations", () => {
    const count = (source.match(/useEffect\(/g) ?? []).length;
    expect(count).toBe(2);
  });

  it("Test 4 (load called exactly twice — mount effect + setInterval callback): void load() appears exactly twice", () => {
    const count = (source.match(/void load\(\)/g) ?? []).length;
    expect(count).toBe(2);
  });

  it("Test 5 (shouldPoll guard preserved): source contains state.drop !== null && status !== closed", () => {
    expect(source).toContain('state.drop !== null && status !== "closed"');
  });

  it("Test 6 (setInterval/clearInterval): exactly one setInterval and one clearInterval, both after shouldPoll", () => {
    const setIntervalCount = (source.match(/setInterval/g) ?? []).length;
    const clearIntervalCount = (source.match(/clearInterval/g) ?? []).length;
    expect(setIntervalCount).toBe(1);
    expect(clearIntervalCount).toBe(1);
    const shouldPollIdx = source.indexOf("shouldPoll");
    const setIntervalIdx = source.indexOf("setInterval");
    expect(setIntervalIdx).toBeGreaterThan(shouldPollIdx);
  });

  it("Test 7 (reload still works): reload: load is in the return object", () => {
    expect(source).toContain("reload: load");
  });

  it("Test 8 (POLL_INTERVAL_MS unchanged): constant is still 30_000", () => {
    expect(source).toContain("POLL_INTERVAL_MS = 30_000");
  });

  it("Test 9 (cache no-store unchanged): fetch option is still no-store", () => {
    expect(source).toContain('cache: "no-store"');
  });

  it("Test 10 (export signature unchanged): export function useActiveDrop is present", () => {
    expect(source).toContain("export function useActiveDrop");
  });

  it("Test 11 (no reference to inactive): source does not contain the string inactive", () => {
    expect(source).not.toContain('"inactive"');
  });
});
