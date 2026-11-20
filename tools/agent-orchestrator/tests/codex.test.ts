import { afterEach, expect, it } from "vitest";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Codex, CodexError } from "../src/codex.js";
import type { Config } from "../src/types.js";

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

function fixture(events: object[], exitCode = 0, auth = "chatgpt") {
  const root = mkdtempSync(join(tmpdir(), "bbq-codex-")); roots.push(root);
  mkdirSync(join(root, "auth"));
  writeFileSync(join(root, "auth", "auth.json"), JSON.stringify({ auth_mode: auth }));
  const binary = join(root, "fake-codex");
  writeFileSync(binary, `#!/usr/bin/node
const fs=require('node:fs');
if(process.argv[2]==='login') process.exit(0);
fs.writeFileSync('args.json',JSON.stringify(process.argv.slice(2)));
for(const event of ${JSON.stringify(events)}) console.log(JSON.stringify(event));
console.error('private diagnostics should not appear in errors');
process.exit(${exitCode});\n`);
  chmodSync(binary, 0o700);
  const config = { codexBinary: binary, codexHome: join(root, "auth") } as Config;
  const engine = new Codex(config);
  const sessions: string[] = [];
  const run = (session?: string) => engine.run({ cwd: root, runtime: join(root, "runtime"), prompt: "test",
    isolated: false, structured: false, session, onSession: id => sessions.push(id) });
  return { root, engine, sessions, run };
}

it("streams and preserves the thread ID before completion", async () => {
  const f = fixture([{ type: "thread.started", thread_id: "saved-id" },
    { type: "item.completed", item: { type: "agent_message", text: "complete" } }, { type: "turn.completed" }]);
  expect(await f.run()).toBe("complete"); expect(f.sessions).toEqual(["saved-id"]);
  const args = JSON.parse(readFileSync(join(f.root, "args.json"), "utf8"));
  expect(args).toContain('forced_login_method="chatgpt"');
  expect(args).toContain("--ignore-user-config");
  expect(args).not.toContain("--dangerously-bypass-approvals-and-sandbox");
});

it("resumes an explicit saved session instead of creating a new thread", async () => {
  const f = fixture([{ type: "item.completed", item: { type: "agent_message", text: "complete" } }, { type: "turn.completed" }]);
  await f.run("original-id");
  const args = JSON.parse(readFileSync(join(f.root, "args.json"), "utf8"));
  expect(args.slice(0, 2)).toEqual(["exec", "resume"]); expect(args).toContain("original-id"); expect(args).not.toContain("--last");
});

it("records subscription exhaustion and the provider's explicit reset time", async () => {
  const f = fixture([{ type: "thread.started", thread_id: "save-before-failure" },
    { type: "turn.failed", error: { message: "usage_limit_reached", resets_at: 2000000000 } }], 1);
  await expect(f.run()).rejects.toMatchObject({ kind: "usage", resetAt: 2000000000000 });
  expect(f.sessions).toEqual(["save-before-failure"]);
});

it("distinguishes an interrupted stream from usage exhaustion", async () => {
  const f = fixture([{ type: "thread.started", thread_id: "interrupted-session" }], 1);
  await expect(f.run()).rejects.toMatchObject({ kind: "unknown" }); expect(f.sessions).toEqual(["interrupted-session"]);
});

it("never falls back from API authentication to billable execution", async () => {
  const f = fixture([], 0, "apikey"); await expect(f.run()).rejects.toMatchObject({ kind: "authentication" }); expect(f.sessions).toEqual([]);
});

it.each([
  ["token expired", "authentication"], ["connection timeout", "network"],
  ["permission denied", "permission"], ["thread not found", "session"], ["approval required", "approval"]
])("classifies %s without exposing provider diagnostics", async (message, kind) => {
  const f = fixture([{ type: "turn.failed", error: { message } }], 1);
  try { await f.run(); throw new Error("Expected rejection"); }
  catch (error) { expect(error).toBeInstanceOf(CodexError); expect(error).toMatchObject({ kind }); expect(String(error)).not.toContain("private diagnostics"); }
});
