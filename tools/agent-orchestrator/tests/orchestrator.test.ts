import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/store.js";
import { Orchestrator } from "../src/orchestrator.js";
import { classify, dependencies, prioritize, retryAt } from "../src/policy.js";
import { cleanEnvironment, parseResult } from "../src/codex.js";
import { protectedChange } from "../src/worker.js";
import { processAlive, processIdentity } from "../src/process.js";
import type { Config, Issue } from "../src/types.js";

const config: Config = {
  repository: "/tmp/repository", stateDirectory: "/tmp/state", codexHome: "/tmp/codex",
  codexBinary: "/usr/bin/codex", toolchainDirectory: "/tmp/toolchain", approvedSecurityIssues: [],
  readyLabel: "ready-for-agent", blockedLabel: "agent-blocked", ownerLabel: "awaiting-owner-input",
  maxRetries: 3, leaseMs: 300000, enabled: true, integrationVerified: true
};

function issue(number = 1, body = "Implement a small documented improvement following the existing architecture.\nAcceptance criteria: add regression coverage."): Issue {
  return { number, title: `Issue ${number}`, body, url: `https://github.com/Yamatoberu/bigmattsbbq/issues/${number}`,
    state: "OPEN", createdAt: "2026-01-01", labels: [{ name: "ready-for-agent" }] };
}

const stores: Store[] = [];
const paths: string[] = [];
afterEach(() => { for (const s of stores.splice(0)) s.close(); for (const p of paths.splice(0)) rmSync(p, { recursive: true, force: true }); });

function setup(custom: Partial<Config> = {}) {
  const store = new Store(":memory:"); stores.push(store);
  const github = {
    verify: vi.fn().mockResolvedValue(undefined), issues: vi.fn().mockResolvedValue([issue()]),
    issue: vi.fn().mockResolvedValue(issue()), pulls: vi.fn().mockResolvedValue([]),
    comment: vi.fn().mockResolvedValue(undefined), label: vi.fn().mockResolvedValue(undefined),
    ownerAnswer: vi.fn().mockResolvedValue(undefined)
  };
  const supervisor = { state: vi.fn().mockResolvedValue("stopped"), start: vi.fn().mockResolvedValue(undefined) };
  return { store, github, supervisor, orchestrator: new Orchestrator(store, github, supervisor, { ...config, ...custom }) };
}

describe("exclusive execution and state", () => {
  it("rejects duplicate orchestration locks", () => {
    const { store } = setup();
    expect(store.lock("orchestrator", "one", () => true)).toBe(true);
    expect(store.lock("orchestrator", "two", () => true)).toBe(false);
    store.unlock("orchestrator", "two");
    expect(store.lock("orchestrator", "three", () => true)).toBe(false);
  });

  it("recovers stale locks after process termination or host reboot", () => {
    const { store } = setup();
    store.lock("orchestrator", "old-boot:10:99", () => false);
    expect(store.lock("orchestrator", processIdentity(), processAlive)).toBe(true);
    expect(processAlive(processIdentity())).toBe(true);
    expect(processAlive("old-boot:10:99")).toBe(false);
  });

  it("enforces one dispatch across independent SQLite connections", () => {
    const root = mkdtempSync(join(tmpdir(), "bbq-db-")); paths.push(root);
    const one = new Store(join(root, "state.sqlite")); const two = new Store(join(root, "state.sqlite")); stores.push(one, two);
    one.create(1, root);
    expect(() => two.create(2, root)).toThrow();
    expect(two.list()).toHaveLength(1);
  });

  it("persists session and checkpoint through database reopen", () => {
    const root = mkdtempSync(join(tmpdir(), "bbq-db-")); paths.push(root);
    const one = new Store(join(root, "state.sqlite"));
    const e = one.create(1, root);
    one.update(e.id, { session: "exact-session", progress: "tests added", status: "usage_paused" }); one.close();
    const two = new Store(join(root, "state.sqlite")); stores.push(two);
    expect(two.get(e.id)).toMatchObject({ session: "exact-session", progress: "tests added", status: "usage_paused" });
  });

  it("rolls back transactional changes", () => {
    const { store } = setup();
    expect(() => store.transaction(() => { store.set("test", "x"); throw new Error("rollback"); })).toThrow();
    expect(store.setting("test")).toBeUndefined();
  });
});

