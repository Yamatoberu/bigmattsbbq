import { afterEach, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Store } from "../src/store.js";
import { Worker } from "../src/worker.js";
import { CodexError } from "../src/codex.js";
import type { Config, Result } from "../src/types.js";

const cleanup: (() => void)[] = [];
afterEach(() => cleanup.splice(0).forEach(fn => fn()));

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "bbq-worker-"));
  const store = new Store(join(root, "state.sqlite"));
  cleanup.push(() => { store.close(); rmSync(root, { recursive: true, force: true }); });
  const e = store.create(123, root);
  mkdirSync(e.worktree, { recursive: true }); writeFileSync(join(e.worktree, ".git"), "gitdir: /not-mounted");
  const github = {
    verify: vi.fn().mockResolvedValue(undefined), verifyTransport: vi.fn().mockResolvedValue(undefined),
    issue: vi.fn().mockResolvedValue({ number: 123, title: "Controlled change", body: "Acceptance criteria: done" }),
    pulls: vi.fn().mockResolvedValue([]), comment: vi.fn().mockResolvedValue(undefined), label: vi.fn().mockResolvedValue(undefined)
  };
  const ready: Result = { outcome: "ready", summary: "Implemented", acceptanceEvidence: ["regression test"], question: null };
  const codex = { run: vi.fn().mockImplementation(async options => { options.onSession("persisted-session"); return JSON.stringify(ready); }) };
  const execute = vi.fn().mockImplementation(async (binary: string, args: string[]) => {
    if (binary === "gh") return "https://github.com/Yamatoberu/bigmattsbbq/pull/777";
    if (args.includes("--show-current")) return e.branch;
    if (args.includes("--cached")) return "docs/feature.md";
    if (args.includes("--name-only")) return "docs/feature.md\0";
    return "";
  });
  const config = { repository: root, stateDirectory: root, codexHome: join(root, "codex"), codexBinary: "/engine/codex",
    toolchainDirectory: root, approvedSecurityIssues: [], readyLabel: "ready-for-agent", blockedLabel: "agent-blocked",
    ownerLabel: "awaiting-owner-input", maxRetries: 3, leaseMs: 300000, enabled: true, integrationVerified: true } satisfies Config;
  return { root, store, e, github, codex, execute, ready, worker: new Worker(store, github, codex, config, execute) };
}

it("creates a PR only after checks, commit and push, then releases the coding lock", async () => {
  const f = fixture(); await f.worker.run(f.e.id);
  expect(f.store.get(f.e.id)).toMatchObject({ status: "awaiting_review", pr: 777, session: "persisted-session" });
  const calls = f.execute.mock.calls;
  const push = calls.findIndex(([, args]) => args.includes("push"));
  const pr = calls.findIndex(([binary]) => binary === "gh");
  expect(push).toBeGreaterThan(0); expect(pr).toBeGreaterThan(push);
  expect(calls.filter(([binary]) => binary === "/usr/bin/bwrap")).toHaveLength(8);
  expect(f.store.db.prepare("SELECT * FROM locks").all()).toHaveLength(0);
  expect(calls.some(([, args]) => args.includes("merge") || args.includes("--force"))).toBe(false);
});

it("preserves the session and pushed branch when PR creation fails", async () => {
  const f = fixture(); const original = f.execute.getMockImplementation()!;
  f.execute.mockImplementation(async (binary, args) => { if (binary === "gh") throw new Error("PR denied"); return original(binary, args); });
  await expect(f.worker.run(f.e.id)).rejects.toThrow("interrupted");
  expect(f.store.get(f.e.id)).toMatchObject({ status: "interrupted", session: "persisted-session", branch: f.e.branch });
  expect(f.execute.mock.calls.some(([, args]) => args.includes("push"))).toBe(true);
});

it("pauses on usage exhaustion without starting a replacement session", async () => {
  const f = fixture(); f.codex.run.mockImplementation(async options => { options.onSession("limited-session"); throw new CodexError("usage", Date.now() + 999999); });
  await expect(f.worker.run(f.e.id)).rejects.toThrow();
  expect(f.store.get(f.e.id)).toMatchObject({ status: "usage_paused", session: "limited-session", error_kind: "usage" });
  expect(f.codex.run).toHaveBeenCalledTimes(1); expect(f.execute.mock.calls.some(([binary]) => binary === "gh")).toBe(false);
});

it("opens a circuit for approval/authentication failures", async () => {
  const f = fixture(); f.codex.run.mockRejectedValue(new CodexError("authentication"));
  await expect(f.worker.run(f.e.id)).rejects.toThrow(); expect(f.store.setting("circuit")).toBe("authentication");
});

it("bounds verification correction attempts", async () => {
  const f = fixture(); const original = f.execute.getMockImplementation()!;
  f.execute.mockImplementation(async (binary, args) => { if (binary === "/usr/bin/bwrap") throw new Error("failed check"); return original(binary, args); });
  await expect(f.worker.run(f.e.id)).rejects.toThrow(); expect(f.codex.run).toHaveBeenCalledTimes(3);
  expect(f.store.get(f.e.id).error_kind).toBe("coding");
});

it("gives technical questions one reasoning continuation before asking the owner", async () => {
  const f = fixture(); f.codex.run.mockResolvedValue(JSON.stringify({ ...f.ready, outcome: "question", question: {
    kind: "technical", question: "Which module?", missingDocumentation: "Unclear boundary", options: ["A", "B"], recommendation: "A", impact: "Organization"
  } }));
  await f.worker.run(f.e.id); expect(f.codex.run).toHaveBeenCalledTimes(2);
  expect(f.store.get(f.e.id).status).toBe("waiting_technical"); expect(f.github.comment).toHaveBeenCalled();
});

it("escalates business policy without spending extra inference on the decision", async () => {
  const f = fixture(); f.codex.run.mockResolvedValue(JSON.stringify({ ...f.ready, outcome: "question", question: {
    kind: "business", question: "What price?", missingDocumentation: "No price policy", options: ["A", "B"], recommendation: "Owner sets price", impact: "Customer commitment"
  } }));
  await f.worker.run(f.e.id); expect(f.codex.run).toHaveBeenCalledTimes(1);
  expect(f.store.get(f.e.id).status).toBe("waiting_business"); expect(f.store.current()).toBeUndefined();
  expect(f.github.comment.mock.calls[0][1]).toContain(`agent-answer:${f.e.id}`);
});

it("only discards an explicitly irrecoverable session", async () => {
  const f = fixture(); f.store.update(f.e.id, { session: "corrupt" });
  f.codex.run.mockRejectedValue(new CodexError("session")); await expect(f.worker.run(f.e.id)).rejects.toThrow();
  expect(f.store.get(f.e.id).session).toBeNull(); expect(f.store.get(f.e.id).branch).toBe(f.e.branch);
});
