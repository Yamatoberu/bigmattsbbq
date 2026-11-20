import { Store } from "./store.js";
import type { Config } from "./types.js";
import type { GitHubPort } from "./github.js";
import type { SupervisorPort } from "./supervisor.js";
import { dependencies, prioritize, readiness } from "./policy.js";
import { processAlive, processIdentity } from "./process.js";

export class Orchestrator {
  constructor(private store: Store, private github: GitHubPort,
    private supervisor: SupervisorPort, private config: Config) {}

  async wake(options: { issue?: number; dryRun?: boolean } = {}): Promise<string> {
    const owner = processIdentity();
    if (!this.store.lock("orchestrator", owner, processAlive)) return "Another reconciliation is active";
    try {
      await this.github.verify();
      const pulls = await this.github.pulls();
      if (!options.dryRun) {
        for (const reviewed of this.store.list().filter(e => e.status === "awaiting_review")) {
          const pr = pulls.find(p => p.number === reviewed.pr);
          if (pr?.state === "MERGED") this.store.update(reviewed.id, { status: "completed" });
          if (pr?.state === "CLOSED") this.store.update(reviewed.id, { status: "failed", blocker: "PR closed without merge; owner review required" });
        }
      }
      if (this.store.setting("pause") !== "true" && !this.store.current()) {
        for (const waiting of this.store.list().filter(e => e.status === "waiting_business" || e.status === "waiting_technical")) {
          let marker: unknown;
          try { marker = JSON.parse(waiting.question ?? "{}").replyMarker; } catch { continue; }
          if (typeof marker !== "string" || !marker.startsWith(`agent-answer:${waiting.id}:`)) continue;
          const answer = await this.github.ownerAnswer(waiting.issue, marker);
          if (!answer) continue;
          if (options.dryRun) return "Would record owner answer and resume";
          this.store.decision(waiting.id, "owner", waiting.question ?? "", answer.body, answer.url);
          this.store.update(waiting.id, { answer: answer.body, status: "interrupted", retries: 0 });
          break;
        }
      }
      const current = this.store.current();
      if (current) {
        const unit = await this.supervisor.state(current.unit);
        if (unit === "unknown") return "Supervisor unavailable; leaving execution unchanged";
        if (unit === "running") {
          if (!options.dryRun) this.store.audit(current.id, "worker.observed", { healthy: !!current.heartbeat && Date.now() - current.heartbeat < this.config.leaseMs });
          return "Worker is supervised; leaving it running";
        }
        const pr = pulls.find(p => p.headRefName === current.branch);
        if (pr) {
          if (!options.dryRun) this.store.update(current.id, { status: pr.state === "MERGED" ? "completed" : "awaiting_review", pr: pr.number, pr_url: pr.url });
          return "Recovered pull request";
        }
        if (this.store.setting("pause") === "true") return "Paused; worker recovery deferred";
        if (this.store.setting("circuit")) return "Circuit breaker open; run diagnostics and explicitly clear it";
        if (current.retry_at && current.retry_at > Date.now()) return "Waiting for retry/reset time";
        if (current.retries >= this.config.maxRetries) {
          if (!options.dryRun) this.store.update(current.id, { status: "failed", blocker: "Retry budget exhausted; owner intervention required" });
          return "Retry budget exhausted";
        }
        if (options.dryRun) return "Would resume existing execution";
        if (!this.config.enabled || !this.config.integrationVerified) return "Recovery disabled by dispatch gates";
        this.store.update(current.id, { status: "queued", retries: current.retries + 1, retry_at: null });
        await this.supervisor.start(current.unit);
        return "Resuming existing execution";
      }
      if (this.store.setting("pause") === "true" || this.store.setting("drain") === "true") return "New work disabled";
      if (this.store.setting("circuit")) return "Circuit breaker open";
      if (!this.config.enabled || !this.config.integrationVerified) return "Dispatch disabled until integration and owner security review are recorded in configuration";
      const issues = options.issue ? [await this.github.issue(options.issue)] : prioritize(await this.github.issues(this.config.readyLabel));
      for (const issue of issues) {
        if (this.store.list().some(e => e.issue === issue.number)) continue;
        if (pulls.some(p => p.state === "OPEN" && (p.headRefName.startsWith(`codex/${issue.number}-`) ||
          p.headRefName.startsWith(`claude/${issue.number}-`) ||
          new RegExp(`(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\\s+(?:https://github.com/Yamatoberu/bigmattsbbq/issues/|#)${issue.number}(?!\\d)`, "i").test(p.body ?? "")))) continue;
        let blocker = readiness(issue, this.config.readyLabel);
        for (const dependency of dependencies(issue.body)) {
          if ((await this.github.issue(dependency)).state.toUpperCase() !== "CLOSED") blocker = `Waiting for dependency #${dependency}`;
        }
        if (blocker) {
          if (!options.dryRun && !issue.labels.some(l => l.name === this.config.blockedLabel)) {
            await this.github.comment(issue.number, `Agent dispatch blocked: ${blocker}. Update the issue and remove ${this.config.blockedLabel} to request re-evaluation.`);
            await this.github.label(issue.number, this.config.blockedLabel);
          }
          continue;
        }
        if (issue.labels.some(l => l.name === this.config.blockedLabel || l.name === this.config.ownerLabel)) continue;
        if (options.dryRun) return `Would dispatch #${issue.number}`;
        const execution = this.store.create(issue.number, this.config.stateDirectory);
        // Persist first: a crash around either external action is recovered by the next wake.
        await this.github.comment(issue.number, `Agent execution ${execution.id} claimed branch ${execution.branch}.`);
        await this.supervisor.start(execution.unit);
        return `Dispatched #${issue.number}`;
      }
      return "No actionable issues";
    } finally { this.store.unlock("orchestrator", owner); }
  }
}