describe("reconciliation", () => {
  it("does not duplicate a healthy worker", async () => {
    const s = setup(); s.store.create(1, "/tmp/state"); s.supervisor.state.mockResolvedValue("running");
    await s.orchestrator.wake(); expect(s.supervisor.start).not.toHaveBeenCalled(); expect(s.github.issues).not.toHaveBeenCalled();
  });

  it("does not replace supervised workers even when heartbeat/lease expires", async () => {
    const s = setup(); const e = s.store.create(1, "/tmp/state"); s.store.update(e.id, { heartbeat: 1 });
    s.supervisor.state.mockResolvedValue("running"); await s.orchestrator.wake();
    expect(s.store.list()).toHaveLength(1); expect(s.supervisor.start).not.toHaveBeenCalled();
  });

  it("fails closed when supervisor state is unknown", async () => {
    const s = setup(); s.store.create(1, "/tmp/state"); s.supervisor.state.mockResolvedValue("unknown");
    expect(await s.orchestrator.wake()).toContain("unavailable"); expect(s.supervisor.start).not.toHaveBeenCalled();
  });

  it("resumes terminated workers using the same session and branch", async () => {
    const s = setup(); const e = s.store.create(1, "/tmp/state");
    s.store.update(e.id, { session: "saved", status: "interrupted" });
    await s.orchestrator.wake();
    expect(s.supervisor.start).toHaveBeenCalledWith(e.unit);
    expect(s.store.get(e.id)).toMatchObject({ session: "saved", branch: e.branch, retries: 1 });
  });

  it("waits for usage reset without consuming another session", async () => {
    const s = setup(); const e = s.store.create(1, "/tmp/state");
    s.store.update(e.id, { status: "usage_paused", retry_at: Date.now() + 1000000, session: "saved" });
    await s.orchestrator.wake(); expect(s.supervisor.start).not.toHaveBeenCalled(); expect(s.store.get(e.id).session).toBe("saved");
  });

  it("resumes a usage-paused session after reset", async () => {
    const s = setup(); const e = s.store.create(1, "/tmp/state");
    s.store.update(e.id, { status: "usage_paused", retry_at: 1, session: "saved" });
    await s.orchestrator.wake(); expect(s.supervisor.start).toHaveBeenCalledWith(e.unit); expect(s.store.get(e.id).session).toBe("saved");
  });

  it("bounds retries", async () => {
    const s = setup(); const e = s.store.create(1, "/tmp/state"); s.store.update(e.id, { retries: 3 });
    await s.orchestrator.wake(); expect(s.store.get(e.id).status).toBe("failed"); expect(s.supervisor.start).not.toHaveBeenCalled();
  });

  it("recovers PR creation before its SQLite update", async () => {
    const s = setup(); const e = s.store.create(1, "/tmp/state");
    s.github.pulls.mockResolvedValue([{ number: 9, url: "pr/9", state: "OPEN", headRefName: e.branch }]);
    await s.orchestrator.wake(); expect(s.store.get(e.id)).toMatchObject({ status: "awaiting_review", pr: 9 });
    expect(s.supervisor.start).not.toHaveBeenCalled();
  });

  it("preserves pushed work when PR creation previously failed", async () => {
    const s = setup(); const e = s.store.create(1, "/tmp/state");
    s.store.update(e.id, { status: "interrupted", progress: "pushed; PR creation failed", session: "saved" });
    await s.orchestrator.wake(); expect(s.store.list()).toHaveLength(1); expect(s.supervisor.start).toHaveBeenCalledWith(e.unit);
  });

  it("does not dispatch while paused or draining", async () => {
    for (const setting of ["pause", "drain"]) {
      const s = setup(); s.store.set(setting, "true"); await s.orchestrator.wake(); expect(s.supervisor.start).not.toHaveBeenCalled();
    }
  });

  it("requires integration and owner activation", async () => {
    const s = setup({ integrationVerified: false }); await s.orchestrator.wake(); expect(s.github.issues).not.toHaveBeenCalled();
  });

  it("dry-run does not dispatch, post comments, or create executions", async () => {
    const s = setup(); expect(await s.orchestrator.wake({ dryRun: true })).toContain("Would dispatch");
    expect(s.store.list()).toHaveLength(0); expect(s.github.comment).not.toHaveBeenCalled(); expect(s.supervisor.start).not.toHaveBeenCalled();
  });

  it.each(["Wrong GitHub identity", "Missing GitHub permissions"])("fails closed: %s", async message => {
    const s = setup(); s.github.verify.mockRejectedValue(new Error(message));
    await expect(s.orchestrator.wake()).rejects.toThrow(message); expect(s.supervisor.start).not.toHaveBeenCalled();
  });
});

