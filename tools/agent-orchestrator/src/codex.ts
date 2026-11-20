import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { command } from "./process.js";
import { classify } from "./policy.js";
import type { Config, ErrorKind, Result } from "./types.js";

export class CodexError extends Error {
  constructor(readonly kind: ErrorKind, readonly resetAt?: number) { super(`Codex stopped: ${kind}`); }
}

export const resultSchema = {
  type: "object", additionalProperties: false,
  required: ["outcome", "summary", "acceptanceEvidence", "question"],
  properties: {
    outcome: { type: "string", enum: ["ready", "question", "blocked"] },
    summary: { type: "string" },
    acceptanceEvidence: { type: "array", items: { type: "string" } },
    question: { anyOf: [{ type: "null" }, {
      type: "object", additionalProperties: false,
      required: ["kind", "question", "missingDocumentation", "options", "recommendation", "impact"],
      properties: {
        kind: { type: "string", enum: ["technical", "business"] }, question: { type: "string" },
        missingDocumentation: { type: "string" }, options: { type: "array", items: { type: "string" } },
        recommendation: { type: "string" }, impact: { type: "string" }
      }
    }] }
  }
};

export function parseResult(text: string): Result {
  const result: unknown = JSON.parse(text);
  if (!result || typeof result !== "object") throw new CodexError("coding");
  const r = result as Result;
  if (!["ready", "question", "blocked"].includes(r.outcome) || typeof r.summary !== "string" ||
      !Array.isArray(r.acceptanceEvidence) || r.acceptanceEvidence.some(e => typeof e !== "string")) throw new CodexError("coding");
  if (r.outcome === "question") {
    const q = r.question;
    if (!q || !["technical", "business"].includes(q.kind) ||
      [q.question, q.missingDocumentation, q.recommendation, q.impact].some(v => typeof v !== "string") ||
      !Array.isArray(q.options) || q.options.some(v => typeof v !== "string")) throw new CodexError("coding");
  }
  return r;
}

export function cleanEnvironment(codexHome: string): NodeJS.ProcessEnv {
  // Deliberate allowlist. In particular no OPENAI_API_KEY, CODEX_API_KEY, GH_TOKEN,
  // cloud credentials, production application variables, or shell startup files.
  return { PATH: "/usr/local/bin:/usr/bin:/bin", HOME: "/tmp", CODEX_HOME: codexHome,
    LANG: "C.UTF-8", TERM: "dumb", GIT_TERMINAL_PROMPT: "0", NODE_ENV: "production" };
}

export class Codex {
  constructor(private config: Config) {}

  async verify(): Promise<void> {
    try {
    const status = await command(this.config.codexBinary, ["login", "status"], {
      env: { ...cleanEnvironment(this.config.codexHome), HOME: process.env.HOME }
    });
    // Some CLI releases print login status on stderr. Inspect auth_mode locally too;
    // never read or emit credential values into prompts, audit events, or errors.
    const auth = JSON.parse(readFileSync(join(this.config.codexHome, "auth.json"), "utf8"));
    if (auth.auth_mode !== "chatgpt") throw new Error("Codex must authenticate through ChatGPT; API credentials forbidden");
    if (status && !/ChatGPT/i.test(status)) throw new Error("Unrecognized Codex authentication mode");
    } catch { throw new CodexError("authentication"); }
  }

