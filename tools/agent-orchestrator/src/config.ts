import { readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative } from "node:path";
import type { Config } from "./types.js";

export function loadConfig(path: string): Config {
  const value = JSON.parse(readFileSync(path, "utf8")) as Config;
  for (const key of ["repository", "stateDirectory", "codexHome", "codexBinary", "toolchainDirectory"] as const) {
    if (typeof value[key] !== "string" || !isAbsolute(value[key])) throw new Error(`Configuration ${key} must be an absolute path`);
  }
  const relation = relative(realpathSync(value.repository), value.stateDirectory);
  if (!relation.startsWith("..") && !isAbsolute(relation)) throw new Error("State must live outside the source repository");
  for (const key of ["readyLabel", "blockedLabel", "ownerLabel"] as const) {
    if (typeof value[key] !== "string" || !value[key]) throw new Error(`Missing ${key}`);
  }
  if (!Number.isInteger(value.maxRetries) || value.maxRetries < 1 || value.maxRetries > 6) throw new Error("maxRetries must be 1–6");
  if (!Number.isFinite(value.leaseMs) || value.leaseMs < 60000) throw new Error("leaseMs must be at least one minute");
  if (!Array.isArray(value.approvedSecurityIssues) || !value.approvedSecurityIssues.every(Number.isSafeInteger)) throw new Error("Invalid approvedSecurityIssues");
  if (typeof value.enabled !== "boolean" || typeof value.integrationVerified !== "boolean") throw new Error("Dispatch gates must be boolean");
  return value;
}
