import type { ErrorKind, Issue } from "./types.js";

export function prioritize(issues: Issue[]): Issue[] {
  const rank = (i: Issue) => {
    for (let n = 0; n <= 3; n++) if (i.labels.some(l => l.name.toLowerCase() === `priority:p${n}`)) return n;
    return 4;
  };
  return [...issues].sort((a, b) => rank(a) - rank(b) || a.createdAt.localeCompare(b.createdAt) || a.number - b.number);
}

export function dependencies(body: string): number[] {
  return [...new Set([...body.matchAll(/(?:depends on|blocked by)\s+#(\d+)/gi)].map(m => Number(m[1])))];
}

export function readiness(issue: Issue, readyLabel: string): string | undefined {
  if (issue.state.toUpperCase() !== "OPEN") return "Issue is not open";
  if (!issue.labels.some(l => l.name === readyLabel)) return `Requires ${readyLabel} label`;
  if (issue.body.length < 80 || !/acceptance criteria|\[ \]|\[x\]/i.test(issue.body)) return "Needs explicit acceptance criteria and a description";
  return undefined;
}

export function classify(message: string): ErrorKind {
  if (/usage_limit|usage limit|you(?:'|’)ve hit your.*limit|weekly limit|subscription.*limit|usage cap/i.test(message)) return "usage";
  if (/unauthorized|authentication|not logged in|token.*expired|401\b/i.test(message)) return "authentication";
  if (/approval.*required|requires.*approval|approval.*denied/i.test(message)) return "approval";
  if (/permission denied|forbidden|403\b/i.test(message)) return "permission";
  if (/session.*not found|thread.*not found|invalid.*thread|session.*corrupt/i.test(message)) return "session";
  if (/network|timed? out|connection|dns|502\b|503\b/i.test(message)) return "network";
  return "unknown";
}

export function retryAt(attempt: number, resetAt?: number, now = Date.now()): number {
  if (resetAt && Number.isFinite(resetAt) && resetAt > now) return resetAt;
  return now + Math.min(24, 2 ** attempt) * 60 * 60 * 1000;
}
