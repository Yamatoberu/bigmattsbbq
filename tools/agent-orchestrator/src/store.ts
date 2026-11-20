import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import type { Execution, Status } from "./types.js";

const terminal = new Set<Status>(["completed", "awaiting_review", "failed", "waiting_business", "waiting_technical"]);
const columns = new Set(["status", "session", "progress", "heartbeat", "retries", "retry_at",
  "error_kind", "blocker", "question", "answer", "pr", "pr_url"]);

export class Store {
  readonly db: DatabaseSync;

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;");
    this.db.exec("CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY)");
    this.transaction(() => {
      if (!this.db.prepare("SELECT version FROM migrations WHERE version=1").get()) {
        this.db.exec(readFileSync(new URL("../migrations/001-initial.sql", import.meta.url), "utf8"));
        this.db.prepare("INSERT INTO migrations VALUES (1)").run();
      }
    });
  }

  transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try { const result = fn(); this.db.exec("COMMIT"); return result; }
    catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }

  list(): Execution[] { return this.db.prepare("SELECT * FROM executions ORDER BY started").all() as unknown as Execution[]; }
  current(): Execution | undefined { return this.list().find(e => !terminal.has(e.status)); }
  get(id: string): Execution {
    const value = this.db.prepare("SELECT * FROM executions WHERE id=?").get(id);
    if (!value) throw new Error("Unknown execution");
    return value as unknown as Execution;
  }

  create(issue: number, root: string): Execution {
    return this.transaction(() => {
      const id = randomUUID();
      const now = Date.now();
      this.db.prepare(`INSERT INTO executions
        (id,issue,issue_url,branch,worktree,unit,status,started,updated) VALUES (?,?,?,?,?,?,?,?,?)`)
        .run(id, issue, `https://github.com/Yamatoberu/bigmattsbbq/issues/${issue}`,
          `codex/${issue}-agent-implementation`, `${root}/worktrees/${id}`,
          `bbq-agent-worker@${id}.service`, "queued", now, now);
      this.audit(id, "execution.created", { issue });
      return this.get(id);
    });
  }

  update(id: string, patch: Partial<Execution>): void {
    const entries = Object.entries(patch);
    if (entries.some(([key]) => !columns.has(key))) throw new Error("Invalid execution update");
    if (!entries.length) return;
    this.transaction(() => {
      this.db.prepare(`UPDATE executions SET ${entries.map(([key]) => `${key}=?`).join(",")}, updated=? WHERE id=?`)
        .run(...entries.map(([, value]) => value ?? null), Date.now(), id);
      // Store metadata only: prompts, credentials, and raw provider output never enter audit logs.
      this.audit(id, "execution.updated", { fields: entries.map(([key]) => key), status: patch.status });
    });
  }

  setting(key: string): string | undefined {
    return (this.db.prepare("SELECT value FROM settings WHERE key=?").get(key) as { value: string } | undefined)?.value;
  }

  set(key: string, value: string): void {
    this.db.prepare("INSERT INTO settings VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(key, value);
    this.audit(null, "setting.updated", { key });
  }

  audit(id: string | null, event: string, details: object): void {
    this.db.prepare("INSERT INTO audit(at,execution,event,details) VALUES (?,?,?,?)")
      .run(Date.now(), id, event, JSON.stringify(details));
  }

  lock(name: string, owner: string, alive: (owner: string) => boolean): boolean {
    return this.transaction(() => {
      const old = this.db.prepare("SELECT owner FROM locks WHERE name=?").get(name) as { owner: string } | undefined;
      if (old && alive(old.owner)) return false;
      this.db.prepare("INSERT INTO locks VALUES (?,?) ON CONFLICT(name) DO UPDATE SET owner=excluded.owner").run(name, owner);
      return true;
    });
  }

  unlock(name: string, owner: string): void {
    this.db.prepare("DELETE FROM locks WHERE name=? AND owner=?").run(name, owner);
  }

  decision(id: string, kind: string, question: string, answer: string | null, source: string): void {
    this.db.prepare("INSERT INTO decisions(execution,kind,question,answer,source,created) VALUES (?,?,?,?,?,?)")
      .run(id, kind, question, answer, source, Date.now());
  }

  close(): void { this.db.close(); }
}
