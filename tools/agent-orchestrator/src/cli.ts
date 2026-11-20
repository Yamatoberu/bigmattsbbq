import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { loadConfig } from "./config.js";
import { Store } from "./store.js";
import { Codex } from "./codex.js";
import { GitHub } from "./github.js";
import { Supervisor } from "./supervisor.js";
import { Orchestrator } from "./orchestrator.js";
import { Worker } from "./worker.js";
import { command, processAlive, processIdentity } from "./process.js";

async function main(): Promise<void> {
  if (Number(process.versions.node.split(".")[0]) !== 24) throw new Error("Node.js 24.x is required");
  process.umask(0o077);
  const args = process.argv.slice(2);
  const configIndex = args.indexOf("--config");
  if (configIndex < 0 || !args[configIndex + 1]) throw new Error("Pass --config /absolute/path/config.json");
  const config = loadConfig(args[configIndex + 1]);
  args.splice(configIndex, 2);
  const [action, argument] = args;
  mkdirSync(config.stateDirectory, { recursive: true, mode: 0o700 });
  const store = new Store(join(config.stateDirectory, "state.sqlite"));
  const github = new GitHub();
  const codex = new Codex(config);
  const supervisor = new Supervisor();
  const orchestrator = new Orchestrator(store, github, supervisor, config);
  try {
    switch (action) {
      case "status":
        console.log(JSON.stringify({ paused: store.setting("pause") === "true", draining: store.setting("drain") === "true",
          circuit: store.setting("circuit"), dispatchEnabled: config.enabled && config.integrationVerified,
          executions: store.list(), subscriptionProbeSession: store.setting("probe.session") }, null, 2));
        break;
      case "pause": store.set("pause", "true"); console.log("Paused: no new or resumed work; current worker may finish"); break;
      case "drain": store.set("drain", "true"); console.log("Draining: current execution may recover and finish; no new issues"); break;
      case "resume": store.set("pause", "false"); store.set("drain", "false"); console.log("Scheduling resumed; dispatch gates still apply"); break;
      case "clear-circuit":
        await github.verifyTransport(); await codex.verify();
        store.set("circuit", ""); console.log("Circuit cleared after authentication checks"); break;
      case "wake": console.log(await orchestrator.wake({ dryRun: args.includes("--dry-run") })); break;
      case "dispatch": {
        const issue = Number(argument);
        if (!Number.isSafeInteger(issue) || issue < 1) throw new Error("dispatch requires a positive issue number");
        console.log(await orchestrator.wake({ issue, dryRun: args.includes("--dry-run") })); break;
      }
      case "worker":
        if (!argument || !/^[a-f0-9-]{36}$/.test(argument)) throw new Error("worker requires an execution UUID");
        await new Worker(store, github, codex, config).run(argument); break;
      case "probe": {
        const owner = processIdentity();
        if (!store.lock("probe", owner, processAlive)) throw new Error("Subscription probe already running");
        try {
          const resume = args.includes("--resume");
          const session = resume ? store.setting("probe.session") : undefined;
          if (resume && !session) throw new Error("No persisted probe session to resume");
          const marker = resume ? "ORCHESTRATOR_RESUME_OK" : "ORCHESTRATOR_SUBSCRIPTION_PROBE_OK";
          const output = await codex.run({ cwd: config.repository,
            runtime: join(config.stateDirectory, "probe"), session, isolated: false, structured: false,
            prompt: `Reply exactly ${marker}. Do not use tools, access files, or change anything.`,
            onSession: id => store.set("probe.session", id) });
          if (output.trim() !== marker) throw new Error("Unexpected probe response");
          store.set(resume ? "probe.resumeVerified" : "probe.newVerified", String(Date.now()));
          console.log(JSON.stringify({ ok: true, resumed: resume, session: store.setting("probe.session"), auth: "chatgpt" }));
        } finally { store.unlock("probe", owner); }
        break;
      }
      case "diagnostics": {
        const checks: Record<string, string> = { node: process.version };
        for (const [name, fn] of Object.entries({
          github: () => github.verify(), gitTransport: () => github.verifyTransport(), codex: () => codex.verify(),
          systemd: () => command("systemctl", ["--user", "show", "--property=Version", "--value"]),
          sandbox: () => command("/usr/bin/bwrap", ["--unshare-all", "--ro-bind", "/usr", "/usr", "--ro-bind", "/lib", "/lib", "--ro-bind", "/lib64", "/lib64", "/usr/bin/true"])
        })) {
          try { await fn(); checks[name] = "ok"; } catch { checks[name] = "FAILED (check authentication, permissions, or service availability)"; }
        }
        console.log(JSON.stringify(checks, null, 2));
        if (Object.values(checks).some(v => v.startsWith("FAILED"))) process.exitCode = 1;
        break;
      }
      default: throw new Error("Commands: diagnostics, probe [--resume], status, pause, drain, resume, clear-circuit, wake [--dry-run], dispatch NUMBER [--dry-run], worker UUID");
    }
  } finally { store.close(); }
}

main().catch(error => {
  // Errors from commands are deliberately sanitized at the subprocess boundary.
  console.error(error instanceof Error ? error.message : "Orchestrator failed");
  process.exitCode = 1;
});