  async run(options: {
    cwd: string; runtime: string; prompt: string; session?: string | null; isolated: boolean;
    structured?: boolean; onSession: (id: string) => void; onProgress?: () => void;
    signal?: AbortSignal;
  }): Promise<string> {
    await this.verify();
    mkdirSync(options.runtime, { recursive: true, mode: 0o700 });
    const schemaPath = join(options.runtime, "result.schema.json");
    writeFileSync(schemaPath, JSON.stringify(resultSchema), { mode: 0o600 });
    const config = ["--ignore-user-config", "--ignore-rules", "-c", 'forced_login_method="chatgpt"',
      "-c", 'model_provider="openai"', "-c", 'approval_policy="never"',
      ...(options.isolated ? ["-c", 'default_permissions="bbq"', "-c", 'permissions.bbq.extends=":workspace"',
        "-c", 'permissions.bbq.filesystem={"/codex-home"="deny"}', "-c", "permissions.bbq.network.enabled=false"] :
        ["-c", 'sandbox_mode="read-only"']), "--json"];
    const runtime = options.isolated ? "/runtime" : options.runtime;
    const args = ["exec", ...(options.session ? ["resume"] : []), ...config,
      ...(options.structured === false ? [] : ["--output-schema", `${runtime}/result.schema.json`]),
      ...(options.session ? [options.session] : ["--skip-git-repo-check"]), "-"];
    let binary = this.config.codexBinary;
    let env: NodeJS.ProcessEnv = { ...cleanEnvironment(this.config.codexHome), HOME: process.env.HOME };
    if (options.isolated) {
      // The model sees only OS tools, its isolated source tree, its own Codex state,
      // and runtime output. Host home, gh credentials, application .env files,
      // other worktrees, the orchestrator install, and SQLite are not mounted.
      binary = "/usr/bin/bwrap";
      args.unshift("/engine/codex");
      args.unshift("--unshare-all", "--share-net", "--die-with-parent", "--new-session",
        "--ro-bind", "/usr", "/usr", "--ro-bind", "/lib", "/lib", "--ro-bind", "/lib64", "/lib64",
        "--symlink", "usr/bin", "/bin", "--symlink", "usr/sbin", "/sbin",
        "--ro-bind", "/etc/ssl", "/etc/ssl", "--ro-bind", "/etc/resolv.conf", "/etc/resolv.conf",
        "--ro-bind", "/etc/hosts", "/etc/hosts", "--proc", "/proc", "--dev", "/dev", "--tmpfs", "/tmp",
        "--ro-bind", dirname(realpathSync(this.config.codexBinary)), "/engine",
        "--bind", this.config.codexHome, "/codex-home", "--bind", options.cwd, "/workspace",
        "--ro-bind", join(options.cwd, ".git"), "/workspace/.git",
        "--tmpfs", "/workspace/.codex",
        "--ro-bind", this.config.toolchainDirectory, "/toolchain",
        "--bind", options.runtime, "/runtime", "--chdir", "/workspace");
      env = cleanEnvironment("/codex-home");
      env.PATH = "/toolchain/.bin:/usr/bin:/bin";
    }
    return new Promise((resolve, reject) => {
      const child = spawn(binary, args, { cwd: options.cwd, env, stdio: "pipe" });
      let final = "";
      let failure: CodexError | undefined;
      let complete = false;
      let eventBytes = 0;
      const stop = () => child.kill("SIGTERM");
      const timer = setTimeout(stop, 4 * 60 * 60 * 1000);
      options.signal?.addEventListener("abort", stop, { once: true });
      const lines = createInterface({ input: child.stdout });
      child.stdout.on("data", chunk => {
        eventBytes += chunk.length;
        if (eventBytes > 32 * 1024 * 1024) { failure = new CodexError("coding"); stop(); }
      });
      lines.on("line", line => {
        try {
          const event = JSON.parse(line);
          if (event.type === "thread.started" && typeof event.thread_id === "string") options.onSession(event.thread_id);
          if (event.type === "item.completed" && event.item?.type === "agent_message") final = event.item.text;
          if (event.type === "turn.completed") complete = true;
          if (event.type === "error" || event.type === "turn.failed") {
            const message = event.message ?? event.error?.message ?? "";
            const reset = event.error?.resets_at;
            const parsed = typeof reset === "number" ? reset * 1000 : typeof reset === "string" ? Date.parse(reset) : undefined;
            failure = new CodexError(classify(message), parsed);
          }
          options.onProgress?.();
        } catch { failure = new CodexError("unknown"); stop(); }
      });
      child.stderr.resume();
      child.stdin.on("error", () => {});
      child.on("error", () => { failure = new CodexError("permission"); });
      child.on("close", code => {
        clearTimeout(timer);
        options.signal?.removeEventListener("abort", stop);
        if (code === 0 && complete && !failure && final) resolve(final);
        else reject(failure ?? new CodexError("unknown"));
      });
      child.stdin.end(options.prompt);
    });
  }
}