describe("readiness, dependencies and decisions", () => {
  it("skips blocked issues and processes the next actionable one", async () => {
    const s = setup(); s.github.issues.mockResolvedValue([issue(1, "unclear"), issue(2)]);
    expect(await s.orchestrator.wake()).toBe("Dispatched #2"); expect(s.github.label).toHaveBeenCalledWith(1, "agent-blocked");
  });

  it("waits for dependencies, without stalling other issues", async () => {
    const s = setup(); s.github.issues.mockResolvedValue([issue(1, `${issue().body}\nDepends on #99`), issue(2)]);
    s.github.issue.mockResolvedValue(issue(99)); await s.orchestrator.wake(); expect(s.store.current()?.issue).toBe(2);
  });

  it("accepts a closed dependency", async () => {
    const s = setup(); s.github.issues.mockResolvedValue([issue(1, `${issue().body}\nBlocked by #99`)]);
    s.github.issue.mockResolvedValue({ ...issue(99), state: "CLOSED" }); await s.orchestrator.wake(); expect(s.store.current()?.issue).toBe(1);
  });

  it("does not duplicate another open PR linked by its body", async () => {
    const s = setup(); s.github.pulls.mockResolvedValue([{ headRefName: "human/fix", body: "Closes #1", state: "OPEN" }]);
    await s.orchestrator.wake(); expect(s.supervisor.start).not.toHaveBeenCalled();
  });

  it("business questions do not stall the backlog", async () => {
    const s = setup(); const e = s.store.create(10, "/tmp/state"); s.store.update(e.id, { status: "waiting_business" });
    await s.orchestrator.wake(); expect(s.store.current()?.issue).toBe(1);
  });

  it.each(["waiting_technical", "waiting_business"] as const)("records and resumes owner answer for %s", async status => {
    const s = setup(); const e = s.store.create(1, "/tmp/state"); s.store.update(e.id, { status, question: JSON.stringify({ question: "Which policy?", replyMarker: `agent-answer:${e.id}:new-question` }) });
    s.github.ownerAnswer.mockResolvedValue({ body: "Use documented policy", url: "comment/1" });
    await s.orchestrator.wake(); expect(s.store.get(e.id).answer).toBe("Use documented policy");
    expect(s.supervisor.start).toHaveBeenCalledWith(e.unit);
    expect(s.store.db.prepare("SELECT * FROM decisions").all()).toHaveLength(1);
    expect(s.github.ownerAnswer).toHaveBeenCalledWith(1, `agent-answer:${e.id}:new-question`);
  });

  it("orders priority labels then oldest issue", () => {
    const high = { ...issue(3), labels: [{ name: "priority:p0" }] };
    expect(prioritize([issue(2), high, issue(1)]).map(i => i.number)).toEqual([3, 1, 2]);
    expect(dependencies("Depends on #3, Blocked by #4; depends on #3")).toEqual([3, 4]);
  });
});

describe("provider and security boundaries", () => {
  it("does not mistake network, authentication, permission, or 429 errors for subscription exhaustion", () => {
    expect(classify("You've hit your usage limit")).toBe("usage");
    expect(classify("401 Unauthorized")).toBe("authentication");
    expect(classify("connection timeout")).toBe("network");
    expect(classify("403 forbidden")).toBe("permission");
    expect(classify("429 too many requests")).toBe("unknown");
    expect(classify("thread not found")).toBe("session");
    expect(classify("approval required")).toBe("approval");
  });

  it("uses bounded backoff and respects provider reset times", () => {
    expect(retryAt(100, undefined, 0)).toBe(24 * 60 * 60 * 1000);
    expect(retryAt(1, 90000000, 0)).toBe(90000000);
  });

  it("never passes API, GitHub, or production credentials into the coding environment", () => {
    expect(Object.keys(cleanEnvironment("/codex"))).toEqual(["PATH", "HOME", "CODEX_HOME", "LANG", "TERM", "GIT_TERMINAL_PROMPT", "NODE_ENV"]);
  });

  it("protects credentials and orchestrator controls", () => {
    expect(protectedChange(".env.production", true)).toBe(true);
    expect(protectedChange("tools/agent-orchestrator/src/cli.ts", false)).toBe(true);
    expect(protectedChange("tools/agent-orchestrator/src/cli.ts", true)).toBe(false);
    expect(protectedChange("components/Cart.tsx", false)).toBe(false);
  });

  it("rejects malformed structured results and questions", () => {
    expect(() => parseResult('{"outcome":"ready"}')).toThrow();
    expect(() => parseResult(JSON.stringify({ outcome: "question", summary: "x", acceptanceEvidence: [], question: {} }))).toThrow();
    expect(parseResult(JSON.stringify({ outcome: "ready", summary: "done", acceptanceEvidence: ["test"], question: null })).outcome).toBe("ready");
  });
});
