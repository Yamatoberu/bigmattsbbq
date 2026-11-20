import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

export interface CommandOptions { cwd?: string; env?: NodeJS.ProcessEnv; input?: string; timeout?: number }

export async function command(binary: string, args: string[], options: CommandOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { cwd: options.cwd, env: options.env ?? process.env, stdio: "pipe" });
    let output = "";
    let size = 0;
    // Never include arbitrary command output in thrown errors (it may contain credentials).
    child.stdout.on("data", chunk => {
      size += chunk.length;
      if (size > 8 * 1024 * 1024) child.kill("SIGTERM");
      else output += chunk.toString();
    });
    child.stderr.resume();
    const timer = setTimeout(() => child.kill("SIGTERM"), options.timeout ?? 120000);
    child.on("error", () => { clearTimeout(timer); reject(new Error(`Unable to start ${binary}`)); });
    child.on("close", code => {
      clearTimeout(timer);
      if (code === 0 && size <= 8 * 1024 * 1024) resolve(output.trim());
      else reject(new Error(`${binary} failed (exit ${code ?? "signal"})`));
    });
    child.stdin.on("error", () => {});
    child.stdin.end(options.input);
  });
}

function startTime(pid: number): string {
  return readFileSync(`/proc/${pid}/stat`, "utf8").split(") ")[1].split(" ")[19];
}

export function processIdentity(): string {
  return `${readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim()}:${process.pid}:${startTime(process.pid)}`;
}

export function processAlive(identity: string): boolean {
  const [boot, pid, start] = identity.split(":");
  try {
    return boot === readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim() && startTime(Number(pid)) === start;
  } catch { return false; }
}
