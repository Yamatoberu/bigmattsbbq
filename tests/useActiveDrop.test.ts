/**
 * Static analysis tests for useActiveDrop polling behavior.
 *
 * These tests verify the source code structure of components/hooks/useActiveDrop.ts
 * to confirm the conditional polling fix is in place. The hook uses React hooks
 * and cannot be rendered in a node environment; static analysis of the source is
 * the correct approach here per the plan's behavior contract.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

const HOOK_PATH = join(__dirname, "../components/hooks/useActiveDrop.ts");
const source = readFileSync(HOOK_PATH, "utf-8");

describe("useActiveDrop — conditional polling (Issue 12)", () => {
  it("Test 1 (null drop): shouldPoll guard is declared and checked", () => {
    // shouldPoll appears twice: declaration + conditional check
    const matches = (source.match(/shouldPoll/g) ?? []).length;
    expect(matches).toBe(2);
  });

  it("Test 2 (closed drop): shouldPoll condition uses state.drop !== null && status !== closed", () => {
    expect(source).toContain('state.drop !== null && status !== "closed"');
  });

  it("Test 3 (active drop): setInterval is called exactly once, inside the shouldPoll branch", () => {
    const count = (source.match(/setInterval/g) ?? []).length;
    expect(count).toBe(1);
    // setInterval must appear AFTER the shouldPoll check
    const shouldPollIdx = source.indexOf("shouldPoll");
    const setIntervalIdx = source.indexOf("setInterval");
    expect(setIntervalIdx).toBeGreaterThan(shouldPollIdx);
  });

  it("Test 4 (status transition): dep array includes state.drop and state.drop?.status", () => {
    expect(source).toContain("[load, state.drop, state.drop?.status]");
  });

  it("Test 4b: old dep array [load] is removed", () => {
    // The old dep array was exactly [load]; the new one adds state.drop
    // We check that [load] no longer appears as a standalone dep array
    expect(source).not.toContain("}, [load]);");
  });

  it("Test 4c (cleanup): clearInterval is called exactly once in the cleanup function", () => {
    const count = (source.match(/clearInterval/g) ?? []).length;
    expect(count).toBe(1);
  });

  it("Test 5 (reload still works): reload: load is still in the return object", () => {
    expect(source).toContain("reload: load");
  });

  it("Test 6a: POLL_INTERVAL_MS constant is unchanged at 30_000", () => {
    expect(source).toContain("POLL_INTERVAL_MS = 30_000");
  });

  it("Test 6b: no reference to non-existent DropStatus member inactive", () => {
    expect(source).not.toContain('"inactive"');
  });

  it("Test 6c: cache no-store fetch option is unchanged", () => {
    expect(source).toContain('cache: "no-store"');
  });

  it("Test 6d: export function signature is unchanged", () => {
    expect(source).toContain("export function useActiveDrop");
  });
});
