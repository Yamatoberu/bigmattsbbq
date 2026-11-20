import { command } from "./process.js";

export type UnitState = "running" | "stopped" | "unknown";
export interface SupervisorPort { state(unit: string): Promise<UnitState>; start(unit: string): Promise<void> }

export class Supervisor implements SupervisorPort {
  async state(unit: string): Promise<UnitState> {
    try {
      const output = await command("systemctl", ["--user", "show", unit, "--property=ActiveState", "--value"]);
      if (["active", "activating", "deactivating", "reloading"].includes(output)) return "running";
      if (["inactive", "failed"].includes(output)) return "stopped";
      return "unknown";
    } catch { return "unknown"; }
  }

  async start(unit: string): Promise<void> {
    await command("systemctl", ["--user", "start", "--no-block", unit]);
  }
}
